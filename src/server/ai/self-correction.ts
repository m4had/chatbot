import { generateResponse } from "./router";
import { searchDocuments } from "./rag";

export async function validateAndCorrect(
  originalResponse: string,
  userQuery: string
): Promise<{ corrected: string; wasChanged: boolean; corrections: string[] }> {
  // Step 1: Check against knowledge base
  const ragResults = searchDocuments(userQuery, 3);
  const knowledgeContext = ragResults.map((r) => r.chunk.content).join("\n\n");

  // Step 2: Ask the model to self-check
  const validationPrompt = `You are a fact-checking validator. Review this AI response for accuracy, logic errors, and potential hallucinations.

USER QUERY: ${userQuery}

AI RESPONSE TO VALIDATE:
${originalResponse}

${knowledgeContext ? `VERIFIED KNOWLEDGE BASE:\n${knowledgeContext}\n` : ""}

Instructions:
1. Check for factual errors or unsupported claims
2. Check for logical inconsistencies
3. Check for hallucinated details (made-up names, dates, stats)
4. If the response seems confident about something uncertain, flag it

Return a JSON object with:
{
  "isAccurate": true/false,
  "corrections": ["list of specific corrections needed"],
  "correctedResponse": "the full corrected response if changes needed, or empty string if accurate"
}

Return ONLY valid JSON, no other text.`;

  try {
    const result = await generateResponse(
      [{ role: "user", content: validationPrompt }],
      { temperature: 0.1 }
    );

    const parsed = JSON.parse(result.text);
    if (!parsed.isAccurate && parsed.correctedResponse) {
      return {
        corrected: parsed.correctedResponse,
        wasChanged: true,
        corrections: parsed.corrections || [],
      };
    }
  } catch {
    // If validation fails, return original
  }

  return { corrected: originalResponse, wasChanged: false, corrections: [] };
}

// Lightweight checks that don't need AI
export function quickValidate(text: string): string[] {
  const issues: string[] = [];

  // Check for common hallucination patterns
  if (/as of my (last|knowledge) (update|cutoff)/i.test(text)) {
    issues.push("Contains knowledge cutoff disclaimer - may have outdated info");
  }

  // Check for overly specific but unverifiable claims
  if (/\b(exactly|precisely)\s+\d+(\.\d+)?%/i.test(text)) {
    issues.push("Contains very precise statistics that may need verification");
  }

  // Check for made-up URLs
  const urlMatch = text.match(/https?:\/\/[^\s]+/g);
  if (urlMatch) {
    issues.push(`Contains ${urlMatch.length} URL(s) that should be verified`);
  }

  return issues;
}
