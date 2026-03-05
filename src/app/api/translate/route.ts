import { NextRequest } from "next/server";
import { translateText, detectLanguage, SUPPORTED_LANGUAGES } from "@/server/ai/translate";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, target, source } = body;

  if (!text || !target) return Response.json({ error: "text and target required" }, { status: 400 });

  const result = await translateText(text, target, source || "auto");
  return Response.json(result);
}

export async function GET() {
  return Response.json({ languages: SUPPORTED_LANGUAGES });
}
