import { NextRequest } from "next/server";
import { createHandoff, getPendingHandoffs, assignHandoff, resolveHandoff } from "@/server/ai/handoff";

export async function GET() {
  const handoffs = getPendingHandoffs();
  return Response.json({ handoffs });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id, user_id, reason, priority } = body;

  if (!session_id || !user_id) return Response.json({ error: "session_id and user_id required" }, { status: 400 });

  const handoff = createHandoff(session_id, user_id, reason || "User requested", priority || 0);
  return Response.json({ handoff });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { handoff_id, action, agent_id } = body;

  if (!handoff_id || !action) return Response.json({ error: "handoff_id and action required" }, { status: 400 });

  if (action === "assign") {
    assignHandoff(handoff_id, agent_id);
  } else if (action === "resolve") {
    resolveHandoff(handoff_id);
  }

  return Response.json({ success: true });
}
