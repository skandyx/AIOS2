<div align="center">

# 🧠 AIOS — AI Operating System

**A modular, production-ready AI platform for voice interaction, advanced reasoning, persistent memory, intelligent automation, and multi-agent orchestration.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Inspired by **Jarvis** and **OpenClaw** • Built with Next.js 16, React 19, and TypeScript 5

[Features](#-features) • [Quick Start](#-quick-start) • [Configuration](#-configuration) • [API Reference](#-api-reference) • [Architecture](#-architecture) • [Deployment](#-deployment)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [What's New](#-whats-new)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Installation (Download & Extract)](#-installation-download--extract)
- [Configuration](#-configuration)
- [Modules](#-modules)
- [API Reference](#-api-reference)
- [AI Providers](#-ai-providers)
- [Multi-Platform Integration](#-multi-platform-integration)
- [PWA (iPhone / Mobile)](#-pwa-iphone--mobile)
- [Database Schema](#-database-schema)
- [WebSocket Service](#-websocket-service)
- [Project Structure](#-project-structure)
- [Best Practices](#-best-practices)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

AIOS is a comprehensive AI Operating System that unifies conversational AI, voice interaction, multi-agent orchestration, persistent memory, visual workflows, skill installation from GitHub, MCP (Model Context Protocol) server management, project organization, and external service integrations into a single, cohesive platform. Whether you're building an AI assistant, automating complex workflows, or orchestrating teams of specialized agents, AIOS provides the infrastructure to do it all.

### Why AIOS?

| Capability | Description |
|---|---|
| 🗣️ **Voice-First** | Alexa-like always-listening voice assistant with STT/TTS |
| 🧠 **Persistent Memory** | 11 memory types across short-term, long-term, procedural, and more |
| 🤖 **Multi-Agent** | 16 specialized agent types working in concert |
| 🔌 **Extensible** | Skills from GitHub repos + MCP servers + 12 integration types |
| 🔒 **Secure** | 5 autonomy levels with granular permission matrices |
| 📊 **Observable** | Real-time monitoring, audit logging, and health dashboards |
| 🔄 **Visual Workflows** | Drag-and-drop workflow engine with 7 node types |
| 🌐 **Multi-Provider** | 7 AI providers with seamless switching |
| 📱 **PWA Ready** | Install on iPhone/Android as a native-like app |
| 💬 **Multi-Platform** | Communicate via Telegram, WhatsApp, and more |

---

## ✨ Features

- **AI Chat** — Full-featured conversational AI with system prompt presets, persistent model selection, markdown rendering, syntax-highlighted code blocks, and conversation deletion
- **Voice Interaction** — Alexa-like always-listening voice assistant with language selection, speech-to-text transcription, and text-to-speech synthesis
- **Multi-Agent Orchestration** — 16 specialized agent types coordinated for complex tasks
- **Persistent Memory** — 11 memory types ensuring context is never lost across sessions
- **Visual Workflows** — Drag-and-drop workflow builder with 7 node types for automating complex processes
- **Skills Marketplace** — Install AI skills directly from GitHub repositories with one click
- **MCP Registry** — Browse, install, and configure Model Context Protocol servers
- **Projects** — Organize tasks, skills, and MCP servers into projects
- **Real-Time Monitoring** — System metrics, health checks, and performance dashboards
- **Plugin Marketplace** — 12 pre-configured plugins for extending functionality
- **Multi-Provider AI** — Unified interface across 7 AI providers with persistent model selection
- **Terminal Interface** — In-browser command terminal for power users
- **Security Framework** — 5 autonomy levels, permission matrices, and comprehensive audit logging
- **External Integrations** — Gmail, Calendar, GitHub, Slack, Notion, Jira, Trello, Discord, Linear, Figma, Drive, Sheets, custom MCP, and webhooks
- **Multi-Platform Channels** — Telegram bot and WhatsApp integration for chatting with your AI assistant from any platform
- **PWA Support** — Install AIOS on your iPhone or Android home screen for native app-like experience

---

## 🆕 What's New

### Recent Updates (v1.1)

| Feature | Description |
|---|---|
| 🗑️ **Delete Chat** | Delete conversations with a single click |
| 📜 **Vertical Scroll** | All module menus now have proper vertical scrolling |
| 🎤 **Centered Mic** | Microphone icon properly centered in its circle |
| 🌍 **Language Selection** | Choose your language for voice discussions |
| 💾 **Persistent Model** | Model selection is now saved and persists across all chats |
| 🗣️ **Always-Listening Voice** | Alexa-like always-listening mode with wake word support |
| 🔧 **Skills from GitHub** | Install AI skills directly from GitHub repositories |
| 📦 **MCP Registry** | Browse and install MCP servers from the registry |
| 📁 **Projects Module** | Organize tasks, skills, and MCP servers into projects |
| 💬 **Telegram Integration** | Chat with your AI assistant via Telegram bot |
| 📱 **WhatsApp Integration** | Connect your AI assistant to WhatsApp |
| 📲 **PWA Support** | Install as a Progressive Web App on iPhone/Android |
| 🗄️ **14 Database Models** | Expanded schema with Skills, MCP, Projects, and more |

---

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui (New York) + Framer Motion |
| **Database** | Prisma ORM + SQLite (14 models) |
| **Real-Time** | Socket.io WebSocket (port 3003) |
| **State** | Zustand (global) + TanStack Query (server) |
| **AI SDK** | z-ai-web-dev-sdk (built-in) + external providers |
| **Voice** | Web Speech API + z-ai-web-dev-sdk TTS/ASR |
| **Runtime** | Node.js 18+ / Bun |

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Install |
|---|---|---|
| Node.js | 18+ | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt install -y nodejs` |
| Bun | Latest | `curl -fsSL https://bun.sh/install \| bash` |
| Git | Latest | `sudo apt install -y git` |

### Option A: Clone from Git

```bash
# 1. Clone the repository
git clone https://github.com/your-org/aios.git
cd aios

# 2. Run the installer
chmod +x install.sh && ./install.sh
```

### Option B: Manual Installation

```bash
# 1. Navigate to the project directory
cd /path/to/aios

# 2. Install dependencies
bun install

# 3. Configure environment (API keys are optional!)
cp .env.example .env
# Edit .env only if you want to add provider keys

# 4. Generate Prisma client and initialize database
bunx prisma generate
bunx prisma db push

# 5. Start the development server
bun run dev

# 6. In a separate terminal, start the WebSocket service
cd mini-services/aios-ws && bun run dev
```

The application will be available at:

| Service | URL |
|---|---|
| Next.js App | [http://localhost:3000](http://localhost:3000) |
| WebSocket Server | `ws://localhost:3003` |

### One-Line Install (Debian/Ubuntu)

```bash
chmod +x install.sh && ./install.sh
```

> 💡 **The installer auto-detects the project directory** — it works whether you cloned from git or downloaded and extracted a zip archive. API keys are **not required** during installation; you can add them later.

---

## 📦 Installation (Download & Extract)

If you downloaded AIOS as a zip/tar.gz archive:

```bash
# 1. Extract the archive
unzip aios.zip
# or: tar -xzf aios.tar.gz

# 2. Navigate into the project
cd aios

# 3. Run the installer — it auto-detects the directory
chmod +x install.sh && ./install.sh
```

The installer will:
1. ✅ Check your OS and install system dependencies
2. ✅ Install Bun runtime if not present
3. ✅ Auto-detect the project directory (no need to set REPO_URL)
4. ✅ Install all Node.js dependencies
5. ✅ Create `.env` with default values (API keys are optional!)
6. ✅ Generate Prisma client and initialize the database (non-blocking)
7. ✅ Start the dev server and WebSocket service

> ⚠️ If the database initialization fails, the installer **continues anyway** — you can initialize it manually later with `bunx prisma generate && bunx prisma db push`.

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root. Only the built-in **Z-AI provider** requires no API key — all other providers are optional and activated by setting their respective keys.

```env
# ============================================
# AIOS — Environment Configuration
# ============================================

# ── Database ──────────────────────────────────
DATABASE_URL="file:./db/custom.db"

# ── AI Provider API Keys ──────────────────────
# Z-AI (Built-in) — No key required, works out of the box!
MISTRAL_API_KEY=your_mistral_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# ── Local AI (Ollama) ─────────────────────────
OLLAMA_BASE_URL=http://localhost:11434

# ── WebSocket ─────────────────────────────────
WS_PORT=3003

# ── Application ───────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> ⚠️ **Security Warning**: Never commit your `.env` file to version control. The `.gitignore` is configured to exclude it.

### Adding API Keys After Installation

```bash
# Edit the .env file
nano .env

# Add your keys, for example:
# MISTRAL_API_KEY=your_key_here

# Restart the dev server for changes to take effect
# (Ctrl+C the running server, then:)
bun run dev
```

---

## 📦 Modules

AIOS includes **14 modules** accessible from the sidebar:

### 1. 🤖 AI Chat

Full-featured conversational AI interface with:
- System prompt presets for common use cases
- Persistent model selection across conversations
- Model and provider switching per conversation
- Markdown and syntax-highlighted code rendering
- Conversation history, management, and **deletion**
- Streaming responses

### 2. 🗣️ Voice

Natural voice interaction powered by:
- **Always-Listening Mode**: Alexa-like continuous listening with wake word
- **Speech-to-Text**: Real-time audio transcription
- **Text-to-Speech**: Natural language audio output
- **Language Selection**: Choose your preferred language for voice discussions
- Hands-free operation mode
- Centered microphone interface

### 3. 🧑‍🤝‍🧑 Agents

Multi-agent orchestration with **16 specialized agent types**:

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
| Voice Agent | Handles voice interactions |
| MCP Agent | Manages MCP server connections |

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

### 7. 🔧 Skills

Install AI skills directly from GitHub repositories:
- Search and browse available skills
- One-click install from GitHub repos
- Skill configuration and management
- Enable/disable installed skills
- Community ratings and downloads

### 8. 📦 MCP Registry

Browse and install Model Context Protocol servers:
- Search the MCP registry for available servers
- Configure transport (stdio, SSE, WebSocket)
- Set up environment variables and commands
- Manage installed MCP servers
- Monitor running MCP server status

### 9. 📁 Projects

Organize your AIOS workspace into projects:
- Group tasks, skills, and MCP servers per project
- Project status tracking (planning, in progress, on hold, etc.)
- Priority and category management
- Technology stack and requirements tracking

### 10. 🔌 Plugins

Extensible plugin system with **12 pre-configured plugins**:
- Plugin marketplace interface
- Install, configure, enable/disable plugins
- Custom plugin development support

### 11. 🧮 AI Models

Multi-provider model management:
- Unified provider configuration UI
- API key management per provider
- Persistent model selection per conversation/task
- Provider health monitoring

### 12. 💻 Terminal

In-browser command terminal:
- Full shell access from the UI
- Command history and autocomplete
- Output formatting and streaming

### 13. 🔒 Security

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

### 14. 🔗 Integrations

**14+ integration types** for connecting with external services:

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

## 📡 API Reference

AIOS exposes **25+ API routes** under the Next.js App Router:

### Chat & Conversations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Chat completions with model selection |
| `GET` | `/api/conversations` | List all conversations |
| `POST` | `/api/conversations` | Create a new conversation |
| `GET` | `/api/conversations/[id]` | Get conversation details |
| `PATCH` | `/api/conversations/[id]` | Update conversation |
| `DELETE` | `/api/conversations/[id]` | Delete conversation |

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

### Skills & MCP

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/skills` | List all skills |
| `POST` | `/api/skills` | Install a skill from GitHub |
| `GET` | `/api/skills/[id]` | Get skill details |
| `PATCH` | `/api/skills/[id]` | Update skill configuration |
| `DELETE` | `/api/skills/[id]` | Uninstall a skill |
| `GET` | `/api/skills/search` | Search skills in the registry |
| `GET` | `/api/mcp` | List all MCP servers |
| `POST` | `/api/mcp` | Install an MCP server |
| `GET` | `/api/mcp/[id]` | Get MCP server details |
| `PATCH` | `/api/mcp/[id]` | Update MCP server |
| `DELETE` | `/api/mcp/[id]` | Remove MCP server |
| `GET` | `/api/mcp/search` | Search MCP registry |

### Projects

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a new project |
| `GET` | `/api/projects/[id]` | Get project details |
| `PATCH` | `/api/projects/[id]` | Update project |
| `DELETE` | `/api/projects/[id]` | Delete project |
| `GET` | `/api/projects/[id]/skills` | List project skills |
| `GET` | `/api/projects/[id]/mcp` | List project MCP servers |

### Plugins & Integrations

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/plugins` | List all plugins |
| `POST` | `/api/plugins` | Install a plugin |
| `GET` | `/api/plugins/[id]` | Get plugin details |
| `PATCH` | `/api/plugins/[id]` | Update plugin configuration |
| `DELETE` | `/api/plugins/[id]` | Uninstall a plugin |
| `GET` | `/api/integrations` | List all integrations |
| `POST` | `/api/integrations` | Configure an integration |

### Voice & AI

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/voice` | Process voice/speech data |
| `POST` | `/api/voice/assistant` | Voice assistant interaction |
| `POST` | `/api/voice/tts` | Text-to-speech synthesis |
| `POST` | `/api/generate-image` | Generate AI images |

### Channels (Multi-Platform)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/channels/telegram` | Telegram bot webhook |
| `GET` | `/api/channels/telegram/setup` | Get Telegram setup instructions |
| `POST` | `/api/channels/whatsapp` | WhatsApp webhook |

### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/monitoring` | Get system metrics |
| `GET` | `/api/models/config` | Get provider configuration |
| `POST` | `/api/models/config` | Update provider API keys |
| `GET` | `/api/automation/platforms` | Get available automation platforms |

---

## 🤖 AI Providers

AIOS uses a unified provider abstraction layer (`src/lib/providers.ts`) that supports **7 AI providers**:

| Provider | Env Variable | Required | Available Models |
|---|---|---|---|
| **Z-AI** (Built-in) | None | No | GPT-4 Turbo, GPT-4o, Claude 3.5 Sonnet, Claude 3 Opus |
| **Mistral AI** | `MISTRAL_API_KEY` | No | Mistral Large, Medium, Small, Nemo, Codestral |
| **OpenAI** | `OPENAI_API_KEY` | No | GPT-4 Turbo, GPT-4o, GPT-4o Mini |
| **Anthropic** | `ANTHROPIC_API_KEY` | No | Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku |
| **Google** | `GOOGLE_API_KEY` | No | Gemini Pro, Gemini 1.5 Flash |
| **DeepSeek** | `DEEPSEEK_API_KEY` | No | DeepSeek V3, DeepSeek Coder, DeepSeek Reasoner |
| **Ollama** (Local) | `OLLAMA_BASE_URL` | No | Llama 3.1, CodeLlama, Mistral 7B |

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
│ Long Context │ Gemini 1.5 Flash / Claude 3.5 Sonnet        │
└──────────────┴──────────────────────────────────────────────┘
```

> 💡 **Model selection is persistent** — your chosen model is saved and persists across all conversations and sessions.

---

## 💬 Multi-Platform Integration

AIOS supports communicating with your AI assistant from multiple platforms:

### Telegram Bot

Chat with your AI assistant directly from Telegram:

1. **Create a Bot**: Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` → Get your bot token
2. **Configure**: Add `TELEGRAM_BOT_TOKEN=your_token` to your `.env`
3. **Set Webhook**: Visit `/api/channels/telegram/setup` for instructions
4. **Chat**: Start messaging your bot on Telegram!

```bash
# Set the webhook (replace with your domain)
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-domain.com/api/channels/telegram"
```

### WhatsApp

Connect your AI assistant to WhatsApp via the WhatsApp Business API:

1. **Setup**: Configure WhatsApp Business API credentials
2. **Webhook**: Set your webhook URL to `/api/channels/whatsapp`
3. **Chat**: Start messaging your AI assistant on WhatsApp!

### Custom Integrations

Use the Integrations module to connect any service via:
- **Webhooks** — Custom HTTP endpoint integrations
- **Custom MCP** — Model Context Protocol for extending AI capabilities
- **Plugin API** — Build custom plugins for any platform

---

## 📲 PWA (iPhone / Mobile)

AIOS is a **Progressive Web App** — you can install it on your iPhone or Android device for a native app-like experience:

### iPhone (Safari)

1. Open AIOS in Safari: `http://your-server:3000`
2. Tap the **Share** button (⬆️)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "AIOS" and tap **Add**
5. AIOS appears on your home screen like a native app!

### Android (Chrome)

1. Open AIOS in Chrome: `http://your-server:3000`
2. Chrome will show an **"Install"** banner — tap it
3. Or tap the ⋮ menu → **"Install app"**
4. AIOS installs as a standalone app

### PWA Features

| Feature | Supported |
|---|---|
| Standalone mode (no browser bar) | ✅ |
| Home screen icon | ✅ |
| Splash screen | ✅ |
| Dark theme | ✅ |
| Offline caching | ✅ |
| Push notifications | 🔜 (coming soon) |

---

## 🗄 Database Schema

AIOS uses **Prisma ORM** with **SQLite** for persistent storage. The schema defines **14 models**:

```
┌─────────────┐     ┌────────────────┐     ┌───────────┐
│    User      │────<│  Conversation  │────<│  Message   │
└─────────────┘     └────────────────┘     └───────────┘

┌─────────────┐     ┌────────────────┐     ┌────────────────┐
│   Memory     │     │     Agent      │────<│      Task       │
└─────────────┘     └────────────────┘     └────────────────┘

┌─────────────┐     ┌──────────────────────────┐
│  Workflow    │────<│  WorkflowExecution        │
└─────────────┘     └──────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Plugin     │     │ Integration │     │   Project    │
└─────────────┘     └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐
│    Skill     │     │  MCPServer  │
└─────────────┘     └─────────────┘

┌──────────────────┐     ┌──────────────────────┐
│  ProjectSkill    │     │  ProjectMCPServer     │
└──────────────────┘     └──────────────────────┘
```

### Database Commands

```bash
# Generate Prisma client
bunx prisma generate

# Push schema changes (development)
bunx prisma db push

# Open Prisma Studio (database GUI)
bunx prisma studio

# Create a migration (production)
bunx prisma migrate dev --name your_migration_name
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

### Starting the WebSocket Server

```bash
# Development (separate terminal)
cd mini-services/aios-ws && bun run dev

# Production (with process manager)
pm2 start mini-services/aios-ws/index.ts --name aios-ws
```

---

## 📁 Project Structure

```
my-project/
├── prisma/
│   └── schema.prisma            # Database schema (14 models)
├── src/
│   ├── app/
│   │   ├── page.tsx             # Main dashboard page (14 modules)
│   │   ├── layout.tsx           # Root layout with PWA support
│   │   ├── globals.css          # Global styles
│   │   └── api/                 # 25+ API route handlers
│   │       ├── chat/route.ts
│   │       ├── conversations/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── memory/route.ts
│   │       ├── agents/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── tasks/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── workflows/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── execute/route.ts
│   │       ├── plugins/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── integrations/route.ts
│   │       ├── projects/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── skills/route.ts
│   │       │       └── mcp/route.ts
│   │       ├── skills/
│   │       │   ├── route.ts
│   │       │   ├── [id]/route.ts
│   │       │   └── search/route.ts
│   │       ├── mcp/
│   │       │   ├── route.ts
│   │       │   ├── [id]/route.ts
│   │       │   └── search/route.ts
│   │       ├── voice/
│   │       │   ├── route.ts
│   │       │   ├── assistant/route.ts
│   │       │   └── tts/route.ts
│   │       ├── channels/
│   │       │   ├── telegram/
│   │       │   │   ├── route.ts
│   │       │   │   └── setup/route.ts
│   │       │   └── whatsapp/route.ts
│   │       ├── automation/platforms/route.ts
│   │       ├── generate-image/route.ts
│   │       ├── monitoring/route.ts
│   │       └── models/config/route.ts
│   ├── components/
│   │   ├── modules/             # 14 module UI components
│   │   │   ├── ChatModule.tsx
│   │   │   ├── VoiceModule.tsx
│   │   │   ├── AgentsModule.tsx
│   │   │   ├── MemoryModule.tsx
│   │   │   ├── WorkflowsModule.tsx
│   │   │   ├── MonitoringModule.tsx
│   │   │   ├── SkillsModule.tsx
│   │   │   ├── MCPModule.tsx
│   │   │   ├── ProjectsModule.tsx
│   │   │   ├── PluginsModule.tsx
│   │   │   ├── ModelsModule.tsx
│   │   │   ├── TerminalModule.tsx
│   │   │   ├── SecurityModule.tsx
│   │   │   └── IntegrationsModule.tsx
│   │   ├── PWARegister.tsx      # PWA service worker registration
│   │   └── ui/                  # shadcn/ui components (New York)
│   ├── hooks/
│   │   ├── use-mobile.ts        # Mobile detection hook
│   │   └── use-toast.ts         # Toast notification hook
│   └── lib/
│       ├── db.ts                # Prisma client singleton
│       ├── auth.ts              # Authentication helpers
│       ├── store.ts             # Zustand global store
│       ├── providers.ts         # AI provider abstraction layer
│       ├── utils.ts             # Utility functions
│       └── web-search.ts        # Web search integration
├── mini-services/
│   └── aios-ws/                 # WebSocket service (Socket.io)
│       ├── index.ts
│       └── package.json
├── public/
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service worker
│   ├── icon-192.svg             # PWA icon (192px)
│   ├── icon-512.svg             # PWA icon (512px)
│   ├── icon-192.png
│   ├── icon-512.png
│   └── logo.svg
├── .env                         # Environment variables (not committed)
├── .env.example                 # Environment variable template
├── install.sh                   # Automated installation script
├── requirements.txt             # Python dependencies (for plugins)
├── package.json                 # Node.js dependencies
├── tsconfig.json                # TypeScript configuration
├── next.config.ts               # Next.js configuration
├── components.json              # shadcn/ui configuration
└── README.md                    # This file
```

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
- **Match the model to the task** — use code models for coding, reasoning models for analysis
- **Use local models (Ollama)** for sensitive data that must not leave your machine
- **Monitor costs** — cheaper models (GPT-4o Mini, Mistral Small) are sufficient for most tasks
- **Test before deploying** — validate model outputs in the AI Models module before production use
- **Model selection persists** — your choice is saved automatically across sessions

### 🗣️ Voice Assistant

- **Use always-listening mode** for hands-free operation
- **Select your language** in the Voice module settings for best transcription accuracy
- **Position your microphone** close for better speech recognition
- **Use push-to-talk** in noisy environments

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

- **Enable WebSocket** for real-time features — polling is a fallback only
- **Use SQLite** for development; consider PostgreSQL for production with Prisma
- **Monitor agent resource usage** via the Monitoring module
- **Cache frequently accessed memories** in short-term storage

### 📱 Mobile & PWA

- **Install as PWA** on mobile for the best experience
- **Use the always-listening voice** for mobile hands-free operation
- **Connect via Telegram/WhatsApp** for mobile-first interaction

---

## 🚢 Deployment

### Production Build

```bash
# Build the Next.js application
bun run build

# Start the production server
bun start

# Start the WebSocket service (use a process manager)
pm2 start mini-services/aios-ws/index.ts --name aios-ws
```

### Docker (Recommended)

```dockerfile
# Dockerfile example
FROM oven/bun:1

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bunx prisma generate
RUN bun run build

EXPOSE 3000 3003

CMD ["sh", "-c", "cd mini-services/aios-ws && bun run dev & cd /app && bun start"]
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

### Environment Checklist

Before going to production, ensure:

- [ ] All API keys are set via environment variables (not hardcoded)
- [ ] `DATABASE_URL` points to a persistent database
- [ ] WebSocket service is running and accessible
- [ ] Security autonomy level is appropriately configured
- [ ] Audit logging is enabled
- [ ] CORS and security headers are configured
- [ ] SSL/TLS is enabled (via reverse proxy or Next.js config)
- [ ] Regular database backups are scheduled
- [ ] PWA manifest and service worker are configured
- [ ] Telegram/WhatsApp webhooks are secured with verification tokens

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
- All module panels must have vertical scrolling (`max-h-* overflow-y-auto`)

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by the AIOS Team**

Inspired by Jarvis and OpenClaw • Powered by Next.js, React, and TypeScript

[⬆ Back to Top](#-aios--ai-operating-system)

</div>
