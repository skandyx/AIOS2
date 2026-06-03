'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import {
  Plus, FolderKanban, Calendar, CheckCircle2, PauseCircle, Archive, ListChecks,
  Sparkles, Trash2, ChevronLeft, AlertCircle, Zap, Rocket, Edit3, Loader2, Play,
  Activity, MessageSquare, FileText, Upload, Download, Github, BookOpen, File,
  FileCode, FileJson, FileImage, Folder, Send, RefreshCw, GitBranch, X, Circle,
  Clock, Users, HardDrive, Globe, ChevronRight, ChevronDown, Shield, Tag, Hash,
  Target, BarChart3, GitFork, Bot, Eye, ThumbsUp, ThumbsDown, UserPlus,
  UserMinus, Pause, ArrowRight, ArrowUpRight, LayoutGrid, Layers,
  Milestone, Network, PieChart, TrendingUp, Award, Code2, FileSearch,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'archived'
type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'
type ProjectCategory = 'Web App' | 'API' | 'Automation' | 'Mobile' | 'Desktop' | 'Data' | 'AI' | 'Other'

interface TaskData {
  id: string; title: string; description?: string; status: string; priority: string
  type?: string | null; progress?: number; assignedTo?: string; assigneeId?: string | null
  assignee?: { id: string; name: string; type: string; avatar?: string | null } | null
  createdAt: string; updatedAt: string; startedAt?: string | null; completedAt?: string | null
  dueDate?: string | null; error?: string | null; result?: string | null
}

interface AgentMessage {
  id: string; fromRole: string; toRole: string; type: string; content: string
  createdAt: string; fromAgentId?: string | null; toAgentId?: string | null
  fromAgent?: { id: string; name: string; type: string; avatar?: string | null } | null
  toAgent?: { id: string; name: string; type: string; avatar?: string | null } | null
  metadata?: string | null
}

interface AgentData {
  id: string; name: string; type: string; description?: string | null; avatar?: string | null
  isActive: boolean; capabilities?: string | null; config?: string | null; model?: string | null
  createdAt: string; updatedAt: string
  _count?: { tasksAssigned: number; messages: number }
}

interface ProjectFileData {
  id: string; name: string; path: string; language?: string | null; size: number
  mimeType?: string | null; isDirectory: boolean; source?: string | null
  createdAt: string; updatedAt: string
}

interface ProjectData {
  id: string; name: string; description?: string | null; status: ProjectStatus
  priority: ProjectPriority; category?: string | null; icon?: string | null
  techStack?: string | null; requirements?: string | null; notes?: string | null
  tags?: string | null; dueDate?: string | null; createdAt: string; updatedAt: string
  orchestratorStatus?: string | null; orchestratorLog?: string | null
  repoUrl?: string | null; repoOwner?: string | null; repoName?: string | null
  repoBranch?: string | null; githubToken?: string | null; localPath?: string | null
  documentation?: string | null; readme?: string | null
  _count?: { tasks: number; projectSkills: number; projectMCPServers: number }
  tasks?: TaskData[]
}

interface OrchestrationStatus {
  projectId: string; projectName: string; projectStatus: string
  orchestratorStatus: string; orchestratorLog: Array<{ timestamp: string; event: string; details?: unknown }>
  recentMessages: AgentMessage[]
  taskProgress: { total: number; completed: number; inProgress: number; pending: number; failed: number; completionPercentage: number; statusCounts: Record<string, number>; typeCounts: Record<string, number> }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  planning: { label: 'Planning', color: 'text-sky-400', bgColor: 'bg-sky-500/15', borderColor: 'border-sky-500/30', icon: <ListChecks className="size-3" /> },
  in_progress: { label: 'In Progress', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30', icon: <Zap className="size-3" /> },
  on_hold: { label: 'On Hold', color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30', icon: <PauseCircle className="size-3" /> },
  completed: { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30', icon: <CheckCircle2 className="size-3" /> },
  archived: { label: 'Archived', color: 'text-neutral-400', bgColor: 'bg-neutral-500/15', borderColor: 'border-neutral-500/30', icon: <Archive className="size-3" /> },
}

const PRIORITY_CONFIG: Record<ProjectPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-neutral-400', bgColor: 'bg-neutral-500/15' },
  medium: { label: 'Medium', color: 'text-cyan-400', bgColor: 'bg-cyan-500/15' },
  high: { label: 'High', color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/15' },
}

const AGENT_TYPE_COLORS: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  orchestrator: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  project_manager: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', dot: 'bg-sky-500' },
  architect: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', dot: 'bg-violet-500' },
  developer: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  coordinator: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  qa: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' },
  security: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  research: { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30', dot: 'bg-teal-500' },
  documentation: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', dot: 'bg-pink-500' },
  debugger: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  monitoring: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
}

const AGENT_STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
  idle: { label: 'Idle', color: 'text-gray-400', pulse: false },
  working: { label: 'Working', color: 'text-emerald-400', pulse: true },
  waiting: { label: 'Waiting', color: 'text-yellow-400', pulse: false },
  blocked: { label: 'Blocked', color: 'text-red-400', pulse: false },
  error: { label: 'Error', color: 'text-red-600', pulse: false },
}

const ORCH_PHASES = ['idle', 'analyzing', 'planning', 'assigning', 'executing', 'reviewing', 'delivering', 'completed', 'failed']
const ORCH_PHASE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  idle: { label: 'Idle', color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
  analyzing: { label: 'Analyzing', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  planning: { label: 'Planning', color: 'text-sky-400', bgColor: 'bg-sky-500/10' },
  assigning: { label: 'Assigning', color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
  executing: { label: 'Executing', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  reviewing: { label: 'Reviewing', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  delivering: { label: 'Delivering', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  running: { label: 'Running', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  completed: { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/10' },
}

const KANBAN_COLUMNS = [
  { id: 'backlog', label: 'Backlog', status: 'todo', icon: <ListChecks className="size-3.5" />, wip: 20 },
  { id: 'planned', label: 'Planned', status: 'planned', icon: <Calendar className="size-3.5" />, wip: 10 },
  { id: 'in_progress', label: 'In Progress', status: 'in_progress', icon: <Zap className="size-3.5" />, wip: 5 },
  { id: 'review', label: 'Review', status: 'review', icon: <Eye className="size-3.5" />, wip: 5 },
  { id: 'blocked', label: 'Blocked', status: 'blocked', icon: <AlertCircle className="size-3.5" />, wip: 10 },
  { id: 'done', label: 'Done', status: 'done', icon: <CheckCircle2 className="size-3.5" />, wip: 0 },
]

const MESSAGE_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  instruction: { label: 'Instruction', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: <Zap className="size-3" /> },
  result: { label: 'Result', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: <CheckCircle2 className="size-3" /> },
  discussion: { label: 'Discussion', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', icon: <MessageSquare className="size-3" /> },
  status: { label: 'Status', color: 'text-slate-400', bgColor: 'bg-slate-500/10', icon: <Activity className="size-3" /> },
  question: { label: 'Question', color: 'text-sky-400', bgColor: 'bg-sky-500/10', icon: <Hash className="size-3" /> },
  error: { label: 'Error', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: <AlertCircle className="size-3" /> },
}

const CATEGORY_OPTIONS: ProjectCategory[] = ['Web App', 'API', 'Automation', 'Mobile', 'Desktop', 'Data', 'AI', 'Other']
const PRIORITY_OPTIONS: ProjectPriority[] = ['low', 'medium', 'high', 'critical']

const FILE_ICON_MAP: Record<string, React.ReactNode> = {
  typescript: <FileCode className="size-4 text-blue-400" />, javascript: <FileCode className="size-4 text-yellow-400" />,
  python: <FileCode className="size-4 text-green-400" />, html: <FileCode className="size-4 text-orange-400" />,
  css: <FileCode className="size-4 text-purple-400" />, json: <FileJson className="size-4 text-yellow-300" />,
  markdown: <FileText className="size-4 text-slate-300" />, yaml: <FileText className="size-4 text-pink-400" />,
  image: <FileImage className="size-4 text-emerald-400" />,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTechStack(raw: string | null | undefined): string[] {
  if (!raw) return []
  try { const p = JSON.parse(raw); if (Array.isArray(p)) return p } catch { /* */ }
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function formatDate(d: string | null | undefined): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d }
}

function formatRelativeTime(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatBytes(b: number): string {
  if (b === 0) return '0 B'; const k = 1024; const s = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(b) / Math.log(k)); return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${s[i]}`
}

function getAgentColor(type: string) { return AGENT_TYPE_COLORS[type] || AGENT_TYPE_COLORS.developer }

function getFileIcon(lang: string | null | undefined, name: string): React.ReactNode {
  if (lang && FILE_ICON_MAP[lang]) return FILE_ICON_MAP[lang]
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) return FILE_ICON_MAP.image
  if (['ts', 'tsx'].includes(ext)) return FILE_ICON_MAP.typescript
  if (['js', 'jsx'].includes(ext)) return FILE_ICON_MAP.javascript
  if (['json'].includes(ext)) return FILE_ICON_MAP.json
  if (['md'].includes(ext)) return FILE_ICON_MAP.markdown
  return <File className="size-4 text-slate-400" />
}

// ─── File Tree ────────────────────────────────────────────────────────────────

interface FileTreeNode { name: string; path: string; isDirectory: boolean; children: FileTreeNode[]; file?: ProjectFileData }

function buildFileTree(files: ProjectFileData[]): FileTreeNode[] {
  const root: FileTreeNode[] = []
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean); let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]; const isLast = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join('/')
      let node = current.find(n => n.name === part && n.isDirectory === !isLast)
      if (!node) { node = { name: part, path: currentPath, isDirectory: !isLast, children: [], file: isLast ? file : undefined }; current.push(node) }
      if (!isLast) current = node.children
    }
  }
  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] =>
    nodes.sort((a, b) => (a.isDirectory !== b.isDirectory ? (a.isDirectory ? -1 : 1) : a.name.localeCompare(b.name))).map(n => ({ ...n, children: sortNodes(n.children) }))
  return sortNodes(root)
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: ProjectData; onClick: () => void }) {
  const sc = STATUS_CONFIG[project.status]; const pc = PRIORITY_CONFIG[project.priority]
  const tech = parseTechStack(project.techStack)
  const progress = project.tasks ? Math.round((project.tasks.filter(t => t.status === 'done' || t.status === 'completed').length / Math.max(project.tasks.length, 1)) * 100) : 0
  const taskCount = project._count?.tasks ?? project.tasks?.length ?? 0

  return (
    <Card className="bg-[#0d1117] border-neutral-800 hover:border-emerald-500/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/5 py-0" onClick={onClick}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">{project.icon || '📁'}</span>
            <div className="min-w-0">
              <CardTitle className="text-sm text-white truncate">{project.name}</CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5 line-clamp-1">{project.description || 'No description'}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${sc.color} ${sc.bgColor} ${sc.borderColor}`}>{sc.icon}{sc.label}</Badge>
          <Badge variant="outline" className={`text-[10px] h-5 ${pc.color} ${pc.bgColor} border-neutral-700`}>{pc.label}</Badge>
          {project.category && <Badge variant="outline" className="text-[10px] h-5 text-emerald-300 bg-emerald-500/10 border-emerald-500/20">{project.category}</Badge>}
          {project.orchestratorStatus && project.orchestratorStatus !== 'idle' && (
            <Badge variant="outline" className="text-[10px] h-5 text-emerald-400 bg-emerald-500/10 border-emerald-500/20 gap-1">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse`} /> Orchestrating
            </Badge>
          )}
        </div>
        {tech.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tech.slice(0, 4).map(t => <Badge key={t} variant="outline" className="text-[9px] h-4 px-1.5 border-neutral-700 text-slate-300 bg-neutral-800/50">{t}</Badge>)}
            {tech.length > 4 && <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-neutral-700 text-slate-500">+{tech.length - 4}</Badge>}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><ListChecks className="size-3" />{taskCount}</span>
          {project.dueDate && <span className="flex items-center gap-1 ml-auto"><Calendar className="size-3" />{formatDate(project.dueDate)}</span>}
        </div>
        {taskCount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Progress</span><span className="text-emerald-400 font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-400" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Create Project Dialog ────────────────────────────────────────────────────

function CreateProjectDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (p: ProjectData) => void }) {
  const [name, setName] = useState(''); const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ProjectCategory>('Web App'); const [priority, setPriority] = useState<ProjectPriority>('medium')
  const [techStack, setTechStack] = useState(''); const [requirements, setRequirements] = useState('')
  const [creating, setCreating] = useState(false); const [error, setError] = useState('')

  const reset = () => { setName(''); setDescription(''); setCategory('Web App'); setPriority('medium'); setTechStack(''); setRequirements(''); setError('') }

  const handleCreate = async () => {
    if (!name.trim()) return; setCreating(true); setError('')
    try {
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, status: 'planning', priority, category, techStack: techStack.trim() ? techStack.split(',').map(s => s.trim()).filter(Boolean) : undefined, requirements: requirements.trim() || undefined }) })
      if (res.ok) { const created = await res.json(); onCreated(created); reset(); onOpenChange(false) }
      else { let msg = 'Failed to create project'; try { const e = await res.json(); if (e.error) msg = e.error } catch { /* */ } setError(msg) }
    } catch (e) { setError(e instanceof Error ? e.message : 'Network error') }
    finally { setCreating(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-emerald-400 flex items-center gap-2"><FolderKanban className="size-5" /> New Project</DialogTitle>
          <DialogDescription className="text-slate-400">Create a new project for the multi-agent orchestrator</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label className="text-slate-300">Name *</Label><Input placeholder="Project name..." value={name} onChange={e => setName(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white" /></div>
          <div className="space-y-2"><Label className="text-slate-300">Description</Label><Textarea placeholder="What is this project about..." value={description} onChange={e => setDescription(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white min-h-20" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-slate-300">Category</Label><Select value={category} onValueChange={v => setCategory(v as ProjectCategory)}><SelectTrigger className="bg-neutral-900 border-neutral-700 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-neutral-900 border-neutral-700">{CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c} className="text-white focus:bg-neutral-800 focus:text-white">{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-slate-300">Priority</Label><Select value={priority} onValueChange={v => setPriority(v as ProjectPriority)}><SelectTrigger className="bg-neutral-900 border-neutral-700 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-neutral-900 border-neutral-700">{PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p} className="text-white focus:bg-neutral-800 focus:text-white">{PRIORITY_CONFIG[p].label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label className="text-slate-300">Tech Stack (comma-separated)</Label><Input placeholder="React, Node.js, PostgreSQL..." value={techStack} onChange={e => setTechStack(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white" /></div>
          <div className="space-y-2"><Label className="text-slate-300">Requirements</Label><Textarea placeholder="Project requirements..." value={requirements} onChange={e => setRequirements(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white min-h-16" /></div>
        </div>
        {error && <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs"><AlertCircle className="size-4 shrink-0" /><span>{error}</span></div>}
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }} className="border-neutral-700 text-slate-300">Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">{creating ? <><Loader2 className="size-4 animate-spin mr-2" />Creating...</> : 'Create Project'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Agent Avatar ─────────────────────────────────────────────────────────────

function AgentAvatar({ type, name, size = 'sm' }: { type: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const c = getAgentColor(type)
  const sz = size === 'lg' ? 'size-10' : size === 'md' ? 'size-8' : 'size-6'
  const text = size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[9px]'
  return (
    <div className={`${sz} rounded-full ${c.bg} ${c.border} border flex items-center justify-center ${c.text} font-bold ${text}`} title={name}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectsModule() {
  // State
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectData | null>(null)
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [agents, setAgents] = useState<AgentData[]>([])
  const [files, setFiles] = useState<ProjectFileData[]>([])
  const [orchStatus, setOrchStatus] = useState<OrchestrationStatus | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [orchLoading, setOrchLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [messageFilter, setMessageFilter] = useState('all')
  const [viewingFile, setViewingFile] = useState<{ id: string; name: string; content: string; path: string } | null>(null)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [addAgentDialogOpen, setAddAgentDialogOpen] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentType, setNewAgentType] = useState('developer')
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [depSelectedNode, setDepSelectedNode] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch projects list
  const fetchProjects = useCallback(async () => {
    try { const res = await fetch('/api/projects'); if (res.ok) setProjects(await res.json()) } catch { /* */ }
    finally { setLoading(false) }
  }, [])

  // Fetch project detail
  const fetchProject = useCallback(async (id: string) => {
    try {
      const [projRes, taskRes, msgRes, agentRes, fileRes] = await Promise.allSettled([
        fetch(`/api/projects/${id}`), fetch(`/api/projects/${id}/tasks`),
        fetch(`/api/projects/${id}/agents/messages?limit=100`),
        fetch('/api/agents'), fetch(`/api/projects/${id}/files`),
      ])
      if (projRes.status === 'fulfilled' && projRes.value.ok) setProject(await projRes.value.json())
      if (taskRes.status === 'fulfilled' && taskRes.value.ok) setTasks(await taskRes.value.json())
      if (msgRes.status === 'fulfilled' && msgRes.value.ok) { const d = await msgRes.value.json(); setMessages(d.messages || d) }
      if (agentRes.status === 'fulfilled' && agentRes.value.ok) setAgents(await agentRes.value.json())
      if (fileRes.status === 'fulfilled' && fileRes.value.ok) { const d = await fileRes.value.json(); setFiles(d.files || []) }
    } catch { /* */ }
  }, [])

  // Fetch orchestration status
  const fetchOrchStatus = useCallback(async (id: string) => {
    try { const res = await fetch(`/api/projects/${id}/orchestrate/status`); if (res.ok) setOrchStatus(await res.json()) } catch { /* */ }
  }, [])

  // Initial load
  useEffect(() => { fetchProjects() }, [fetchProjects])

  // Load project detail when selected
  useEffect(() => {
    if (selectedProjectId) { fetchProject(selectedProjectId); fetchOrchStatus(selectedProjectId) }
  }, [selectedProjectId, fetchProject, fetchOrchStatus])

  // Poll orchestration status
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (selectedProjectId && (orchStatus?.orchestratorStatus === 'running' || orchStatus?.orchestratorStatus === 'analyzing' || orchStatus?.orchestratorStatus === 'assigning' || project?.orchestratorStatus === 'running' || project?.orchestratorStatus === 'analyzing')) {
      pollRef.current = setInterval(() => fetchOrchStatus(selectedProjectId), 5000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedProjectId, orchStatus?.orchestratorStatus, project?.orchestratorStatus, fetchOrchStatus])

  // Start orchestration
  const startOrchestration = async () => {
    if (!selectedProjectId) return; setOrchLoading(true)
    try { await fetch(`/api/projects/${selectedProjectId}/orchestrate`, { method: 'POST' }); fetchOrchStatus(selectedProjectId); fetchProject(selectedProjectId) } catch { /* */ }
    finally { setOrchLoading(false) }
  }

  // Send message
  const sendMessage = async () => {
    if (!selectedProjectId || !messageInput.trim()) return
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/agents/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: messageInput.trim(), fromRole: 'user', toRole: 'all', type: 'instruction' }) })
      if (res.ok) { setMessageInput(''); fetchProject(selectedProjectId) }
    } catch { /* */ }
  }

  // Agent control
  const controlAgent = async (agentId: string, action: string) => {
    if (!selectedProjectId) return
    try { await fetch(`/api/projects/${selectedProjectId}/agents/control`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId, action }) }); fetchProject(selectedProjectId) } catch { /* */ }
  }

  // Create agent
  const createAgent = async () => {
    if (!newAgentName.trim()) return
    try { await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newAgentName.trim(), type: newAgentType }) }); setNewAgentName(''); setAddAgentDialogOpen(false); fetch('/api/agents').then(r => r.json()).then(setAgents).catch(() => {}) } catch { /* */ }
  }

  // Delete project
  const deleteProject = async (id: string) => {
    try { await fetch(`/api/projects/${id}`, { method: 'DELETE' }); setSelectedProjectId(null); setProject(null); fetchProjects() } catch { /* */ }
  }

  // View file
  const viewFile = async (id: string, name: string, path: string) => {
    try { const res = await fetch(`/api/projects/${selectedProjectId}/files/${id}`); if (res.ok) { const d = await res.json(); setViewingFile({ id, name, content: d.content || '', path }) } } catch { /* */ }
  }

  // ─── Derived Data ────────────────────────────────────────────────────────

  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'done' || t.status === 'completed').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const blockedTasks = tasks.filter(t => t.status === 'failed' || t.status === 'blocked').length
  const overallProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const filteredMessages = messageFilter === 'all' ? messages : messages.filter(m => m.fromRole === messageFilter || m.type === messageFilter)

  // ─── Project List View ───────────────────────────────────────────────────

  if (!selectedProjectId) {
    return (
      <div className="h-full flex flex-col bg-[#0a0e14]">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div><h2 className="text-lg font-semibold text-white flex items-center gap-2"><FolderKanban className="size-5 text-emerald-400" /> Projects</h2><p className="text-xs text-slate-400 mt-0.5">Multi-Agent Project Orchestrator</p></div>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><Plus className="size-4" /> New Project</Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-emerald-400 animate-spin" /></div>
            ) : projects.length === 0 ? (
              <div className="text-center py-20"><FolderKanban className="size-12 text-neutral-700 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-300 mb-2">No Projects Yet</h3><p className="text-sm text-slate-500 mb-4">Create your first project to start orchestrating AI agents</p><Button onClick={() => setCreateDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><Plus className="size-4" /> Create Project</Button></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{projects.map(p => <ProjectCard key={p.id} project={p} onClick={() => setSelectedProjectId(p.id)} />)}</div>
            )}
          </div>
        </ScrollArea>
        <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onCreated={p => { setProjects(prev => [p, ...prev]) }} />
      </div>
    )
  }

  // ─── Project Detail View ─────────────────────────────────────────────────

  const sc = project ? STATUS_CONFIG[project.status] : STATUS_CONFIG.planning
  const pc = project ? PRIORITY_CONFIG[project.priority] : PRIORITY_CONFIG.medium
  const techStack = project ? parseTechStack(project.techStack) : []
  const orchPhase = orchStatus?.orchestratorStatus || project?.orchestratorStatus || 'idle'
  const orchConf = ORCH_PHASE_CONFIG[orchPhase] || ORCH_PHASE_CONFIG.idle

  return (
    <div className="h-full flex flex-col bg-[#0a0e14]">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-neutral-800 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedProjectId(null); setProject(null); setOrchStatus(null) }} className="text-slate-400 hover:text-white h-8 w-8 p-0"><ChevronLeft className="size-4" /></Button>
        <span className="text-lg">{project?.icon || '📁'}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white truncate">{project?.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={`text-[9px] h-4 gap-1 ${sc.color} ${sc.bgColor} ${sc.borderColor}`}>{sc.icon}{sc.label}</Badge>
            <Badge variant="outline" className={`text-[9px] h-4 ${pc.color} ${pc.bgColor} border-neutral-700`}>{pc.label}</Badge>
            <Badge variant="outline" className={`text-[9px] h-4 gap-1 ${orchConf.color} ${orchConf.bgColor} border-neutral-700`}>
              {(orchPhase === 'running' || orchPhase === 'analyzing' || orchPhase === 'executing') && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {orchConf.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(orchPhase === 'idle' || orchPhase === 'completed' || orchPhase === 'failed') ? (
            <Button onClick={startOrchestration} disabled={orchLoading} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-7 text-xs">
              {orchLoading ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />} Start Orchestrator
            </Button>
          ) : (
            <Button onClick={startOrchestration} disabled={orchLoading} size="sm" variant="outline" className="border-amber-500/30 text-amber-400 gap-1 h-7 text-xs">
              <RefreshCw className="size-3" /> Re-orchestrate
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-400" onClick={() => { if (confirm('Delete this project?')) deleteProject(selectedProjectId) }}><Trash2 className="size-3.5" /></Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b border-neutral-800 px-3 shrink-0 overflow-x-auto">
            <TabsList className="bg-transparent h-9 p-0 gap-0.5">
              {[
                { v: 'overview', l: '🎯 Overview' }, { v: 'chat', l: '💬 Chat' }, { v: 'progress', l: '📊 Progress' },
                { v: 'kanban', l: '📋 Kanban' }, { v: 'timeline', l: '⏱️ Timeline' }, { v: 'dependencies', l: '🔗 Deps' },
                { v: 'metrics', l: '📈 Metrics' }, { v: 'agents', l: '👥 Agents' }, { v: 'code', l: '📁 Code' }, { v: 'docs', l: '📄 Docs' },
              ].map(t => (
                <TabsTrigger key={t.v} value={t.v} className="text-[11px] px-2.5 py-1.5 h-8 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 rounded-md text-slate-400 hover:text-slate-200">{t.l}</TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            {/* ─── Overview Tab ────────────────────────────────────────── */}
            <TabsContent value="overview" className="h-full m-0 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Project Info */}
                <Card className="bg-[#0d1117] border-neutral-800 py-0">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><Target className="size-4 text-emerald-400" /> Project Info</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <p className="text-xs text-slate-400">{project?.description || 'No description'}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Category', value: project?.category || '-', icon: <Tag className="size-3 text-slate-500" /> },
                        { label: 'Priority', value: PRIORITY_CONFIG[project?.priority || 'medium'].label, icon: <Zap className="size-3 text-slate-500" /> },
                        { label: 'Due Date', value: formatDate(project?.dueDate), icon: <Calendar className="size-3 text-slate-500" /> },
                        { label: 'Created', value: formatDate(project?.createdAt), icon: <Clock className="size-3 text-slate-500" /> },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-2 text-xs"><span className="text-slate-500">{item.icon}</span><span className="text-slate-500">{item.label}:</span><span className="text-slate-200">{item.value}</span></div>
                      ))}
                    </div>
                    {techStack.length > 0 && <div className="flex flex-wrap gap-1">{techStack.map(t => <Badge key={t} variant="outline" className="text-[9px] h-5 border-neutral-700 text-emerald-300 bg-emerald-500/5">{t}</Badge>)}</div>}
                  </CardContent>
                </Card>

                {/* Orchestrator Status + Progress */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><Activity className="size-4 text-emerald-400" /> Orchestrator</CardTitle></CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge className={`${orchConf.color} ${orchConf.bgColor} gap-1.5`}>
                          {(orchPhase === 'running' || orchPhase === 'analyzing' || orchPhase === 'executing') && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                          {orchConf.label}
                        </Badge>
                      </div>
                      {/* Phase progression */}
                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-500 mb-1">Phase Progression</div>
                        <div className="flex items-center gap-1">
                          {['Analyzing', 'Planning', 'Assigning', 'Executing', 'Reviewing', 'Delivering'].map((phase, i) => {
                            const phaseKey = phase.toLowerCase()
                            const currentIdx = ORCH_PHASES.indexOf(orchPhase)
                            const isDone = currentIdx > i + 1; const isCurrent = orchPhase === phaseKey || (orchPhase === 'running' && phaseKey === 'executing')
                            return (
                              <div key={phase} className="flex items-center gap-1 flex-1">
                                <div className={`h-1.5 flex-1 rounded-full ${isDone ? 'bg-emerald-500' : isCurrent ? 'bg-emerald-500/50 animate-pulse' : 'bg-neutral-800'}`} title={phase} />
                                {i < 5 && <ChevronRight className="size-2.5 text-neutral-700 shrink-0" />}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><BarChart3 className="size-4 text-emerald-400" /> Progress</CardTitle></CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="flex items-center justify-between"><span className="text-2xl font-bold text-emerald-400">{overallProgress}%</span><span className="text-xs text-slate-500">{doneTasks}/{totalTasks} tasks</span></div>
                      <Progress value={overallProgress} className="h-2 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-400" />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded bg-neutral-800/50"><div className="text-sm font-bold text-sky-400">{inProgressTasks}</div><div className="text-[9px] text-slate-500">In Progress</div></div>
                        <div className="p-2 rounded bg-neutral-800/50"><div className="text-sm font-bold text-red-400">{blockedTasks}</div><div className="text-[9px] text-slate-500">Blocked</div></div>
                        <div className="p-2 rounded bg-neutral-800/50"><div className="text-sm font-bold text-emerald-400">{doneTasks}</div><div className="text-[9px] text-slate-500">Done</div></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Tasks', value: totalTasks, icon: <ListChecks className="size-4 text-sky-400" />, color: 'text-sky-400' },
                    { label: 'Agents', value: agents.length, icon: <Users className="size-4 text-violet-400" />, color: 'text-violet-400' },
                    { label: 'Messages', value: messages.length, icon: <MessageSquare className="size-4 text-amber-400" />, color: 'text-amber-400' },
                    { label: 'Files', value: files.length, icon: <FileCode className="size-4 text-teal-400" />, color: 'text-teal-400' },
                  ].map(s => (
                    <Card key={s.label} className="bg-[#0d1117] border-neutral-800 py-0">
                      <CardContent className="p-3 flex items-center gap-3">{s.icon}<div><div className={`text-lg font-bold ${s.color}`}>{s.value}</div><div className="text-[10px] text-slate-500">{s.label}</div></div></CardContent>
                    </Card>
                  ))}
                </div>

                {/* Team Overview */}
                <Card className="bg-[#0d1117] border-neutral-800 py-0">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><Users className="size-4 text-emerald-400" /> Team</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {agents.map(a => {
                        const ac = getAgentColor(a.type)
                        const aTasks = tasks.filter(t => t.assigneeId === a.id)
                        const isWorking = aTasks.some(t => t.status === 'in_progress')
                        return (
                          <div key={a.id} className={`flex items-center gap-2 p-2 rounded-md ${ac.bg} border ${ac.border}`}>
                            <div className="relative"><AgentAvatar type={a.type} name={a.name} size="sm" />{isWorking && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#0d1117] animate-pulse" />}</div>
                            <div className="min-w-0"><div className="text-xs font-medium text-slate-200 truncate">{a.name}</div><div className="text-[9px] text-slate-500">{a.type} • {aTasks.length} tasks</div></div>
                          </div>
                        )
                      })}
                      {agents.length === 0 && <div className="text-xs text-slate-500 p-2">No agents assigned yet</div>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Chat Tab ──────────────────────────────────────────── */}
            <TabsContent value="chat" className="h-full m-0 flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800 shrink-0">
                <span className="text-xs text-slate-500">Filter:</span>
                <Select value={messageFilter} onValueChange={setMessageFilter}>
                  <SelectTrigger className="h-6 w-32 text-[10px] bg-neutral-900 border-neutral-700 text-slate-300"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-700">
                    <SelectItem value="all" className="text-slate-200 text-xs">All Messages</SelectItem>
                    <SelectItem value="orchestrator" className="text-slate-200 text-xs">Orchestrator</SelectItem>
                    <SelectItem value="agent" className="text-slate-200 text-xs">Agents</SelectItem>
                    <SelectItem value="user" className="text-slate-200 text-xs">User</SelectItem>
                    <SelectItem value="instruction" className="text-slate-200 text-xs">Instructions</SelectItem>
                    <SelectItem value="result" className="text-slate-200 text-xs">Results</SelectItem>
                    <SelectItem value="error" className="text-slate-200 text-xs">Errors</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-500" onClick={() => selectedProjectId && fetchProject(selectedProjectId)}><RefreshCw className="size-3" /></Button>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2 max-w-3xl mx-auto">
                  {filteredMessages.length === 0 && <div className="text-center py-10 text-slate-500 text-xs">No messages yet. Start orchestration to see agent conversations.</div>}
                  {filteredMessages.map(msg => {
                    const mtConfig = MESSAGE_TYPE_CONFIG[msg.type] || MESSAGE_TYPE_CONFIG.status
                    const fromColor = getAgentColor(msg.fromAgent?.type || msg.fromRole)
                    const toColor = getAgentColor(msg.toAgent?.type || msg.toRole || 'developer')
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 p-2.5 rounded-lg ${fromColor.bg} border ${fromColor.border}/30`}>
                        <div className="shrink-0 mt-0.5"><AgentAvatar type={msg.fromAgent?.type || msg.fromRole} name={msg.fromAgent?.name || msg.fromRole} size="sm" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${fromColor.text}`}>{msg.fromAgent?.name || msg.fromRole}</span>
                            <ArrowRight className="size-3 text-slate-600" />
                            <span className={`text-xs ${toColor.text}`}>{msg.toAgent?.name || msg.toRole || 'All'}</span>
                            <Badge variant="outline" className={`text-[8px] h-4 gap-0.5 ${mtConfig.color} ${mtConfig.bgColor} border-neutral-700`}>{mtConfig.icon}{mtConfig.label}</Badge>
                            <span className="text-[9px] text-slate-600 ml-auto shrink-0">{formatRelativeTime(msg.createdAt)}</span>
                          </div>
                          <p className="text-xs text-slate-300 whitespace-pre-wrap break-words">{msg.content}</p>
                          {/* Human oversight buttons */}
                          <div className="flex items-center gap-1 mt-2">
                            <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 px-1.5" onClick={() => { /* approve */ }}><ThumbsUp className="size-2.5" /> Approve</Button>
                            <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 px-1.5" onClick={() => { /* reject */ }}><ThumbsDown className="size-2.5" /> Reject</Button>
                            <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1 text-sky-500 hover:text-sky-400 hover:bg-sky-500/10 px-1.5" onClick={() => { /* override */ }}><Edit3 className="size-2.5" /> Override</Button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>
              <div className="border-t border-neutral-800 p-3 shrink-0">
                <div className="flex gap-2 max-w-3xl mx-auto">
                  <Input placeholder="Send instruction or override..." value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="bg-neutral-900 border-neutral-700 text-white text-xs h-8" />
                  <Button onClick={sendMessage} disabled={!messageInput.trim()} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"><Send className="size-3.5" /></Button>
                </div>
              </div>
            </TabsContent>

            {/* ─── Progress Tab ──────────────────────────────────────── */}
            <TabsContent value="progress" className="h-full m-0 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Animated Ring */}
                <Card className="bg-[#0d1117] border-neutral-800 py-0">
                  <CardContent className="p-6 flex flex-col items-center">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1f2e" strokeWidth="8" />
                        <motion.circle cx="50" cy="50" r="42" fill="none" stroke="url(#progressGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 42}`} initial={{ strokeDashoffset: 2 * Math.PI * 42 }} animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - overallProgress / 100) }} transition={{ duration: 1, ease: 'easeOut' }} />
                        <defs><linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#2dd4bf" /></linearGradient></defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-emerald-400">{overallProgress}%</span><span className="text-[10px] text-slate-500">Complete</span></div>
                    </div>
                  </CardContent>
                </Card>

                {/* Per-Agent Progress */}
                <Card className="bg-[#0d1117] border-neutral-800 py-0">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><Users className="size-4 text-emerald-400" /> Per-Agent Progress</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {agents.map(a => {
                      const aTasks = tasks.filter(t => t.assigneeId === a.id); const done = aTasks.filter(t => t.status === 'done' || t.status === 'completed').length
                      const prog = aTasks.length > 0 ? Math.round((done / aTasks.length) * 100) : 0
                      const ac = getAgentColor(a.type)
                      return (
                        <div key={a.id} className="flex items-center gap-3">
                          <AgentAvatar type={a.type} name={a.name} size="sm" />
                          <span className={`text-xs ${ac.text} w-24 truncate`}>{a.name}</span>
                          <Progress value={prog} className="flex-1 h-2 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-400" />
                          <span className="text-xs text-slate-400 w-10 text-right">{prog}%</span>
                        </div>
                      )
                    })}
                    {agents.length === 0 && <div className="text-xs text-slate-500">No agents</div>}
                  </CardContent>
                </Card>

                {/* Phase Progress */}
                <Card className="bg-[#0d1117] border-neutral-800 py-0">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><Milestone className="size-4 text-emerald-400" /> Phase Progress</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {[{ label: 'Analyzing', icon: '🔍' }, { label: 'Planning', icon: '📋' }, { label: 'Assigning', icon: '🎯' }, { label: 'Executing', icon: '⚡' }, { label: 'Reviewing', icon: '👁️' }, { label: 'Delivering', icon: '📦' }].map((phase, i) => {
                        const currentIdx = ORCH_PHASES.indexOf(orchPhase)
                        const isDone = currentIdx > i + 1; const isCurrent = orchPhase === phase.label.toLowerCase() || (orchPhase === 'running' && phase.label === 'Executing')
                        return (
                          <div key={phase.label} className="flex items-center gap-3">
                            <span className="text-sm">{phase.icon}</span>
                            <span className={`text-xs w-20 ${isDone ? 'text-emerald-400' : isCurrent ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>{phase.label}</span>
                            <div className="flex-1 h-2 rounded-full bg-neutral-800"><motion.div className={`h-full rounded-full ${isDone ? 'bg-emerald-500' : isCurrent ? 'bg-emerald-500/50' : 'bg-transparent'}`} initial={{ width: 0 }} animate={{ width: isDone ? '100%' : isCurrent ? '50%' : '0%' }} transition={{ duration: 0.5 }} /></div>
                            <span className="text-[10px] text-slate-600">{isDone ? '✓' : isCurrent ? '...' : ''}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Kanban Tab ─────────────────────────────────────────── */}
            <TabsContent value="kanban" className="h-full m-0 overflow-x-auto">
              <div className="p-4 h-full">
                <div className="flex gap-3 h-full min-w-max">
                  {KANBAN_COLUMNS.map(col => {
                    const colTasks = tasks.filter(t => t.status === col.status || (col.status === 'todo' && t.status === 'pending') || (col.status === 'done' && t.status === 'completed'))
                    const isOverWip = col.wip > 0 && colTasks.length > col.wip
                    return (
                      <div key={col.id} className="w-64 flex flex-col shrink-0">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border border-b-0 ${isOverWip ? 'border-red-500/30 bg-red-500/5' : 'border-neutral-800 bg-neutral-800/50'}`}>
                          <span className="text-slate-400">{col.icon}</span>
                          <span className="text-xs font-medium text-slate-300">{col.label}</span>
                          <Badge variant="outline" className={`text-[9px] h-4 ml-auto ${isOverWip ? 'text-red-400 border-red-500/30' : 'text-slate-500 border-neutral-700'}`}>{colTasks.length}{col.wip > 0 ? `/${col.wip}` : ''}</Badge>
                        </div>
                        <div className="flex-1 rounded-b-lg border border-t-0 border-neutral-800 bg-neutral-900/30 p-2 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                          {colTasks.map(task => {
                            const tp = PRIORITY_CONFIG[(task.priority as ProjectPriority) || 'medium']
                            return (
                              <Card key={task.id} className="bg-[#0d1117] border-neutral-800 hover:border-emerald-500/20 cursor-pointer transition-colors py-0" onClick={() => { setSelectedTask(task); setTaskDialogOpen(true) }}>
                                <CardContent className="p-2.5 space-y-1.5">
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="text-xs text-slate-200 font-medium leading-tight">{task.title}</span>
                                    <Badge variant="outline" className={`text-[8px] h-3.5 px-1 shrink-0 ${tp.color} ${tp.bgColor} border-neutral-700`}>{tp.label}</Badge>
                                  </div>
                                  {task.assignee && (
                                    <div className="flex items-center gap-1.5">
                                      <AgentAvatar type={task.assignee.type} name={task.assignee.name} size="sm" />
                                      <span className="text-[9px] text-slate-500">{task.assignee.name}</span>
                                    </div>
                                  )}
                                  {task.type && <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-neutral-700 text-slate-500">{task.type}</Badge>}
                                </CardContent>
                              </Card>
                            )
                          })}
                          {colTasks.length === 0 && <div className="text-[10px] text-slate-600 text-center py-4">No tasks</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </TabsContent>

            {/* ─── Timeline Tab ───────────────────────────────────────── */}
            <TabsContent value="timeline" className="h-full m-0 overflow-y-auto">
              <div className="p-4">
                <Card className="bg-[#0d1117] border-neutral-800 py-0">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><Clock className="size-4 text-emerald-400" /> Project Timeline</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="relative pl-6">
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-neutral-800" />
                      {(() => {
                        const events: Array<{ id: string; timestamp: string; title: string; desc: string; icon: React.ReactNode; color: string }> = []
                        // Orchestrator log events
                        if (orchStatus?.orchestratorLog) {
                          orchStatus.orchestratorLog.forEach((entry: { timestamp?: string; event?: string; details?: unknown }, i: number) => {
                            events.push({ id: `orch-${i}`, timestamp: entry.timestamp || '', title: entry.event || 'Event', desc: entry.details ? JSON.stringify(entry.details).slice(0, 100) : '', icon: <Activity className="size-3" />, color: 'text-amber-400' })
                          })
                        }
                        // Task events
                        tasks.forEach(t => {
                          events.push({ id: `task-create-${t.id}`, timestamp: t.createdAt, title: `Task Created: ${t.title}`, desc: `Priority: ${t.priority}`, icon: <Plus className="size-3" />, color: 'text-sky-400' })
                          if (t.startedAt) events.push({ id: `task-start-${t.id}`, timestamp: t.startedAt, title: `Task Started: ${t.title}`, desc: t.assignee ? `Assigned to ${t.assignee.name}` : '', icon: <Play className="size-3" />, color: 'text-emerald-400' })
                          if (t.completedAt) events.push({ id: `task-done-${t.id}`, timestamp: t.completedAt, title: `Task Completed: ${t.title}`, desc: '', icon: <CheckCircle2 className="size-3" />, color: 'text-emerald-400' })
                        })
                        // Sort by timestamp desc
                        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        if (events.length === 0) return <div className="text-xs text-slate-500 py-8 text-center">No timeline events yet</div>
                        return events.map(e => (
                          <div key={e.id} className="relative pb-4 last:pb-0">
                            <div className={`absolute -left-4 top-0.5 w-4 h-4 rounded-full bg-[#0d1117] border border-neutral-700 flex items-center justify-center ${e.color}`}>{e.icon}</div>
                            <div className="ml-2"><div className="flex items-center gap-2"><span className={`text-xs font-medium ${e.color}`}>{e.title}</span><span className="text-[9px] text-slate-600">{formatRelativeTime(e.timestamp)}</span></div>{e.desc && <p className="text-[10px] text-slate-500 mt-0.5">{e.desc}</p>}</div>
                          </div>
                        ))
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Dependencies Tab ───────────────────────────────────── */}
            <TabsContent value="dependencies" className="h-full m-0 overflow-y-auto">
              <div className="p-4">
                <Card className="bg-[#0d1117] border-neutral-800 py-0">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><Network className="size-4 text-emerald-400" /> Dependency Graph</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex gap-4 flex-wrap text-[9px] mb-4">
                      {Object.entries(AGENT_TYPE_COLORS).slice(0, 6).map(([type, c]) => (
                        <div key={type} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} /><span className="text-slate-500">{type}</span></div>
                      ))}
                    </div>
                    <svg viewBox="0 0 800 500" className="w-full h-auto border border-neutral-800 rounded-lg bg-neutral-900/30">
                      {/* Agent nodes */}
                      {agents.map((a, i) => {
                        const ac = getAgentColor(a.type)
                        const x = 100 + (i % 4) * 180; const y = 80 + Math.floor(i / 4) * 120
                        const isSelected = depSelectedNode === a.id
                        return (
                          <g key={a.id} onClick={() => setDepSelectedNode(isSelected ? null : a.id)} className="cursor-pointer">
                            <circle cx={x} cy={y} r={isSelected ? 28 : 22} fill={isSelected ? 'rgba(16,185,129,0.2)' : 'rgba(30,35,50,0.8)'} stroke={isSelected ? '#10b981' : '#374151'} strokeWidth={2} />
                            <text x={x} y={y - 2} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="600">{a.name.slice(0, 8)}</text>
                            <text x={x} y={y + 10} textAnchor="middle" fill="#64748b" fontSize="8">{a.type}</text>
                          </g>
                        )
                      })}
                      {/* Task nodes */}
                      {tasks.slice(0, 12).map((t, i) => {
                        const x = 80 + (i % 6) * 120; const y = 340 + Math.floor(i / 6) * 80
                        const statusColor = t.status === 'done' || t.status === 'completed' ? '#10b981' : t.status === 'in_progress' ? '#3b82f6' : t.status === 'failed' ? '#ef4444' : '#6b7280'
                        return (
                          <g key={t.id} onClick={() => setDepSelectedNode(isSelected => isSelected === t.id ? null : t.id)} className="cursor-pointer">
                            <circle cx={x} cy={y} r="14" fill="rgba(30,35,50,0.8)" stroke={statusColor} strokeWidth="1.5" />
                            <text x={x} y={y + 3} textAnchor="middle" fill="#94a3b8" fontSize="7">{t.title.slice(0, 5)}</text>
                          </g>
                        )
                      })}
                      {/* Dependency lines from agents to tasks */}
                      {tasks.slice(0, 12).map((t, ti) => {
                        if (!t.assigneeId) return null
                        const agentIdx = agents.findIndex(a => a.id === t.assigneeId)
                        if (agentIdx < 0) return null
                        const ax = 100 + (agentIdx % 4) * 180; const ay = 80 + Math.floor(agentIdx / 4) * 120
                        const tx = 80 + (ti % 6) * 120; const ty = 340 + Math.floor(ti / 6) * 80
                        return <line key={`line-${t.id}`} x1={ax} y1={ay + 22} x2={tx} y2={ty - 14} stroke="#374151" strokeWidth="1" strokeDasharray="4 2" />
                      })}
                    </svg>
                    {depSelectedNode && (
                      <div className="mt-3 p-3 rounded-md bg-neutral-800/50 border border-neutral-700">
                        {(() => {
                          const agent = agents.find(a => a.id === depSelectedNode)
                          const task = tasks.find(t => t.id === depSelectedNode)
                          if (agent) return <div><span className="text-xs font-medium text-emerald-400">{agent.name}</span><span className="text-xs text-slate-500 ml-2">{agent.type}</span><p className="text-[10px] text-slate-500 mt-1">{agent.description || 'No description'} • {tasks.filter(t => t.assigneeId === agent.id).length} tasks assigned</p></div>
                          if (task) return <div><span className="text-xs font-medium text-emerald-400">{task.title}</span><Badge variant="outline" className="text-[9px] h-4 ml-2 border-neutral-700 text-slate-400">{task.status}</Badge><p className="text-[10px] text-slate-500 mt-1">{task.assignee ? `Assigned to: ${task.assignee.name}` : 'Unassigned'}</p></div>
                          return null
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Metrics Tab ────────────────────────────────────────── */}
            <TabsContent value="metrics" className="h-full m-0 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total', value: totalTasks, icon: <ListChecks className="size-4 text-sky-400" />, color: 'text-sky-400' },
                    { label: 'Completed', value: doneTasks, icon: <CheckCircle2 className="size-4 text-emerald-400" />, color: 'text-emerald-400' },
                    { label: 'In Progress', value: inProgressTasks, icon: <Zap className="size-4 text-amber-400" />, color: 'text-amber-400' },
                    { label: 'Blocked', value: blockedTasks, icon: <AlertCircle className="size-4 text-red-400" />, color: 'text-red-400' },
                  ].map(m => (
                    <Card key={m.label} className="bg-[#0d1117] border-neutral-800 py-0">
                      <CardContent className="p-4 flex flex-col items-center text-center">{m.icon}<div className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</div><div className="text-[10px] text-slate-500">{m.label}</div></CardContent>
                    </Card>
                  ))}
                </div>

                {/* Success/Error Rate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><TrendingUp className="size-4 text-emerald-400" /> Success Rate</CardTitle></CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="text-3xl font-bold text-emerald-400">{totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%</div>
                      <Progress value={totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0} className="h-2 mt-2 bg-neutral-800 [&>div]:bg-emerald-500" />
                      <div className="text-[10px] text-slate-500 mt-1">{doneTasks} of {totalTasks} tasks completed</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><AlertCircle className="size-4 text-red-400" /> Error Rate</CardTitle></CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="text-3xl font-bold text-red-400">{totalTasks > 0 ? Math.round((blockedTasks / totalTasks) * 100) : 0}%</div>
                      <Progress value={totalTasks > 0 ? (blockedTasks / totalTasks) * 100 : 0} className="h-2 mt-2 bg-neutral-800 [&>div]:bg-red-500" />
                      <div className="text-[10px] text-slate-500 mt-1">{blockedTasks} tasks blocked/failed</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Agent Productivity */}
                <Card className="bg-[#0d1117] border-neutral-800 py-0">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><Award className="size-4 text-emerald-400" /> Agent Productivity</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {agents.map(a => {
                      const aTasks = tasks.filter(t => t.assigneeId === a.id); const done = aTasks.filter(t => t.status === 'done' || t.status === 'completed').length
                      const ac = getAgentColor(a.type)
                      return (
                        <div key={a.id} className="flex items-center gap-3">
                          <AgentAvatar type={a.type} name={a.name} size="sm" />
                          <span className={`text-xs ${ac.text} w-24 truncate`}>{a.name}</span>
                          <div className="flex-1 h-5 bg-neutral-800 rounded relative overflow-hidden">
                            <motion.div className={`h-full ${ac.bg} rounded`} initial={{ width: 0 }} animate={{ width: `${aTasks.length > 0 ? (done / aTasks.length) * 100 : 0}%` }} transition={{ duration: 0.5 }} />
                            <span className="absolute inset-0 flex items-center px-2 text-[9px] text-slate-300">{done}/{aTasks.length} tasks</span>
                          </div>
                        </div>
                      )
                    })}
                    {agents.length === 0 && <div className="text-xs text-slate-500">No agents</div>}
                  </CardContent>
                </Card>

                {/* Workload Distribution */}
                <Card className="bg-[#0d1117] border-neutral-800 py-0">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><PieChart className="size-4 text-emerald-400" /> Workload Distribution</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-1">
                      {agents.map(a => {
                        const count = tasks.filter(t => t.assigneeId === a.id).length
                        const maxCount = Math.max(...agents.map(ag => tasks.filter(t => t.assigneeId === ag.id).length), 1)
                        const ac = getAgentColor(a.type)
                        return (
                          <div key={a.id} className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 w-20 truncate">{a.name}</span>
                            <div className="flex-1 h-3 bg-neutral-800 rounded overflow-hidden"><div className={`h-full ${ac.dot} opacity-60 rounded`} style={{ width: `${(count / maxCount) * 100}%` }} /></div>
                            <span className="text-[10px] text-slate-500 w-6 text-right">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Agents Tab ─────────────────────────────────────────── */}
            <TabsContent value="agents" className="h-full m-0 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2"><Users className="size-4 text-emerald-400" /> Agent Team</h3>
                  <Button onClick={() => setAddAgentDialogOpen(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-7 text-xs"><UserPlus className="size-3" /> Add Agent</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {agents.map(a => {
                    const ac = getAgentColor(a.type)
                    const aTasks = tasks.filter(t => t.assigneeId === a.id)
                    const isWorking = aTasks.some(t => t.status === 'in_progress')
                    const aDone = aTasks.filter(t => t.status === 'done' || t.status === 'completed').length
                    const aStatus = isWorking ? 'working' : aTasks.length > 0 ? 'idle' : 'idle'
                    const statusConf = AGENT_STATUS_CONFIG[aStatus]
                    return (
                      <motion.div key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="bg-[#0d1117] border-neutral-800 hover:border-emerald-500/20 transition-colors py-0">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="relative"><AgentAvatar type={a.type} name={a.name} size="lg" />{statusConf.pulse && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0d1117] animate-pulse" />}</div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-white truncate">{a.name}</div>
                                <Badge variant="outline" className={`text-[9px] h-4 ${ac.text} ${ac.bg} ${ac.border}`}>{a.type}</Badge>
                              </div>
                              <Badge variant="outline" className={`text-[9px] h-4 gap-1 ${statusConf.color} border-neutral-700`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConf.pulse ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
                                {statusConf.label}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div className="p-1.5 rounded bg-neutral-800/50"><div className="text-xs font-bold text-slate-300">{aTasks.length}</div><div className="text-[8px] text-slate-500">Tasks</div></div>
                              <div className="p-1.5 rounded bg-neutral-800/50"><div className="text-xs font-bold text-emerald-400">{aDone}</div><div className="text-[8px] text-slate-500">Done</div></div>
                            </div>
                            {isWorking && <div className="text-[10px] text-slate-500">Current: {aTasks.find(t => t.status === 'in_progress')?.title || '-'}</div>}
                            {/* Workload bar */}
                            <div className="space-y-0.5"><div className="flex justify-between text-[9px]"><span className="text-slate-500">Workload</span><span className="text-slate-400">{aTasks.length > 0 ? Math.round((aDone / aTasks.length) * 100) : 0}%</span></div><Progress value={aTasks.length > 0 ? (aDone / aTasks.length) * 100 : 0} className="h-1 bg-neutral-800 [&>div]:bg-emerald-500" /></div>
                            {/* Actions */}
                            <div className="flex gap-1.5">
                              <Button variant="outline" size="sm" className="flex-1 h-6 text-[9px] gap-1 border-neutral-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/30" onClick={() => controlAgent(a.id, 'pause')}><Pause className="size-2.5" /> Pause</Button>
                              <Button variant="outline" size="sm" className="flex-1 h-6 text-[9px] gap-1 border-neutral-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30" onClick={() => controlAgent(a.id, 'resume')}><Play className="size-2.5" /> Resume</Button>
                              <Button variant="outline" size="sm" className="h-6 text-[9px] border-neutral-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 px-1.5" onClick={() => { if (confirm(`Remove agent ${a.name}?`)) controlAgent(a.id, 'remove') }}><UserMinus className="size-2.5" /></Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
              {/* Add Agent Dialog */}
              <Dialog open={addAgentDialogOpen} onOpenChange={setAddAgentDialogOpen}>
                <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-sm">
                  <DialogHeader><DialogTitle className="text-emerald-400 flex items-center gap-2"><UserPlus className="size-5" /> Add Agent</DialogTitle><DialogDescription className="text-slate-400">Add a new agent to the team</DialogDescription></DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-2"><Label className="text-slate-300">Name</Label><Input placeholder="Agent name..." value={newAgentName} onChange={e => setNewAgentName(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white" /></div>
                    <div className="space-y-2"><Label className="text-slate-300">Type</Label><Select value={newAgentType} onValueChange={setNewAgentType}><SelectTrigger className="bg-neutral-900 border-neutral-700 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-neutral-900 border-neutral-700">{['developer', 'architect', 'project_manager', 'qa', 'security', 'research', 'documentation', 'coordinator', 'debugger'].map(t => <SelectItem key={t} value={t} className="text-white focus:bg-neutral-800 focus:text-white">{t}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <DialogFooter><Button onClick={createAgent} disabled={!newAgentName.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add Agent</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* ─── Code Tab ───────────────────────────────────────────── */}
            <TabsContent value="code" className="h-full m-0 flex flex-col">
              <div className="flex-1 flex overflow-hidden">
                {/* File Tree */}
                <div className="w-56 shrink-0 border-r border-neutral-800 overflow-y-auto">
                  <div className="p-2 border-b border-neutral-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Files</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-500" onClick={() => selectedProjectId && fetchProject(selectedProjectId)}><RefreshCw className="size-3" /></Button>
                  </div>
                  {(() => {
                    const tree = buildFileTree(files)
                    const renderNode = (node: FileTreeNode, depth: number = 0) => (
                      <div key={node.path}>
                        {node.isDirectory ? (
                          <div className="flex items-center gap-1.5 py-1 px-2 cursor-pointer hover:bg-neutral-800/60 text-xs text-slate-300 transition-colors" style={{ paddingLeft: `${depth * 12 + 8}px` }} onClick={() => setExpandedDirs(prev => { const n = new Set(prev); if (n.has(node.path)) { n.delete(node.path) } else { n.add(node.path) }; return n })}>
                            {expandedDirs.has(node.path) ? <ChevronDown className="size-3 text-slate-500 shrink-0" /> : <ChevronRight className="size-3 text-slate-500 shrink-0" />}
                            <Folder className="size-3.5 text-amber-400/70 shrink-0" /><span className="truncate">{node.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 py-1 px-2 cursor-pointer hover:bg-neutral-800/60 text-xs text-slate-300 transition-colors" style={{ paddingLeft: `${depth * 12 + 8}px` }} onClick={() => node.file && viewFile(node.file.id, node.file.name, node.file.path)}>
                            <span className="w-3 shrink-0" />{node.file ? getFileIcon(node.file.language, node.file.name) : <File className="size-3.5 text-slate-400" />}<span className="truncate">{node.name}</span>
                          </div>
                        )}
                        {node.isDirectory && expandedDirs.has(node.path) && <div>{node.children.map(c => renderNode(c, depth + 1))}</div>}
                      </div>
                    )
                    return tree.length > 0 ? tree.map(n => renderNode(n)) : <div className="p-4 text-xs text-slate-600 text-center">No files</div>
                  })()}
                </div>
                {/* File Content */}
                <div className="flex-1 overflow-hidden">
                  {viewingFile ? (
                    <div className="h-full flex flex-col">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800 shrink-0">
                        <span className="text-xs text-slate-300 font-medium">{viewingFile.path}</span>
                        <span className="text-[9px] text-slate-600">{formatBytes(new Blob([viewingFile.content]).size)}</span>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto text-slate-500" onClick={() => setViewingFile(null)}><X className="size-3" /></Button>
                      </div>
                      <ScrollArea className="flex-1">
                        <pre className="p-3 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre overflow-x-auto">{viewingFile.content || '(empty file)'}</pre>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center"><div className="text-center"><FileSearch className="size-8 text-neutral-700 mx-auto mb-2" /><p className="text-xs text-slate-500">Select a file to view</p></div></div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ─── Docs Tab ───────────────────────────────────────────── */}
            <TabsContent value="docs" className="h-full m-0 overflow-y-auto">
              <div className="p-4 space-y-4">
                {project?.readme ? (
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><BookOpen className="size-4 text-emerald-400" /> README</CardTitle></CardHeader>
                    <CardContent className="px-4 pb-4"><div className="prose prose-invert prose-sm max-w-none text-xs text-slate-300 whitespace-pre-wrap">{project.readme}</div></CardContent>
                  </Card>
                ) : null}
                {project?.documentation ? (
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-white flex items-center gap-2"><FileText className="size-4 text-emerald-400" /> Documentation</CardTitle></CardHeader>
                    <CardContent className="px-4 pb-4"><div className="prose prose-invert prose-sm max-w-none text-xs text-slate-300 whitespace-pre-wrap">{project.documentation}</div></CardContent>
                  </Card>
                ) : null}
                {!project?.readme && !project?.documentation && (
                  <div className="text-center py-16"><BookOpen className="size-12 text-neutral-700 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-300 mb-2">No Documentation Yet</h3><p className="text-sm text-slate-500 mb-4">Start orchestration to generate project documentation</p><Button onClick={startOrchestration} disabled={orchLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">{orchLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Start Orchestrator</Button></div>
                )}
              </div>
            </TabsContent>

          </div>
        </Tabs>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-md">
          {selectedTask && (() => {
            const tp = PRIORITY_CONFIG[(selectedTask.priority as ProjectPriority) || 'medium']
            return (
              <>
                <DialogHeader><DialogTitle className="text-emerald-400 text-sm">{selectedTask.title}</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                  {selectedTask.description && <p className="text-xs text-slate-400">{selectedTask.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={`text-[9px] h-4 ${tp.color} ${tp.bgColor} border-neutral-700`}>{tp.label} priority</Badge>
                    <Badge variant="outline" className="text-[9px] h-4 text-slate-400 border-neutral-700">{selectedTask.status}</Badge>
                    {selectedTask.type && <Badge variant="outline" className="text-[9px] h-4 text-slate-400 border-neutral-700">{selectedTask.type}</Badge>}
                  </div>
                  {selectedTask.assignee && (
                    <div className="flex items-center gap-2"><AgentAvatar type={selectedTask.assignee.type} name={selectedTask.assignee.name} size="sm" /><span className="text-xs text-slate-300">{selectedTask.assignee.name}</span></div>
                  )}
                  <div className="text-[10px] text-slate-500">Created: {formatDate(selectedTask.createdAt)} {selectedTask.completedAt && `• Completed: ${formatDate(selectedTask.completedAt)}`}</div>
                  {selectedTask.error && <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">{selectedTask.error}</div>}
                  {/* Human oversight */}
                  <div className="flex gap-2 pt-2 border-t border-neutral-800">
                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-7 text-xs" onClick={() => { /* approve task */ }}><ThumbsUp className="size-3" /> Approve</Button>
                    <Button size="sm" variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1 h-7 text-xs" onClick={() => { /* reject task */ }}><ThumbsDown className="size-3" /> Reject</Button>
                    <Button size="sm" variant="outline" className="border-neutral-700 text-slate-400 hover:text-sky-400 gap-1 h-7 text-xs" onClick={() => { /* reassign */ }}><Edit3 className="size-3" /> Reassign</Button>
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
