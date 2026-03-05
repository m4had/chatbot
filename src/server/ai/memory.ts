import { getDb } from "../db";
import { v4 as uuid } from "uuid";
import type { Memory } from "../types";

export class MemoryStore {
  store(userId: string, category: string, key: string, value: string, source = "conversation"): Memory {
    const db = getDb();
    const id = uuid();
    const existing = db
      .prepare("SELECT id FROM memories WHERE user_id = ? AND category = ? AND key = ?")
      .get(userId, category, key) as { id: string } | undefined;

    if (existing) {
      db.prepare(
        "UPDATE memories SET value = ?, confidence = MIN(confidence + 0.1, 1.0), updated_at = datetime('now') WHERE id = ?"
      ).run(value, existing.id);
      return this.get(existing.id)!;
    }

    db.prepare(
      "INSERT INTO memories (id, user_id, category, key, value, source) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, userId, category, key, value, source);

    return this.get(id)!;
  }

  get(id: string): Memory | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM memories WHERE id = ?").get(id) as Memory | undefined;
    return row ?? null;
  }

  getByUser(userId: string, category?: string): Memory[] {
    const db = getDb();
    if (category) {
      return db
        .prepare("SELECT * FROM memories WHERE user_id = ? AND category = ? ORDER BY updated_at DESC")
        .all(userId, category) as Memory[];
    }
    return db
      .prepare("SELECT * FROM memories WHERE user_id = ? ORDER BY updated_at DESC")
      .all(userId) as Memory[];
  }

  search(userId: string, query: string): Memory[] {
    const db = getDb();
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const results = db
      .prepare("SELECT * FROM memories WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100")
      .all(userId) as Memory[];

    return results
      .map((m) => {
        const text = `${m.category} ${m.key} ${m.value}`.toLowerCase();
        const matchCount = words.filter((w) => text.includes(w)).length;
        return { memory: m, score: matchCount / words.length };
      })
      .filter((r) => r.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.memory);
  }

  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare("DELETE FROM memories WHERE id = ?").run(id);
    return result.changes > 0;
  }

  deleteByUser(userId: string): number {
    const db = getDb();
    const result = db.prepare("DELETE FROM memories WHERE user_id = ?").run(userId);
    return result.changes;
  }

  buildContextString(userId: string): string {
    const memories = this.getByUser(userId);
    if (memories.length === 0) return "";

    const grouped: Record<string, string[]> = {};
    for (const m of memories) {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(`${m.key}: ${m.value}`);
    }

    let context = "\n\n[User Memory Context]\n";
    for (const [category, items] of Object.entries(grouped)) {
      context += `\n${category}:\n`;
      for (const item of items.slice(0, 10)) {
        context += `- ${item}\n`;
      }
    }
    return context;
  }

  extractAndStore(userId: string, message: string): void {
    // Auto-extract preferences and facts from conversation
    const patterns: Array<{ category: string; pattern: RegExp; keyGroup: number; valueGroup: number }> = [
      { category: "preferences", pattern: /(?:i (?:like|love|prefer|enjoy))\s+(.+?)(?:\.|$)/i, keyGroup: 0, valueGroup: 1 },
      { category: "preferences", pattern: /(?:my favorite\s+(\w+)\s+is)\s+(.+?)(?:\.|$)/i, keyGroup: 1, valueGroup: 2 },
      { category: "personal", pattern: /(?:my name is|i'm|i am)\s+([A-Z][a-z]+)/i, keyGroup: 0, valueGroup: 1 },
      { category: "personal", pattern: /(?:i live in|i'm from|i am from)\s+(.+?)(?:\.|$)/i, keyGroup: 0, valueGroup: 1 },
      { category: "work", pattern: /(?:i work (?:at|for|in))\s+(.+?)(?:\.|$)/i, keyGroup: 0, valueGroup: 1 },
      { category: "interests", pattern: /(?:i'm interested in|i'm passionate about)\s+(.+?)(?:\.|$)/i, keyGroup: 0, valueGroup: 1 },
    ];

    for (const { category, pattern, keyGroup, valueGroup } of patterns) {
      const match = message.match(pattern);
      if (match) {
        const key = match[keyGroup] || category;
        const value = match[valueGroup];
        if (value && value.length > 1 && value.length < 200) {
          this.store(userId, category, key.toLowerCase().trim(), value.trim());
        }
      }
    }
  }
}

export const memoryStore = new MemoryStore();
