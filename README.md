<div align="center">

# 🧠 AIOS — AI Operating System

**A modular, production-ready AI platform for voice interaction, advanced reasoning, persistent memory, intelligent automation, and multi-agent orchestration.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![Python](https://img.shields.io/badge/edge--tts-7.x-3776AB?logo=python)](https://pypi.org/project/edge-tts/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Inspired by **Jarvis** and **OpenClaw** • Built with Next.js 16, React 19, and TypeScript 5

[Features](#-features) • [Quick Start](#-quick-start) • [Configuration](#-configuration) • [Voice (Jarvis)](#-voice--jarvis) • [API Reference](#-api-reference) • [Architecture](#-architecture) • [Deployment](#-deployment)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Modules](#-modules)
- [Voice & Jarvis](#-voice--jarvis)
- [API Reference](#-api-reference)
- [AI Providers](#-ai-providers)
- [Database Schema](#-database-schema)
- [WebSocket Service](#-websocket-service)
- [Project Structure](#-project-structure)
- [Supported OS](#-supported-os)
- [Troubleshooting](#-troubleshooting)
- [Recent Fixes](#-recent-fixes)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

AIOS is a comprehensive AI Operating System that unifies conversational AI, voice interaction, multi-agent orchestration, persistent memory, visual workflows, and external service integrations into a single, cohesive platform. Whether you're building an AI assistant, automating complex workflows, or orchestrating teams of specialized agents, AIOS provides the infrastructure to do it all.

### Why AIOS?

| Capability | Description |
|---|---|
| 🗣️ **Voice-First** | High-quality Jarvis-like neural TTS via edge-tts + wake word "Fred" |
| 🧠 **Persistent Memory** | 11 memory types across short-term, long-term, procedural, and more |
| 🤖 **Multi-Agent** | 14 specialized agent types working in concert |
| 🔌 **Extensible** | 12 pre-configured plugins + 12 integration types + custom MCP |
| 🔒 **Secure** | 5 autonomy levels with granular permission matrices |
| 📊 **Observable** | Real-time monitoring, audit logging, and health dashboards |
| 🔄 **Visual Workflows** | Drag-and-drop workflow engine with 7 node types |
| 🌐 **Multi-Provider** | 7 AI providers with seamless switching (Z-AI, Mistral, OpenAI, etc.) |
| 🐉 **Kali Linux** | Full support for Kali Linux, Parrot OS, and other Debian derivatives |

---

## ✨ Features

- **AI Chat** — Full-featured conversational AI with system prompt presets, model selection, markdown rendering, syntax-highlighted code blocks, and automatic retry with exponential backoff
- **Voice Interaction (Jarvis)** — Wake word "Fred", edge-tts neural voices (en-GB-RyanNeural), always-listening mode, speech-to-text transcription
- **Multi-Agent Orchestration** — 14 specialized agent types (Coder, Researcher, Planner, Reviewer, Tester, etc.) coordinated for complex tasks
- **Persistent Memory** — 11 memory types ensuring context is never lost across sessions
- **Visual Workflows** — Drag-and-drop workflow builder with 7 node types for automating complex processes
- **Real-Time Monitoring** — System metrics, health checks, and performance dashboards with optimized queries
- **Plugin Marketplace** — 12 pre-configured plugins for extending functionality
- **Multi-Provider AI** — Unified interface across 7 AI providers with easy switching
- **Terminal Interface** — In-browser command terminal for power users
- **Security Framework** — 5 autonomy levels, permission matrices, and comprehensive audit logging
- **External Integrations** — Gmail, Calendar, GitHub, Slack, Notion, Jira, Trello, Discord, Linear, Figma, Drive, Sheets, custom MCP, and webhooks
- **Resilient Networking** — Automatic retry with exponential backoff, timeout handling, and user-friendly error messages for chat operations

---

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui (New York) + Framer Motion |
| **Database** | Prisma ORM + SQLite |
| **Real-Time** | Socket.io WebSocket (port 3003) |
| **State** | Zustand + TanStack Query |
| **AI SDK** | z-ai-web-dev-sdk (built-in) + external providers |
| **Voice TTS** | edge-tts (Microsoft Neural Voices) — Jarvis-quality audio |
| **Voice STT** | z-ai-web-dev-sdk ASR + Web Speech API |
| **Runtime** | Node.js 18+ / Bun |

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Install |
|---|---|---|
| **RAM** | **2 GB minimum** | Required for Node.js + Next.js Turbopack |
| Bun | Latest | `curl -fsSL https://bun.sh/install \| bash` |
| Python3 | 3.8+ | Pre-installed on most Linux distros |
| pip3 | Latest | `sudo apt install -y python3-pip` |
| Git | Latest | `sudo apt install -y git` |

> ⚠️ **Memory Requirement**: AIOS requires a minimum of **2 GB RAM**. The Node.js runtime is configured with a 1536 MB heap limit to accommodate Next.js Turbopack compilation. Running with less than 2 GB RAM may cause the server to crash during startup or under load.

### One-Line Install (13+ Linux Distributions)

```bash
chmod +x install.sh && ./install.sh
```

The install script automatically:
1. ✅ Detects your OS (Debian, Ubuntu, Kali, Parrot, Arch, Manjaro, Garuda, Fedora, Linux Mint, Pop!_OS, Zorin, elementary OS, and more)
2. ✅ Installs system dependencies (curl, git, build-essential, python3, pip)
3. ✅ Installs Bun runtime
4. ✅ Installs Node.js (if not present)
5. ✅ Installs edge-tts for Jarvis-quality neural voices
6. ✅ Clones or detects the project directory
7. ✅ Runs `bun install` for project dependencies
8. ✅ Configures `.env` with API key templates (including `MISTRAL_API_KEY`)
9. ✅ Initializes the Prisma/SQLite database
10. ✅ Starts the development server

> 💡 **OS Detection**: The install script uses `/etc/os-release` with `ID_LIKE` fallback, so even unlisted Debian/Arch derivatives should work automatically.

### Manual Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/aios.git
cd aios/my-project

# 2. Install dependencies
bun install

# 3. Install edge-tts for Jarvis voice
pip3 install edge-tts

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your API keys (see Configuration section below)
nano .env

# 5. Initialize the database
bun run db:push

# 6. Start the development server
bun run dev
```

The application will be available at:

| Service | URL |
|---|---|
| Next.js App | [http://localhost:3000](http://localhost:3000) |
| WebSocket Server | `ws://localhost:3003` |

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root. Only the built-in **Z-AI provider** requires no API key — all other providers are optional and activated by setting their respective keys.

```env
# ============================================
# AIOS — Environment Configuration
# ============================================

# ── AI Provider API Keys ──────────────────────
# Z-AI (Built-in) — No key required, works out of the box
MISTRAL_API_KEY=your_mistral_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# ── Local AI (Ollama / Raspberry Pi) ──────────
OLLAMA_BASE_URL=http://localhost:11434

# ── Database ──────────────────────────────────
DATABASE_URL="file:./db/custom.db"
```

> ⚠️ **Security Warning**: Never commit your `.env` file to version control. The `.gitignore` is configured to exclude it.

> 💡 **Mistral API Key**: The `MISTRAL_API_KEY` is pre-configured in the `.env` template and is recommended for voice/Jarvis interactions due to Mistral's low latency and high quality.

### Voice Configuration

AIOS uses **edge-tts** (Microsoft Edge Neural TTS) for high-quality voice synthesis. No API key is needed — it uses the same endpoint as Microsoft Edge's Read Aloud feature.

| Voice ID | Full Name | Style |
|---|---|---|
| `ryan` | en-GB-RyanNeural | 🇬🇧 **British gentleman — Jarvis (default)** |
| `thomas` | en-GB-ThomasNeural | 🇬🇧 British male, warm |
| `brian` | en-US-BrianNeural | 🇺🇸 American male, deep |
| `guy` | en-US-GuyNeural | 🇺🇸 American male, authoritative |
| `roger` | en-US-RogerNeural | 🇺🇸 American male, mature |
| `sonia` | en-GB-SoniaNeural | 🇬🇧 British female |
| `andrew` | en-US-AndrewNeural | 🇺🇸 American male, clear |
| `christopher` | en-US-ChristopherNeural | 🇺🇸 American male, warm |
| `eric` | en-US-EricNeural | 🇺🇸 American male |
| `steffan` | en-US-SteffanNeural | 🇺🇸 American male |
| `libby` | en-GB-LibbyNeural | 🇬🇧 British female |
| `maisie` | en-GB-MaisieNeural | 🇬🇧 British female, young |

---

## 📦 Modules

### 1. 🤖 AI Chat

Full-featured conversational AI interface with:

- System prompt presets for common use cases
- Model selection across all configured providers (Z-AI, Mistral, OpenAI, etc.)
- Markdown and syntax-highlighted code rendering
- Conversation history and management
- Ollama support for local/Raspberry Pi models
- **Automatic retry with exponential backoff** — 5 retries with 3s/6s/9s/12s/15s delays on transient failures
- **30-second fetch timeout** via AbortController to prevent hanging requests (increased from 15s to accommodate server compilation)
- **Smart error handling** — non-blocking errors that set empty conversations instead of blocking the UI; users can always start a new chat
- **Network error classification** — distinguishes between server unreachable, timeout, and API errors for appropriate handling

### 2. 🗣️ Voice & Jarvis

Natural voice interaction powered by **edge-tts** (Microsoft Neural TTS):

- **Wake Word "Fred"** — Say "Fred" and the assistant activates automatically
- **Always Listening Mode** — Hands-free, always-on voice assistant (like Alexa)
- **Jarvis Voice** — en-GB-RyanNeural (default) — British gentleman, Jarvis-like quality
- **12 Neural Voices** — Multiple British and American voices
- **Speech-to-Text** — Real-time audio transcription via Z-AI ASR
- **Multilingual** — French, English, and more handled naturally
- **Fallback TTS** — Z-AI SDK TTS available if edge-tts fails

### 3. 🧑‍🤝‍🧑 Agents

Multi-agent orchestration with **14 specialized agent types**:

| Agent Type | Role |
|---|---|
| Coder | Writes and modifies code |
| Researcher | Gathers and analyzes information |
| Planner | Creates execution plans |
| Reviewer | Reviews code and outputs |
| Tester | Generates and runs tests |
| Debugger | Diagnoses and fixes issues |
| Architect | Designs system architecture |
| Writer | Produces documentation and content |
| Analyst | Performs data analysis |
| Coordinator | Orchestrates multi-agent workflows |
| Optimizer | Improves performance and efficiency |
| Validator | Verifies correctness and compliance |
| Explorer | Discovers and evaluates options |
| Executor | Carries out specific tasks |

### 4. 🧠 Memory

Persistent memory system with **11 memory types**:

| Type | Scope | Purpose |
|---|---|---|
| `short_term` | Session | Temporary working memory |
| `long_term` | Persistent | Permanent knowledge storage |
| `contextual` | Conversation | Context within a dialogue |
| `procedural` | System | How-to knowledge and procedures |
| `user` | User-specific | Personal preferences and data |
| `system` | Global | System-wide configuration |
| `project` | Project | Project-specific knowledge |
| `error` | Diagnostic | Error history and resolutions |
| `workflow` | Process | Workflow execution state |
| `skill` | Capability | Learned skills and abilities |
| `episodic` | Temporal | Time-based event memory |

### 5. 🔄 Workflows

Visual workflow engine with drag-and-drop editing:

- **7 Node Types**: Trigger, Condition, Action, Transform, Loop, Parallel, Delay
- Visual canvas for building automation pipelines
- Workflow execution with state tracking
- Error handling and retry logic

### 6. 📊 Monitoring

Real-time system observability:

- System metrics (CPU, memory, disk, network)
- Service health checks
- Performance dashboards
- Alert notifications
- **Optimized endpoint** — reduced from 16 separate COUNT queries to 8 groupBy queries with 30-second in-memory cache for significantly lower database load

### 7. 🔌 Plugins

Extensible plugin system with **12 pre-configured plugins**:

- Plugin marketplace interface
- Install, configure, enable/disable plugins
- Custom plugin development support

### 8. 🧮 AI Models

Multi-provider model management:

- Unified provider configuration UI
- API key management per provider
- Model selection per conversation/task
- Provider health monitoring

### 9. 💻 Terminal

In-browser command terminal:

- Full shell access from the UI
- Command history and autocomplete
- Output formatting and streaming

### 10. 🔒 Security

Comprehensive security framework with **5 autonomy levels**:

| Level | Name | Description |
|---|---|---|
| 0 | **Fully Restricted** | All actions require explicit approval |
| 1 | **Supervised** | High-impact actions require approval |
| 2 | **Guided** | System suggests actions, user confirms |
| 3 | **Assisted** | System acts autonomously, reports actions |
| 4 | **Fully Autonomous** | System acts independently without confirmation |

Additional security features:
- Granular permission matrices per action type
- Comprehensive audit logging
- Action review and rollback capabilities

### 11. 🔗 Integrations

**12 integration types** for connecting with external services:

| Integration | Type | Description |
|---|---|---|
| Gmail | Communication | Send and read emails |
| Calendar | Scheduling | Manage events and reminders |
| GitHub | Development | Repos, issues, pull requests |
| Slack | Communication | Channels, messages, notifications |
| Notion | Productivity | Pages, databases, wikis |
| Jira | Project Management | Issues, boards, sprints |
| Trello | Project Management | Boards, lists, cards |
| Discord | Communication | Servers, channels, messages |
| Linear | Project Management | Issues, projects, cycles |
| Figma | Design | Files, components, prototypes |
| Drive | Storage | Files, folders, sharing |
| Sheets | Data | Spreadsheets, formulas, charts |
| Custom MCP | Extensible | Model Context Protocol servers |
| Webhooks | Extensible | Custom HTTP endpoint integrations |

---

## 🗣️ Voice & Jarvis

### How It Works

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐     ┌──────────────┐
│  Microphone   │────▶│  Z-AI ASR     │────▶│  LLM (Chat)  │────▶│  edge-tts    │
│  (Browser)    │     │  (STT)        │     │  (AI Model)  │     │  (TTS MP3)   │
└──────────────┘     └───────────────┘     └──────────────┘     └──────────────┘
                            │                                          │
                     "Fred, hello!"                             MP3 audio
                            │                                          │
                     Wake word detected                          Browser plays
                            │                                          │
                     ──▶ Full pipeline ──▶                        ──▶ Speaker
```

### Wake Word "Fred"

When **Always Listening** is enabled, the system continuously listens for the wake word **"Fred"**. Once detected:
1. Audio is transcribed via Z-AI ASR
2. The transcription is sent to the LLM with Fred's system prompt
3. The response is synthesized via edge-tts (Jarvis voice)
4. Audio plays automatically in the browser

### Edge-TTS Details

- **No API key required** — uses Microsoft Edge's Read Aloud endpoint
- **High quality** — neural voices, not robotic browser TTS
- **MP3 output** — smaller files, better quality than WAV
- **Pitch adjustment** — slightly lowered (-2Hz) for authoritative Jarvis sound
- **Fallback** — Z-AI SDK TTS (WAV) available if edge-tts fails

---

## 📡 API Reference

AIOS exposes **18+ API routes** under the Next.js App Router:

### Chat & Conversations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Chat completions with model selection |
| `GET` | `/api/conversations` | List all conversations |
| `POST` | `/api/conversations` | Create a new conversation |
| `GET` | `/api/conversations/[id]` | Get conversation details |
| `PATCH` | `/api/conversations/[id]` | Update conversation |
| `DELETE` | `/api/conversations/[id]` | Delete conversation |

### Voice & Speech

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/voice/assistant` | Full voice pipeline: ASR → LLM → TTS (edge-tts) |
| `POST` | `/api/voice/tts` | Text-to-speech synthesis |

### Memory

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/memory` | List memory entries (filterable) |
| `POST` | `/api/memory` | Create a memory entry |
| `PATCH` | `/api/memory` | Update a memory entry |
| `DELETE` | `/api/memory` | Delete a memory entry |

### Agents & Tasks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/agents` | List all agents |
| `POST` | `/api/agents` | Create a new agent |
| `GET` | `/api/agents/[id]` | Get agent details |
| `PATCH` | `/api/agents/[id]` | Update agent configuration |
| `DELETE` | `/api/agents/[id]` | Delete an agent |
| `GET` | `/api/tasks` | List all tasks |
| `POST` | `/api/tasks` | Create a new task |
| `GET` | `/api/tasks/[id]` | Get task details |
| `PATCH` | `/api/tasks/[id]` | Update task status |
| `DELETE` | `/api/tasks/[id]` | Delete a task |

### Workflows

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/workflows` | List all workflows |
| `POST` | `/api/workflows` | Create a new workflow |
| `GET` | `/api/workflows/[id]` | Get workflow details |
| `PATCH` | `/api/workflows/[id]` | Update workflow |
| `DELETE` | `/api/workflows/[id]` | Delete workflow |
| `POST` | `/api/workflows/[id]/execute` | Execute a workflow |

### System

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/generate-image` | Generate AI images |
| `GET` | `/api/monitoring` | Get system metrics (30s cached, optimized groupBy queries) |
| `GET` | `/api/models/config` | Get provider configuration |

---

## 🤖 AI Providers

AIOS uses a unified provider abstraction layer (`src/lib/providers.ts`) that supports **7 AI providers** with smart model routing:

| Provider | Env Variable | Required | Available Models |
|---|---|---|---|
| **Z-AI** (Built-in) | None | No | GPT-4 Turbo, GPT-4o, Claude 3.5 Sonnet, Claude 3 Opus |
| **Mistral AI** | `MISTRAL_API_KEY` | No | Mistral Large, Medium, Small, Tiny, Nemo, Codestral, Magistral, Devstral |
| **OpenAI** | `OPENAI_API_KEY` | No | GPT-4 Turbo, GPT-4o, GPT-4o Mini |
| **Anthropic** | `ANTHROPIC_API_KEY` | No | Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku |
| **Google** | `GOOGLE_API_KEY` | No | Gemini Pro, Gemini 1.5 Flash |
| **DeepSeek** | `DEEPSEEK_API_KEY` | No | DeepSeek V3, DeepSeek Coder, DeepSeek Reasoner |
| **Ollama** (Local/Pi) | `OLLAMA_BASE_URL` | No | Llama 3.1, CodeLlama, Mistral 7B |

### Provider Configuration Notes

- **Z-AI** — Built-in provider, works out of the box with no API key needed
- **Mistral AI** — `MISTRAL_API_KEY` is pre-configured in the `.env` template; recommended for voice/Jarvis interactions due to low latency
- **OpenAI, Anthropic, Google, DeepSeek** — Add respective API keys to `.env` to activate
- **Ollama** — Set `OLLAMA_BASE_URL` to your local or Raspberry Pi Ollama instance

### Model Routing

Models are automatically routed to the correct provider using a 3-step resolution:

1. **Exact match** — Model ID is in the mapping table (e.g., `mistral-large-latest` → Mistral)
2. **Prefix match** — Model ID starts with a known prefix (e.g., `mistral-*` → Mistral, `codestral-*` → Mistral)
3. **Fallback** — Z-AI built-in provider

### Model Selection Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Choosing a Model                          │
├──────────────┬──────────────────────────────────────────────┤
│ Use Case     │ Recommended Provider & Model                  │
├──────────────┼──────────────────────────────────────────────┤
│ Quick Start  │ Z-AI (built-in, no key required)             │
│ Coding       │ DeepSeek Coder / Codestral / GPT-4o          │
│ Reasoning    │ Claude 3.5 Sonnet / DeepSeek Reasoner        │
│ Fast/ Cheap  │ GPT-4o Mini / Mistral Small / Gemini Flash   │
│ Local/ Private│ Ollama (Llama 3.1, Mistral 7B)              │
│ Voice/ Fred  │ Mistral Large (low latency, high quality)    │
│ Long Context │ Gemini 1.5 Flash / Claude 3.5 Sonnet        │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 🗄 Database Schema

AIOS uses **Prisma ORM** with **SQLite** for persistent storage. The schema defines **10 models**:

```
┌─────────────┐     ┌────────────────┐     ┌───────────┐
│    User      │────<│  Conversation  │────<│  Message   │
└─────────────┘     └────────────────┘     └───────────┘

┌─────────────┐     ┌────────────────┐     ┌───────────────────────┐
│   Memory     │     │     Agent      │────<│        Task            │
└─────────────┘     └────────────────┘     └───────────────────────┘

┌─────────────┐     ┌──────────────────────────┐
│  Workflow    │────<│  WorkflowExecution        │
└─────────────┘     └──────────────────────────┘

┌─────────────┐     ┌─────────────┐
│   Plugin     │     │ Integration │
└─────────────┘     └─────────────┘
```

### Database Commands

```bash
# Generate Prisma client
bunx prisma generate

# Push schema changes (development)
bunx prisma db push

# Open Prisma Studio (database GUI)
bunx prisma studio
```

---

## 🔌 WebSocket Service

The WebSocket server enables real-time communication and is located in `mini-services/aios-ws/`.

| Property | Value |
|---|---|
| **Port** | 3003 |
| **Protocol** | Socket.io |
| **Entry Point** | `mini-services/aios-ws/index.ts` |

### Events

| Event | Direction | Description |
|---|---|---|
| `system:metrics` | Server → Client | Real-time system metrics (CPU, memory, etc.) |
| `notification` | Server → Client | System notifications and alerts |
| `agent:status` | Server → Client | Agent status updates (idle, running, error) |

---

## 📁 Project Structure

```
my-project/
├── prisma/
│   └── schema.prisma            # Database schema (10 models)
├── src/
│   ├── app/
│   │   ├── page.tsx             # Main dashboard page
│   │   ├── layout.tsx           # Root layout with providers
│   │   ├── globals.css          # Global styles
│   │   └── api/                 # 18+ API route handlers
│   │       ├── chat/route.ts
│   │       ├── conversations/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── voice/
│   │       │   ├── assistant/route.ts   # Full ASR→LLM→TTS pipeline
│   │       │   └── tts/route.ts         # TTS only
│   │       ├── memory/route.ts
│   │       ├── agents/
│   │       ├── tasks/
│   │       ├── workflows/
│   │       ├── plugins/
│   │       ├── integrations/route.ts
│   │       ├── generate-image/route.ts
│   │       ├── monitoring/route.ts      # Optimized: 8 groupBy + 30s cache
│   │       └── models/config/route.ts
│   ├── components/
│   │   ├── modules/             # Module UI components
│   │   │   ├── ChatModule.tsx   # Chat with retry + timeout + smart errors
│   │   │   ├── VoiceModule.tsx  # Voice + Jarvis + Fred wake word
│   │   │   ├── AgentsModule.tsx
│   │   │   ├── MemoryModule.tsx
│   │   │   ├── WorkflowsModule.tsx
│   │   │   ├── MonitoringModule.tsx
│   │   │   ├── PluginsModule.tsx
│   │   │   ├── AIModelsModule.tsx
│   │   │   ├── TerminalModule.tsx
│   │   │   ├── SecurityModule.tsx
│   │   │   └── IntegrationsModule.tsx
│   │   └── ui/                  # shadcn/ui components (New York)
│   └── lib/
│       ├── db.ts                # Prisma client singleton (log: error/warn only)
│       ├── auth.ts              # Authentication helpers
│       ├── audio-utils.ts       # PCM→WAV conversion + voice IDs
│       ├── store.ts             # Zustand global store
│       └── providers.ts         # AI provider abstraction (7 providers)
├── mini-services/
│   └── aios-ws/                 # WebSocket service (Socket.io)
├── start-dev.sh                 # Dev server startup (Node.js 1536MB limit)
├── pm.js                        # Process manager with health checks (1536MB)
├── server-manager.js            # Server manager (1536MB)
├── .env                         # Environment variables (not committed)
├── install.sh                   # Automated installation (13+ Linux distributions)
├── package.json                 # Node.js dependencies
├── tsconfig.json                # TypeScript configuration
├── next.config.ts               # Next.js configuration
├── components.json              # shadcn/ui configuration
└── README.md                    # This file
```

---

## 🐧 Supported OS

AIOS runs on most Linux distributions. The install script automatically detects and configures **13+ distributions** using `/etc/os-release` with `ID_LIKE` fallback:

| Distribution | OS Family | Package Manager | Status |
|---|---|---|---|
| **Debian 11+** | debian | apt | ✅ Full support |
| **Ubuntu 20.04+** | debian | apt | ✅ Full support |
| **Kali Linux** | debian | apt | ✅ Full support |
| **Parrot OS** | debian | apt | ✅ Full support |
| **Linux Mint** | debian | apt | ✅ Full support |
| **Pop!_OS** | debian | apt | ✅ Full support |
| **Zorin OS** | debian | apt | ✅ Full support |
| **elementary OS** | debian | apt | ✅ Full support |
| **Arch Linux** | arch | pacman | ✅ Full support |
| **Manjaro** | arch | pacman | ✅ Full support |
| **Garuda** | arch | pacman | ✅ Full support |
| **Fedora** | redhat | dnf | ✅ Full support |
| **Other Debian-like** | debian* | apt | ⚠️ Auto-detected via `ID_LIKE` |
| **Other Arch-like** | arch* | pacman | ⚠️ Auto-detected via `ID_LIKE` |
| **Raspberry Pi OS** | debian | apt | ✅ Full support (with Ollama) |

> **Kali Linux Note**: Kali is Debian-based and fully supported. The install script detects `$ID=kali` and uses `apt` just like Debian/Ubuntu. No OS detection blocking.

> **Fallback Detection**: If your distribution isn't explicitly listed, the install script checks the `ID_LIKE` field from `/etc/os-release` to determine the package manager. Most Debian and Arch derivatives will work automatically.

---

## 🔧 Troubleshooting

### Common Error Messages

| Error Message | Cause | Solution |
|---|---|---|
| "The server may be starting up — please try again" | Server is still initializing or temporarily unreachable | Wait a moment and retry — the chat module will auto-retry with exponential backoff (2s → 4s → 6s) |
| "Failed to connect to the server. Please check your internet connection." | Server is unreachable (network error) | Verify the server is running (`bun run dev`) and check your network connection |
| "The request timed out. The server may be busy — please try again." | Fetch request exceeded 15-second timeout | The server may be under heavy load; retry after a moment. Ensure Node.js has sufficient memory (1536MB) |
| "Failed to send message: [API error details]" | The API returned an error response | Check the error details — may be an invalid model, missing API key, or rate limit. Verify your `.env` configuration |

### Server Crashes on Startup

**Symptom**: The server crashes with an out-of-memory (OOM) error or repeatedly restarts.

**Solutions**:
1. **Check RAM** — Ensure your system has at least 2 GB of free RAM
2. **Node.js memory limit** — Verify the `--max-old-space-size=1536` flag is set in `start-dev.sh`, `pm.js`, and `server-manager.js`
3. **Prisma query logging** — Ensure `src/lib/db.ts` uses `log: ['error', 'warn']` (not `log: ['query']`) to avoid log flooding

### Prisma Query Log Flooding

**Symptom**: Console is flooded with SQL queries, server runs out of memory.

**Solution**: The Prisma client should be configured with minimal logging:

```typescript
// src/lib/db.ts — Correct configuration
const prisma = new PrismaClient({
  log: ['error', 'warn'],  // NOT ['query'] — query logging causes OOM
})
```

### Chat "Failed to Load" Errors

**Symptom**: Conversations list or chat messages fail to load.

**Solutions**:
1. The chat module now includes automatic retry with 5 retries and exponential backoff (3s→15s) — most transient errors resolve themselves
2. If the server is unreachable, the chat gracefully falls back to empty conversations (no blocking error) — you can always start a new chat
3. If errors persist, check that the server is fully started (look for "Ready in" in the console)
4. Verify `DATABASE_URL` in `.env` points to a valid SQLite file
5. The process manager (`pm.js`) auto-restarts the server if it crashes — ensure it's running (`node pm.js`)
6. Frontend polling has been reduced to 60-second intervals to lower server load — if you need real-time updates, enable the WebSocket service

### Monitoring Endpoint Slow

**Symptom**: `/api/monitoring` endpoint takes a long time to respond.

**Solution**: The monitoring endpoint now uses optimized groupBy queries (8 instead of 16 separate COUNT queries) with a 30-second in-memory cache. If you're still experiencing slowness, check database size and consider pruning old records.

---

## 📝 Recent Fixes

### Critical Bug Fixes

| Fix | Details | Impact |
|---|---|---|
| **Chat retry logic** | Added exponential backoff retry (5 retries, 3s/6s/9s/12s/15s delays) with 30s timeout in ChatModule | Eliminates "Failed to load conversations" and "Failed to send message" errors on transient failures |
| **Prisma log flooding** | Changed `log: ['query']` → `log: ['error', 'warn']` in `src/lib/db.ts` | Prevents OOM crashes caused by query log flooding |
| **Node.js memory limit** | Increased from 384MB → 1536MB in `start-dev.sh`, `pm.js`, and `server-manager.js` | Prevents server crashes during Next.js Turbopack compilation |
| **Monitoring endpoint** | Reduced 16 separate COUNT queries to 8 groupBy queries + 30s in-memory cache | Significantly lower database load and faster response times |
| **Frontend polling** | Reduced polling intervals from 15s/30s → 60s | Lower server load, fewer unnecessary requests |
| **Chat error handling** | Non-blocking errors — sets empty conversations instead of blocking UI; users can always start a new chat | Better user experience — no more "Failed to load conversations" blocking error |
| **Fetch timeout** | Increased from 15s to 30s on all chat fetch requests via AbortController | Prevents false timeouts during server compilation |
| **Network error handling** | Chat send now distinguishes between server unreachable vs. timeout vs. API error | Appropriate error messages and recovery for each failure type |

### Configuration Fixes

| Fix | Details |
|---|---|
| **MISTRAL_API_KEY** | Restored in `.env` file template — Mistral is now pre-configured for voice/Jarvis use cases |
| **Install.sh** | Expanded support to 13+ Linux distributions with `ID_LIKE` fallback; auto-detects script directory (no more hardcoded paths or REPO_URL required) |
| **AI Providers** | Full configuration for Z-AI (built-in), Mistral AI (API key in .env), OpenAI, Anthropic, Google Gemini, DeepSeek (keys in .env), and Ollama (local/Raspberry Pi) |

---

## 🚢 Deployment

### Production Build

```bash
# Build the Next.js application
bun run build

# Start the production server
bun start
```

### Docker (Recommended)

```dockerfile
# Dockerfile example
FROM oven/bun:1

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Install edge-tts for Jarvis voice
RUN apt-get update && apt-get install -y python3 python3-pip && \
    pip3 install edge-tts --break-system-packages

COPY . .
RUN bunx prisma generate
RUN bun run build

EXPOSE 3000 3003

CMD ["sh", "-c", "node mini-services/aios-ws/index.ts & bun start"]
```

```bash
# Build and run
docker build -t aios .
docker run -p 3000:3000 -p 3003:3003 --env-file .env aios
```

### Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Start the Next.js app
pm2 start "bun start" --name aios-app

# Start the WebSocket server
pm2 start mini-services/aios-ws/index.ts --name aios-ws

# Save and enable auto-restart
pm2 save
pm2 startup
```

### Raspberry Pi Deployment

```bash
# 1. Install Ollama for local AI
curl -fsSL https://ollama.com/install.sh | sh
ollama pull mistral

# 2. Set Ollama URL in .env
echo "OLLAMA_BASE_URL=http://localhost:11434" >> .env

# 3. Start AIOS — it will automatically detect Ollama models
./install.sh
```

### Environment Checklist

Before going to production, ensure:

- [ ] All API keys are set via environment variables (not hardcoded)
- [ ] `DATABASE_URL` points to a persistent database
- [ ] `edge-tts` is installed (`pip3 install edge-tts`) for voice features
- [ ] WebSocket service is running and accessible
- [ ] Security autonomy level is appropriately configured
- [ ] Audit logging is enabled
- [ ] CORS and security headers are configured
- [ ] SSL/TLS is enabled (via reverse proxy or Next.js config)
- [ ] Regular database backups are scheduled
- [ ] Node.js memory limit is set to 1536MB (check `start-dev.sh` / `pm.js` / `server-manager.js`)
- [ ] System has at least 2 GB RAM available

---

## 💡 Best Practices

### 🔐 API Key Security

- **Never** commit your `.env` file — it is already in `.gitignore`
- Use `.env.example` as a template and share it with your team
- Rotate API keys regularly, especially after accidental exposure
- In production, use a secrets manager (e.g., Docker Secrets, AWS Secrets Manager, Vault)
- Set the minimum required permissions for each API key

### 🧠 Model Selection

- **Start with Z-AI** — it requires no API key and covers most use cases
- **Use Mistral for voice** — Mistral Large has low latency and high quality for voice responses
- **Match the model to the task** — use code models for coding, reasoning models for analysis
- **Use local models (Ollama)** for sensitive data that must not leave your machine
- **Monitor costs** — cheaper models (GPT-4o Mini, Mistral Small) are sufficient for most tasks
- **Test before deploying** — validate model outputs in the AI Models module before production use

### 🗣️ Voice & Jarvis

- **Use edge-tts** — much better quality than browser SpeechSynthesis
- **Default voice: Ryan** — en-GB-RyanNeural is the most Jarvis-like voice
- **Lower pitch** — the default -2Hz shift makes the voice sound more authoritative
- **Say "Fred"** — the wake word activates the assistant in Always Listening mode
- **Check edge-tts is installed** — run `python3 -m edge_tts --help` to verify

### 🧠 Memory Management

- **Tag memories** with the correct type for efficient retrieval
- **Prune short-term memory** regularly to avoid stale context
- **Use procedural memory** for reusable instructions and workflows
- **Leverage project memory** for project-specific knowledge that persists across sessions
- **Review error memory** periodically to identify recurring issues

### 🔒 Security & Autonomy Levels

Choose the appropriate autonomy level for your use case:

```
Level 0 (Fully Restricted) ──▶ Testing, demos, sensitive environments
Level 1 (Supervised)        ──▶ Production with critical operations
Level 2 (Guided)            ──▶ Day-to-day development work
Level 3 (Assisted)          ──▶ Trusted environments, experienced users
Level 4 (Fully Autonomous)  ──▶ Controlled environments only, with monitoring
```

- **Start at Level 0** and increase only as you build trust
- **Audit logs** are your safety net — review them regularly
- **Permission matrices** allow fine-grained control beyond the 5 levels
- Never use Level 4 in production without robust monitoring in place

### 🚀 Performance

- **Ensure 2 GB RAM minimum** — Node.js + Next.js Turbopack requires adequate memory
- **Verify Node.js memory limit** — should be `--max-old-space-size=1536` in startup scripts
- **Enable WebSocket** for real-time features — polling is a fallback only (now at 60s intervals)
- **Use SQLite** for development; consider PostgreSQL for production with Prisma
- **Monitor agent resource usage** via the Monitoring module
- **Cache frequently accessed memories** in short-term storage
- **Prisma logging** — keep at `['error', 'warn']` to avoid log-induced OOM

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing TypeScript and React patterns
- Use shadcn/ui components for all UI elements
- Maintain the modular architecture — new features go in `src/components/modules/`
- Add API routes under `src/app/api/` following the existing patterns
- Update the Prisma schema for new data models and run `bunx prisma db push`
- Test with multiple AI providers before submitting

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by the AIOS Team**

Inspired by Jarvis and OpenClaw • Powered by Next.js, React, and TypeScript

[⬆ Back to Top](#-aios--ai-operating-system)

</div>
