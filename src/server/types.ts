export interface User {
  id: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface Session {
  id: string;
  user_id: string;
  channel: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata: Record<string, unknown>;
  sentiment_score?: number;
  sentiment_label?: string;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
  source: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface Document {
  id: string;
  title?: string;
  content: string;
  source?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  embedding_text?: string;
}

export interface AnalyticsEvent {
  id: number;
  event_type: string;
  session_id?: string;
  user_id?: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface HandoffRequest {
  id: string;
  session_id: string;
  user_id: string;
  reason?: string;
  priority: number;
  status: "pending" | "assigned" | "resolved";
  assigned_to?: string;
  context?: string;
  created_at: string;
  resolved_at?: string;
}

export interface BotConfig {
  bot_name: string;
  bot_avatar: string;
  bot_tone: string;
  greeting: string;
  max_context_messages: number;
  enable_sentiment: boolean;
  enable_memory: boolean;
  enable_rag: boolean;
  enable_self_correction: boolean;
  supported_languages: string[];
}

export interface SentimentResult {
  score: number;
  label: "very_negative" | "negative" | "neutral" | "positive" | "very_positive";
  confidence: number;
  emotions: string[];
}

export interface Intent {
  name: string;
  confidence: number;
  entities: Record<string, string>;
}

export interface AgentTask {
  id: string;
  type: "researcher" | "editor" | "coder" | "analyst";
  prompt: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  user_id?: string;
  channel?: string;
  language?: string;
  attachments?: Array<{
    type: "image" | "audio" | "video" | "file";
    url: string;
    name?: string;
  }>;
}

export interface ChatResponse {
  message: string;
  session_id: string;
  message_id: string;
  sentiment?: SentimentResult;
  intents?: Intent[];
  sources?: Array<{ title: string; url?: string; snippet: string }>;
  suggestions?: string[];
  actions?: Array<{ label: string; type: string; payload: unknown }>;
  translation?: { original: string; language: string };
  metadata?: Record<string, unknown>;
}
