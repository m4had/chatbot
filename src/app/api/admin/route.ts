import { NextRequest } from "next/server";
import { getBotConfig, updateBotConfig } from "@/server/ai/config";

export async function GET() {
  try {
    const config = getBotConfig();
    return Response.json(config);
  } catch (error) {
    return Response.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  try {
    for (const [key, value] of Object.entries(body)) {
      updateBotConfig(key, value);
    }
    const config = getBotConfig();
    return Response.json(config);
  } catch (error) {
    return Response.json({ error: "Failed to update config" }, { status: 500 });
  }
}
