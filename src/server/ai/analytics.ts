import { getDb } from "../db";
import { v4 as uuid } from "uuid";

export function trackEvent(
  eventType: string,
  data: Record<string, unknown> = {},
  sessionId?: string,
  userId?: string
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO analytics (event_type, session_id, user_id, data) VALUES (?, ?, ?, ?)"
  ).run(eventType, sessionId ?? null, userId ?? null, JSON.stringify(data));
}

export function getAnalyticsSummary(days = 30): {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerSession: number;
  sentimentDistribution: Record<string, number>;
  topIntents: Array<{ intent: string; count: number }>;
  dailyVolume: Array<{ date: string; count: number }>;
  avgResponseTime: number;
  resolutionRate: number;
  handoffRate: number;
} {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const totalConversations = (
    db.prepare("SELECT COUNT(DISTINCT session_id) as c FROM messages WHERE created_at >= ?").get(since) as { c: number }
  ).c;

  const totalMessages = (
    db.prepare("SELECT COUNT(*) as c FROM messages WHERE created_at >= ?").get(since) as { c: number }
  ).c;

  const avgMessagesPerSession = totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0;

  // Sentiment distribution
  const sentimentRows = db
    .prepare(
      "SELECT sentiment_label, COUNT(*) as c FROM messages WHERE sentiment_label IS NOT NULL AND created_at >= ? GROUP BY sentiment_label"
    )
    .all(since) as Array<{ sentiment_label: string; c: number }>;

  const sentimentDistribution: Record<string, number> = {};
  for (const row of sentimentRows) {
    sentimentDistribution[row.sentiment_label] = row.c;
  }

  // Top intents from analytics events
  const intentRows = db
    .prepare(
      `SELECT json_extract(data, '$.intent') as intent, COUNT(*) as c
       FROM analytics WHERE event_type = 'intent_detected' AND created_at >= ?
       GROUP BY intent ORDER BY c DESC LIMIT 10`
    )
    .all(since) as Array<{ intent: string; c: number }>;

  const topIntents = intentRows.map((r) => ({ intent: r.intent, count: r.c }));

  // Daily volume
  const dailyRows = db
    .prepare(
      "SELECT date(created_at) as date, COUNT(*) as c FROM messages WHERE created_at >= ? GROUP BY date(created_at) ORDER BY date"
    )
    .all(since) as Array<{ date: string; c: number }>;

  const dailyVolume = dailyRows.map((r) => ({ date: r.date, count: r.c }));

  // Response time from analytics
  const avgTimeRow = db
    .prepare(
      `SELECT AVG(CAST(json_extract(data, '$.response_time_ms') AS REAL)) as avg_time
       FROM analytics WHERE event_type = 'response_sent' AND created_at >= ?`
    )
    .get(since) as { avg_time: number | null };

  // Handoff rate
  const handoffs = (
    db.prepare("SELECT COUNT(*) as c FROM handoff_queue WHERE created_at >= ?").get(since) as { c: number }
  ).c;

  const resolved = (
    db.prepare(
      "SELECT COUNT(*) as c FROM handoff_queue WHERE status = 'resolved' AND created_at >= ?"
    ).get(since) as { c: number }
  ).c;

  return {
    totalConversations,
    totalMessages,
    avgMessagesPerSession,
    sentimentDistribution,
    topIntents,
    dailyVolume,
    avgResponseTime: Math.round(avgTimeRow.avg_time ?? 0),
    resolutionRate: totalConversations > 0 ? Math.round((resolved / Math.max(handoffs, 1)) * 100) : 0,
    handoffRate: totalConversations > 0 ? Math.round((handoffs / totalConversations) * 100) : 0,
  };
}
