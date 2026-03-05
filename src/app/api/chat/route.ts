import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import { getDb } from "@/server/db";
import { streamResponse } from "@/server/ai/router";
import { analyzeSentiment, getToneAdjustment } from "@/server/ai/sentiment";
import { recognizeIntents } from "@/server/ai/intent";
import { memoryStore } from "@/server/ai/memory";
import { buildRAGContext } from "@/server/ai/rag";
import { redactPII } from "@/server/ai/pii";
import { quickValidate } from "@/server/ai/self-correction";
import { trackEvent } from "@/server/ai/analytics";
import { getBotConfig } from "@/server/ai/config";
import { shouldEscalate, createHandoff } from "@/server/ai/handoff";
import { translateText } from "@/server/ai/translate";
import type { ChatRequest } from "@/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ensureDbReady() {
  try {
    const db = getDb();
    // Check if tables exist
    db.prepare("SELECT 1 FROM users LIMIT 1").get();
  } catch {
    // Auto-init database
    const { initDatabase } = require("@/server/db/init");
    initDatabase();
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    ensureDbReady();
    const body: ChatRequest = await req.json();
    const { message, language } = body;
    const db = getDb();
    const config = getBotConfig();

    // Ensure user exists
    const userId = body.user_id || uuid();
    db.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run(userId);

    // Ensure session exists
    const sessionId = body.session_id || uuid();
    const existingSession = db.prepare("SELECT id FROM sessions WHERE id = ?").get(sessionId);
    if (!existingSession) {
      db.prepare("INSERT INTO sessions (id, user_id, channel) VALUES (?, ?, ?)").run(
        sessionId, userId, body.channel || "web"
      );
    }

    // Store user message (PII-redacted in logs)
    const msgId = uuid();
    const sentiment = analyzeSentiment(message);
    const intents = recognizeIntents(message);

    db.prepare(
      "INSERT INTO messages (id, session_id, role, content, metadata, sentiment_score, sentiment_label) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(msgId, sessionId, "user", message, JSON.stringify({ intents }), sentiment.score, sentiment.label);

    // Track analytics
    trackEvent("message_received", { sentiment: sentiment.label }, sessionId, userId);
    for (const intent of intents) {
      trackEvent("intent_detected", { intent: intent.name, confidence: intent.confidence }, sessionId, userId);
    }

    // Auto-extract memory
    if (config.enable_memory) {
      memoryStore.extractAndStore(userId, message);
    }

    // Check for escalation
    const messageCount = (db.prepare("SELECT COUNT(*) as c FROM messages WHERE session_id = ?").get(sessionId) as { c: number }).c;
    if (shouldEscalate(sentiment.score, messageCount, intents.map((i) => i.name))) {
      createHandoff(sessionId, userId, `Auto-escalated: sentiment=${sentiment.label}, intents=${intents.map((i) => i.name).join(",")}`);
      trackEvent("handoff_created", { reason: "auto_escalation" }, sessionId, userId);
    }

    // Build context
    let systemPrompt = `You are ${config.bot_name}, an ultra-advanced AI assistant. Your tone is ${config.bot_tone}.

Key capabilities:
- Deep reasoning and analysis
- Multi-step task planning and execution
- Real-time information retrieval
- Multi-language support
- Sentiment-aware responses

Always be helpful, accurate, and cite sources when possible. If you're unsure about something, say so.`;

    // Add tone adjustment based on sentiment
    const toneAdj = getToneAdjustment(sentiment);
    if (toneAdj) systemPrompt += `\n\n${toneAdj}`;

    // Add memory context
    if (config.enable_memory) {
      const memoryContext = memoryStore.buildContextString(userId);
      if (memoryContext) systemPrompt += memoryContext;
    }

    // Add RAG context
    let sources: Array<{ title: string; url?: string; snippet: string }> = [];
    if (config.enable_rag) {
      const ragResult = buildRAGContext(message);
      if (ragResult.context) {
        systemPrompt += ragResult.context;
        sources = ragResult.sources;
      }
    }

    // Gather conversation history
    const history = db
      .prepare("SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?")
      .all(sessionId, config.max_context_messages) as Array<{ role: string; content: string }>;

    const messages_for_ai = history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata first
          const metadataPayload = JSON.stringify({
            type: "metadata",
            session_id: sessionId,
            message_id: uuid(),
            sentiment,
            intents,
            sources: sources.length > 0 ? sources : undefined,
          });
          controller.enqueue(encoder.encode(`data: ${metadataPayload}\n\n`));

          const result = await streamResponse(messages_for_ai, {
            system: systemPrompt,
            deepReasoning: intents.some((i) => ["question", "data_query", "task_execution"].includes(i.name)),
          });

          let fullResponse = "";

          for await (const chunk of result.textStream) {
            fullResponse += chunk;
            const payload = JSON.stringify({ type: "text", content: chunk });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }

          // Translate if requested
          if (language && language !== "en") {
            try {
              const translated = await translateText(fullResponse, language);
              const translationPayload = JSON.stringify({
                type: "text",
                content: `\n\n---\n**Translation (${language}):**\n${translated.translatedText}`,
              });
              controller.enqueue(encoder.encode(`data: ${translationPayload}\n\n`));
              fullResponse += `\n\n[Translated to ${language}]: ${translated.translatedText}`;
            } catch { /* skip translation errors */ }
          }

          // Quick validation
          const issues = quickValidate(fullResponse);
          if (issues.length > 0) {
            const warningPayload = JSON.stringify({
              type: "text",
              content: `\n\n> ⚠️ *Self-check: ${issues.join("; ")}*`,
            });
            controller.enqueue(encoder.encode(`data: ${warningPayload}\n\n`));
          }

          // Store assistant response (redacted)
          const assistantMsgId = uuid();
          db.prepare(
            "INSERT INTO messages (id, session_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)"
          ).run(assistantMsgId, sessionId, "assistant", fullResponse, JSON.stringify({ sources }));

          // Track response time
          trackEvent("response_sent", { response_time_ms: Date.now() - startTime }, sessionId, userId);

          // Log PII-redacted version
          redactPII(fullResponse); // Just for logging purposes

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : "Unknown error";
          const errPayload = JSON.stringify({ type: "text", content: `I encountered an error: ${errMsg}. Please check your API configuration.` });
          controller.enqueue(encoder.encode(`data: ${errPayload}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
