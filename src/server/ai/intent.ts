import type { Intent } from "../types";

// Rule-based multi-intent recognition with entity extraction
// Handles compound sentences like "Book a flight to Paris and find me a hotel near the Eiffel Tower"

interface IntentPattern {
  name: string;
  patterns: RegExp[];
  entityExtractors?: Record<string, RegExp>;
}

const INTENT_DEFINITIONS: IntentPattern[] = [
  {
    name: "greeting",
    patterns: [/^(hi|hello|hey|howdy|greetings|good\s*(morning|afternoon|evening))/i],
  },
  {
    name: "farewell",
    patterns: [/^(bye|goodbye|see\s*you|later|take\s*care|have\s*a\s*good)/i],
  },
  {
    name: "question",
    patterns: [/^(what|who|where|when|why|how|can\s*you|could\s*you|is\s*there|are\s*there|do\s*you)/i, /\?$/],
  },
  {
    name: "booking",
    patterns: [/\b(book|reserve|schedule|appointment|reservation)\b/i],
    entityExtractors: {
      service: /\b(book|reserve|schedule)\s+(?:a\s+)?(\w+)/i,
      date: /\b(on|for|at)\s+(\w+\s*\d{1,2}(?:\s*,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
      location: /\b(in|at|to|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    },
  },
  {
    name: "search",
    patterns: [/\b(find|search|look\s*up|look\s*for|show\s*me|get\s*me)\b/i],
    entityExtractors: {
      query: /\b(?:find|search|look\s*(?:up|for)|show\s*me|get\s*me)\s+(.+?)(?:\s+and\s+|\s*$)/i,
    },
  },
  {
    name: "complaint",
    patterns: [
      /\b(not\s*working|broken|bug|issue|problem|error|crash|fail|wrong)\b/i,
      /\b(frustrated|angry|unacceptable|ridiculous|terrible)\b/i,
    ],
    entityExtractors: {
      subject: /\b(?:the|my|your)\s+(\w+(?:\s+\w+)?)\s+(?:is|isn't|are|aren't)\s+(?:not\s+)?(?:working|broken)/i,
    },
  },
  {
    name: "help_request",
    patterns: [/\b(help|assist|support|guide|explain|how\s*(?:do|to|can))\b/i],
    entityExtractors: {
      topic: /\b(?:help|assist|support)\s+(?:me\s+)?(?:with\s+)?(.+?)(?:\s+and\s+|\s*$)/i,
    },
  },
  {
    name: "translation",
    patterns: [/\b(translate|translation|say\s*in|how\s*do\s*you\s*say)\b/i],
    entityExtractors: {
      target_language: /\b(?:to|in|into)\s+(spanish|french|german|chinese|japanese|korean|arabic|portuguese|russian|italian)\b/i,
      text: /\btranslate\s+"?([^"]+?)"?\s+(?:to|into)\b/i,
    },
  },
  {
    name: "data_query",
    patterns: [/\b(stock|price|weather|news|score|result|stat|data)\b/i],
    entityExtractors: {
      symbol: /\b([A-Z]{1,5})\s+(?:stock|price|share)/i,
      location: /\bweather\s+(?:in|for|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    },
  },
  {
    name: "task_execution",
    patterns: [
      /\b(create|make|build|generate|write|draft|compose|send|email|post)\b/i,
    ],
    entityExtractors: {
      action: /\b(create|make|build|generate|write|draft|compose|send)\s+(?:a\s+)?(\w+)/i,
    },
  },
  {
    name: "feedback",
    patterns: [/\b(good\s*job|well\s*done|great|thanks|thank\s*you|awesome|perfect)\b/i],
  },
  {
    name: "escalation",
    patterns: [/\b(speak\s*to|talk\s*to|transfer|human|agent|manager|supervisor|real\s*person)\b/i],
  },
  {
    name: "settings",
    patterns: [/\b(change|update|set|configure|preference|setting|language|theme|mode)\b/i],
    entityExtractors: {
      setting: /\b(?:change|update|set)\s+(?:my\s+)?(\w+)\s+to\s+(\w+)/i,
    },
  },
];

export function recognizeIntents(text: string): Intent[] {
  const intents: Intent[] = [];
  // Split on "and", "also", "plus" for multi-intent
  const clauses = text.split(/\b(?:and\s+(?:also\s+)?|also\s+|plus\s+|then\s+)/i);

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;

    for (const definition of INTENT_DEFINITIONS) {
      const matched = definition.patterns.some((p) => p.test(trimmed));
      if (!matched) continue;

      const entities: Record<string, string> = {};
      if (definition.entityExtractors) {
        for (const [entityName, pattern] of Object.entries(definition.entityExtractors)) {
          const match = trimmed.match(pattern);
          if (match) {
            entities[entityName] = (match[2] || match[1]).trim();
          }
        }
      }

      // Avoid duplicate intents
      if (!intents.some((i) => i.name === definition.name)) {
        intents.push({
          name: definition.name,
          confidence: 0.85,
          entities,
        });
      }
    }
  }

  // Default intent if nothing matched
  if (intents.length === 0) {
    intents.push({ name: "general", confidence: 0.5, entities: {} });
  }

  return intents;
}
