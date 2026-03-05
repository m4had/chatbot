"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3, MessageSquare, Users, TrendingUp, Clock, AlertTriangle,
  ArrowLeft, RefreshCw, Sparkles, Shield, Brain, Zap,
} from "lucide-react";

interface Analytics {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerSession: number;
  sentimentDistribution: Record<string, number>;
  topIntents: Array<{ intent: string; count: number }>;
  dailyVolume: Array<{ date: string; count: number }>;
  avgResponseTime: number;
  resolutionRate: number;
  handoffRate: number;
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?days=${days}`);
      const data = await res.json();
      setAnalytics(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchAnalytics(); }, [days]);

  const sentimentColors: Record<string, string> = {
    very_positive: "bg-green-500",
    positive: "bg-green-400",
    neutral: "bg-gray-400",
    negative: "bg-orange-400",
    very_negative: "bg-red-500",
  };

  const maxVolume = analytics?.dailyVolume ? Math.max(...analytics.dailyVolume.map((d) => d.count), 1) : 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="p-2 rounded-md hover:bg-accent">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">Analytics Dashboard</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-sm bg-background border rounded px-3 py-1.5"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversations</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalConversations ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalMessages ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.avgResponseTime ?? 0}ms</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Handoff Rate</CardTitle>
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.handoffRate ?? 0}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-40">
                {analytics?.dailyVolume?.length ? (
                  analytics.dailyVolume.slice(-30).map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary rounded-t min-h-[2px] transition-all"
                        style={{ height: `${(d.count / maxVolume) * 100}%` }}
                        title={`${d.date}: ${d.count} messages`}
                      />
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    No data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sentiment Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics?.sentimentDistribution ?? {}).map(([label, count]) => {
                  const total = Object.values(analytics?.sentimentDistribution ?? {}).reduce((a, b) => a + b, 1);
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{label.replace("_", " ")}</span>
                        <span>{pct}% ({count})</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${sentimentColors[label] || "bg-gray-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {!analytics?.sentimentDistribution || Object.keys(analytics.sentimentDistribution).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sentiment data yet</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Top Intents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Intents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics?.topIntents?.length ? (
                  analytics.topIntents.map((intent, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="capitalize flex items-center gap-2">
                        <Zap className="w-3 h-3 text-primary" />
                        {intent.intent}
                      </span>
                      <span className="text-muted-foreground">{intent.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No intent data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { icon: Sparkles, label: "AI Engine", status: "Online", color: "text-green-500" },
                  { icon: Brain, label: "Memory System", status: "Active", color: "text-green-500" },
                  { icon: Shield, label: "PII Redaction", status: "Enabled", color: "text-green-500" },
                  { icon: TrendingUp, label: "RAG Pipeline", status: "Ready", color: "text-green-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      {item.label}
                    </span>
                    <span className={`flex items-center gap-1 ${item.color}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
