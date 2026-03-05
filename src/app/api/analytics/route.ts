import { NextRequest } from "next/server";
import { getAnalyticsSummary } from "@/server/ai/analytics";

export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get("days") || "30");
  try {
    const summary = getAnalyticsSummary(days);
    return Response.json(summary);
  } catch (error) {
    return Response.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
