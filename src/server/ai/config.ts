import { getDb } from "../db";
import type { BotConfig } from "../types";

export function getBotConfig(): BotConfig {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM bot_config").all() as Array<{ key: string; value: string }>;

  const config: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      config[row.key] = JSON.parse(row.value);
    } catch {
      config[row.key] = row.value;
    }
  }

  return {
    bot_name: (config.bot_name as string) || "Ultra",
    bot_avatar: (config.bot_avatar as string) || "/bot-avatar.png",
    bot_tone: (config.bot_tone as string) || "professional",
    greeting: (config.greeting as string) || "Hello! How can I help you?",
    max_context_messages: (config.max_context_messages as number) || 50,
    enable_sentiment: config.enable_sentiment !== false,
    enable_memory: config.enable_memory !== false,
    enable_rag: config.enable_rag !== false,
    enable_self_correction: config.enable_self_correction !== false,
    supported_languages: (config.supported_languages as string[]) || ["en"],
  };
}

export function updateBotConfig(key: string, value: unknown): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO bot_config (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(
    key,
    JSON.stringify(value)
  );
}
