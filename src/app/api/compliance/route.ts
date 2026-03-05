import { NextRequest } from "next/server";
import { getDb } from "@/server/db";
import { memoryStore } from "@/server/ai/memory";

// GDPR compliance endpoints

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  const action = req.nextUrl.searchParams.get("action");

  if (!userId) return Response.json({ error: "user_id required" }, { status: 400 });

  if (action === "export") {
    // Data export (GDPR Article 20 - Right to data portability)
    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    const sessions = db.prepare("SELECT * FROM sessions WHERE user_id = ?").all(userId);
    const messages = db.prepare(
      "SELECT m.* FROM messages m JOIN sessions s ON m.session_id = s.id WHERE s.user_id = ?"
    ).all(userId);
    const memories = memoryStore.getByUser(userId);

    return Response.json({
      user,
      sessions,
      messages,
      memories,
      exported_at: new Date().toISOString(),
    });
  }

  return Response.json({ error: "action=export required" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");

  if (!userId) return Response.json({ error: "user_id required" }, { status: 400 });

  // GDPR Article 17 - Right to erasure
  const db = getDb();

  const transaction = db.transaction(() => {
    // Delete messages
    db.prepare(
      "DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)"
    ).run(userId);
    // Delete analytics
    db.prepare("DELETE FROM analytics WHERE user_id = ?").run(userId);
    // Delete handoffs
    db.prepare("DELETE FROM handoff_queue WHERE user_id = ?").run(userId);
    // Delete sessions
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    // Delete memories
    memoryStore.deleteByUser(userId);
    // Delete user
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });

  transaction();

  return Response.json({
    deleted: true,
    user_id: userId,
    deleted_at: new Date().toISOString(),
  });
}
