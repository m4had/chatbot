"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Bot, Palette, Shield, Brain, Globe } from "lucide-react";

export default function SettingsPage() {
  const [config, setConfig] = useState({
    bot_name: "Ultra",
    bot_avatar: "/bot-avatar.png",
    bot_tone: "professional",
    greeting: "Hello! How can I help you?",
    max_context_messages: 50,
    enable_sentiment: true,
    enable_memory: true,
    enable_rag: true,
    enable_self_correction: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="p-2 rounded-md hover:bg-accent"><ArrowLeft className="w-4 h-4" /></a>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Persona */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" /> Persona</CardTitle>
            <CardDescription>Customize your chatbot&apos;s identity and personality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Bot Name</label>
              <Input value={config.bot_name} onChange={(e) => setConfig((c) => ({ ...c, bot_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Tone</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={config.bot_tone}
                onChange={(e) => setConfig((c) => ({ ...c, bot_tone: e.target.value }))}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="empathetic">Empathetic</option>
                <option value="technical">Technical</option>
                <option value="witty">Witty</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Greeting Message</label>
              <textarea
                value={config.greeting}
                onChange={(e) => setConfig((c) => ({ ...c, greeting: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5" /> AI Features</CardTitle>
            <CardDescription>Toggle advanced AI capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "enable_sentiment", label: "Sentiment Analysis", desc: "Detect user emotions and adjust tone" },
              { key: "enable_memory", label: "Long-Term Memory", desc: "Remember user preferences across sessions" },
              { key: "enable_rag", label: "RAG (Knowledge Base)", desc: "Ground responses in verified documents" },
              { key: "enable_self_correction", label: "Self-Correction", desc: "Validate and fix factual errors" },
            ].map((feature) => (
              <div key={feature.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{feature.label}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
                <button
                  onClick={() => setConfig((c) => ({ ...c, [feature.key]: !c[feature.key as keyof typeof c] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    config[feature.key as keyof typeof config] ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      config[feature.key as keyof typeof config] ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
            ))}
            <div>
              <label className="text-sm font-medium">Max Context Messages</label>
              <Input
                type="number"
                value={config.max_context_messages}
                onChange={(e) => setConfig((c) => ({ ...c, max_context_messages: parseInt(e.target.value) || 50 }))}
                className="mt-1 w-32"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Security & Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>PII Redaction</span>
              <span className="text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Always On</span>
            </div>
            <div className="flex items-center justify-between">
              <span>GDPR Data Deletion</span>
              <span className="text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Available</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Content Filtering</span>
              <span className="text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Enabled</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
