'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Activity,
  Bot,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Zap,
  Users,
  Clock,
  ArrowRight,
  Trash2,
  Eye,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'idle' | 'active' | 'busy' | 'error'
type AgentType =
  | 'coordinator'
  | 'developer'
  | 'security'
  | 'memory'
  | 'research'
  | 'system'
  | 'monitoring'
  | 'workflow'
  | 'voice'
  | 'vision'
  | 'document'
  | 'mcp'
  | 'reasoning'
  | 'planning'

interface AgentData {
  id: string
  name: string
  type: AgentType
  description?: string | null
  avatar?: string | null
  capabilities?: string | null
  isActive: boolean
  model?: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    tasksAssigned: number
    messages: number
    conversations?: number
  }
}

interface AgentWithStatus extends AgentData {
  status: AgentStatus
  currentTask?: string
  capabilitiesList: string[]
}

interface CommMessage {
  id: string
  from: string
  to: string
  message: string
  timestamp: string
}

interface ActivityEntry {
  id: string
  agentName: string
  action: string
  timestamp: string
  type: 'task' | 'message' | 'status' | 'creation'
}

// ─── Pre-defined agents (fallback) ───────────────────────────────────────────

const DEFAULT_AGENTS: AgentWithStatus[] = [
  {
    id: 'agent-coordinator',
    name: 'Coordinator Agent',
    type: 'coordinator',
    avatar: '🧠',
    description: 'Global orchestration and task distribution',
    capabilities: JSON.stringify(['task distribution', 'agent coordination', 'priority management', 'workflow orchestration']),
    isActive: true,
    status: 'active',
    currentTask: 'Distributing subtasks for Project Alpha',
    capabilitiesList: ['task distribution', 'agent coordination', 'priority management', 'workflow orchestration'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 24, messages: 156 },
  },
  {
    id: 'agent-developer',
    name: 'Developer Agent',
    type: 'developer',
    avatar: '💻',
    description: 'Code generation, debugging, refactoring',
    capabilities: JSON.stringify(['code generation', 'debugging', 'refactoring', 'code review', 'testing']),
    isActive: true,
    status: 'busy',
    currentTask: 'Refactoring authentication module',
    capabilitiesList: ['code generation', 'debugging', 'refactoring', 'code review', 'testing'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 42, messages: 312 },
  },
  {
    id: 'agent-security',
    name: 'Security Agent',
    type: 'security',
    avatar: '🔒',
    description: 'Security analysis, vulnerability detection',
    capabilities: JSON.stringify(['vulnerability scanning', 'code audit', 'dependency check', 'threat analysis']),
    isActive: true,
    status: 'idle',
    capabilitiesList: ['vulnerability scanning', 'code audit', 'dependency check', 'threat analysis'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 18, messages: 89 },
  },
  {
    id: 'agent-memory',
    name: 'Memory Agent',
    type: 'memory',
    avatar: '🧠',
    description: 'Memory management and retrieval',
    capabilities: JSON.stringify(['memory storage', 'retrieval', 'summarization', 'context management']),
    isActive: true,
    status: 'active',
    currentTask: 'Indexing conversation memories',
    capabilitiesList: ['memory storage', 'retrieval', 'summarization', 'context management'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 12, messages: 67 },
  },
  {
    id: 'agent-research',
    name: 'Research Agent',
    type: 'research',
    avatar: '🔍',
    description: 'Web search and information gathering',
    capabilities: JSON.stringify(['web search', 'data analysis', 'summarization', 'fact-checking']),
    isActive: true,
    status: 'idle',
    capabilitiesList: ['web search', 'data analysis', 'summarization', 'fact-checking'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 15, messages: 94 },
  },
  {
    id: 'agent-system',
    name: 'System Agent',
    type: 'system',
    avatar: '⚙️',
    description: 'System operations and monitoring',
    capabilities: JSON.stringify(['system ops', 'health checks', 'resource management', 'logging']),
    isActive: true,
    status: 'active',
    currentTask: 'Running scheduled health checks',
    capabilitiesList: ['system ops', 'health checks', 'resource management', 'logging'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 31, messages: 203 },
  },
  {
    id: 'agent-monitoring',
    name: 'Monitoring Agent',
    type: 'monitoring',
    avatar: '📊',
    description: 'Performance and health monitoring',
    capabilities: JSON.stringify(['performance monitoring', 'alerting', 'metrics collection', 'reporting']),
    isActive: true,
    status: 'active',
    currentTask: 'Collecting system metrics',
    capabilitiesList: ['performance monitoring', 'alerting', 'metrics collection', 'reporting'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 8, messages: 45 },
  },
  {
    id: 'agent-workflow',
    name: 'Workflow Agent',
    type: 'workflow',
    avatar: '🔄',
    description: 'Workflow execution and management',
    capabilities: JSON.stringify(['workflow execution', 'pipeline management', 'automation', 'scheduling']),
    isActive: true,
    status: 'idle',
    capabilitiesList: ['workflow execution', 'pipeline management', 'automation', 'scheduling'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 22, messages: 134 },
  },
  {
    id: 'agent-voice',
    name: 'Voice Agent',
    type: 'voice',
    avatar: '🎤',
    description: 'Speech recognition and synthesis',
    capabilities: JSON.stringify(['speech-to-text', 'text-to-speech', 'voice commands', 'transcription']),
    isActive: true,
    status: 'idle',
    capabilitiesList: ['speech-to-text', 'text-to-speech', 'voice commands', 'transcription'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 5, messages: 28 },
  },
  {
    id: 'agent-vision',
    name: 'Vision Agent',
    type: 'vision',
    avatar: '👁️',
    description: 'Image and document analysis',
    capabilities: JSON.stringify(['image analysis', 'OCR', 'document parsing', 'visual QA']),
    isActive: true,
    status: 'idle',
    capabilitiesList: ['image analysis', 'OCR', 'document parsing', 'visual QA'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 9, messages: 53 },
  },
  {
    id: 'agent-document',
    name: 'Document Agent',
    type: 'document',
    avatar: '📝',
    description: 'Document processing and generation',
    capabilities: JSON.stringify(['document generation', 'formatting', 'template management', 'PDF processing']),
    isActive: true,
    status: 'busy',
    currentTask: 'Generating project documentation',
    capabilitiesList: ['document generation', 'formatting', 'template management', 'PDF processing'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 14, messages: 76 },
  },
  {
    id: 'agent-mcp',
    name: 'MCP Agent',
    type: 'mcp',
    avatar: '🔗',
    description: 'External service integration',
    capabilities: JSON.stringify(['API integration', 'service discovery', 'data sync', 'webhook management']),
    isActive: true,
    status: 'idle',
    capabilitiesList: ['API integration', 'service discovery', 'data sync', 'webhook management'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 7, messages: 41 },
  },
  {
    id: 'agent-reasoning',
    name: 'Reasoning Agent',
    type: 'reasoning',
    avatar: '🤔',
    description: 'Advanced reasoning and planning',
    capabilities: JSON.stringify(['logical reasoning', 'planning', 'decision trees', 'causal analysis']),
    isActive: true,
    status: 'active',
    currentTask: 'Analyzing complex dependency chain',
    capabilitiesList: ['logical reasoning', 'planning', 'decision trees', 'causal analysis'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 11, messages: 82 },
  },
  {
    id: 'agent-planning',
    name: 'Planning Agent',
    type: 'planning',
    avatar: '📋',
    description: 'Strategic planning and scheduling',
    capabilities: JSON.stringify(['task planning', 'scheduling', 'resource allocation', 'milestone tracking']),
    isActive: true,
    status: 'idle',
    capabilitiesList: ['task planning', 'scheduling', 'resource allocation', 'milestone tracking'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { tasksAssigned: 16, messages: 98 },
  },
]

// Mock communication messages
const MOCK_COMM_MESSAGES: CommMessage[] = [
  { id: '1', from: 'Coordinator Agent', to: 'Developer Agent', message: 'Assigning code review task for PR #42', timestamp: '2 min ago' },
  { id: '2', from: 'Security Agent', to: 'Coordinator Agent', message: 'Vulnerability scan complete - 0 critical issues', timestamp: '5 min ago' },
  { id: '3', from: 'Monitoring Agent', to: 'System Agent', message: 'CPU usage spike detected on node-3', timestamp: '8 min ago' },
  { id: '4', from: 'Coordinator Agent', to: 'Reasoning Agent', message: 'Requesting analysis of dependency chain', timestamp: '12 min ago' },
  { id: '5', from: 'Memory Agent', to: 'Research Agent', message: 'Providing context for query: latest React patterns', timestamp: '15 min ago' },
  { id: '6', from: 'Workflow Agent', to: 'Coordinator Agent', message: 'Pipeline "deploy-staging" completed successfully', timestamp: '20 min ago' },
  { id: '7', from: 'Developer Agent', to: 'Document Agent', message: 'Generating API docs for auth module', timestamp: '25 min ago' },
  { id: '8', from: 'Vision Agent', to: 'Memory Agent', message: 'Storing extracted text from uploaded diagram', timestamp: '30 min ago' },
]

// Mock activity timeline
const MOCK_ACTIVITY: ActivityEntry[] = [
  { id: '1', agentName: 'Coordinator Agent', action: 'Distributed 3 subtasks across agents', timestamp: '2 min ago', type: 'task' },
  { id: '2', agentName: 'Developer Agent', action: 'Started refactoring auth module', timestamp: '5 min ago', type: 'task' },
  { id: '3', agentName: 'Security Agent', action: 'Completed vulnerability scan', timestamp: '8 min ago', type: 'task' },
  { id: '4', agentName: 'Memory Agent', action: 'Indexed 12 new conversation memories', timestamp: '12 min ago', type: 'task' },
  { id: '5', agentName: 'Monitoring Agent', action: 'Alert: CPU usage spike on node-3', timestamp: '15 min ago', type: 'status' },
  { id: '6', agentName: 'Reasoning Agent', action: 'Completed dependency chain analysis', timestamp: '20 min ago', type: 'task' },
  { id: '7', agentName: 'Document Agent', action: 'Generated project documentation v2.1', timestamp: '25 min ago', type: 'task' },
  { id: '8', agentName: 'Workflow Agent', action: 'Pipeline "deploy-staging" completed', timestamp: '30 min ago', type: 'status' },
]

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AgentStatus, { color: string; bgColor: string; borderColor: string; glowColor: string; label: string; pulse: boolean }> = {
  active: { color: 'text-emerald-400', bgColor: 'bg-emerald-400', borderColor: 'border-emerald-400/40', glowColor: 'shadow-emerald-400/20', label: 'Active', pulse: true },
  idle: { color: 'text-amber-400', bgColor: 'bg-amber-400', borderColor: 'border-amber-400/30', glowColor: 'shadow-amber-400/10', label: 'Idle', pulse: false },
  busy: { color: 'text-cyan-400', bgColor: 'bg-cyan-400', borderColor: 'border-cyan-400/40', glowColor: 'shadow-cyan-400/20', label: 'Busy', pulse: true },
  error: { color: 'text-red-400', bgColor: 'bg-red-400', borderColor: 'border-red-400/40', glowColor: 'shadow-red-400/20', label: 'Error', pulse: true },
}

const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  coordinator: 'Coordinator',
  developer: 'Developer',
  security: 'Security',
  memory: 'Memory',
  research: 'Research',
  system: 'System',
  monitoring: 'Monitoring',
  workflow: 'Workflow',
  voice: 'Voice',
  vision: 'Vision',
  document: 'Document',
  mcp: 'MCP',
  reasoning: 'Reasoning',
  planning: 'Planning',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentsModule() {
  const [agents, setAgents] = useState<AgentWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [selectedAgentForTask, setSelectedAgentForTask] = useState<string | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentWithStatus | null>(null)
  const [newAgent, setNewAgent] = useState({ name: '', type: 'coordinator' as AgentType, description: '', capabilities: '' })
  const [taskTitle, setTaskTitle] = useState('')
  const [commMessages] = useState<CommMessage[]>(MOCK_COMM_MESSAGES)
  const [activityLog] = useState<ActivityEntry[]>(MOCK_ACTIVITY)
  const [filterStatus, setFilterStatus] = useState<AgentStatus | 'all'>('all')
  const [creating, setCreating] = useState(false)

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) {
        const data: AgentData[] = await res.json()
        if (data.length > 0) {
          const withStatus: AgentWithStatus[] = data.map((a) => ({
            ...a,
            status: (a.isActive ? 'active' : 'idle') as AgentStatus,
            capabilitiesList: a.capabilities ? JSON.parse(a.capabilities) : [],
          }))
          setAgents(withStatus)
        } else {
          setAgents(DEFAULT_AGENTS)
        }
      } else {
        setAgents(DEFAULT_AGENTS)
      }
    } catch {
      setAgents(DEFAULT_AGENTS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // Create agent
  const handleCreateAgent = async () => {
    if (!newAgent.name) return
    setCreating(true)
    try {
      const capabilities = newAgent.capabilities
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgent.name,
          type: newAgent.type,
          description: newAgent.description,
          capabilities,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setAgents((prev) => [
          {
            ...created,
            status: 'idle' as AgentStatus,
            capabilitiesList: capabilities,
          },
          ...prev,
        ])
        setNewAgent({ name: '', type: 'coordinator', description: '', capabilities: '' })
        setCreateDialogOpen(false)
      }
    } catch {
      // silently fail
    } finally {
      setCreating(false)
    }
  }

  // Assign task (mock)
  const handleAssignTask = () => {
    if (!taskTitle || !selectedAgentForTask) return
    setAgents((prev) =>
      prev.map((a) =>
        a.id === selectedAgentForTask
          ? { ...a, status: 'busy' as AgentStatus, currentTask: taskTitle }
          : a
      )
    )
    setTaskTitle('')
    setSelectedAgentForTask(null)
    setTaskDialogOpen(false)
  }

  // Toggle agent active state
  const handleToggleAgent = async (agent: AgentWithStatus) => {
    try {
      await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !agent.isActive }),
      })
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agent.id
            ? { ...a, isActive: !a.isActive, status: !a.isActive ? 'active' : 'idle' }
            : a
        )
      )
    } catch {
      // silently fail
    }
  }

  // Stats
  const totalAgents = agents.length
  const activeAgents = agents.filter((a) => a.status === 'active' || a.status === 'busy').length
  const idleAgents = agents.filter((a) => a.status === 'idle').length
  const errorAgents = agents.filter((a) => a.status === 'error').length

  const filteredAgents = filterStatus === 'all' ? agents : agents.filter((a) => a.status === filterStatus)

  // Get collaborating agents (agents that are active/busy together)
  const collaboratingAgents = agents.filter((a) => a.status === 'active' || a.status === 'busy')

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="size-6 text-cyan-400" />
            Multi-Agent Orchestration
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage and coordinate specialized AI agents
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2">
              <Plus className="size-4" />
              New Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">Create New Agent</DialogTitle>
              <DialogDescription className="text-slate-400">
                Register a new specialized agent in the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Name</Label>
                <Input
                  placeholder="Agent name..."
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Type</Label>
                <Select
                  value={newAgent.type}
                  onValueChange={(v) => setNewAgent({ ...newAgent, type: v as AgentType })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {Object.entries(AGENT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-white focus:bg-slate-700 focus:text-white">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  placeholder="What does this agent do..."
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white min-h-20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Capabilities (comma-separated)</Label>
                <Input
                  placeholder="e.g. code generation, debugging, testing"
                  value={newAgent.capabilities}
                  onChange={(e) => setNewAgent({ ...newAgent, capabilities: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-slate-600 text-slate-300">
                Cancel
              </Button>
              <Button onClick={handleCreateAgent} disabled={creating || !newAgent.name} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                {creating ? 'Creating...' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Agents', value: totalAgents, icon: Bot, color: 'text-cyan-400' },
          { label: 'Active', value: activeAgents, icon: Activity, color: 'text-emerald-400' },
          { label: 'Idle', value: idleAgents, icon: Clock, color: 'text-amber-400' },
          { label: 'Errors', value: errorAgents, icon: Zap, color: 'text-red-400' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-slate-900/80 border-slate-700/50 py-4 shadow-lg shadow-cyan-500/5">
            <CardContent className="flex items-center gap-3 px-4">
              <stat.icon className={`size-5 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter + Coordination */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 mr-1">Filter:</span>
          {(['all', 'active', 'busy', 'idle', 'error'] as const).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={filterStatus === status ? 'default' : 'outline'}
              onClick={() => setFilterStatus(status)}
              className={
                filterStatus === status
                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-7'
                  : 'border-slate-600 text-slate-400 hover:text-white text-xs h-7'
              }
            >
              {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
            </Button>
          ))}
        </div>

        {/* Coordination viz */}
        {collaboratingAgents.length > 1 && (
          <div className="lg:ml-auto flex items-center gap-2 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/40">
            <Users className="size-4 text-cyan-400" />
            <span className="text-xs text-slate-400">Collaborating:</span>
            <div className="flex items-center gap-1">
              {collaboratingAgents.slice(0, 5).map((agent, i) => (
                <TooltipProvider key={agent.id}>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="text-lg" title={agent.name}>
                        {agent.avatar || '🤖'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-800 text-white border-slate-600">
                      {agent.name} - {agent.currentTask || STATUS_CONFIG[agent.status].label}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {collaboratingAgents.length > 5 && (
                <span className="text-xs text-slate-400">+{collaboratingAgents.length - 5}</span>
              )}
              {collaboratingAgents.length > 1 && (
                <div className="flex items-center gap-0.5 ml-1">
                  <span className="text-[10px] text-cyan-400">linked</span>
                  <ArrowRight className="size-3 text-cyan-400/60" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Agent Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="bg-slate-900/80 border-slate-700/50 animate-pulse py-4">
              <CardHeader className="pb-2">
                <div className="h-5 bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-700/50 rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-slate-700/30 rounded w-full mb-2" />
                <div className="h-3 bg-slate-700/30 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAgents.map((agent) => {
            const config = STATUS_CONFIG[agent.status]
            const isExpanded = expandedAgent === agent.id

            return (
              <Card
                key={agent.id}
                className={`bg-slate-900/80 border py-0 transition-all duration-300 cursor-pointer shadow-lg ${
                  isExpanded ? 'col-span-1 sm:col-span-2' : ''
                } ${config.borderColor} hover:${config.borderColor.replace('/40', '/60')} hover:shadow-${config.glowColor}`}
                style={{
                  boxShadow: agent.status === 'active' || agent.status === 'busy'
                    ? `0 0 20px ${agent.status === 'active' ? 'rgba(52,211,153,0.08)' : 'rgba(34,211,238,0.08)'}`
                    : undefined,
                }}
                onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{agent.avatar || '🤖'}</span>
                      <div>
                        <CardTitle className="text-sm text-white flex items-center gap-2">
                          {agent.name}
                          <span className={`inline-flex items-center gap-1 ${config.color}`}>
                            <span className={`inline-block size-2 rounded-full ${config.bgColor} ${config.pulse ? 'animate-pulse' : ''}`} />
                            <span className="text-[10px]">{config.label}</span>
                          </span>
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400 mt-0.5">
                          {AGENT_TYPE_LABELS[agent.type as AgentType]} Agent
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-slate-400 hover:text-cyan-400"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAgent(agent)
                                setDetailDialogOpen(true)
                              }}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-800 text-white border-slate-600">View details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="size-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4 pt-0">
                  {agent.currentTask && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs">
                      <Zap className="size-3 text-cyan-400" />
                      <span className="text-cyan-300 truncate">{agent.currentTask}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mb-2">
                    {agent.capabilitiesList.slice(0, isExpanded ? undefined : 3).map((cap) => (
                      <Badge
                        key={cap}
                        variant="outline"
                        className="text-[10px] h-5 border-slate-600 text-slate-300 bg-slate-800/50"
                      >
                        {cap}
                      </Badge>
                    ))}
                    {!isExpanded && agent.capabilitiesList.length > 3 && (
                      <Badge variant="outline" className="text-[10px] h-5 border-slate-700 text-slate-500">
                        +{agent.capabilitiesList.length - 3}
                      </Badge>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 mt-2 pt-3 border-t border-slate-700/50">
                      {/* Description */}
                      {agent.description && (
                        <p className="text-xs text-slate-400">{agent.description}</p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-800/50 rounded p-2 text-center">
                          <p className="text-sm font-bold text-white">{agent._count?.tasksAssigned ?? 0}</p>
                          <p className="text-[10px] text-slate-400">Tasks</p>
                        </div>
                        <div className="bg-slate-800/50 rounded p-2 text-center">
                          <p className="text-sm font-bold text-white">{agent._count?.messages ?? 0}</p>
                          <p className="text-[10px] text-slate-400">Messages</p>
                        </div>
                        <div className="bg-slate-800/50 rounded p-2 text-center">
                          <p className="text-sm font-bold text-white">{agent.isActive ? 'ON' : 'OFF'}</p>
                          <p className="text-[10px] text-slate-400">Status</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs h-7 border-cyan-600/40 text-cyan-400 hover:bg-cyan-600/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAgentForTask(agent.id)
                            setTaskDialogOpen(true)
                          }}
                        >
                          <Zap className="size-3 mr-1" />
                          Assign Task
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs h-7 border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleAgent(agent)
                          }}
                        >
                          {agent.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Bottom Section: Communication Log + Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Communication Log */}
        <Card className="bg-slate-900/80 border-slate-700/50 shadow-lg py-4">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <MessageSquare className="size-4 text-cyan-400" />
              Agent Communication Log
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Recent inter-agent messages
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {commMessages.map((msg) => (
                  <div key={msg.id} className="flex gap-2 group">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="size-2 rounded-full bg-cyan-400 mt-1.5 group-hover:bg-cyan-300 transition-colors" />
                      {msg.id !== commMessages[commMessages.length - 1].id && (
                        <div className="w-px h-full bg-slate-700/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-cyan-400">{msg.from}</span>
                        <ArrowRight className="size-3 text-slate-500" />
                        <span className="text-xs font-medium text-emerald-400">{msg.to}</span>
                        <span className="text-[10px] text-slate-500 ml-auto shrink-0">{msg.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 truncate">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card className="bg-slate-900/80 border-slate-700/50 shadow-lg py-4">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Clock className="size-4 text-cyan-400" />
              Activity Timeline
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Recent agent activity
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {activityLog.map((entry) => (
                  <div key={entry.id} className="flex gap-2 group">
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`size-2 rounded-full mt-1.5 transition-colors ${
                          entry.type === 'task'
                            ? 'bg-emerald-400 group-hover:bg-emerald-300'
                            : entry.type === 'status'
                              ? 'bg-amber-400 group-hover:bg-amber-300'
                              : 'bg-cyan-400 group-hover:bg-cyan-300'
                        }`}
                      />
                      {entry.id !== activityLog[activityLog.length - 1].id && (
                        <div className="w-px h-full bg-slate-700/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white">{entry.agentName}</span>
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1 border-slate-600 text-slate-400"
                        >
                          {entry.type}
                        </Badge>
                        <span className="text-[10px] text-slate-500 ml-auto shrink-0">{entry.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{entry.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Task Assignment Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Assign Task</DialogTitle>
            <DialogDescription className="text-slate-400">
              Assign a new task to{' '}
              {agents.find((a) => a.id === selectedAgentForTask)?.name || 'agent'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Task Title</Label>
              <Input
                placeholder="Describe the task..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleAssignTask} disabled={!taskTitle} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 flex items-center gap-2">
              {selectedAgent?.avatar && <span className="text-2xl">{selectedAgent.avatar}</span>}
              {selectedAgent?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedAgent?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-4 py-2">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${STATUS_CONFIG[selectedAgent.status].bgColor} ${STATUS_CONFIG[selectedAgent.status].pulse ? 'animate-pulse' : ''}`} />
                <span className={`text-sm ${STATUS_CONFIG[selectedAgent.status].color}`}>
                  {STATUS_CONFIG[selectedAgent.status].label}
                </span>
                <Separator orientation="vertical" className="h-4 bg-slate-700" />
                <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                  {AGENT_TYPE_LABELS[selectedAgent.type as AgentType]}
                </Badge>
              </div>

              {/* Current Task */}
              {selectedAgent.currentTask && (
                <div className="bg-slate-800/60 rounded-lg p-3 border border-cyan-400/20">
                  <p className="text-xs text-slate-400 mb-1">Current Task</p>
                  <p className="text-sm text-cyan-300">{selectedAgent.currentTask}</p>
                </div>
              )}

              {/* Capabilities */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Capabilities</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.capabilitiesList.map((cap) => (
                    <Badge key={cap} variant="outline" className="text-xs border-cyan-600/40 text-cyan-300 bg-cyan-900/20">
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{selectedAgent._count?.tasksAssigned ?? 0}</p>
                  <p className="text-[10px] text-slate-400">Tasks Assigned</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{selectedAgent._count?.messages ?? 0}</p>
                  <p className="text-[10px] text-slate-400">Messages</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{selectedAgent._count?.conversations ?? 0}</p>
                  <p className="text-[10px] text-slate-400">Conversations</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                  onClick={() => {
                    setSelectedAgentForTask(selectedAgent.id)
                    setDetailDialogOpen(false)
                    setTaskDialogOpen(true)
                  }}
                >
                  <Zap className="size-3 mr-1" />
                  Assign Task
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => handleToggleAgent(selectedAgent)}
                >
                  {selectedAgent.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </div>
      </ScrollArea>
    </div>
  )
}
