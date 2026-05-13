import { create } from "zustand";

// ─── Type Definitions ───────────────────────────────────────────────────────

export type AIModule =
  | "chat"
  | "agents"
  | "memory"
  | "workflows"
  | "monitoring"
  | "plugins"
  | "models"
  | "terminal"
  | "security"
  | "integrations"
  | "voice";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: "active" | "idle" | "error" | "offline";
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Memory {
  id: string;
  type: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  progress: number;
  output?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "paused" | "archived";
  nodes: string; // JSON string
  edges: string; // JSON string
  createdAt: string;
  updatedAt: string;
}

export interface Plugin {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  version: string;
  description?: string;
  config?: string; // JSON string
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected" | "error";
  config?: string; // JSON string
  createdAt: string;
  updatedAt: string;
}

export interface SystemMetrics {
  totalConversations: number;
  totalMessages: number;
  totalMemories: number;
  activeAgents: number;
  pendingTasks: number;
  activeWorkflows: number;
  installedPlugins: number;
  connectedIntegrations: number;
  uptime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  dismissed: boolean;
}

// ─── Store Interface ────────────────────────────────────────────────────────

interface AIOSStore {
  // Navigation
  activeModule: AIModule;
  setActiveModule: (module: AIModule) => void;

  // Chat
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isChatLoading: boolean;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setChatLoading: (loading: boolean) => void;

  // Agents
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  updateAgent: (id: string, data: Partial<Agent>) => void;

  // Memory
  memories: Memory[];
  memoryFilter: string;
  setMemories: (memories: Memory[]) => void;
  setMemoryFilter: (filter: string) => void;

  // Tasks
  tasks: Task[];
  taskFilter: string;
  setTasks: (tasks: Task[]) => void;
  setTaskFilter: (filter: string) => void;
  updateTask: (id: string, data: Partial<Task>) => void;

  // Workflows
  workflows: Workflow[];
  setWorkflows: (workflows: Workflow[]) => void;

  // Plugins
  plugins: Plugin[];
  setPlugins: (plugins: Plugin[]) => void;

  // Integrations
  integrations: Integration[];
  setIntegrations: (integrations: Integration[]) => void;

  // System
  systemMetrics: SystemMetrics;
  notifications: Notification[];
  isVoiceActive: boolean;
  isListening: boolean;
  setSystemMetrics: (metrics: SystemMetrics) => void;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "dismissed">) => void;
  dismissNotification: (id: string) => void;
  setVoiceActive: (active: boolean) => void;
  setListening: (listening: boolean) => void;

  // UI State
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

// ─── Store Implementation ───────────────────────────────────────────────────

export const useAIOSStore = create<AIOSStore>((set) => ({
  // Navigation
  activeModule: "chat",
  setActiveModule: (module) => set({ activeModule: module }),

  // Chat
  conversations: [],
  activeConversationId: null,
  messages: [],
  isChatLoading: false,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setChatLoading: (loading) => set({ isChatLoading: loading }),

  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),
  updateAgent: (id, data) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, ...data } : agent
      ),
    })),

  // Memory
  memories: [],
  memoryFilter: "all",
  setMemories: (memories) => set({ memories }),
  setMemoryFilter: (filter) => set({ memoryFilter: filter }),

  // Tasks
  tasks: [],
  taskFilter: "all",
  setTasks: (tasks) => set({ tasks }),
  setTaskFilter: (filter) => set({ taskFilter: filter }),
  updateTask: (id, data) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...data } : task
      ),
    })),

  // Workflows
  workflows: [],
  setWorkflows: (workflows) => set({ workflows }),

  // Plugins
  plugins: [],
  setPlugins: (plugins) => set({ plugins }),

  // Integrations
  integrations: [],
  setIntegrations: (integrations) => set({ integrations }),

  // System
  systemMetrics: {
    totalConversations: 0,
    totalMessages: 0,
    totalMemories: 0,
    activeAgents: 0,
    pendingTasks: 0,
    activeWorkflows: 0,
    installedPlugins: 0,
    connectedIntegrations: 0,
  },
  notifications: [],
  isVoiceActive: false,
  isListening: false,
  setSystemMetrics: (metrics) => set({ systemMetrics: metrics }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          dismissed: false,
        },
        ...state.notifications,
      ],
    })),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, dismissed: true } : n
      ),
    })),
  setVoiceActive: (active) => set({ isVoiceActive: active }),
  setListening: (listening) => set({ isListening: listening }),

  // UI State
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
