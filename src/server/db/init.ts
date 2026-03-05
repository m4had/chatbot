import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "ultra-chatbot.db");

export function getDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function initDatabase(): void {
  const db = getDb();

  db.exec(`
    -- User sessions and identity
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now')),
      metadata TEXT DEFAULT '{}'
    );

    -- Conversation sessions
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel TEXT DEFAULT 'web',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      metadata TEXT DEFAULT '{}',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Chat messages
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      sentiment_score REAL,
      sentiment_label TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    -- Long-term user memory
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      source TEXT DEFAULT 'conversation',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- RAG document store
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT NOT NULL,
      source TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- RAG document chunks for search
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      content TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      embedding_text TEXT,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    );

    -- FTS5 for full-text search on chunks
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
      content,
      content='document_chunks',
      content_rowid='rowid'
    );

    -- Analytics events
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      session_id TEXT,
      user_id TEXT,
      data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Bot configuration
    CREATE TABLE IF NOT EXISTS bot_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Conversation flows (no-code builder)
    CREATE TABLE IF NOT EXISTS flows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      nodes TEXT NOT NULL DEFAULT '[]',
      edges TEXT NOT NULL DEFAULT '[]',
      active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Human handoff queue
    CREATE TABLE IF NOT EXISTS handoff_queue (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT,
      priority INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'resolved')),
      assigned_to TEXT,
      context TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    -- Insert default bot config
    INSERT OR IGNORE INTO bot_config (key, value) VALUES
      ('bot_name', '"Ultra"'),
      ('bot_avatar', '"/bot-avatar.png"'),
      ('bot_tone', '"professional"'),
      ('greeting', '"Hello! I''m Ultra, your AI assistant. How can I help you today?"'),
      ('max_context_messages', '50'),
      ('enable_sentiment', 'true'),
      ('enable_memory', 'true'),
      ('enable_rag', 'true'),
      ('enable_self_correction', 'true'),
      ('supported_languages', '["en","es","fr","de","zh","ja","ko","ar","pt","ru","hi","it","nl","pl","tr","sv","da","no","fi","el","he","th","vi","id","ms","uk","cs","ro","hu","bg","hr","sk","sl","lt","lv","et","mt","ga","cy","is","mk","sq","bs","sr","ka","hy","az","kk","uz","tg","ky","mn","my","km","lo","si"]');
  `);

  db.close();
  console.log("Database initialized at", DB_PATH);
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}
