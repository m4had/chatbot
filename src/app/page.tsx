"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, Mic, MicOff, Sun, Moon, Globe, Bot, User, Settings, BarChart3,
  Workflow, Sparkles, Shield, Brain, Loader2, Volume2, VolumeX, Menu, X,
  ChevronRight, AlertTriangle, ThumbsUp, ThumbsDown, Copy, RotateCcw,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  sentiment?: { label: string; score: number; emotions: string[] };
  sources?: Array<{ title: string; url?: string; snippet: string }>;
  intents?: Array<{ name: string; confidence: number }>;
  isStreaming?: boolean;
}

const SIDEBAR_LINKS = [
  { label: "Chat", icon: Bot, href: "/" },
  { label: "Dashboard", icon: BarChart3, href: "/admin" },
  { label: "Flow Builder", icon: Workflow, href: "/flows" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [userId] = useState(() => typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [translateTo, setTranslateTo] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [botConfig, setBotConfig] = useState({ bot_name: "Ultra", bot_tone: "professional" });

  const { theme, setTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Voice input setup
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results).map((r) => r[0].transcript).join("");
        setInput(transcript);
        if (event.results[0].isFinal) setIsListening(false);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    if (isSpeaking) { speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`_~\[\]]/g, ""));
    utterance.rate = 1;
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    speechSynthesis.speak(utterance);
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const sendMessage = async (content?: string) => {
    const messageText = content || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          session_id: sessionId || undefined,
          user_id: userId,
          language: translateTo || undefined,
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let metadata: Record<string, unknown> = {};

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(Boolean);

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "text") {
                  fullContent += parsed.content;
                  setMessages((prev) =>
                    prev.map((m) => m.id === assistantMessage.id ? { ...m, content: fullContent } : m)
                  );
                } else if (parsed.type === "metadata") {
                  metadata = parsed;
                  if (!sessionId && parsed.session_id) setSessionId(parsed.session_id);
                }
              } catch { /* skip malformed chunks */ }
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? {
                ...m,
                content: fullContent || "I'm sorry, I couldn't generate a response. Please try again.",
                isStreaming: false,
                sentiment: metadata.sentiment as ChatMessage["sentiment"],
                sources: metadata.sources as ChatMessage["sources"],
                intents: metadata.intents as ChatMessage["intents"],
              }
            : m
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, content: "Sorry, something went wrong. Please check your API keys and try again.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label) {
      case "very_positive": case "positive": return "text-green-500";
      case "very_negative": case "negative": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-50 w-64 h-full bg-card border-r transition-transform duration-200 flex flex-col`}>
        <div className="p-4 border-b flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">{botConfig.bot_name}</h1>
            <p className="text-xs text-muted-foreground">AI Chatbot</p>
          </div>
          <button className="md:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {SIDEBAR_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent ${
                link.href === "/" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </a>
          ))}
        </nav>

        <div className="p-4 border-t space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>End-to-end encrypted</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Brain className="w-3 h-3" />
            <span>Memory & RAG enabled</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Translation toggle */}
            <select
              className="text-xs bg-transparent border rounded px-2 py-1"
              value={translateTo}
              onChange={(e) => setTranslateTo(e.target.value)}
              aria-label="Translation language"
            >
              <option value="">No translation</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="ar">Arabic</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="hi">Hindi</option>
            </select>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-20">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Welcome to {botConfig.bot_name}</h2>
                <p className="text-muted-foreground max-w-md">
                  Your ultra-advanced AI assistant with deep reasoning, multi-agent orchestration, RAG, and real-time intelligence.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {[
                  "What can you do?",
                  "Analyze market trends for AAPL",
                  "Help me write a business plan",
                  "Research quantum computing advances",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="text-left text-sm p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 inline mr-1 text-primary" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[80%] space-y-2 ${message.role === "user" ? "order-first" : ""}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border rounded-bl-md"
                    }`}
                  >
                    {message.isStreaming && !message.content ? (
                      <div className="flex gap-1 py-1">
                        <span className="typing-dot w-2 h-2 rounded-full bg-current opacity-60" />
                        <span className="typing-dot w-2 h-2 rounded-full bg-current opacity-60" />
                        <span className="typing-dot w-2 h-2 rounded-full bg-current opacity-60" />
                      </div>
                    ) : message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>

                  {/* Message actions */}
                  {message.role === "assistant" && message.content && !message.isStreaming && (
                    <div className="flex items-center gap-1 px-1">
                      <button onClick={() => copyMessage(message.content)} className="p-1 rounded hover:bg-accent" title="Copy">
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button onClick={() => speakText(message.content)} className="p-1 rounded hover:bg-accent" title="Read aloud">
                        {isSpeaking ? <VolumeX className="w-3 h-3 text-muted-foreground" /> : <Volume2 className="w-3 h-3 text-muted-foreground" />}
                      </button>
                      <button className="p-1 rounded hover:bg-accent" title="Good response">
                        <ThumbsUp className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button className="p-1 rounded hover:bg-accent" title="Bad response">
                        <ThumbsDown className="w-3 h-3 text-muted-foreground" />
                      </button>
                      {message.sentiment && (
                        <span className={`text-xs ml-2 ${getSentimentColor(message.sentiment.label)}`}>
                          {message.sentiment.emotions?.[0] || message.sentiment.label}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-1">
                      {message.sources.map((source, i) => (
                        <Badge key={i} variant="secondary" className="text-xs cursor-pointer" title={source.snippet}>
                          📄 {source.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px] max-h-[200px]"
                  rows={1}
                  disabled={isLoading}
                  aria-label="Chat message input"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 bottom-1 h-8 w-8"
                  onClick={toggleVoice}
                  disabled={!recognitionRef.current}
                  aria-label={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-muted-foreground" />}
                </Button>
              </div>
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-12 w-12 rounded-xl"
                aria-label="Send message"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              {botConfig.bot_name} can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
