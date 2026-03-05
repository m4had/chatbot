# 🤖 Ultra Chatbot

An ultra-advanced AI chatbot platform built with Next.js 14, featuring multi-model AI, RAG, multi-agent orchestration, sentiment analysis, and 50+ enterprise features.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Chat UI  │ │ Dashboard │ │Flow Builder│ │  Settings  │  │
│  │ Voice/TTS│ │ Analytics │ │ No-Code    │ │  Persona   │  │
│  │ Markdown │ │ Charts    │ │ Drag&Drop  │ │  Toggles   │  │
│  └────┬─────┘ └─────┬─────┘ └─────┬──────┘ └─────┬──────┘  │
│       └──────────────┴─────────────┴──────────────┘         │
│                          API Routes                         │
├─────────────────────────────────────────────────────────────┤
│                        BACKEND                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   AI Router                            │  │
│  │  OpenAI ◄──► Anthropic ◄──► Google (fallback chain)    │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                     │
│  ┌──────────┐ ┌───────┴──────┐ ┌──────────┐ ┌───────────┐  │
│  │Sentiment │ │Multi-Agent   │ │   RAG    │ │  Memory   │  │
│  │Analysis  │ │Orchestration │ │ Pipeline │ │  Store    │  │
│  │          │ │Researcher    │ │ FTS5     │ │  SQLite   │  │
│  │Tone Adj. │ │Editor/Coder  │ │ Chunks   │ │  Per-User │  │
│  └──────────┘ │Analyst       │ └──────────┘ └───────────┘  │
│               └──────────────┘                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │  PII     │ │  Self-   │ │ Intent   │ │  Handoff     │   │
│  │Redaction │ │Correction│ │Recognitn │ │  System      │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │Analytics │ │Translate │ │Compliance│                    │
│  │Engine    │ │80+ langs │ │GDPR/HIPAA│                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
├─────────────────────────────────────────────────────────────┤
│                     SQLite (WAL mode)                       │
│  users │ sessions │ messages │ memories │ documents │ ...   │
└─────────────────────────────────────────────────────────────┘
```

## Features (50+)

### 🧠 Core AI
- **Multi-Model Router** — OpenAI, Anthropic, Google with automatic fallback
- **Deep Reasoning Mode** — Switches models for complex logic tasks
- **RAG Pipeline** — FTS5-powered document search, chunking, citation
- **Self-Correction** — Validates responses against knowledge base
- **Long-Term Memory** — Per-user SQLite store, auto-extracts preferences
- **Sentiment Analysis** — Keyword + pattern emotion detection, tone adjustment
- **Multi-Intent Recognition** — Parses compound sentences into multiple intents
- **Adaptive Learning** — Memory confidence scoring improves over time

### 🤝 Agentic Capabilities
- **Multi-Agent Orchestration** — Researcher, Editor, Coder, Analyst sub-agents
- **Autonomous Task Execution** — Goal decomposition into sub-task chains
- **Multi-Step Planning** — Analyst decomposes goals, agents execute in sequence
- **Human Handoff** — Auto-escalation with full context transfer
- **API Interoperability** — Extensible webhook/API architecture

### 💬 User Experience
- **Beautiful Chat UI** — Dark/light mode, typing indicators, message threading
- **Rich Markdown** — Code blocks, tables, links rendered in chat
- **Voice Input/Output** — Web Speech API for hands-free interaction
- **Real-Time Translation** — 80+ languages via LibreTranslate
- **Interactive Suggestions** — Quick-reply buttons and prompt suggestions
- **Accessibility** — Keyboard navigation, screen reader support
- **Persona Customization** — Name, avatar, tone configuration
- **Message Actions** — Copy, read aloud, thumbs up/down feedback

### 📊 Admin & Analytics
- **Real-Time Dashboard** — KPIs, volume charts, sentiment trends
- **No-Code Flow Builder** — Visual drag-and-drop conversation design
- **Settings Panel** — Toggle features, configure persona, manage security
- **Intent Analytics** — Track top user intents over time

### 🔒 Security & Compliance
- **PII Redaction** — Auto-strips SSN, email, phone, credit cards from logs
- **GDPR Compliance** — Data export (Art. 20) and deletion (Art. 17) endpoints
- **Content Filtering** — Compliance guardrails built-in
- **Encrypted Data** — SQLite WAL mode, secure by default

## Quick Start

### Prerequisites
- Node.js 18+ 
- At least one AI API key (OpenAI, Anthropic, or Google)

### Setup

```bash
# Clone and install
git clone <repo-url> ultra-chatbot
cd ultra-chatbot
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with your API keys

# Initialize database
npx tsx src/server/db/init.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker

```bash
cp .env.example .env.local
# Edit .env.local
docker compose up -d
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Streaming chat (SSE) |
| `/api/memory` | GET/POST/DELETE | User memory CRUD |
| `/api/agents` | POST | Multi-agent task execution |
| `/api/analytics` | GET | Dashboard analytics |
| `/api/admin` | GET/PUT | Bot configuration |
| `/api/translate` | GET/POST | Translation |
| `/api/rag` | GET/POST/DELETE | Document ingestion & search |
| `/api/handoff` | GET/POST/PUT | Human escalation queue |
| `/api/compliance` | GET/DELETE | GDPR data export & deletion |

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **AI:** Vercel AI SDK (OpenAI, Anthropic, Google)
- **Database:** SQLite + better-sqlite3 (WAL mode)
- **Search:** FTS5 full-text search
- **Voice:** Web Speech API
- **Translation:** LibreTranslate

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main chat UI
│   ├── admin/page.tsx        # Analytics dashboard
│   ├── flows/page.tsx        # No-code flow builder
│   ├── settings/page.tsx     # Bot configuration
│   └── api/
│       ├── chat/route.ts     # Streaming chat endpoint
│       ├── memory/route.ts   # Memory CRUD
│       ├── agents/route.ts   # Multi-agent orchestration
│       ├── analytics/route.ts
│       ├── admin/route.ts
│       ├── translate/route.ts
│       ├── rag/route.ts
│       ├── handoff/route.ts
│       └── compliance/route.ts
├── server/
│   ├── types.ts              # TypeScript interfaces
│   ├── db/                   # SQLite database layer
│   └── ai/
│       ├── router.ts         # Multi-model AI router
│       ├── sentiment.ts      # Sentiment analysis
│       ├── intent.ts         # Multi-intent recognition
│       ├── memory.ts         # Long-term memory store
│       ├── rag.ts            # RAG pipeline
│       ├── agents.ts         # Multi-agent orchestration
│       ├── pii.ts            # PII redaction
│       ├── self-correction.ts
│       ├── translate.ts      # Translation service
│       ├── analytics.ts      # Analytics engine
│       ├── handoff.ts        # Human escalation
│       └── config.ts         # Bot configuration
├── components/
│   ├── theme-provider.tsx
│   └── ui/                   # shadcn/ui components
└── lib/
    └── utils.ts
```

## License

MIT
