import { NextRequest } from "next/server";
import { memoryStore } from "@/server/ai/memory";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  const category = req.nextUrl.searchParams.get("category") || undefined;
  const query = req.nextUrl.searchParams.get("q") || undefined;

  if (!userId) return Response.json({ error: "user_id required" }, { status: 400 });

  if (query) {
    const results = memoryStore.search(userId, query);
    return Response.json({ memories: results });
  }

  const memories = memoryStore.getByUser(userId, category);
  return Response.json({ memories });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, category, key, value, source } = body;

  if (!user_id || !category || !key || !value) {
    return Response.json({ error: "user_id, category, key, and value required" }, { status: 400 });
  }

  const memory = memoryStore.store(user_id, category, key, value, source);
  return Response.json({ memory });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const userId = req.nextUrl.searchParams.get("user_id");

  if (id) {
    const deleted = memoryStore.delete(id);
    return Response.json({ deleted });
  }

  if (userId) {
    const count = memoryStore.deleteByUser(userId);
    return Response.json({ deleted: count });
  }

  return Response.json({ error: "id or user_id required" }, { status: 400 });
}
