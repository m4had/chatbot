// PII Redaction Middleware
// Strips personally identifiable information from text before logging

const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  {
    name: "ssn",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: "[SSN REDACTED]",
  },
  {
    name: "credit_card",
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: "[CARD REDACTED]",
  },
  {
    name: "email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: "[EMAIL REDACTED]",
  },
  {
    name: "phone_us",
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[PHONE REDACTED]",
  },
  {
    name: "phone_intl",
    pattern: /\b\+\d{1,3}[-.\s]?\d{4,14}\b/g,
    replacement: "[PHONE REDACTED]",
  },
  {
    name: "ip_address",
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: "[IP REDACTED]",
  },
  {
    name: "passport",
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    replacement: "[ID REDACTED]",
  },
  {
    name: "date_of_birth",
    pattern: /\b(?:born\s+(?:on\s+)?|DOB[:\s]+|date\s+of\s+birth[:\s]+)\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/gi,
    replacement: "[DOB REDACTED]",
  },
];

export function redactPII(text: string): string {
  let redacted = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}

export function detectPII(text: string): Array<{ type: string; count: number }> {
  const detections: Array<{ type: string; count: number }> = [];
  for (const { name, pattern } of PII_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      detections.push({ type: name, count: matches.length });
    }
  }
  return detections;
}

export function hasPII(text: string): boolean {
  return PII_PATTERNS.some(({ pattern }) => pattern.test(text));
}
