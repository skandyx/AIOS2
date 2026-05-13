# AIOS — AI Operating System

> Plateforme avancée d'assistant IA autonome et évolutif, inspirée de Jarvis et OpenClaw.
> Un véritable **AI Operating System** modulaire capable d'interactions vocales, de raisonnement avancé,
> de mémoire persistante, d'automatisation intelligente et d'orchestration multi-agents.

---

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Modules](#modules)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Installation](#installation)
  - [Installation automatique (recommandée)](#installation-automatique-recommandée)
  - [Installation manuelle](#installation-manuelle)
  - [Configuration](#configuration)
- [Utilisation](#utilisation)
- [API Reference](#api-reference)
- [Modèle de données](#modèle-de-données)
- [Services](#services)
- [Raccourcis clavier](#raccourcis-clavier)
- [Sécurité](#sécurité)
- [Dépannage](#dépannage)
- [Roadmap](#roadmap)
- [Licence](#licence)

---

## Vue d'ensemble

AIOS est un système d'exploitation IA de niveau production qui agit comme une couche intelligente capable de :

| Capacité | Description |
|---|---|
| **Comprendre le langage naturel** | Chat IA multi-tours avec LLM (GPT-4, Claude, Mistral…) |
| **Interagir vocalement** | Reconnaissance vocale (ASR) et synthèse vocale (TTS) |
| **Apprendre avec le temps** | Mémoire persistante hiérarchique (10 types de mémoire) |
| **Exécuter des tâches complexes** | Moteur de tâches autonome avec priorités et parallélisation |
| **Automatiser des workflows** | Moteur de workflows visuels avec nœuds et conditions |
| **Orchestrer plusieurs agents** | 14 agents spécialisés collaboratifs |
| **Générer du code et des images** | Développement logiciel autonome + génération d'images IA |
| **S'intégrer aux services externes** | MCP, Gmail, GitHub, Slack, Notion, Jira… |
| **Fonctionner offline** | Support de modèles locaux via Ollama |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AIOS Dashboard                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  AI Chat  │  │  Voice   │  │  Agents  │  │  Memory  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │Workflows │  │Monitoring│  │ Plugins  │  │  Models  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │ Terminal │  │ Security │  │  MCP /   │                    │
│  │          │  │          │  │Integrations│                   │
│  └──────────┘  └──────────┘  └──────────┘                    │
├─────────────────────────────────────────────────────────────────┤
│                     Next.js API Routes                          │
│  /api/chat  /api/voice  /api/agents  /api/memory  /api/tasks  │
│  /api/workflows  /api/plugins  /api/integrations  /api/models  │
│  /api/monitoring  /api/generate-image  /api/conversations      │
├─────────────────────────────────────────────────────────────────┤
│                     Service Layer                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │   LLM Engine   │  │   ASR Engine   │  │ Image Generator│   │
│  │ (z-ai-web-dev- │  │ (z-ai-web-dev- │  │ (z-ai-web-dev- │   │
│  │     sdk)       │  │     sdk)       │  │     sdk)       │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │  Prisma ORM    │  │  Zustand Store │  │ Socket.io WS   │   │
│  │  (SQLite)      │  │  (Client State)│  │ (Real-time)    │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                     Reverse Proxy / Gateway                     │
│                     Caddy (port 81 → 3000)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Flux de communication

```
Navigateur ←→ Caddy (port 81) ←→ Next.js (port 3000) ←→ SQLite / API
                                      ↕
                               Socket.io (port 3003) ←→ Real-time events
```

---

## Modules

### 💬 AI Chat
- Chat IA multi-tours avec réponses en streaming
- Rendu Markdown et coloration syntaxique du code
- Prompts système personnalisables (6 presets)
- Historique des conversations avec recherche
- Compteur de tokens

### 🎤 Voice
- Reconnaissance vocale temps réel via ASR (Whisper)
- Visualisation audio avec Canvas + AnalyserNode
- Indicateur de niveau audio
- Transcription multi-langues (7 langues)
- Envoi des transcriptions vers le chat

### 🤖 Agents
- 14 agents spécialisés pré-configurés :
  - 🧠 Coordinator, 💻 Developer, 🔒 Security, 🧠 Memory
  - 🔍 Research, ⚙️ System, 📊 Monitoring, 🔄 Workflow
  - 🎤 Voice, 👁️ Vision, 📝 Document, 🔗 MCP
  - 🤔 Reasoning, 📋 Planning
- Indicateurs de statut (active/idle/busy/error)
- Journal de communication inter-agents
- Assignation de tâches aux agents

### 🧠 Memory
- 10 types de mémoire : short_term, long_term, contextual, procedural, user, system, project, error, workflow, skill
- Score d'importance (0-100%)
- Compteur d'accès et statistiques
- Vue grille et timeline
- Recherche sémantique

### 🔄 Workflows
- Éditeur visuel de workflows
- 7 types de nœuds : Trigger, AI Agent, Tool, Condition, Output, Delay, Loop
- Contrôles d'exécution (Run, Stop, Pause)
- Historique des exécutions
- Variables et versionnage

### 📊 Monitoring
- Métriques temps réel : CPU, RAM, Agents actifs, Tâches
- Graphiques recharts (AreaChart, BarChart)
- Feed d'activité des agents
- Centre de notifications
- Score de santé système

### 🧩 Plugins
- 12 plugins pré-configurés (GPT-4, DALL-E, Whisper, Web Search…)
- Marketplace avec ratings et downloads
- Activation/désactivation par switch
- Filtrage par catégorie (8 catégories)

### ⚡ AI Models
- 9 modèles IA sur 6 providers (OpenAI, Anthropic, Mistral, Google, DeepSeek, Ollama)
- Barres de rating vitesse/qualité/coût
- Mode comparaison (jusqu'à 3 modèles)
- Configuration température/max tokens
- Chaîne de fallback configurable

### 💻 Terminal
- Interface terminal avec commandes intégrées
- 9 commandes : `help`, `status`, `agents`, `tasks`, `memory`, `clear`, `run`, `chat`, `scan`
- Historique de commandes (↑/↓)
- Autocomplete avec Tab
- Coloration syntaxique

### 🔒 Security
- 5 niveaux d'autonomie : Manuel → Pleinement Autonome
- Matrice de permissions (8 actions × 5 niveaux)
- Score de sécurité avec jauge circulaire
- Journal d'audit
- Zone de danger avec actions critiques

### 🔗 Integrations
- 12 intégrations : Gmail, Calendar, Drive, Notion, Slack, Discord, GitHub, GitLab, Jira, Trello, SQL, REST API
- Statut de connexion OAuth
- Historique de synchronisation
- Configuration par dialogue

---

## Stack technique

| Composant | Technologie | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.x |
| **Langage** | TypeScript | 5.x |
| **Runtime** | Bun | 1.x |
| **Styling** | Tailwind CSS 4 + shadcn/ui | - |
| **Base de données** | SQLite via Prisma ORM | 6.x |
| **State management** | Zustand | 5.x |
| **Animations** | Framer Motion | 12.x |
| **Charts** | Recharts | 2.x |
| **Temps réel** | Socket.io | 4.x |
| **AI SDK** | z-ai-web-dev-sdk | 0.0.18 |
| **Reverse proxy** | Caddy | - |
| **Icônes** | Lucide React | 0.525+ |
| **Markdown** | react-markdown + react-syntax-highlighter | - |

### Dépendances système

| Paquet | Usage | Requis |
|---|---|---|
| `bun` | Runtime JavaScript | ✅ Oui |
| `node` | Compatibilité Prisma/Next.js | ✅ Oui (≥18) |
| `caddy` | Reverse proxy / Gateway | ✅ Oui |

---

## Structure du projet

```
my-project/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Layout racine (dark mode par défaut)
│   │   ├── page.tsx                # Dashboard principal AIOS
│   │   ├── globals.css             # Thème futuriste AIOS
│   │   └── api/                    # Routes API (18 endpoints)
│   │       ├── chat/route.ts       # Chat IA avec LLM
│   │       ├── conversations/      # Gestion conversations
│   │       ├── memory/route.ts     # Système de mémoire
│   │       ├── agents/             # Gestion agents
│   │       ├── tasks/              # Gestion tâches
│   │       ├── workflows/          # Moteur workflows
│   │       ├── plugins/            # Gestion plugins
│   │       ├── integrations/       # Intégrations MCP
│   │       ├── voice/route.ts      # Reconnaissance vocale (ASR)
│   │       ├── generate-image/     # Génération d'images IA
│   │       └── monitoring/         # Métriques système
│   ├── components/
│   │   ├── modules/                # 11 modules AIOS
│   │   │   ├── ChatModule.tsx
│   │   │   ├── VoiceModule.tsx
│   │   │   ├── AgentsModule.tsx
│   │   │   ├── MemoryModule.tsx
│   │   │   ├── WorkflowsModule.tsx
│   │   │   ├── MonitoringModule.tsx
│   │   │   ├── PluginsModule.tsx
│   │   │   ├── ModelsModule.tsx
│   │   │   ├── TerminalModule.tsx
│   │   │   ├── SecurityModule.tsx
│   │   │   └── IntegrationsModule.tsx
│   │   └── ui/                     # shadcn/ui components
│   ├── lib/
│   │   ├── store.ts                # Zustand global store
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── auth.ts                 # Helper auth utilisateur par défaut
│   │   └── utils.ts                # Utilitaires (cn, etc.)
│   └── hooks/                      # Hooks React personnalisés
├── prisma/
│   └── schema.prisma               # Schéma DB (10 modèles)
├── db/
│   └── custom.db                   # Base SQLite
├── mini-services/
│   └── aios-ws/                    # Service WebSocket Socket.io
│       ├── index.ts                # Serveur WS (port 3003)
│       └── package.json
├── Caddyfile                       # Configuration reverse proxy
├── install.sh                      # Script d'installation automatique
├── requirements.txt                # Dépendances système
├── package.json                    # Dépendances npm
└── README.md                       # Ce fichier
```

---

## Installation

### Prérequis

| Prérequis | Version minimale | Vérification |
|---|---|---|
| **OS** | Debian 11+ / Ubuntu 20.04+ | `cat /etc/os-release` |
| **RAM** | 2 Go minimum | `free -h` |
| **Disque** | 1 Go libre | `df -h` |
| **Réseau** | Accès Internet | `ping -c 1 google.com` |

### Installation automatique (recommandée)

```bash
# Cloner le dépôt
git clone <repo-url> && cd my-project

# Rendre le script exécutable
chmod +x install.sh

# Lancer l'installation complète
sudo ./install.sh
```

Le script `install.sh` effectue :
1. Vérification de l'OS (Debian/Ubuntu)
2. Installation des dépendances système (curl, unzip, git, etc.)
3. Installation de Bun runtime
4. Installation de Node.js (pour Prisma)
5. Installation des dépendances npm du projet
6. Installation du mini-service WebSocket
7. Initialisation de la base de données (Prisma push)
8. Démarrage des services
9. Vérification de santé

Options du script :
```bash
sudo ./install.sh --skip-system    # Ne pas installer les paquets système
sudo ./install.sh --skip-bun       # Ne pas installer Bun (déjà installé)
sudo ./install.sh --dev            # Mode développement (avec hot-reload)
sudo ./install.sh --prod           # Mode production (build + start)
sudo ./install.sh --help           # Afficher l'aide
```

### Installation manuelle

#### 1. Installer les dépendances système

```bash
sudo apt update && sudo apt install -y \
  curl unzip git build-essential python3 \
  ca-certificates gnupg
```

#### 2. Installer Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

#### 3. Installer Node.js (requis pour Prisma)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 4. Cloner et installer le projet

```bash
git clone <repo-url>
cd my-project

# Installer les dépendances
bun install

# Installer le service WebSocket
cd mini-services/aios-ws && bun install && cd ../..
```

#### 5. Configurer la base de données

```bash
# La base SQLite est configurée par défaut avec :
# DATABASE_URL="file:./db/custom.db"
bun run db:push
```

#### 6. Démarrer les services

```bash
# Terminal 1 — Application Next.js
bun run dev

# Terminal 2 — Service WebSocket
cd mini-services/aios-ws && bun run dev
```

L'application est accessible sur **http://localhost:3000** (ou port 81 via Caddy).

### Configuration

#### Variables d'environnement

Créer un fichier `.env` à la racine :

```env
# Base de données (SQLite par défaut)
DATABASE_URL="file:./db/custom.db"

# Port de l'application Next.js (défaut: 3000)
PORT=3000

# Port du service WebSocket (défaut: 3003)
WS_PORT=3003
```

#### Configuration avancée

| Fichier | Usage |
|---|---|
| `prisma/schema.prisma` | Schéma de base de données |
| `Caddyfile` | Configuration du reverse proxy |
| `src/lib/store.ts` | Store Zustand (état global) |
| `mini-services/aios-ws/index.ts` | Configuration WebSocket |

---

## Utilisation

### Premier démarrage

1. Ouvrir l'application dans le navigateur
2. Le module **AI Chat** est actif par défaut
3. Commencer à taper un message — l'IA répond via le LLM
4. Naviguer entre les modules avec la barre latérale ou les touches `1` à `0`

### Commandes du terminal intégré

| Commande | Description |
|---|---|
| `help` | Afficher les commandes disponibles |
| `status` | Statut du système |
| `agents` | Lister les agents actifs |
| `tasks` | Lister les tâches |
| `memory` | Lister les mémoires |
| `clear` | Effacer le terminal |
| `run <tâche>` | Créer et exécuter une tâche |
| `chat <message>` | Envoyer un message à l'IA |
| `scan` | Lancer un scan de sécurité |

---

## API Reference

### Chat & Conversations

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Envoyer un message et obtenir une réponse IA |
| `GET` | `/api/conversations` | Lister les conversations |
| `POST` | `/api/conversations` | Créer une conversation |
| `GET` | `/api/conversations/[id]` | Détails d'une conversation + messages |
| `DELETE` | `/api/conversations/[id]` | Supprimer une conversation |

### Mémoire

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/memory?type=long_term` | Lister les mémoires (filtrable par type) |
| `POST` | `/api/memory` | Créer une mémoire |
| `DELETE` | `/api/memory?id=xxx` | Supprimer une mémoire |

### Agents

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/agents` | Lister les agents |
| `POST` | `/api/agents` | Créer un agent |
| `GET` | `/api/agents/[id]` | Détails d'un agent |
| `PATCH` | `/api/agents/[id]` | Mettre à jour un agent |
| `DELETE` | `/api/agents/[id]` | Supprimer un agent |

### Tâches

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks?status=pending` | Lister les tâches (filtrable) |
| `POST` | `/api/tasks` | Créer une tâche |
| `GET` | `/api/tasks/[id]` | Détails d'une tâche |
| `PATCH` | `/api/tasks/[id]` | Mettre à jour une tâche |
| `DELETE` | `/api/tasks/[id]` | Supprimer une tâche |

### Workflows

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/workflows` | Lister les workflows |
| `POST` | `/api/workflows` | Créer un workflow |
| `GET` | `/api/workflows/[id]` | Détails d'un workflow |
| `PATCH` | `/api/workflows/[id]` | Mettre à jour un workflow |
| `DELETE` | `/api/workflows/[id]` | Supprimer un workflow |
| `POST` | `/api/workflows/[id]/execute` | Exécuter un workflow |

### Plugins & Intégrations

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/plugins` | Lister les plugins |
| `POST` | `/api/plugins` | Installer un plugin |
| `PATCH` | `/api/plugins/[id]` | Configurer/activer un plugin |
| `GET` | `/api/integrations` | Lister les intégrations |
| `POST` | `/api/integrations` | Ajouter une intégration |

### IA & Monitoring

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/voice` | Transcrire un audio (ASR) |
| `POST` | `/api/generate-image` | Générer une image IA |
| `GET` | `/api/monitoring` | Métriques système |

---

## Modèle de données

```
User ───< Conversation ───< Message
  │                            │
  ├──< Memory ─────────────────┘
  ├──< Task ──── Agent (assignee)
  ├──< Workflow ───< WorkflowExecution
  │         └──< Task
  ├──< Integration
  └──< Plugin
```

### 10 modèles Prisma

| Modèle | Description | Champs clés |
|---|---|---|
| `User` | Utilisateur | email, name, preferences |
| `Conversation` | Conversation IA | title, model, systemPrompt, isArchived |
| `Message` | Message de chat | role, content, tokenCount, contentType |
| `Memory` | Mémoire persistante | type (10 types), importance, accessCount |
| `Agent` | Agent spécialisé | type (16 types), capabilities, isActive |
| `Task` | Tâche autonome | status, priority, progress, dueDate |
| `Workflow` | Workflow visuel | nodes (JSON), edges (JSON), status |
| `WorkflowExecution` | Exécution de workflow | input/output, nodeStates, duration |
| `Plugin` | Plugin/Skill | slug, isEnabled, rating, downloads |
| `Integration` | Service externe | type (12 types), status, credentials |

---

## Services

### Service WebSocket (port 3003)

Le mini-service `aios-ws` gère la communication temps réel :

| Événement | Direction | Description |
|---|---|---|
| `connection` / `disconnect` | Client ↔ Serveur | Cycle de vie connexion |
| `agent:status` | Serveur → Tous | Mise à jour statut agent |
| `agent:message` | Agent ↔ Agent | Communication inter-agents |
| `task:update` | Serveur → Tous | Changement de statut tâche |
| `workflow:progress` | Serveur → Tous | Progression workflow |
| `memory:update` | Serveur → Tous | Notification mémoire |
| `system:metrics` | Serveur → Tous | Métriques système (toutes les 30s) |
| `chat:stream` | Serveur → Client | Streaming tokens IA |
| `chat:typing` | Client ↔ Serveur | Indicateur de frappe |
| `notification` | Serveur → Tous | Notifications système |
| `health:check` | Client → Serveur | Vérification de santé |

---

## Raccourcis clavier

| Raccourci | Action |
|---|---|
| `1` - `9` | Naviguer vers le module correspondant |
| `0` | Naviguer vers le module Security |
| `⌘K` / `Ctrl+K` | Ouvrir la palette de commandes |
| `Escape` | Fermer les modales / palette |
| `Enter` | Envoyer un message (chat) |
| `↑` / `↓` | Historique des commandes (terminal) |
| `Tab` | Autocomplete (terminal) |

---

## Sécurité

### Niveaux d'autonomie

| Niveau | Description | Actions automatiques |
|---|---|---|
| 🔴 Manuel | L'utilisateur doit confirmer chaque action | Aucune |
| 🟡 Assisté | L'IA suggère, l'utilisateur confirme | Aucune |
| 🟢 Semi-autonome | Actions courantes automatiques | Tâches simples |
| 🔵 Supervisé | Actions automatiques avec supervision | La plupart, validation pour critiques |
| ⚪ Pleinement autonome | Toutes actions automatiques | Toutes (sauf destructives) |

### Bonnes pratiques

1. **Ne jamais stocker de secrets en clair** — les credentials d'intégration sont référencés, pas stockés
2. **Toujours valider les actions critiques** — le mode Supervised est recommandé
3. **Mettre à jour régulièrement** — `bun install` pour les mises à jour de sécurité
4. **Sauvegarder la base** — copier `db/custom.db` régulièrement
5. **Limiter les permissions** — utiliser le niveau d'autonomie le plus bas nécessaire

---

## Dépannage

| Problème | Solution |
|---|---|
| Page blanche | Vérifier que `bun run dev` tourne sur le port 3000 |
| WebSocket déconnecté | Vérifier que le service WS tourne : `lsof -i :3003` |
| Erreur Prisma | Lancer `bun run db:push` puis `bun run db:generate` |
| Erreur 500 /api/chat | Vérifier la clé API z-ai-web-dev-sdk |
| Port déjà utilisé | `lsof -i :3000` ou `:3003` pour identifier le processus |
| Lint en erreur | `bun run lint` pour voir les erreurs, `bun run lint --fix` pour corriger |
| Base de données corrompue | Supprimer `db/custom.db` et relancer `bun run db:push` |

### Vérification de santé

```bash
# Vérifier que l'app répond
curl -s http://localhost:3000/api/monitoring | head -1

# Vérifier le service WebSocket
curl -s http://localhost:3004/health

# Vérifier les processus
ps aux | grep -E "next|bun|socket"
```

---

## Roadmap

### Phase 1 ✅ (Actuel)
- [x] Chat IA avec LLM
- [x] Mémoire persistante (10 types)
- [x] Reconnaissance vocale (ASR)
- [x] Interface futuriste
- [x] Multi-agents (14 types)
- [x] Workflows visuels
- [x] Monitoring temps réel
- [x] Terminal intégré
- [x] Sécurité et permissions

### Phase 2 (Prochain)
- [ ] Streaming des réponses IA (tokens en temps réel)
- [ ] Synthèse vocale (TTS)
- [ ] Mode offline avec Ollama
- [ ] Système de plugins dynamiques (chargement à chaud)
- [ ] OAuth2 pour les intégrations
- [ ] Base vectorielle (Qdrant/ChromaDB)

### Phase 3 (Futur)
- [ ] Automatisation OS (Playwright, PyAutoGUI)
- [ ] Vision IA (analyse d'images et documents)
- [ ] Raisonnement avancé (Chain of Thought, Tree of Thoughts)
- [ ] Orchestration intelligente des modèles
- [ ] Docker Compose pour le déploiement

### Phase 4 (Vision)
- [ ] Auto-amélioration continue
- [ ] Agents persistants autonomes
- [ ] Apprentissage contextuel avancé
- [ ] AI Operating System complet

---

## Licence

MIT — Libre d'utilisation, modification et distribution.
