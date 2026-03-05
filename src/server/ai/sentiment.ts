import type { SentimentResult } from "../types";

// Keyword-based sentiment analysis (no external API needed)
// Falls back gracefully - uses AI model for deeper analysis when available

const POSITIVE_WORDS = new Set([
  "good", "great", "excellent", "amazing", "wonderful", "fantastic", "love", "happy",
  "perfect", "awesome", "brilliant", "beautiful", "nice", "thanks", "thank", "pleased",
  "glad", "enjoy", "helpful", "best", "superb", "outstanding", "magnificent", "delightful",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "terrible", "awful", "horrible", "hate", "angry", "frustrated", "annoyed",
  "disappointed", "worst", "useless", "broken", "fail", "wrong", "error", "problem",
  "issue", "bug", "crash", "slow", "ugly", "stupid", "ridiculous", "pathetic",
]);

const INTENSIFIERS = new Set(["very", "extremely", "incredibly", "absolutely", "totally", "really"]);
const NEGATORS = new Set(["not", "no", "never", "neither", "nor", "don't", "doesn't", "didn't", "won't", "can't", "couldn't"]);

const EMOTION_PATTERNS: Record<string, RegExp[]> = {
  anger: [/angry/i, /furious/i, /rage/i, /mad\b/i, /pissed/i, /wtf/i, /!!+/],
  joy: [/happy/i, /joy/i, /excited/i, /yay/i, /woohoo/i, /😊|😄|🎉|❤️/],
  sadness: [/sad/i, /cry/i, /depressed/i, /lonely/i, /miss\b/i, /😢|😭|💔/],
  fear: [/scared/i, /afraid/i, /worried/i, /anxious/i, /panic/i, /😰|😨/],
  surprise: [/wow/i, /omg/i, /shocked/i, /surprised/i, /unexpected/i, /😮|😱/],
  frustration: [/frustrated/i, /stuck/i, /can't figure/i, /doesn't work/i, /help me/i],
};

export function analyzeSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  let wordCount = 0;
  let hasIntensifier = false;
  let hasNegator = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z']/g, "");

    if (INTENSIFIERS.has(word)) {
      hasIntensifier = true;
      continue;
    }

    if (NEGATORS.has(word)) {
      hasNegator = true;
      continue;
    }

    let wordScore = 0;
    if (POSITIVE_WORDS.has(word)) wordScore = 1;
    if (NEGATIVE_WORDS.has(word)) wordScore = -1;

    if (wordScore !== 0) {
      if (hasNegator) wordScore *= -1;
      if (hasIntensifier) wordScore *= 1.5;
      score += wordScore;
      wordCount++;
      hasIntensifier = false;
      hasNegator = false;
    }
  }

  // Exclamation marks amplify
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 1) score *= 1 + exclamations * 0.1;

  // Question marks slightly negative (seeking help)
  const questions = (text.match(/\?/g) || []).length;
  if (questions > 0 && score === 0) score = -0.1;

  // ALL CAPS = intensity
  const capsRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
  if (capsRatio > 0.5 && text.length > 5) score *= 1.3;

  // Normalize score to -1..1
  const normalizedScore = wordCount > 0 ? Math.max(-1, Math.min(1, score / Math.sqrt(wordCount))) : 0;

  // Detect emotions
  const emotions: string[] = [];
  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) {
      emotions.push(emotion);
    }
  }

  // Label
  let label: SentimentResult["label"];
  if (normalizedScore <= -0.6) label = "very_negative";
  else if (normalizedScore <= -0.2) label = "negative";
  else if (normalizedScore >= 0.6) label = "very_positive";
  else if (normalizedScore >= 0.2) label = "positive";
  else label = "neutral";

  return {
    score: Math.round(normalizedScore * 100) / 100,
    label,
    confidence: wordCount > 0 ? Math.min(0.9, 0.5 + wordCount * 0.1) : 0.3,
    emotions,
  };
}

export function getToneAdjustment(sentiment: SentimentResult): string {
  if (sentiment.emotions.includes("anger") || sentiment.emotions.includes("frustration")) {
    return "The user seems frustrated. Be extra patient, empathetic, and solution-focused. Acknowledge their frustration before offering help.";
  }
  if (sentiment.label === "very_negative" || sentiment.label === "negative") {
    return "The user seems unhappy. Use a warm, supportive tone. Focus on resolving their concern quickly.";
  }
  if (sentiment.emotions.includes("sadness")) {
    return "The user seems sad. Be gentle and supportive in your response.";
  }
  if (sentiment.label === "very_positive" || sentiment.label === "positive") {
    return "The user is in a good mood. Match their energy with an upbeat, friendly tone.";
  }
  return "";
}
