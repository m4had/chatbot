import { getDb } from "../db";
import { v4 as uuid } from "uuid";
import type { HandoffRequest, Message } from "../types";

export function createHandoff(
  sessionId: string,
  userId: string,
  reason: string,
  priority = 0
): HandoffRequest {
  const db = getDb();
  const id = uuid();

  // Gather conversation context
  const messages = db
    .prepare("SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 20")
    .all(sessionId) as Message[];

  const context = JSON.stringify({
    recentMessages: messages.reverse(),
    reason,
    sessionId,
    userId,
    createdAt: new Date().toISOString(),
  });

  db.prepare(
    "INSERT INTO handoff_queue (id, session_id, user_id, reason, priority, context) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, sessionId, userId, reason, priority, context);

  return db.prepare("SELECT * FROM handoff_queue WHERE id = ?").get(id) as HandoffRequest;
}

export function getPendingHandoffs(): HandoffRequest[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM handoff_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC")
    .all() as HandoffRequest[];
}

export function assignHandoff(handoffId: string, agentId: string): void {
  const db = getDb();
  db.prepare("UPDATE handoff_queue SET status = 'assigned', assigned_to = ? WHERE id = ?").run(agentId, handoffId);
}

export function resolveHandoff(handoffId: string): void {
  const db = getDb();
  db.prepare("UPDATE handoff_queue SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?").run(handoffId);
}

export function shouldEscalate(sentimentScore: number, messageCount: number, intents: string[]): boolean {
  // Auto-escalate if user is very frustrated
  if (sentimentScore <= -0.7) return true;
  // Escalate if user explicitly asks for human
  if (intents.includes("escalation")) return true;
  // Escalate if many messages without resolution (user going in circles)
  if (messageCount > 15 && sentimentScore < -0.3) return true;
  return false;
}
