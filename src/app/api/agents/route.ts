import { NextRequest } from "next/server";
import { orchestrateAgents, planAndExecute } from "@/server/ai/agents";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, agents, mode } = body;

  if (!query) return Response.json({ error: "query required" }, { status: 400 });

  try {
    if (mode === "plan") {
      const result = await planAndExecute(query);
      return Response.json(result);
    }

    const agentTypes = agents || ["researcher", "analyst"];
    const tasks = await orchestrateAgents(query, agentTypes);
    return Response.json({ tasks });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Agent execution failed" },
      { status: 500 }
    );
  }
}
