'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Zap,
  Bot,
  Wrench,
  GitBranch,
  ArrowRight,
  Clock,
  RotateCw,
  Play,
  Pause,
  Square,
  Plus,
  Workflow,
  Trash2,
  Eye,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  Globe,
  Sparkles,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type NodeType = 'trigger' | 'agent' | 'tool' | 'condition' | 'output' | 'delay' | 'loop'
type WorkflowStatus = 'draft' | 'active' | 'archived' | 'error'
type NodeStatus = 'idle' | 'running' | 'completed' | 'error'

interface WorkflowNode {
  id: string
  type: NodeType
  label: string
  status: NodeStatus
  config?: Record<string, unknown>
}

interface WorkflowEdge {
  id: string
  from: string
  to: string
  label?: string
}

interface WorkflowData {
  id: string
  name: string
  description?: string
  nodes: string
  edges: string
  status: WorkflowStatus
  icon?: string
  category?: string
  version: number
  createdAt: string
  updatedAt: string
  _count?: { tasks: number; executions: number }
  executions?: WorkflowExecution[]
}

interface WorkflowExecution {
  id: string
  status: string
  startedAt: string
  completedAt?: string
  duration?: number
  error?: string
}

// ─── Node Type Config ────────────────────────────────────────────────────────

const NODE_CONFIG: Record<NodeType, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string; label: string }> = {
  trigger: {
    icon: <Zap className="h-4 w-4" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'Trigger',
  },
  agent: {
    icon: <Bot className="h-4 w-4" />,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    label: 'AI Agent',
  },
  tool: {
    icon: <Wrench className="h-4 w-4" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    label: 'Tool',
  },
  condition: {
    icon: <GitBranch className="h-4 w-4" />,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    label: 'Condition',
  },
  output: {
    icon: <ArrowRight className="h-4 w-4" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    label: 'Output',
  },
  delay: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    label: 'Delay',
  },
  loop: {
    icon: <RotateCw className="h-4 w-4" />,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    label: 'Loop',
  },
}

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-slate-500', icon: <Activity className="h-3 w-3" /> },
  active: { label: 'Active', color: 'bg-emerald-500', icon: <CheckCircle2 className="h-3 w-3" /> },
  archived: { label: 'Archived', color: 'bg-zinc-500', icon: <Clock className="h-3 w-3" /> },
  error: { label: 'Error', color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
}

const NODE_STATUS_CONFIG: Record<NodeStatus, { color: string; icon: React.ReactNode }> = {
  idle: { color: 'bg-slate-400', icon: <Timer className="h-3 w-3" /> },
  running: { color: 'bg-amber-400', icon: <Play className="h-3 w-3" /> },
  completed: { color: 'bg-emerald-400', icon: <CheckCircle2 className="h-3 w-3" /> },
  error: { color: 'bg-red-400', icon: <XCircle className="h-3 w-3" /> },
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_WORKFLOWS: WorkflowData[] = [
  {
    id: 'wf-1',
    name: 'Email Processor',
    description: 'Automatically process incoming emails, classify them, and route to appropriate agents',
    nodes: JSON.stringify([
      { id: 'n1', type: 'trigger', label: 'New Email', status: 'idle' },
      { id: 'n2', type: 'agent', label: 'Classify Email', status: 'idle' },
      { id: 'n3', type: 'condition', label: 'Is Spam?', status: 'idle' },
      { id: 'n4', type: 'agent', label: 'Auto Reply', status: 'idle' },
      { id: 'n5', type: 'tool', label: 'Send Email', status: 'idle' },
      { id: 'n6', type: 'output', label: 'Log Result', status: 'idle' },
    ] as WorkflowNode[]),
    edges: JSON.stringify([
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3' },
      { id: 'e3', from: 'n3', to: 'n4', label: 'No' },
      { id: 'e4', from: 'n4', to: 'n5' },
      { id: 'e5', from: 'n5', to: 'n6' },
    ] as WorkflowEdge[]),
    status: 'active',
    icon: '📧',
    category: 'automation',
    version: 3,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    _count: { tasks: 12, executions: 45 },
  },
  {
    id: 'wf-2',
    name: 'Code Review Pipeline',
    description: 'Automated code review with AI analysis and security scanning',
    nodes: JSON.stringify([
      { id: 'n1', type: 'trigger', label: 'PR Created', status: 'idle' },
      { id: 'n2', type: 'agent', label: 'Code Analysis', status: 'idle' },
      { id: 'n3', type: 'tool', label: 'Security Scan', status: 'idle' },
      { id: 'n4', type: 'condition', label: 'Passes Checks?', status: 'idle' },
      { id: 'n5', type: 'delay', label: 'Wait 5min', status: 'idle' },
      { id: 'n6', type: 'agent', label: 'Review Summary', status: 'idle' },
      { id: 'n7', type: 'output', label: 'Post Comment', status: 'idle' },
    ] as WorkflowNode[]),
    edges: JSON.stringify([
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n1', to: 'n3' },
      { id: 'e3', from: 'n2', to: 'n4' },
      { id: 'e4', from: 'n3', to: 'n4' },
      { id: 'e5', from: 'n4', to: 'n5', label: 'Yes' },
      { id: 'e6', from: 'n5', to: 'n6' },
      { id: 'e7', from: 'n6', to: 'n7' },
    ] as WorkflowEdge[]),
    status: 'active',
    icon: '🔍',
    category: 'development',
    version: 5,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    _count: { tasks: 8, executions: 120 },
  },
  {
    id: 'wf-3',
    name: 'Daily Report Generator',
    description: 'Generate and distribute daily summary reports from multiple data sources',
    nodes: JSON.stringify([
      { id: 'n1', type: 'trigger', label: 'Daily Schedule', status: 'idle' },
      { id: 'n2', type: 'loop', label: 'Fetch Sources', status: 'idle' },
      { id: 'n3', type: 'agent', label: 'Summarize Data', status: 'idle' },
      { id: 'n4', type: 'tool', label: 'Generate PDF', status: 'idle' },
      { id: 'n5', type: 'output', label: 'Send Report', status: 'idle' },
    ] as WorkflowNode[]),
    edges: JSON.stringify([
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3' },
      { id: 'e3', from: 'n3', to: 'n4' },
      { id: 'e4', from: 'n4', to: 'n5' },
    ] as WorkflowEdge[]),
    status: 'draft',
    icon: '📊',
    category: 'productivity',
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    _count: { tasks: 0, executions: 3 },
  },
  {
    id: 'wf-4',
    name: 'Customer Support Bot',
    description: 'AI-powered customer support with escalation workflow',
    nodes: JSON.stringify([
      { id: 'n1', type: 'trigger', label: 'New Ticket', status: 'idle' },
      { id: 'n2', type: 'agent', label: 'Analyze Issue', status: 'idle' },
      { id: 'n3', type: 'condition', label: 'Can Auto-Resolve?', status: 'idle' },
      { id: 'n4', type: 'agent', label: 'Generate Response', status: 'idle' },
      { id: 'n5', type: 'tool', label: 'Escalate to Human', status: 'idle' },
      { id: 'n6', type: 'output', label: 'Close Ticket', status: 'idle' },
    ] as WorkflowNode[]),
    edges: JSON.stringify([
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3' },
      { id: 'e3', from: 'n3', to: 'n4', label: 'Yes' },
      { id: 'e4', from: 'n3', to: 'n5', label: 'No' },
      { id: 'e5', from: 'n4', to: 'n6' },
    ] as WorkflowEdge[]),
    status: 'error',
    icon: '🎧',
    category: 'automation',
    version: 2,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    _count: { tasks: 5, executions: 88 },
  },
]

const MOCK_EXECUTIONS: WorkflowExecution[] = [
  { id: 'ex-1', status: 'completed', startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3500000).toISOString(), duration: 10000 },
  { id: 'ex-2', status: 'completed', startedAt: new Date(Date.now() - 7200000).toISOString(), completedAt: new Date(Date.now() - 7100000).toISOString(), duration: 10000 },
  { id: 'ex-3', status: 'failed', startedAt: new Date(Date.now() - 10800000).toISOString(), completedAt: new Date(Date.now() - 10750000).toISOString(), duration: 5000, error: 'Timeout on node "Security Scan"' },
  { id: 'ex-4', status: 'completed', startedAt: new Date(Date.now() - 14400000).toISOString(), completedAt: new Date(Date.now() - 14200000).toISOString(), duration: 20000 },
  { id: 'ex-5', status: 'running', startedAt: new Date(Date.now() - 60000).toISOString() },
]

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function NodeCard({ node, index }: { node: WorkflowNode; index: number }) {
  const config = NODE_CONFIG[node.type]
  const statusConfig = NODE_STATUS_CONFIG[node.status]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`relative flex items-center gap-3 rounded-lg border ${config.borderColor} ${config.bgColor} p-3 backdrop-blur-sm transition-all hover:scale-[1.02]`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${config.bgColor} ${config.color}`}>
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{node.label}</p>
        <p className="text-xs text-muted-foreground">{config.label}</p>
      </div>
      <div className={`flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-medium ${statusConfig.color} text-white`}>
        {statusConfig.icon}
      </div>
    </motion.div>
  )
}

function ConnectionLine({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="h-4 w-px bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10" />
      {label && (
        <span className="my-0.5 rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {label}
        </span>
      )}
      <div className="h-4 w-px bg-gradient-to-b from-muted-foreground/10 to-muted-foreground/30" />
      <div className="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-muted-foreground/30" />
    </div>
  )
}

function WorkflowVisualizer({ workflow }: { workflow: WorkflowData }) {
  let nodes: WorkflowNode[] = []
  let edges: WorkflowEdge[] = []

  try {
    nodes = JSON.parse(workflow.nodes || '[]')
    edges = JSON.parse(workflow.edges || '[]')
  } catch {
    nodes = []
    edges = []
  }

  // Build adjacency list for topological sort
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const incomingEdges = new Map<string, WorkflowEdge[]>()
  const outgoingEdges = new Map<string, WorkflowEdge[]>()

  nodes.forEach((n) => {
    incomingEdges.set(n.id, [])
    outgoingEdges.set(n.id, [])
  })

  edges.forEach((e) => {
    outgoingEdges.get(e.from)?.push(e)
    incomingEdges.get(e.to)?.push(e)
  })

  // Simple linear layout for visualization
  const visited = new Set<string>()
  const layers: WorkflowNode[][] = []

  function bfs(startIds: string[]) {
    const queue = [...startIds]
    while (queue.length > 0) {
      const layer: WorkflowNode[] = []
      const nextQueue: string[] = []
      for (const id of queue) {
        if (visited.has(id)) continue
        visited.add(id)
        const node = nodeMap.get(id)
        if (node) layer.push(node)
        for (const edge of outgoingEdges.get(id) || []) {
          if (!visited.has(edge.to)) nextQueue.push(edge.to)
        }
      }
      if (layer.length > 0) layers.push(layer)
      queue.length = 0
      queue.push(...nextQueue)
    }
  }

  // Find root nodes (no incoming edges)
  const roots = nodes.filter((n) => (incomingEdges.get(n.id)?.length || 0) === 0)
  if (roots.length > 0) {
    bfs(roots.map((r) => r.id))
  } else if (nodes.length > 0) {
    layers.push(nodes)
  }

  // Add any unvisited nodes
  const unvisited = nodes.filter((n) => !visited.has(n.id))
  if (unvisited.length > 0) {
    layers.push(unvisited)
  }

  return (
    <div className="flex flex-col items-center gap-0">
      {layers.map((layer, layerIdx) => (
        <React.Fragment key={layerIdx}>
          {layerIdx > 0 && (
            <ConnectionLine
              label={edges.find((e) => layer.some((n) => n.id === e.to))?.label}
            />
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {layer.map((node, nodeIdx) => (
              <NodeCard key={node.id} node={node} index={layerIdx * 4 + nodeIdx} />
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

function WorkflowCard({ workflow, onSelect, onDelete }: { workflow: WorkflowData; onSelect: () => void; onDelete: () => void }) {
  let nodeCount = 0
  try {
    nodeCount = JSON.parse(workflow.nodes || '[]').length
  } catch { /* ignore */ }

  const statusConf = STATUS_CONFIG[workflow.status]
  const execCount = workflow._count?.executions || 0

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
        onClick={onSelect}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{workflow.icon || '⚙️'}</span>
              <div>
                <CardTitle className="text-base">{workflow.name}</CardTitle>
                <CardDescription className="line-clamp-1 text-xs">
                  {workflow.description || 'No description'}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`gap-1 text-[10px] ${statusConf.color.replace('bg-', 'text-')} border-current/20`}
            >
              {statusConf.icon}
              {statusConf.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {nodeCount} nodes
              </span>
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {execCount} runs
              </span>
              <span>v{workflow.version}</span>
            </div>
            <span>{formatRelativeTime(workflow.updatedAt)}</span>
          </div>
          <div className="mt-3 flex gap-2">
            {workflow.status === 'active' && (
              <>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={(e) => { e.stopPropagation() }}>
                  <Play className="h-3 w-3" /> Run
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={(e) => { e.stopPropagation() }}>
                  <Pause className="h-3 w-3" /> Pause
                </Button>
              </>
            )}
            {workflow.status === 'draft' && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-emerald-400" onClick={(e) => { e.stopPropagation() }}>
                <Play className="h-3 w-3" /> Activate
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs text-red-400"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function NodePalette() {
  const nodeTypes: NodeType[] = ['trigger', 'agent', 'tool', 'condition', 'output', 'delay', 'loop']

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Node Palette
      </h4>
      {nodeTypes.map((type) => {
        const config = NODE_CONFIG[type]
        return (
          <div
            key={type}
            className={`flex cursor-grab items-center gap-2 rounded-md border ${config.borderColor} ${config.bgColor} p-2 transition-all hover:scale-[1.02] active:cursor-grabbing`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded ${config.bgColor} ${config.color}`}>
              {config.icon}
            </div>
            <span className="text-xs font-medium text-foreground">{config.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function ExecutionHistory({ executions }: { executions: WorkflowExecution[] }) {
  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Activity className="mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">No executions yet</p>
      </div>
    )
  }

  return (
    <ScrollArea className="max-h-64">
      <div className="space-y-2">
        {executions.map((exec) => (
          <div
            key={exec.id}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3"
          >
            <div className="flex items-center gap-2">
              {exec.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              {exec.status === 'failed' && <XCircle className="h-4 w-4 text-red-400" />}
              {exec.status === 'running' && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <RotateCw className="h-4 w-4 text-amber-400" />
                </motion.div>
              )}
              <div>
                <p className="text-xs font-medium text-foreground capitalize">{exec.status}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatRelativeTime(exec.startedAt)}
                </p>
              </div>
            </div>
            <div className="text-right">
              {exec.duration && (
                <p className="text-xs text-muted-foreground">
                  {formatDuration(exec.duration)}
                </p>
              )}
              {exec.error && (
                <p className="text-[10px] text-red-400">{exec.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

function CreateWorkflowDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (data: { name: string; description: string; icon: string }) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('⚙️')

  const ICONS = ['⚙️', '📧', '🔍', '📊', '🎧', '🤖', '📝', '🌐', '🔔', '💼', '🎯', '🛡️']

  const handleCreate = () => {
    if (!name.trim()) return
    onCreate({ name: name.trim(), description: description.trim(), icon })
    setName('')
    setDescription('')
    setIcon('⚙️')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/50 bg-card/95 backdrop-blur-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Create New Workflow
          </DialogTitle>
          <DialogDescription>
            Define a new automated workflow for your AI agents
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all ${
                    icon === emoji
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 bg-muted/30 hover:border-primary/30'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wf-name">Name</Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workflow"
              className="border-border/50 bg-muted/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wf-desc">Description</Label>
            <Textarea
              id="wf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              className="border-border/50 bg-muted/30"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WorkflowsModule() {
  const [workflows, setWorkflows] = useState<WorkflowData[]>(MOCK_WORKFLOWS)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'grid' | 'detail'>('grid')

  // Fetch workflows from API
  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch('/api/workflows')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setWorkflows(data)
        }
      }
    } catch {
      // Use mock data on error
    }
  }, [])

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  const handleSelectWorkflow = (wf: WorkflowData) => {
    setSelectedWorkflow(wf)
    setView('detail')
  }

  const handleCreateWorkflow = async (data: { name: string; description: string; icon: string }) => {
    setLoading(true)
    try {
      const defaultNodes: WorkflowNode[] = [
        { id: 'n1', type: 'trigger', label: 'Start', status: 'idle' },
        { id: 'n2', type: 'output', label: 'End', status: 'idle' },
      ]
      const defaultEdges: WorkflowEdge[] = [
        { id: 'e1', from: 'n1', to: 'n2' },
      ]

      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          icon: data.icon,
          nodes: defaultNodes,
          edges: defaultEdges,
        }),
      })

      if (res.ok) {
        const newWf = await res.json()
        setWorkflows((prev) => [newWf, ...prev])
      } else {
        // Add locally on error
        const newWf: WorkflowData = {
          id: `wf-${Date.now()}`,
          name: data.name,
          description: data.description,
          nodes: JSON.stringify(defaultNodes),
          edges: JSON.stringify(defaultEdges),
          status: 'draft',
          icon: data.icon,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { tasks: 0, executions: 0 },
        }
        setWorkflows((prev) => [newWf, ...prev])
      }
    } catch {
      // Add locally on error
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWorkflow = (wf: WorkflowData) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== wf.id))
    if (selectedWorkflow?.id === wf.id) {
      setSelectedWorkflow(null)
      setView('grid')
    }
    // API call
    fetch(`/api/workflows/${wf.id}`, { method: 'DELETE' }).catch(() => {})
  }

  const handleRunWorkflow = () => {
    if (!selectedWorkflow) return
    // Simulate running
    let nodes: WorkflowNode[] = []
    try {
      nodes = JSON.parse(selectedWorkflow.nodes || '[]')
    } catch { /* ignore */ }

    const updatedNodes = nodes.map((n) => ({ ...n, status: 'running' as NodeStatus }))
    const updatedWf = { ...selectedWorkflow, nodes: JSON.stringify(updatedNodes) }
    setSelectedWorkflow(updatedWf)
    setWorkflows((prev) => prev.map((w) => (w.id === updatedWf.id ? updatedWf : w)))

    // Simulate completion after 3s
    setTimeout(() => {
      const completedNodes = nodes.map((n) => ({ ...n, status: 'completed' as NodeStatus }))
      const completedWf = { ...selectedWorkflow, nodes: JSON.stringify(completedNodes) }
      setSelectedWorkflow(completedWf)
      setWorkflows((prev) => prev.map((w) => (w.id === completedWf.id ? completedWf : w)))
    }, 3000)
  }

  const handleStopWorkflow = () => {
    if (!selectedWorkflow) return
    let nodes: WorkflowNode[] = []
    try {
      nodes = JSON.parse(selectedWorkflow.nodes || '[]')
    } catch { /* ignore */ }
    const stoppedNodes = nodes.map((n) => ({ ...n, status: 'idle' as NodeStatus }))
    const updatedWf = { ...selectedWorkflow, nodes: JSON.stringify(stoppedNodes) }
    setSelectedWorkflow(updatedWf)
    setWorkflows((prev) => prev.map((w) => (w.id === updatedWf.id ? updatedWf : w)))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Workflow className="h-5 w-5 text-primary" />
            Workflow Engine
          </h2>
          <p className="text-sm text-muted-foreground">
            Build and manage automated AI workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view === 'detail' && (
            <Button variant="ghost" size="sm" onClick={() => { setView('grid'); setSelectedWorkflow(null) }} className="gap-1">
              ← Back
            </Button>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Workflow
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      <CreateWorkflowDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreateWorkflow}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {workflows.map((wf) => (
                <WorkflowCard
                  key={wf.id}
                  workflow={wf}
                  onSelect={() => handleSelectWorkflow(wf)}
                  onDelete={() => handleDeleteWorkflow(wf)}
                />
              ))}

              {/* Create New Card */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card
                  className="flex h-full cursor-pointer items-center justify-center border-dashed border-border/50 bg-card/40 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/60"
                  onClick={() => setCreateOpen(true)}
                >
                  <CardContent className="flex flex-col items-center py-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Plus className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-muted-foreground">
                      Create Workflow
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ) : selectedWorkflow ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Tabs defaultValue="visual" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedWorkflow.icon || '⚙️'}</span>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedWorkflow.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkflow.description || 'No description'}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${STATUS_CONFIG[selectedWorkflow.status].color.replace('bg-', 'text-')}`}
                    >
                      {STATUS_CONFIG[selectedWorkflow.status].label}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1" onClick={handleRunWorkflow} disabled={loading}>
                      <Play className="h-3 w-3" /> Run
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1" onClick={handleStopWorkflow}>
                      <Square className="h-3 w-3" /> Stop
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1" onClick={handleStopWorkflow}>
                      <Pause className="h-3 w-3" /> Pause
                    </Button>
                  </div>
                </div>

                <TabsList className="bg-muted/50">
                  <TabsTrigger value="visual" className="gap-1">
                    <Eye className="h-3 w-3" /> Visual
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-1">
                    <Activity className="h-3 w-3" /> History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="visual">
                  <div className="flex gap-6">
                    {/* Node Palette */}
                    <div className="hidden w-40 shrink-0 md:block">
                      <NodePalette />
                    </div>

                    {/* Visual Flow */}
                    <Card className="flex-1 border-border/50 bg-card/60 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <WorkflowVisualizer workflow={selectedWorkflow} />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-sm">Execution History</CardTitle>
                      <CardDescription>Recent workflow executions and their results</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ExecutionHistory executions={MOCK_EXECUTIONS} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
