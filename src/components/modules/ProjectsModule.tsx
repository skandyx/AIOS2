'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
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
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  FolderKanban,
  Calendar,
  CheckCircle2,
  PauseCircle,
  Archive,
  ListChecks,
  Wrench,
  Server,
  Sparkles,
  Trash2,
  ExternalLink,
  ChevronLeft,
  AlertCircle,
  Zap,
  LayoutGrid,
  Rocket,
  PartyPopper,
  Edit3,
  Loader2,
  Bot,
  File,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  MessageSquare,
  Users,
  Github,
  Upload,
  Globe,
  GitBranch,
  RefreshCw,
  Download,
  Send,
  ChevronDown,
  ChevronRight,
  Activity,
  Eye,
  ClipboardList,
  CircleDot,
  Search,
  Cog,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'archived'
type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'
type ProjectCategory = 'Web App' | 'API' | 'Automation' | 'Mobile' | 'Desktop' | 'Data' | 'AI' | 'Other'

interface TaskData {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  priority?: string
  assignedTo?: string
  assignee?: { id: string; name: string; type: string; avatar?: string }
  createdAt: string
}

interface SkillAssignment {
  id: string
  skillId: string
  role?: string
  skill?: { id: string; name: string; description?: string }
}

interface McpAssignment {
  id: string
  mcpServerId: string
  role?: string
  mcpServer?: { id: string; name: string; description?: string; url?: string }
}

interface ProjectFileData {
  id: string
  filename: string
  path: string
  mimeType?: string | null
  size: number
  encoding: string
  source: string
  createdAt: string
  updatedAt: string
  type?: string
}

interface AgentDiscussionMsg {
  id: string
  agentId?: string | null
  agentName: string
  agentType: string
  agentAvatar?: string | null
  content: string
  round: number
  type: string
  metadata?: string | null
  timestamp: string
}

interface AgentInstruction {
  id: string
  agentId?: string | null
  agentName: string
  agentType: string
  agentAvatar?: string | null
  action: string
  type: string
  status: string
  metadata?: string | null
  timestamp: string
}

interface ProjectData {
  id: string
  name: string
  description?: string | null
  status: ProjectStatus
  priority: ProjectPriority
  category?: string | null
  icon?: string | null
  techStack?: string | null
  requirements?: string | null
  notes?: string | null
  tags?: string | null
  dueDate?: string | null
  createdAt: string
  updatedAt: string
  githubRepoUrl?: string | null
  githubBranch?: string | null
  githubStatus?: string | null
  githubPushedAt?: string | null
  orchestratorStatus?: string | null
  orchestratorStartedAt?: string | null
  orchestratorCompletedAt?: string | null
  _count?: {
    tasks: number
    skills: number
    mcpServers: number
    files: number
    discussions: number
    activities: number
  }
  tasks?: TaskData[]
  skills?: SkillAssignment[]
  mcpServers?: McpAssignment[]
  files?: ProjectFileData[]
  discussions?: AgentDiscussionMsg[]
  activities?: AgentInstruction[]
}

interface InstalledSkill {
  id: string
  name: string
  description?: string
}

interface InstalledMcp {
  id: string
  name: string
  description?: string
  url?: string
}

interface FileTreeNode {
  name: string
  type: 'file' | 'folder'
  icon?: React.ReactNode
  size?: string
  modified?: string
  children?: FileTreeNode[]
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  planning: { label: 'Planning', color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/30', icon: <ListChecks className="size-3" /> },
  in_progress: { label: 'In Progress', color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30', icon: <Zap className="size-3" /> },
  on_hold: { label: 'On Hold', color: 'text-slate-400', bgColor: 'bg-slate-500/15', borderColor: 'border-slate-500/30', icon: <PauseCircle className="size-3" /> },
  completed: { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30', icon: <CheckCircle2 className="size-3" /> },
  archived: { label: 'Archived', color: 'text-neutral-400', bgColor: 'bg-neutral-500/15', borderColor: 'border-neutral-500/30', icon: <Archive className="size-3" /> },
}

const PRIORITY_CONFIG: Record<ProjectPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-neutral-400', bgColor: 'bg-neutral-500/15' },
  medium: { label: 'Medium', color: 'text-cyan-400', bgColor: 'bg-cyan-500/15' },
  high: { label: 'High', color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/15' },
}

const CATEGORY_OPTIONS: ProjectCategory[] = ['Web App', 'API', 'Automation', 'Mobile', 'Desktop', 'Data', 'AI', 'Other']

const PRIORITY_OPTIONS: ProjectPriority[] = ['low', 'medium', 'high', 'critical']

const STATUS_OPTIONS: ProjectStatus[] = ['planning', 'in_progress', 'on_hold', 'completed', 'archived']

const PIPELINE_STAGES = [
  { key: 'planning', label: 'Planning', emoji: '📋' },
  { key: 'analyzing', label: 'Analyzing', emoji: '🔍' },
  { key: 'assigning', label: 'Assigning', emoji: '🎯' },
  { key: 'discussing', label: 'Discussing', emoji: '💬' },
  { key: 'working', label: 'Working', emoji: '⚙️' },
  { key: 'completed', label: 'Completed', emoji: '✅' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTechStack(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // not JSON, try comma-separated
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function calculateProgress(tasks: TaskData[] | undefined): number {
  if (!tasks || tasks.length === 0) return 0
  const done = tasks.filter(t => t.status === 'done').length
  return Math.round((done / tasks.length) * 100)
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getAgentColor(type: string) {
  switch (type) {
    case 'coordinator': return { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-400' }
    case 'developer': return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' }
    case 'security': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' }
    case 'data': return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' }
    case 'qa': return { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-400' }
    case 'research': return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400' }
    case 'system': return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' }
    case 'reasoning': return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-400' }
    case 'planning': return { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30', dot: 'bg-teal-400' }
    case 'document': return { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30', dot: 'bg-pink-400' }
    case 'mcp': return { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-400' }
    case 'workflow': return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' }
    default: return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-400' }
  }
}

function getAgentAvatar(type: string) {
  switch (type) {
    case 'coordinator': return '🎯'
    case 'developer': return '💻'
    case 'security': return '🛡️'
    case 'data': return '📊'
    case 'qa': return '🧪'
    case 'research': return '🔬'
    case 'system': return '⚙️'
    case 'reasoning': return '🧠'
    case 'planning': return '📋'
    case 'document': return '📄'
    case 'mcp': return '🔌'
    case 'workflow': return '🔄'
    default: return '🤖'
  }
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts': case 'tsx': return <FileCode className="size-3.5 text-cyan-400 shrink-0" />
    case 'js': case 'jsx': case 'mjs': return <FileCode className="size-3.5 text-amber-400 shrink-0" />
    case 'py': return <FileCode className="size-3.5 text-emerald-400 shrink-0" />
    case 'json': return <FileJson className="size-3.5 text-amber-400 shrink-0" />
    case 'md': case 'txt': return <FileText className="size-3.5 text-blue-400 shrink-0" />
    case 'css': case 'scss': return <FileCode className="size-3.5 text-pink-400 shrink-0" />
    case 'yaml': case 'yml': case 'toml': return <FileText className="size-3.5 text-orange-400 shrink-0" />
    default: return <File className="size-3.5 text-slate-400 shrink-0" />
  }
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onClick,
}: {
  project: ProjectData
  onClick: () => void
}) {
  const statusConf = STATUS_CONFIG[project.status]
  const priorityConf = PRIORITY_CONFIG[project.priority]
  const techStack = parseTechStack(project.techStack)
  const progress = project.tasks ? calculateProgress(project.tasks) : 0
  const taskCount = project._count?.tasks ?? project.tasks?.length ?? 0
  const skillCount = project._count?.skills ?? project.skills?.length ?? 0
  const mcpCount = project._count?.mcpServers ?? project.mcpServers?.length ?? 0

  return (
    <Card
      className="bg-[#0d1117] border-neutral-800 hover:border-rose-500/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-rose-500/5 py-0"
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">{project.icon || '📁'}</span>
            <div className="min-w-0">
              <CardTitle className="text-sm text-white truncate">{project.name}</CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {project.description || 'No description'}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] h-5 gap-1 ${statusConf.color} ${statusConf.bgColor} ${statusConf.borderColor}`}
          >
            {statusConf.icon}
            {statusConf.label}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] h-5 ${priorityConf.color} ${priorityConf.bgColor} border-neutral-700`}
          >
            {priorityConf.label}
          </Badge>
          {project.category && (
            <Badge variant="outline" className="text-[10px] h-5 text-rose-300 bg-rose-500/10 border-rose-500/20">
              {project.category}
            </Badge>
          )}
          {project.orchestratorStatus && project.orchestratorStatus !== 'pending' && (
            <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${
              project.orchestratorStatus === 'completed' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
            }`}>
              <Bot className="size-2.5" />
              {project.orchestratorStatus === 'completed' ? 'Orchestrated' : 'Orchestrating'}
            </Badge>
          )}
          {project.githubStatus === 'pushed' && (
            <Badge variant="outline" className="text-[10px] h-5 text-emerald-300 bg-emerald-500/10 border-emerald-500/20 gap-1">
              <Github className="size-2.5" />
              Pushed
            </Badge>
          )}
        </div>

        {techStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {techStack.slice(0, 4).map((tech) => (
              <Badge
                key={tech}
                variant="outline"
                className="text-[9px] h-4 px-1.5 border-neutral-700 text-slate-300 bg-neutral-800/50"
              >
                {tech}
              </Badge>
            ))}
            {techStack.length > 4 && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-neutral-700 text-slate-500">
                +{techStack.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <ListChecks className="size-3" />
            {taskCount}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="size-3" />
            {skillCount}
          </span>
          <span className="flex items-center gap-1">
            <Server className="size-3" />
            {mcpCount}
          </span>
          {project.dueDate && (
            <span className="flex items-center gap-1 ml-auto">
              <Calendar className="size-3" />
              {formatDate(project.dueDate)}
            </span>
          )}
        </div>

        {taskCount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Progress</span>
              <span className="text-rose-400 font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-pink-500" />
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>Updated {formatRelativeTime(project.updatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (project: ProjectData) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ProjectCategory>('Web App')
  const [priority, setPriority] = useState<ProjectPriority>('medium')
  const [icon, setIcon] = useState('📁')
  const [techStack, setTechStack] = useState('')
  const [requirements, setRequirements] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [creating, setCreating] = useState(false)

  const resetForm = () => {
    setName('')
    setDescription('')
    setCategory('Web App')
    setPriority('medium')
    setIcon('📁')
    setTechStack('')
    setRequirements('')
    setNotes('')
    setDueDate('')
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        status: 'planning',
        priority,
        category,
        icon,
        techStack: techStack.trim() ? JSON.stringify(techStack.split(',').map(s => s.trim()).filter(Boolean)) : undefined,
        requirements: requirements.trim() || undefined,
        notes: notes.trim() || undefined,
        dueDate: dueDate || undefined,
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const created = await res.json()
        onCreated(created)
        resetForm()
        onOpenChange(false)
      }
    } catch {
      // silently fail
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-rose-400 flex items-center gap-2">
            <FolderKanban className="size-5" />
            New Project
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new project to organize tasks, skills, and MCP servers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-slate-300">Name *</Label>
            <Input
              placeholder="Project name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Description</Label>
            <Textarea
              placeholder="What is this project about..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white min-h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ProjectCategory)}>
                <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-white focus:bg-neutral-800 focus:text-white">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ProjectPriority)}>
                <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p} className="text-white focus:bg-neutral-800 focus:text-white">
                      {PRIORITY_CONFIG[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Icon / Emoji</Label>
            <Input
              placeholder="📁"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white w-20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Tech Stack (comma-separated)</Label>
            <Input
              placeholder="React, Node.js, PostgreSQL..."
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Requirements</Label>
            <Textarea
              placeholder="Project requirements..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white min-h-16"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white min-h-16"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }} className="border-neutral-700 text-slate-300">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()} className="bg-rose-600 hover:bg-rose-700 text-white">
            {creating ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatusChangeDialog({
  open,
  onOpenChange,
  newStatus,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  newStatus: ProjectStatus | null
  onConfirm: () => void
}) {
  if (!newStatus) return null

  const isCompleted = newStatus === 'completed'
  const isInProgress = newStatus === 'in_progress'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className={isCompleted ? 'text-emerald-400' : 'text-amber-400'}>
            {isCompleted ? (
              <span className="flex items-center gap-2">
                <PartyPopper className="size-5" />
                Project Completed!
              </span>
            ) : isInProgress ? (
              <span className="flex items-center gap-2">
                <Rocket className="size-5" />
                Start Project?
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <AlertCircle className="size-5" />
                Change Status
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isCompleted
              ? '🎉 Congratulations! Marking this project as completed is a great milestone.'
              : isInProgress
                ? 'Are you ready to start working on this project? This will change the status to In Progress.'
                : `Change project status to ${STATUS_CONFIG[newStatus].label}?`
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-neutral-700 text-slate-300">
            Cancel
          </Button>
          <Button
            onClick={() => { onConfirm(); onOpenChange(false) }}
            className={isCompleted ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : isInProgress ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Pipeline Step Component ──────────────────────────────────────────────────

function PipelineStep({
  stage,
  isActive,
  isCompleted,
  isPending,
}: {
  stage: typeof PIPELINE_STAGES[number]
  isActive: boolean
  isCompleted: boolean
  isPending: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-500',
          isActive && 'bg-rose-600/30 border-2 border-rose-500 shadow-lg shadow-rose-500/30 scale-110 animate-pulse',
          isCompleted && 'bg-emerald-600/30 border-2 border-emerald-500 scale-100',
          isPending && 'bg-neutral-800/50 border-2 border-neutral-700 opacity-50'
        )}
      >
        {stage.emoji}
      </div>
      <span
        className={cn(
          'text-[10px] font-medium text-center leading-tight',
          isActive && 'text-rose-400',
          isCompleted && 'text-emerald-400',
          isPending && 'text-neutral-500'
        )}
      >
        {stage.label}
      </span>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProjectsModule() {
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null)
  const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([])
  const [installedMcpServers, setInstalledMcpServers] = useState<InstalledMcp[]>([])
  const [addSkillDialogOpen, setAddSkillDialogOpen] = useState(false)
  const [addMcpDialogOpen, setAddMcpDialogOpen] = useState(false)
  const [newSkillRole, setNewSkillRole] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [newMcpRole, setNewMcpRole] = useState('')
  const [selectedMcpId, setSelectedMcpId] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [editingProject, setEditingProject] = useState(false)
  const [editForm, setEditForm] = useState<{ name: string; description: string; requirements: string; notes: string; icon: string; category: string; priority: ProjectPriority; dueDate: string }>({
    name: '', description: '', requirements: '', notes: '', icon: '', category: '', priority: 'medium', dueDate: '',
  })
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState('pipeline')
  const socketRef = useRef<ReturnType<typeof io> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/components']))
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // ── Orchestration state ──
  const [orchestrating, setOrchestrating] = useState(false)

  // ── GitHub state ──
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubUsername, setGithubUsername] = useState<string | null>(null)
  const [githubSetupDialogOpen, setGithubSetupDialogOpen] = useState(false)
  const [githubPushDialogOpen, setGithubPushDialogOpen] = useState(false)
  const [githubToken, setGithubToken] = useState('')
  const [githubSetupUsername, setGithubSetupUsername] = useState('')
  const [githubSettingUp, setGithubSettingUp] = useState(false)
  const [githubSetupError, setGithubSetupError] = useState<string | null>(null)
  const [pushRepoName, setPushRepoName] = useState('')
  const [pushPrivate, setPushPrivate] = useState(false)
  const [pushDescription, setPushDescription] = useState('')
  const [pushing, setPushing] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [pushResult, setPushResult] = useState<{ repoUrl: string; filesPushed: number } | null>(null)

  // ── Discussion generation state ──
  const [generatingDiscussion, setGeneratingDiscussion] = useState(false)

  // ── File upload state ──
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [projectFiles, setProjectFiles] = useState<ProjectFileData[]>([])

  // ── Download state ──
  const [downloading, setDownloading] = useState(false)

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data)
        }
      }
    } catch {
      // Use empty state on error
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch installed skills
  const fetchInstalledSkills = useCallback(async () => {
    try {
      const res = await fetch('/api/skills')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setInstalledSkills(data)
      }
    } catch {
      // ignore
    }
  }, [])

  // Fetch installed MCP servers
  const fetchInstalledMcp = useCallback(async () => {
    try {
      const res = await fetch('/api/mcp')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setInstalledMcpServers(data)
      }
    } catch {
      // ignore
    }
  }, [])

  // Check GitHub connection
  const checkGithub = useCallback(async () => {
    try {
      const res = await fetch('/api/github')
      if (res.ok) {
        const data = await res.json()
        setGithubConnected(data.connected === true)
        setGithubUsername(data.username || null)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    fetchInstalledSkills()
    fetchInstalledMcp()
    checkGithub()
  }, [fetchInstalledSkills, fetchInstalledMcp, checkGithub])

  // ─── Polling for orchestrator status ──────────────────────────────────────

  useEffect(() => {
    if (view !== 'detail' || !selectedProject) return

    const activeStatuses = ['analyzing', 'assigning', 'discussing', 'working']
    const shouldPoll = activeStatuses.includes(selectedProject.orchestratorStatus || '')

    if (shouldPoll) {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/projects/${selectedProject.id}`)
          if (res.ok) {
            const detail = await res.json()
            setSelectedProject(detail)
            setProjects((prev) => prev.map((p) => (p.id === detail.id ? detail : p)))
          }
        } catch {
          // ignore polling errors
        }
      }, 3000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [view, selectedProject?.id, selectedProject?.orchestratorStatus])

  // ─── WebSocket for real-time updates ──────────────────────────────────────

  useEffect(() => {
    if (view !== 'detail' || !selectedProject) return

    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('agent:message', () => {
      // Refresh project data on agent messages
      fetch(`/api/projects/${selectedProject.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(detail => {
          if (detail) {
            setSelectedProject(detail)
            setProjects((prev) => prev.map((p) => (p.id === detail.id ? detail : p)))
          }
        })
        .catch(() => {})
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [view, selectedProject?.id])

  // ─── Fetch files when project is selected ─────────────────────────────────

  useEffect(() => {
    if (view !== 'detail' || !selectedProject) return

    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/projects/${selectedProject.id}/files`)
        if (res.ok) {
          const data = await res.json()
          setProjectFiles(data.files || [])
        }
      } catch {
        // ignore
      }
    }

    fetchFiles()
  }, [view, selectedProject?.id, selectedProject?.updatedAt])

  // ─── File Tree Generation ───────────────────────────────────────────────────

  const generateFileTree = useCallback((project: ProjectData): FileTreeNode[] => {
    const category = project.category || 'Web App'
    switch (category) {
      case 'Web App':
        return [
          { name: 'src', type: 'folder', children: [
            { name: 'components', type: 'folder', children: [
              { name: 'ui', type: 'folder', children: [
                { name: 'Button.tsx', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '2.4 KB', modified: '2h ago' },
                { name: 'Card.tsx', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '1.8 KB', modified: '3h ago' },
                { name: 'Dialog.tsx', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '3.1 KB', modified: '1d ago' },
              ]},
              { name: 'Layout.tsx', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '4.2 KB', modified: '1h ago' },
              { name: 'Dashboard.tsx', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '6.8 KB', modified: '30m ago' },
            ]},
            { name: 'lib', type: 'folder', children: [
              { name: 'utils.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '1.2 KB', modified: '2d ago' },
              { name: 'db.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '2.1 KB', modified: '1d ago' },
            ]},
            { name: 'api', type: 'folder', children: [
              { name: 'projects', type: 'folder', children: [
                { name: 'route.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '2.8 KB', modified: '2h ago' },
              ]},
            ]},
          ]},
          { name: 'package.json', type: 'file', icon: <FileJson className="size-3.5 text-amber-400" />, size: '1.8 KB', modified: '2d ago' },
          { name: 'README.md', type: 'file', icon: <FileText className="size-3.5 text-blue-400" />, size: '2.1 KB', modified: '3d ago' },
        ]
      case 'API':
        return [
          { name: 'src', type: 'folder', children: [
            { name: 'routes', type: 'folder', children: [
              { name: 'auth.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '3.2 KB', modified: '1h ago' },
              { name: 'users.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '4.1 KB', modified: '2h ago' },
            ]},
            { name: 'middleware', type: 'folder', children: [
              { name: 'auth.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '2.1 KB', modified: '1d ago' },
            ]},
          ]},
          { name: 'package.json', type: 'file', icon: <FileJson className="size-3.5 text-amber-400" />, size: '1.2 KB', modified: '3d ago' },
        ]
      case 'AI':
        return [
          { name: 'src', type: 'folder', children: [
            { name: 'agents', type: 'folder', children: [
              { name: 'coordinator.py', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '4.5 KB', modified: '1h ago' },
              { name: 'developer.py', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '6.2 KB', modified: '2h ago' },
            ]},
            { name: 'models', type: 'folder', children: [
              { name: 'llm.py', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '5.1 KB', modified: '4h ago' },
            ]},
          ]},
          { name: 'requirements.txt', type: 'file', icon: <FileText className="size-3.5 text-blue-400" />, size: '0.4 KB', modified: '1w ago' },
          { name: 'README.md', type: 'file', icon: <FileText className="size-3.5 text-blue-400" />, size: '2.8 KB', modified: '2d ago' },
        ]
      default:
        return [
          { name: 'src', type: 'folder', children: [
            { name: 'index.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '1.2 KB', modified: '1h ago' },
          ]},
          { name: 'package.json', type: 'file', icon: <FileJson className="size-3.5 text-amber-400" />, size: '0.8 KB', modified: '2d ago' },
          { name: 'README.md', type: 'file', icon: <FileText className="size-3.5 text-blue-400" />, size: '1.0 KB', modified: '3d ago' },
        ]
    }
  }, [])

  // Toggle folder expand/collapse
  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  // Toggle task expand
  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  // Select project & fetch detail
  const handleSelectProject = async (project: ProjectData) => {
    setSelectedProject(project)
    setView('detail')
    setEditingProject(false)
    setPushResult(null)
    setPushError(null)
    setDetailTab('pipeline')

    try {
      const res = await fetch(`/api/projects/${project.id}`)
      if (res.ok) {
        const detail = await res.json()
        setSelectedProject(detail)
      }
    } catch {
      // Use the list item as fallback
    }
  }

  // Create project - auto-open detail view
  const handleProjectCreated = (project: ProjectData) => {
    setProjects((prev) => [project, ...prev])
    handleSelectProject(project)
  }

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
    } catch {
      // optimistically remove
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    if (selectedProject?.id === projectId) {
      setSelectedProject(null)
      setView('list')
    }
  }

  // Status change with confirmation
  const handleStatusChangeRequest = (newStatus: ProjectStatus) => {
    if (newStatus === 'in_progress' || newStatus === 'completed') {
      setPendingStatus(newStatus)
      setStatusChangeDialogOpen(true)
    } else {
      applyStatusChange(newStatus)
    }
  }

  const applyStatusChange = async (newStatus: ProjectStatus) => {
    if (!selectedProject) return
    const updated = { ...selectedProject, status: newStatus }
    setSelectedProject(updated)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

    try {
      await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      // silently fail
    }
  }

  // Edit project
  const startEditing = () => {
    if (!selectedProject) return
    setEditForm({
      name: selectedProject.name || '',
      description: selectedProject.description || '',
      requirements: selectedProject.requirements || '',
      notes: selectedProject.notes || '',
      icon: selectedProject.icon || '',
      category: selectedProject.category || '',
      priority: selectedProject.priority || 'medium',
      dueDate: selectedProject.dueDate ? selectedProject.dueDate.split('T')[0] : '',
    })
    setEditingProject(true)
  }

  const saveEdit = async () => {
    if (!selectedProject) return
    const updated = {
      ...selectedProject,
      name: editForm.name,
      description: editForm.description,
      requirements: editForm.requirements,
      notes: editForm.notes,
      icon: editForm.icon,
      category: editForm.category,
      priority: editForm.priority,
      dueDate: editForm.dueDate || null,
    }
    setSelectedProject(updated)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setEditingProject(false)

    try {
      await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
    } catch {
      // silently fail
    }
  }

  // Add task
  const handleAddTask = async () => {
    if (!selectedProject || !newTaskTitle.trim()) return

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle.trim(), description: newTaskDesc.trim() || undefined }),
      })

      if (res.ok) {
        const newTask = await res.json()
        const updated = {
          ...selectedProject,
          tasks: [...(selectedProject.tasks || []), newTask],
          _count: { ...selectedProject._count!, tasks: (selectedProject._count?.tasks ?? 0) + 1 },
        }
        setSelectedProject(updated)
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      }
    } catch {
      // silently fail
    }
    setNewTaskTitle('')
    setNewTaskDesc('')
  }

  // Toggle task status
  const handleToggleTask = async (taskId: string) => {
    if (!selectedProject) return
    const task = (selectedProject.tasks || []).find(t => t.id === taskId)
    if (!task) return
    const newStatus = task.status === 'done' ? 'todo' : 'done'

    const tasks = (selectedProject.tasks || []).map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    )
    const updated = { ...selectedProject, tasks }
    setSelectedProject(updated)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

    try {
      await fetch(`/api/projects/${selectedProject.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      // silently fail
    }
  }

  // AI task generation
  const handleAiAnalyze = async () => {
    if (!selectedProject) return
    setAiAnalyzing(true)
    setAiError(null)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/analyze`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        const detailRes = await fetch(`/api/projects/${selectedProject.id}`)
        if (detailRes.ok) {
          const detail = await detailRes.json()
          setSelectedProject(detail)
          setProjects((prev) => prev.map((p) => (p.id === detail.id ? detail : p)))
        }
      } else {
        setAiError(data.error || 'AI analysis failed')
      }
    } catch {
      setAiError('Failed to connect to AI service')
    } finally {
      setTimeout(() => setAiAnalyzing(false), 1500)
    }
  }

  // ── Orchestration ──
  const handleOrchestrate = async () => {
    if (!selectedProject) return
    setOrchestrating(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeDiscussion: true, simulateWork: false }),
      })
      const data = await res.json()
      if (data.success) {
        // Refresh the project detail to get updated data
        const detailRes = await fetch(`/api/projects/${selectedProject.id}`)
        if (detailRes.ok) {
          const detail = await detailRes.json()
          setSelectedProject(detail)
          setProjects((prev) => prev.map((p) => (p.id === detail.id ? detail : p)))
        }
      } else {
        setAiError(data.error || 'Orchestration failed')
      }
    } catch {
      setAiError('Failed to connect to orchestration service')
    } finally {
      setOrchestrating(false)
    }
  }

  // ── Generate Discussion ──
  const handleGenerateDiscussion = async () => {
    if (!selectedProject) return
    setGeneratingDiscussion(true)
    try {
      const res = await fetch('/api/agent-discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject.id }),
      })
      if (res.ok) {
        // Refresh project data
        const detailRes = await fetch(`/api/projects/${selectedProject.id}`)
        if (detailRes.ok) {
          const detail = await detailRes.json()
          setSelectedProject(detail)
          setProjects((prev) => prev.map((p) => (p.id === detail.id ? detail : p)))
        }
      }
    } catch {
      // silently fail
    } finally {
      setGeneratingDiscussion(false)
    }
  }

  // ── File Upload ──
  const handleFileUpload = async (files: FileList) => {
    if (!selectedProject) return
    setUploadingFiles(true)
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', file.name)

      try {
        const res = await fetch(`/api/projects/${selectedProject.id}/files`, {
          method: 'POST',
          body: formData,
        })
        if (res.ok) {
          const data = await res.json()
          if (data.file) {
            setProjectFiles((prev) => [data.file, ...prev])
          }
        }
      } catch {
        // ignore
      }
    }
    setUploadingFiles(false)
  }

  // ── Download ZIP ──
  const handleDownloadZip = async () => {
    if (!selectedProject) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/download`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedProject.name.toLowerCase().replace(/\s+/g, '-')}.zip`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch {
      // ignore
    } finally {
      setDownloading(false)
    }
  }

  // ── Download single file ──
  const handleDownloadFile = async (fileId: string, filename: string) => {
    if (!selectedProject) return
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/files/${fileId}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch {
      // ignore
    }
  }

  // ── Delete file ──
  const handleDeleteFile = async (fileId: string) => {
    if (!selectedProject) return
    try {
      await fetch(`/api/projects/${selectedProject.id}/files/${fileId}`, { method: 'DELETE' })
      setProjectFiles((prev) => prev.filter(f => f.id !== fileId))
    } catch {
      // ignore
    }
  }

  // ── GitHub Setup ──
  const handleGithubSetup = async () => {
    if (!githubToken.trim() || !githubSetupUsername.trim()) return
    setGithubSettingUp(true)
    setGithubSetupError(null)
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken.trim(), username: githubSetupUsername.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setGithubConnected(true)
        setGithubUsername(data.username || githubSetupUsername.trim())
        setGithubSetupDialogOpen(false)
        setGithubToken('')
        setGithubSetupUsername('')
      } else {
        setGithubSetupError(data.error || data.details || 'Invalid token or username')
      }
    } catch {
      setGithubSetupError('Failed to connect to GitHub API')
    } finally {
      setGithubSettingUp(false)
    }
  }

  // ── GitHub Push ──
  const handleGithubPush = async () => {
    if (!selectedProject) return
    setPushing(true)
    setPushError(null)
    setPushResult(null)
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          repoName: pushRepoName.trim() || undefined,
          private: pushPrivate,
          description: pushDescription.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPushResult({
          repoUrl: data.repoUrl,
          filesPushed: data.successCount || data.pushedFiles?.length || 0,
        })
        const updated = {
          ...selectedProject,
          githubRepoUrl: data.repoUrl,
          githubStatus: 'pushed',
        }
        setSelectedProject(updated)
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        setPushError(data.error || 'Failed to push to GitHub')
      }
    } catch {
      setPushError('Failed to connect to GitHub push service')
    } finally {
      setPushing(false)
    }
  }

  // Open GitHub push dialog
  const openGithubPush = () => {
    if (!selectedProject) return
    if (!githubConnected) {
      setGithubSetupDialogOpen(true)
      return
    }
    setPushRepoName(selectedProject.name.toLowerCase().replace(/[^a-z0-9]/g, '-'))
    setPushDescription(selectedProject.description || '')
    setPushPrivate(false)
    setPushError(null)
    setPushResult(null)
    setGithubPushDialogOpen(true)
  }

  // Add skill
  const handleAddSkill = async () => {
    if (!selectedProject || !selectedSkillId) return
    const skill = installedSkills.find((s) => s.id === selectedSkillId)
    const newSkill: SkillAssignment = {
      id: `ps-${Date.now()}`,
      skillId: selectedSkillId,
      role: newSkillRole.trim() || undefined,
      skill: skill ? { id: skill.id, name: skill.name, description: skill.description } : undefined,
    }

    const updated = {
      ...selectedProject,
      skills: [...(selectedProject.skills || []), newSkill],
      _count: { ...selectedProject._count!, skills: (selectedProject._count?.skills ?? 0) + 1 },
    }
    setSelectedProject(updated)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedSkillId('')
    setNewSkillRole('')
    setAddSkillDialogOpen(false)

    try {
      await fetch(`/api/projects/${selectedProject.id}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: selectedSkillId, role: newSkillRole.trim() || undefined }),
      })
    } catch {
      // optimistically added
    }
  }

  // Remove skill
  const handleRemoveSkill = async (skillId: string) => {
    if (!selectedProject) return
    const skills = (selectedProject.skills || []).filter((s) => s.skillId !== skillId)
    const updated = {
      ...selectedProject,
      skills,
      _count: { ...selectedProject._count!, skills: Math.max(0, (selectedProject._count?.skills ?? 1) - 1) },
    }
    setSelectedProject(updated)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

    try {
      await fetch(`/api/projects/${selectedProject.id}/skills`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId }),
      })
    } catch {
      // optimistically removed
    }
  }

  // Add MCP server
  const handleAddMcp = async () => {
    if (!selectedProject || !selectedMcpId) return
    const mcp = installedMcpServers.find((m) => m.id === selectedMcpId)
    const newMcp: McpAssignment = {
      id: `pm-${Date.now()}`,
      mcpServerId: selectedMcpId,
      role: newMcpRole.trim() || undefined,
      mcpServer: mcp ? { id: mcp.id, name: mcp.name, description: mcp.description, url: mcp.url } : undefined,
    }

    const updated = {
      ...selectedProject,
      mcpServers: [...(selectedProject.mcpServers || []), newMcp],
      _count: { ...selectedProject._count!, mcpServers: (selectedProject._count?.mcpServers ?? 0) + 1 },
    }
    setSelectedProject(updated)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedMcpId('')
    setNewMcpRole('')
    setAddMcpDialogOpen(false)

    try {
      await fetch(`/api/projects/${selectedProject.id}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpServerId: selectedMcpId, role: newMcpRole.trim() || undefined }),
      })
    } catch {
      // optimistically added
    }
  }

  // Remove MCP server
  const handleRemoveMcp = async (mcpServerId: string) => {
    if (!selectedProject) return
    const mcpServers = (selectedProject.mcpServers || []).filter((m) => m.mcpServerId !== mcpServerId)
    const updated = {
      ...selectedProject,
      mcpServers,
      _count: { ...selectedProject._count!, mcpServers: Math.max(0, (selectedProject._count?.mcpServers ?? 1) - 1) },
    }
    setSelectedProject(updated)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

    try {
      await fetch(`/api/projects/${selectedProject.id}/mcp`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpServerId }),
      })
    } catch {
      // optimistically removed
    }
  }

  // Render file tree recursively
  const renderFileTree = (nodes: FileTreeNode[], depth: number = 0, parentPath: string = ''): React.ReactNode => {
    return nodes.map((node) => {
      const path = parentPath ? `${parentPath}/${node.name}` : node.name
      const isExpanded = expandedFolders.has(path)

      if (node.type === 'folder') {
        return (
          <div key={path}>
            <button
              className="flex items-center gap-1.5 w-full py-1 px-2 rounded text-xs text-slate-300 hover:bg-neutral-800/60 hover:text-white transition-colors"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => toggleFolder(path)}
            >
              {isExpanded ? (
                <FolderOpen className="size-3.5 text-amber-400 shrink-0" />
              ) : (
                <Folder className="size-3.5 text-amber-400 shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
            {isExpanded && node.children && renderFileTree(node.children, depth + 1, path)}
          </div>
        )
      }

      return (
        <div
          key={path}
          className="flex items-center justify-between py-1 px-2 rounded text-xs hover:bg-neutral-800/60 transition-colors group"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {node.icon || <File className="size-3.5 text-slate-400 shrink-0" />}
            <span className="text-slate-400 group-hover:text-white truncate transition-colors">{node.name}</span>
          </div>
          <span className="text-[10px] text-slate-600 shrink-0 ml-2">{node.size}</span>
        </div>
      )
    })
  }

  // ─── Pipeline stage determination ──────────────────────────────────────────

  const getPipelineStageIndex = (status: string | null | undefined): number => {
    if (!status || status === 'pending') return -1
    return PIPELINE_STAGES.findIndex(s => s.key === status)
  }

  // Stats
  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === 'in_progress').length
  const completedProjects = projects.filter((p) => p.status === 'completed').length
  const planningProjects = projects.filter((p) => p.status === 'planning').length

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FolderKanban className="size-6 text-rose-400" />
                Projects
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Manage projects, assign skills and MCP servers, track progress
              </p>
            </div>
            {view === 'detail' ? (
              <Button
                variant="outline"
                onClick={() => { setView('list'); setSelectedProject(null) }}
                className="border-neutral-700 text-slate-300 gap-2"
              >
                <ChevronLeft className="size-4" />
                Back to Projects
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="size-4" />
                  New Project
                </Button>
                <CreateProjectDialog
                  open={createDialogOpen}
                  onOpenChange={setCreateDialogOpen}
                  onCreated={handleProjectCreated}
                />
              </div>
            )}
          </div>

          {/* ─── List View ──────────────────────────────────────────────────────── */}
          {view === 'list' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Projects', value: totalProjects, icon: FolderKanban, color: 'text-rose-400' },
                  { label: 'Active', value: activeProjects, icon: Zap, color: 'text-amber-400' },
                  { label: 'Planning', value: planningProjects, icon: LayoutGrid, color: 'text-blue-400' },
                  { label: 'Completed', value: completedProjects, icon: CheckCircle2, color: 'text-emerald-400' },
                ].map((stat) => (
                  <Card key={stat.label} className="bg-[#0d1117] border-neutral-800 py-4 shadow-lg shadow-rose-500/5">
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

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="bg-[#0d1117] border-neutral-800 animate-pulse py-4">
                      <CardHeader className="pb-2">
                        <div className="h-5 bg-neutral-800 rounded w-3/4" />
                        <div className="h-3 bg-neutral-800/50 rounded w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <div className="h-3 bg-neutral-800/30 rounded w-full mb-2" />
                        <div className="h-3 bg-neutral-800/30 rounded w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <Card className="bg-[#0d1117] border-neutral-800 py-12">
                  <CardContent className="flex flex-col items-center text-center">
                    <FolderKanban className="size-12 text-rose-400/30 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-1">No projects yet</h3>
                    <p className="text-sm text-slate-400 mb-4">Create your first project to get started</p>
                    <Button className="bg-rose-600 hover:bg-rose-700 text-white gap-2" onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="size-4" />
                      New Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => handleSelectProject(project)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── Detail View ───────────────────────────────────────────────────── */}
          {view === 'detail' && selectedProject && (
            <>
              {/* Project Header */}
              <Card className="bg-[#0d1117] border-neutral-800">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    {/* Row 1: Project identity + actions */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-3xl shrink-0">{selectedProject.icon || '📁'}</span>
                        <div className="min-w-0">
                          {editingProject ? (
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="bg-neutral-900 border-neutral-700 text-white text-lg font-bold h-8"
                            />
                          ) : (
                            <h3 className="text-lg font-bold text-white truncate">{selectedProject.name}</h3>
                          )}
                          {editingProject ? (
                            <Textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="bg-neutral-900 border-neutral-700 text-white text-xs min-h-[40px] mt-1"
                            />
                          ) : (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{selectedProject.description || 'No description'}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {editingProject ? (
                          <>
                            <Button size="sm" onClick={saveEdit} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs">
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingProject(false)} className="border-neutral-700 text-slate-300 h-7 text-xs">
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={startEditing} className="border-neutral-700 text-slate-300 h-7 text-xs gap-1">
                              <Edit3 className="size-3" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleOrchestrate}
                              disabled={orchestrating}
                              className="bg-rose-600 hover:bg-rose-700 text-white h-7 text-xs gap-1"
                            >
                              {orchestrating ? <Loader2 className="size-3 animate-spin" /> : <Rocket className="size-3" />}
                              {orchestrating ? 'Working...' : 'Orchestrate'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={openGithubPush} className="border-neutral-700 text-slate-300 h-7 text-xs gap-1">
                              <Github className="size-3" />
                              Push
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleDownloadZip} disabled={downloading} className="border-neutral-700 text-slate-300 h-7 text-xs gap-1">
                              {downloading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                              ZIP
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles} className="border-neutral-700 text-slate-300 h-7 text-xs gap-1">
                              {uploadingFiles ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                              Upload
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${STATUS_CONFIG[selectedProject.status].color} ${STATUS_CONFIG[selectedProject.status].bgColor} ${STATUS_CONFIG[selectedProject.status].borderColor}`}>
                        {STATUS_CONFIG[selectedProject.status].icon}
                        {STATUS_CONFIG[selectedProject.status].label}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] h-5 ${PRIORITY_CONFIG[selectedProject.priority].color} ${PRIORITY_CONFIG[selectedProject.priority].bgColor} border-neutral-700`}>
                        {PRIORITY_CONFIG[selectedProject.priority].label}
                      </Badge>
                      {selectedProject.category && (
                        <Badge variant="outline" className="text-[10px] h-5 text-rose-300 bg-rose-500/10 border-rose-500/20">
                          {selectedProject.category}
                        </Badge>
                      )}

                      {/* Orchestrator status badge */}
                      {selectedProject.orchestratorStatus && selectedProject.orchestratorStatus !== 'pending' && (
                        <Badge variant="outline" className={cn(
                          'text-[10px] h-5 gap-1',
                          selectedProject.orchestratorStatus === 'completed' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' :
                          selectedProject.orchestratorStatus === 'failed' ? 'text-red-300 bg-red-500/10 border-red-500/20' :
                          'text-amber-300 bg-amber-500/10 border-amber-500/20'
                        )}>
                          <Bot className="size-2.5" />
                          {selectedProject.orchestratorStatus === 'completed' ? 'Orchestrated' :
                           selectedProject.orchestratorStatus === 'failed' ? 'Failed' :
                           `${selectedProject.orchestratorStatus.charAt(0).toUpperCase() + selectedProject.orchestratorStatus.slice(1)}...`}
                          {['analyzing', 'assigning', 'discussing', 'working'].includes(selectedProject.orchestratorStatus) && (
                            <Loader2 className="size-2.5 animate-spin" />
                          )}
                        </Badge>
                      )}

                      {/* GitHub status */}
                      {selectedProject.githubStatus === 'pushed' && selectedProject.githubRepoUrl && (
                        <a href={selectedProject.githubRepoUrl} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="text-[10px] h-5 gap-1 text-emerald-300 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20">
                            <Github className="size-2.5" />
                            Pushed
                            <ExternalLink className="size-2" />
                          </Badge>
                        </a>
                      )}

                      {/* Quick status change */}
                      <Select value={selectedProject.status} onValueChange={(v) => handleStatusChangeRequest(v as ProjectStatus)}>
                        <SelectTrigger className="h-5 w-[100px] text-[10px] bg-transparent border-neutral-700 text-slate-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-700">
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s} className="text-white focus:bg-neutral-800 focus:text-white text-xs">
                              {STATUS_CONFIG[s].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Row 3: Progress */}
                    {((selectedProject.tasks?.length ?? 0) > 0) && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Overall Progress</span>
                          <span className="text-rose-400 font-medium">{calculateProgress(selectedProject.tasks)}%</span>
                        </div>
                        <Progress value={calculateProgress(selectedProject.tasks)} className="h-2 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-pink-500" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabbed Content */}
              <Tabs value={detailTab} onValueChange={setDetailTab} className="space-y-4">
                <TabsList className="bg-neutral-900 border border-neutral-800 h-9 p-1">
                  <TabsTrigger value="pipeline" className="text-xs gap-1 data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400">
                    <Activity className="size-3" />
                    Pipeline
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="text-xs gap-1 data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400">
                    <ClipboardList className="size-3" />
                    Tasks & Agents
                  </TabsTrigger>
                  <TabsTrigger value="discussion" className="text-xs gap-1 data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400">
                    <MessageSquare className="size-3" />
                    Discussion
                  </TabsTrigger>
                  <TabsTrigger value="files" className="text-xs gap-1 data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400">
                    <File className="size-3" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="export" className="text-xs gap-1 data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400">
                    <Globe className="size-3" />
                    Export
                  </TabsTrigger>
                </TabsList>

                {/* ─── Pipeline Tab ────────────────────────────────────────── */}
                <TabsContent value="pipeline">
                  <Card className="bg-[#0d1117] border-neutral-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <Activity className="size-4 text-rose-400" />
                        Orchestrator Pipeline
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Track the orchestrator&apos;s progress through each stage
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Pipeline visualization */}
                      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                        {PIPELINE_STAGES.map((stage, idx) => {
                          const currentIdx = getPipelineStageIndex(selectedProject.orchestratorStatus)
                          const isCompleted = currentIdx >= 0 && idx < currentIdx
                          const isActive = currentIdx >= 0 && idx === currentIdx
                          const isPending = currentIdx < 0 || idx > currentIdx

                          return (
                            <div key={stage.key} className="flex items-center gap-2">
                              <PipelineStep stage={stage} isActive={isActive} isCompleted={isCompleted} isPending={isPending} />
                              {idx < PIPELINE_STAGES.length - 1 && (
                                <div className={cn(
                                  'w-6 h-0.5 shrink-0 transition-colors duration-500',
                                  isCompleted ? 'bg-emerald-500' : isActive ? 'bg-rose-500/50' : 'bg-neutral-700'
                                )} />
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Current stage detail */}
                      {selectedProject.orchestratorStatus && selectedProject.orchestratorStatus !== 'pending' && (
                        <div className="bg-neutral-900/50 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {PIPELINE_STAGES.find(s => s.key === selectedProject.orchestratorStatus)?.emoji || '🔄'}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-white">
                                  Stage: {PIPELINE_STAGES.find(s => s.key === selectedProject.orchestratorStatus)?.label || selectedProject.orchestratorStatus}
                                </p>
                                {selectedProject.orchestratorStartedAt && (
                                  <p className="text-[10px] text-slate-500">
                                    Started {formatRelativeTime(selectedProject.orchestratorStartedAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                            {selectedProject.orchestratorCompletedAt && (
                              <Badge variant="outline" className="text-[10px] h-5 text-emerald-300 bg-emerald-500/10 border-emerald-500/20">
                                Completed {formatRelativeTime(selectedProject.orchestratorCompletedAt)}
                              </Badge>
                            )}
                          </div>

                          {/* Activity feed from activities */}
                          {selectedProject.activities && selectedProject.activities.length > 0 && (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Recent Activity</p>
                              {selectedProject.activities.slice(0, 10).map((activity) => {
                                const colors = getAgentColor(activity.agentType)
                                const avatar = getAgentAvatar(activity.agentType)
                                return (
                                  <div key={activity.id} className="flex items-start gap-2 text-xs">
                                    <span className="shrink-0">{avatar}</span>
                                    <div className="min-w-0">
                                      <span className={cn('font-medium', colors.text)}>{activity.agentName}</span>
                                      <span className="text-slate-400 ml-1">{activity.action}</span>
                                      <span className="text-slate-600 ml-1 text-[10px]">{formatRelativeTime(activity.timestamp)}</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* No orchestration yet */}
                      {(!selectedProject.orchestratorStatus || selectedProject.orchestratorStatus === 'pending') && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                          <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/20 flex items-center justify-center">
                            <Rocket className="size-8 text-rose-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-white">No Orchestration Yet</p>
                            <p className="text-xs text-slate-400 mt-1">Launch the orchestrator to analyze, assign, and distribute tasks to agents</p>
                          </div>
                          <Button
                            onClick={handleOrchestrate}
                            disabled={orchestrating}
                            className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
                          >
                            {orchestrating ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                            {orchestrating ? 'Launching...' : '🚀 Launch Orchestrator'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ─── Tasks & Agents Tab ───────────────────────────────────── */}
                <TabsContent value="tasks">
                  <Card className="bg-[#0d1117] border-neutral-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm text-white flex items-center gap-2">
                            <ClipboardList className="size-4 text-rose-400" />
                            Tasks & Agents
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-400">
                            {selectedProject.tasks?.length || 0} tasks assigned to agents
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={handleAiAnalyze} disabled={aiAnalyzing} className="border-neutral-700 text-slate-300 h-7 text-xs gap-1">
                            {aiAnalyzing ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                            AI Analyze
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {aiError && (
                        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
                          <AlertCircle className="size-3 shrink-0" />
                          {aiError}
                        </div>
                      )}

                      {/* Tasks grouped by agent */}
                      {selectedProject.tasks && selectedProject.tasks.length > 0 ? (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                          {selectedProject.tasks.map((task) => {
                            const isExpanded = expandedTasks.has(task.id)
                            const assigneeColors = task.assignee ? getAgentColor(task.assignee.type) : null
                            const assigneeAvatar = task.assignee ? getAgentAvatar(task.assignee.type) : null

                            // Find instruction for this task
                            const instruction = selectedProject.activities?.find(
                              a => a.type === 'instruction' && a.agentId === task.assignedTo
                            )

                            return (
                              <div key={task.id} className="bg-neutral-900/50 rounded-lg border border-neutral-800">
                                <button
                                  className="w-full p-3 flex items-center gap-3 text-left"
                                  onClick={() => toggleTaskExpand(task.id)}
                                >
                                  {/* Task status checkbox */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id) }}
                                    className={cn(
                                      'size-4 rounded border shrink-0 flex items-center justify-center transition-colors',
                                      task.status === 'done' ? 'bg-emerald-600 border-emerald-500' : 'border-neutral-600 hover:border-rose-500'
                                    )}
                                  >
                                    {task.status === 'done' && <CheckCircle2 className="size-3 text-white" />}
                                  </button>

                                  {/* Task info */}
                                  <div className="min-w-0 flex-1">
                                    <p className={cn('text-sm font-medium', task.status === 'done' ? 'text-slate-500 line-through' : 'text-white')}>
                                      {task.title}
                                    </p>
                                    {task.description && (
                                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{task.description}</p>
                                    )}
                                  </div>

                                  {/* Assignee badge */}
                                  {task.assignee && (
                                    <Badge variant="outline" className={cn('text-[10px] h-5 gap-1', assigneeColors?.bg, assigneeColors?.text, assigneeColors?.border)}>
                                      <span>{assigneeAvatar}</span>
                                      {task.assignee.name}
                                    </Badge>
                                  )}

                                  {/* Status badge */}
                                  <Badge variant="outline" className={cn(
                                    'text-[10px] h-5',
                                    task.status === 'done' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' :
                                    task.status === 'in_progress' ? 'text-amber-300 bg-amber-500/10 border-amber-500/20' :
                                    'text-slate-400 bg-slate-500/10 border-slate-500/20'
                                  )}>
                                    {task.status === 'done' ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'To Do'}
                                  </Badge>

                                  {/* Expand icon */}
                                  {isExpanded ? <ChevronDown className="size-3 text-slate-500" /> : <ChevronRight className="size-3 text-slate-500" />}
                                </button>

                                {/* Expanded content: instruction */}
                                {isExpanded && instruction && (
                                  <div className="px-3 pb-3 pt-0">
                                    <div className={cn('rounded-lg p-3 border', assigneeColors?.bg, assigneeColors?.border)}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <span>{assigneeAvatar}</span>
                                        <span className={cn('text-xs font-medium', assigneeColors?.text)}>
                                          Instruction for {task.assignee?.name}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-300 leading-relaxed">{instruction.action}</p>
                                      {instruction.metadata && (
                                        <p className="text-[10px] text-slate-500 mt-2 italic">{instruction.metadata}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-8 gap-3">
                          <ListChecks className="size-8 text-slate-600" />
                          <p className="text-xs text-slate-400">No tasks yet. Use Orchestrate or AI Analyze to generate tasks.</p>
                        </div>
                      )}

                      {/* Add task form */}
                      <Separator className="bg-neutral-800" />
                      <div className="flex gap-2">
                        <Input
                          placeholder="New task title..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="bg-neutral-900 border-neutral-700 text-white text-xs h-8"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                        />
                        <Button size="sm" onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="bg-rose-600 hover:bg-rose-700 text-white h-8 text-xs shrink-0">
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ─── Discussion Tab ──────────────────────────────────────── */}
                <TabsContent value="discussion">
                  <Card className="bg-[#0d1117] border-neutral-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm text-white flex items-center gap-2">
                            <MessageSquare className="size-4 text-rose-400" />
                            Agent Discussion
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-400">
                            {selectedProject.discussions?.length || 0} messages between agents
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleGenerateDiscussion}
                          disabled={generatingDiscussion}
                          className="border-neutral-700 text-slate-300 h-7 text-xs gap-1"
                        >
                          {generatingDiscussion ? <Loader2 className="size-3 animate-spin" /> : <MessageSquare className="size-3" />}
                          {generatingDiscussion ? 'Generating...' : 'Generate Discussion'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedProject.discussions && selectedProject.discussions.length > 0 ? (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                          {(() => {
                            let lastRound = -1
                            return selectedProject.discussions
                              .sort((a, b) => a.round - b.round || new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                              .map((msg) => {
                                const colors = getAgentColor(msg.agentType)
                                const avatar = getAgentAvatar(msg.agentType)
                                const showRoundHeader = msg.round !== lastRound
                                lastRound = msg.round

                                return (
                                  <div key={msg.id}>
                                    {showRoundHeader && msg.round > 0 && (
                                      <div className="flex items-center gap-2 my-3">
                                        <Separator className="flex-1 bg-neutral-800" />
                                        <Badge variant="outline" className="text-[9px] h-4 text-slate-500 bg-neutral-900 border-neutral-700 shrink-0">
                                          Round {msg.round}
                                        </Badge>
                                        <Separator className="flex-1 bg-neutral-800" />
                                      </div>
                                    )}

                                    {/* Instruction message */}
                                    {msg.type === 'instruction' ? (
                                      <div className={cn('rounded-lg p-3 border-l-2', colors.bg, colors.border)}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-sm">{avatar}</span>
                                          <span className={cn('text-xs font-medium', colors.text)}>{msg.agentName}</span>
                                          <Badge variant="outline" className="text-[9px] h-4 text-amber-300 bg-amber-500/10 border-amber-500/20">
                                            Instruction
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed">{msg.content}</p>
                                        <p className="text-[10px] text-slate-600 mt-1">{formatRelativeTime(msg.timestamp)}</p>
                                      </div>
                                    ) : msg.type === 'milestone' ? (
                                      <div className="rounded-lg p-3 border border-emerald-500/20 bg-emerald-500/5">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-sm">🏁</span>
                                          <span className="text-xs font-medium text-emerald-400">Milestone</span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed">{msg.content}</p>
                                      </div>
                                    ) : msg.type === 'status' ? (
                                      <div className="rounded-lg p-2 bg-neutral-900/30 border border-neutral-800">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">{avatar}</span>
                                          <span className={cn('text-xs', colors.text)}>{msg.agentName}</span>
                                          <span className="text-xs text-slate-500">{msg.content}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      /* Regular discussion message */
                                      <div className="flex items-start gap-2">
                                        <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 text-xs">
                                          {avatar}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className={cn('text-xs font-medium', colors.text)}>{msg.agentName}</span>
                                            <span className="text-[10px] text-slate-600">{formatRelativeTime(msg.timestamp)}</span>
                                          </div>
                                          <div className="mt-1 bg-neutral-900/50 rounded-lg p-2.5">
                                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })
                          })()}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-12 gap-4">
                          <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/20 flex items-center justify-center">
                            <MessageSquare className="size-8 text-rose-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-white">No Discussions Yet</p>
                            <p className="text-xs text-slate-400 mt-1">Generate a discussion between agents working on this project</p>
                          </div>
                          <Button
                            onClick={handleGenerateDiscussion}
                            disabled={generatingDiscussion}
                            className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
                          >
                            {generatingDiscussion ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
                            {generatingDiscussion ? 'Generating...' : 'Generate Discussion'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ─── Files Tab ───────────────────────────────────────────── */}
                <TabsContent value="files">
                  <Card className="bg-[#0d1117] border-neutral-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm text-white flex items-center gap-2">
                            <File className="size-4 text-rose-400" />
                            Project Files
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-400">
                            {projectFiles.length} uploaded + generated files
                          </CardDescription>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles} className="border-neutral-700 text-slate-300 h-7 text-xs gap-1">
                          {uploadingFiles ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                          Upload
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Drag and drop area */}
                      <div
                        className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center mb-4 hover:border-rose-500/30 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files) }}
                      >
                        <Upload className="size-6 text-slate-500 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">Drag & drop files here, or click to upload</p>
                      </div>

                      {/* Documentation section */}
                      {projectFiles.filter(f => f.source === 'orchestrator').length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Auto-Generated Documentation</p>
                          <div className="space-y-1">
                            {projectFiles.filter(f => f.source === 'orchestrator').map((file) => (
                              <div key={file.id} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs hover:bg-neutral-800/60 transition-colors group">
                                {getFileIcon(file.filename)}
                                <span className="text-slate-300 group-hover:text-white truncate flex-1">{file.path}</span>
                                <Badge variant="outline" className="text-[9px] h-4 text-pink-300 bg-pink-500/10 border-pink-500/20 shrink-0">Docs</Badge>
                                <span className="text-[10px] text-slate-600 shrink-0">{formatFileSize(file.size)}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 text-slate-500 hover:text-white shrink-0"
                                  onClick={(e) => { e.stopPropagation(); handleDownloadFile(file.id, file.filename) }}
                                >
                                  <Download className="size-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Uploaded files */}
                      {projectFiles.filter(f => f.source === 'upload').length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Uploaded Files</p>
                          <div className="space-y-1">
                            {projectFiles.filter(f => f.source === 'upload').map((file) => (
                              <div key={file.id} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs hover:bg-neutral-800/60 transition-colors group">
                                {getFileIcon(file.filename)}
                                <span className="text-slate-300 group-hover:text-white truncate flex-1">{file.path}</span>
                                <Badge variant="outline" className="text-[9px] h-4 text-cyan-300 bg-cyan-500/10 border-cyan-500/20 shrink-0">Upload</Badge>
                                <span className="text-[10px] text-slate-600 shrink-0">{formatFileSize(file.size)}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 text-slate-500 hover:text-white shrink-0"
                                  onClick={(e) => { e.stopPropagation(); handleDownloadFile(file.id, file.filename) }}
                                >
                                  <Download className="size-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 text-slate-500 hover:text-red-400 shrink-0"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id) }}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Generated file tree */}
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Generated Project Structure</p>
                        <div className="bg-neutral-900/30 rounded-lg p-2">
                          {renderFileTree(generateFileTree(selectedProject))}
                        </div>
                      </div>

                      {projectFiles.length === 0 && (
                        <div className="flex flex-col items-center py-8 gap-3">
                          <File className="size-8 text-slate-600" />
                          <p className="text-xs text-slate-400">No files uploaded yet. Orchestrate a project to generate documentation.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ─── Export Tab ──────────────────────────────────────────── */}
                <TabsContent value="export">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GitHub Push */}
                    <Card className="bg-[#0d1117] border-neutral-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-white flex items-center gap-2">
                          <Github className="size-4 text-rose-400" />
                          Push to GitHub
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">
                          {githubConnected ? `Connected as ${githubUsername}` : 'Connect your GitHub account to push'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {githubConnected ? (
                          <>
                            {selectedProject.githubStatus === 'pushed' && selectedProject.githubRepoUrl ? (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="size-3" />
                                  Already pushed to GitHub
                                </p>
                                <a
                                  href={selectedProject.githubRepoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 mt-1"
                                >
                                  {selectedProject.githubRepoUrl}
                                  <ExternalLink className="size-3" />
                                </a>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-slate-300 text-xs">Repository Name</Label>
                                  <Input
                                    value={pushRepoName}
                                    onChange={(e) => setPushRepoName(e.target.value)}
                                    placeholder={selectedProject.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}
                                    className="bg-neutral-900 border-neutral-700 text-white text-xs h-8"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-slate-300 text-xs">Description</Label>
                                  <Input
                                    value={pushDescription}
                                    onChange={(e) => setPushDescription(e.target.value)}
                                    placeholder={selectedProject.description || ''}
                                    className="bg-neutral-900 border-neutral-700 text-white text-xs h-8"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch checked={pushPrivate} onCheckedChange={setPushPrivate} />
                                  <Label className="text-slate-300 text-xs">Private repository</Label>
                                </div>
                                <Button
                                  onClick={handleGithubPush}
                                  disabled={pushing}
                                  className="w-full bg-neutral-800 hover:bg-neutral-700 text-white gap-2 h-8 text-xs"
                                >
                                  {pushing ? <Loader2 className="size-3 animate-spin" /> : <Github className="size-3" />}
                                  {pushing ? 'Pushing...' : 'Push to GitHub'}
                                </Button>
                              </div>
                            )}
                            {pushError && (
                              <p className="text-xs text-red-400 flex items-center gap-1">
                                <AlertCircle className="size-3" />
                                {pushError}
                              </p>
                            )}
                            {pushResult && (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                                <p className="text-xs text-emerald-400 font-medium">Push successful!</p>
                                <p className="text-[10px] text-slate-400">{pushResult.filesPushed} files pushed</p>
                                <a
                                  href={pushResult.repoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 mt-1"
                                >
                                  View on GitHub <ExternalLink className="size-3" />
                                </a>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="space-y-3">
                            <div className="bg-neutral-900/50 rounded-lg p-3 text-center">
                              <Github className="size-8 text-slate-600 mx-auto mb-2" />
                              <p className="text-xs text-slate-400">Connect your GitHub account to push this project</p>
                            </div>
                            <Button
                              onClick={() => setGithubSetupDialogOpen(true)}
                              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white gap-2 h-8 text-xs"
                            >
                              <Github className="size-3" />
                              Connect GitHub
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* ZIP Download */}
                    <Card className="bg-[#0d1117] border-neutral-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-white flex items-center gap-2">
                          <Download className="size-4 text-rose-400" />
                          Download ZIP
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">
                          Download all project files as a ZIP archive
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Project summary */}
                        <div className="bg-neutral-900/50 rounded-lg p-3 space-y-2">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Project Summary</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <ListChecks className="size-3" />
                              <span>{selectedProject.tasks?.length || 0} tasks</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <File className="size-3" />
                              <span>{projectFiles.length} files</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Users className="size-3" />
                              <span>{new Set(selectedProject.tasks?.filter(t => t.assignedTo).map(t => t.assignedTo)).size} agents</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <CheckCircle2 className="size-3" />
                              <span>{selectedProject.tasks?.filter(t => t.status === 'done').length || 0} completed</span>
                            </div>
                          </div>
                          <div className="space-y-1 mt-2">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">Completion</span>
                              <span className="text-rose-400 font-medium">{calculateProgress(selectedProject.tasks)}%</span>
                            </div>
                            <Progress value={calculateProgress(selectedProject.tasks)} className="h-1.5 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-pink-500" />
                          </div>
                        </div>

                        <Button
                          onClick={handleDownloadZip}
                          disabled={downloading}
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white gap-2 h-9"
                        >
                          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                          {downloading ? 'Generating ZIP...' : 'Download Project ZIP'}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Skills & MCP */}
                    <Card className="bg-[#0d1117] border-neutral-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white flex items-center gap-2">
                            <Sparkles className="size-4 text-rose-400" />
                            Skills
                          </CardTitle>
                          <Button size="sm" variant="outline" onClick={() => setAddSkillDialogOpen(true)} className="border-neutral-700 text-slate-300 h-6 text-[10px] gap-1">
                            <Plus className="size-2.5" />
                            Add
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {selectedProject.skills && selectedProject.skills.length > 0 ? (
                          <div className="space-y-1.5">
                            {selectedProject.skills.map((ps) => (
                              <div key={ps.id} className="flex items-center justify-between text-xs bg-neutral-900/50 rounded p-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Wrench className="size-3 text-cyan-400 shrink-0" />
                                  <span className="text-white truncate">{ps.skill?.name || 'Unknown'}</span>
                                  {ps.role && <Badge variant="outline" className="text-[9px] h-4 text-slate-400 bg-neutral-800 border-neutral-700">{ps.role}</Badge>}
                                </div>
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-slate-500 hover:text-red-400" onClick={() => handleRemoveSkill(ps.skillId)}>
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-4">No skills assigned</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-[#0d1117] border-neutral-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white flex items-center gap-2">
                            <Server className="size-4 text-rose-400" />
                            MCP Servers
                          </CardTitle>
                          <Button size="sm" variant="outline" onClick={() => setAddMcpDialogOpen(true)} className="border-neutral-700 text-slate-300 h-6 text-[10px] gap-1">
                            <Plus className="size-2.5" />
                            Add
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {selectedProject.mcpServers && selectedProject.mcpServers.length > 0 ? (
                          <div className="space-y-1.5">
                            {selectedProject.mcpServers.map((pm) => (
                              <div key={pm.id} className="flex items-center justify-between text-xs bg-neutral-900/50 rounded p-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Server className="size-3 text-violet-400 shrink-0" />
                                  <span className="text-white truncate">{pm.mcpServer?.name || 'Unknown'}</span>
                                  {pm.role && <Badge variant="outline" className="text-[9px] h-4 text-slate-400 bg-neutral-800 border-neutral-700">{pm.role}</Badge>}
                                </div>
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-slate-500 hover:text-red-400" onClick={() => handleRemoveMcp(pm.mcpServerId)}>
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-4">No MCP servers assigned</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </ScrollArea>

      {/* ─── Status Change Dialog ──────────────────────────────────────────────── */}
      <StatusChangeDialog
        open={statusChangeDialogOpen}
        onOpenChange={setStatusChangeDialogOpen}
        newStatus={pendingStatus}
        onConfirm={() => pendingStatus && applyStatusChange(pendingStatus)}
      />

      {/* ─── Add Skill Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={addSkillDialogOpen} onOpenChange={setAddSkillDialogOpen}>
        <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-400 text-sm">Add Skill to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
              <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                <SelectValue placeholder="Select a skill..." />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {installedSkills.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-white focus:bg-neutral-800 focus:text-white">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Role (optional)"
              value={newSkillRole}
              onChange={(e) => setNewSkillRole(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSkillDialogOpen(false)} className="border-neutral-700 text-slate-300">Cancel</Button>
            <Button onClick={handleAddSkill} disabled={!selectedSkillId} className="bg-rose-600 hover:bg-rose-700 text-white">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add MCP Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={addMcpDialogOpen} onOpenChange={setAddMcpDialogOpen}>
        <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-400 text-sm">Add MCP Server to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedMcpId} onValueChange={setSelectedMcpId}>
              <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                <SelectValue placeholder="Select an MCP server..." />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {installedMcpServers.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-white focus:bg-neutral-800 focus:text-white">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Role (optional)"
              value={newMcpRole}
              onChange={(e) => setNewMcpRole(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMcpDialogOpen(false)} className="border-neutral-700 text-slate-300">Cancel</Button>
            <Button onClick={handleAddMcp} disabled={!selectedMcpId} className="bg-rose-600 hover:bg-rose-700 text-white">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── GitHub Setup Dialog ──────────────────────────────────────────────── */}
      <Dialog open={githubSetupDialogOpen} onOpenChange={setGithubSetupDialogOpen}>
        <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-400 flex items-center gap-2">
              <Github className="size-5" />
              Connect GitHub
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter your GitHub Personal Access Token to push projects
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-slate-300">Username</Label>
              <Input
                placeholder="github-username"
                value={githubSetupUsername}
                onChange={(e) => setGithubSetupUsername(e.target.value)}
                className="bg-neutral-900 border-neutral-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Personal Access Token</Label>
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="bg-neutral-900 border-neutral-700 text-white"
              />
            </div>
            {githubSetupError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="size-3" />
                {githubSetupError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGithubSetupDialogOpen(false)} className="border-neutral-700 text-slate-300">Cancel</Button>
            <Button onClick={handleGithubSetup} disabled={githubSettingUp || !githubToken.trim() || !githubSetupUsername.trim()} className="bg-rose-600 hover:bg-rose-700 text-white">
              {githubSettingUp ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── GitHub Push Dialog ──────────────────────────────────────────────── */}
      <Dialog open={githubPushDialogOpen} onOpenChange={setGithubPushDialogOpen}>
        <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-400 flex items-center gap-2">
              <Github className="size-5" />
              Push to GitHub
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Push project files to a GitHub repository
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-slate-300">Repository Name</Label>
              <Input
                value={pushRepoName}
                onChange={(e) => setPushRepoName(e.target.value)}
                className="bg-neutral-900 border-neutral-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Description</Label>
              <Input
                value={pushDescription}
                onChange={(e) => setPushDescription(e.target.value)}
                className="bg-neutral-900 border-neutral-700 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={pushPrivate} onCheckedChange={setPushPrivate} />
              <Label className="text-slate-300">Private repository</Label>
            </div>
            {pushError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="size-3" />
                {pushError}
              </p>
            )}
            {pushResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <p className="text-xs text-emerald-400 font-medium">Push successful!</p>
                <p className="text-[10px] text-slate-400">{pushResult.filesPushed} files pushed</p>
                <a href={pushResult.repoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 mt-1">
                  View on GitHub <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGithubPushDialogOpen(false)} className="border-neutral-700 text-slate-300">Cancel</Button>
            <Button onClick={handleGithubPush} disabled={pushing} className="bg-rose-600 hover:bg-rose-700 text-white">
              {pushing ? 'Pushing...' : 'Push'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
