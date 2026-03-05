import { getDb } from "../db";
import { v4 as uuid } from "uuid";
import type { Document, DocumentChunk } from "../types";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap
      const words = current.split(/\s+/);
      current = words.slice(-CHUNK_OVERLAP).join(" ") + " " + sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function ingestDocument(title: string, content: string, source?: string, metadata: Record<string, unknown> = {}): string {
  const db = getDb();
  const docId = uuid();

  db.prepare("INSERT INTO documents (id, title, content, source, metadata) VALUES (?, ?, ?, ?, ?)").run(
    docId, title, content, source ?? null, JSON.stringify(metadata)
  );

  const chunks = chunkText(content);
  const insertChunk = db.prepare(
    "INSERT INTO document_chunks (id, document_id, content, chunk_index, embedding_text) VALUES (?, ?, ?, ?, ?)"
  );
  const insertFts = db.prepare(
    "INSERT INTO chunks_fts (rowid, content) VALUES (?, ?)"
  );

  const transaction = db.transaction(() => {
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = uuid();
      const result = insertChunk.run(chunkId, docId, chunks[i], i, chunks[i].toLowerCase());
      insertFts.run(result.lastInsertRowid, chunks[i]);
    }
  });

  transaction();
  return docId;
}

export function searchDocuments(query: string, limit = 5): Array<{ chunk: DocumentChunk; document: Document; score: number }> {
  const db = getDb();

  // FTS5 search
  const ftsQuery = query
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => `"${w}"`)
    .join(" OR ");

  if (!ftsQuery) return [];

  try {
    const results = db
      .prepare(
        `SELECT dc.*, d.title, d.source, d.metadata as doc_metadata,
                rank as score
         FROM chunks_fts fts
         JOIN document_chunks dc ON dc.rowid = fts.rowid
         JOIN documents d ON d.id = dc.document_id
         WHERE chunks_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
      )
      .all(ftsQuery, limit) as Array<DocumentChunk & { title: string; source: string; doc_metadata: string; score: number }>;

    return results.map((r) => ({
      chunk: { id: r.id, document_id: r.document_id, content: r.content, chunk_index: r.chunk_index, embedding_text: r.embedding_text ?? undefined },
      document: {
        id: r.document_id,
        title: r.title,
        content: "",
        source: r.source,
        metadata: JSON.parse(r.doc_metadata || "{}"),
        created_at: "",
      },
      score: Math.abs(r.score),
    }));
  } catch {
    return [];
  }
}

export function buildRAGContext(query: string): { context: string; sources: Array<{ title: string; url?: string; snippet: string }> } {
  const results = searchDocuments(query);
  if (results.length === 0) return { context: "", sources: [] };

  const context =
    "\n\n[Retrieved Knowledge]\n" +
    results
      .map((r, i) => `[Source ${i + 1}: ${r.document.title || "Untitled"}]\n${r.chunk.content}`)
      .join("\n\n");

  const sources = results.map((r) => ({
    title: r.document.title || "Untitled",
    url: r.document.source ?? undefined,
    snippet: r.chunk.content.slice(0, 150) + "...",
  }));

  return { context, sources };
}

export function deleteDocument(docId: string): boolean {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM chunks_fts WHERE rowid IN (SELECT rowid FROM document_chunks WHERE document_id = ?)").run(docId);
    db.prepare("DELETE FROM document_chunks WHERE document_id = ?").run(docId);
    db.prepare("DELETE FROM documents WHERE id = ?").run(docId);
  });
  transaction();
  return true;
}

export function listDocuments(): Document[] {
  const db = getDb();
  return db.prepare("SELECT id, title, source, metadata, created_at FROM documents ORDER BY created_at DESC").all() as Document[];
}
