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
import {
  Plus,
  FolderKanban,
  Calendar,
  Clock,
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
  Send,
  Users,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'archived'
type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'
type ProjectCategory = 'Web App' | 'API' | 'Automation' | 'Mobile' | 'Desktop' | 'Data' | 'AI' | 'Other'

interface TaskData {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  assignedTo?: string
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
  _count?: {
    tasks: number
    skills: number
    mcpServers: number
  }
  tasks?: TaskData[]
  skills?: SkillAssignment[]
  mcpServers?: McpAssignment[]
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

interface AgentActivity {
  id: string
  agentName: string
  agentType: string
  action: string
  timestamp: string
  status: 'active' | 'idle' | 'busy' | 'error'
}

interface AgentMessage {
  id: string
  from: string
  fromType: string
  content: string
  timestamp: string
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

const AUTOMATION_TOOLS = [
  { name: 'Activepieces', icon: '🧩', url: 'http://localhost:4200', description: 'Open-source workflow automation' },
  { name: 'Node-RED', icon: '🔴', url: 'http://localhost:1880', description: 'Flow-based programming tool' },
  { name: 'n8n', icon: '⚡', url: 'http://localhost:5678', description: 'Workflow automation platform' },
  { name: 'Huginn', icon: '🦅', url: 'http://localhost:3100', description: 'Agent-based automation system' },
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
        {/* Badges row */}
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
        </div>

        {/* Tech stack pills */}
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

        {/* Stats row */}
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

        {/* Progress bar */}
        {taskCount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Progress</span>
              <span className="text-rose-400 font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-pink-500" />
          </div>
        )}

        {/* Updated time */}
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
  const [aiTasksGenerated, setAiTasksGenerated] = useState(0)
  const [aiError, setAiError] = useState<string | null>(null)
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([])
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/components']))
  const [detailTab, setDetailTab] = useState<'code' | 'chat'>('code')
  const socketRef = useRef<ReturnType<typeof io> | null>(null)

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

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    fetchInstalledSkills()
    fetchInstalledMcp()
  }, [fetchInstalledSkills, fetchInstalledMcp])

  // ─── Agent Simulation Data ──────────────────────────────────────────────────

  const AGENT_NAMES = [
    { name: 'Atlas', type: 'coordinator' },
    { name: 'CodePilot', type: 'developer' },
    { name: 'Shield', type: 'security' },
    { name: 'DataForge', type: 'data' },
    { name: 'TestRunner', type: 'qa' },
  ]

  const AGENT_ACTIONS = [
    'Analyzing project requirements...',
    'Generating component scaffold...',
    'Running security audit...',
    'Optimizing database queries...',
    'Writing unit tests...',
    'Reviewing code changes...',
    'Updating API endpoints...',
    'Syncing with MCP server...',
    'Processing task queue...',
    'Building deployment pipeline...',
    'Checking dependencies...',
    'Formatting and linting code...',
  ]

  const AGENT_CHAT_MESSAGES = [
    { from: 'Atlas', fromType: 'coordinator', content: 'I\'ve reviewed the project requirements. We should prioritize the API layer first.' },
    { from: 'CodePilot', fromType: 'developer', content: 'Agreed. I\'ll start scaffolding the routes and middleware. Should be ready in a few minutes.' },
    { from: 'Shield', fromType: 'security', content: 'Make sure we add input validation on all endpoints. I found a potential XSS vector in the spec.' },
    { from: 'DataForge', fromType: 'data', content: 'The schema looks good. I\'m optimizing the indexes for the query patterns we identified.' },
    { from: 'TestRunner', fromType: 'qa', content: 'I\'ve set up the test framework. Running initial smoke tests now.' },
    { from: 'Atlas', fromType: 'coordinator', content: 'Good progress everyone. Let\'s sync on the component architecture after the API is stable.' },
    { from: 'CodePilot', fromType: 'developer', content: 'Just pushed the auth module. Uses JWT with refresh token rotation as discussed.' },
    { from: 'Shield', fromType: 'security', content: 'Auth module looks solid. I\'ll run a penetration test on it next.' },
    { from: 'DataForge', fromType: 'data', content: 'Migration scripts are ready. Should we seed the dev database with test data?' },
    { from: 'TestRunner', fromType: 'qa', content: 'Coverage is at 78% and climbing. I added integration tests for the new endpoints.' },
    { from: 'Atlas', fromType: 'coordinator', content: 'Excellent work. Let\'s target 90% coverage before we merge to main.' },
    { from: 'CodePilot', fromType: 'developer', content: 'Working on the dashboard UI now. Using the design tokens from the spec.' },
  ]

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
              { name: 'auth.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '3.5 KB', modified: '4h ago' },
            ]},
            { name: 'api', type: 'folder', children: [
              { name: 'projects', type: 'folder', children: [
                { name: 'route.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '2.8 KB', modified: '2h ago' },
              ]},
              { name: 'tasks', type: 'folder', children: [
                { name: 'route.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '1.9 KB', modified: '3h ago' },
              ]},
            ]},
            { name: 'app', type: 'folder', children: [
              { name: 'layout.tsx', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '1.5 KB', modified: '1d ago' },
              { name: 'page.tsx', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '3.2 KB', modified: '1h ago' },
            ]},
            { name: 'hooks', type: 'folder', children: [
              { name: 'useAuth.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '1.8 KB', modified: '5h ago' },
              { name: 'useApi.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '2.3 KB', modified: '6h ago' },
            ]},
          ]},
          { name: 'public', type: 'folder', children: [
            { name: 'favicon.ico', type: 'file', icon: <File className="size-3.5 text-slate-400" />, size: '4.2 KB', modified: '1w ago' },
            { name: 'logo.svg', type: 'file', icon: <File className="size-3.5 text-slate-400" />, size: '1.1 KB', modified: '3d ago' },
          ]},
          { name: 'package.json', type: 'file', icon: <FileJson className="size-3.5 text-amber-400" />, size: '1.8 KB', modified: '2d ago' },
          { name: 'tsconfig.json', type: 'file', icon: <FileJson className="size-3.5 text-amber-400" />, size: '0.6 KB', modified: '1w ago' },
          { name: 'next.config.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '0.3 KB', modified: '1w ago' },
          { name: 'README.md', type: 'file', icon: <FileText className="size-3.5 text-blue-400" />, size: '2.1 KB', modified: '3d ago' },
        ]
      case 'API':
        return [
          { name: 'src', type: 'folder', children: [
            { name: 'routes', type: 'folder', children: [
              { name: 'auth.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '3.2 KB', modified: '1h ago' },
              { name: 'users.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '4.1 KB', modified: '2h ago' },
              { name: 'projects.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '5.3 KB', modified: '30m ago' },
            ]},
            { name: 'middleware', type: 'folder', children: [
              { name: 'auth.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '2.1 KB', modified: '1d ago' },
              { name: 'rateLimit.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '1.4 KB', modified: '2d ago' },
              { name: 'errorHandler.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '1.8 KB', modified: '1d ago' },
            ]},
            { name: 'models', type: 'folder', children: [
              { name: 'User.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '2.4 KB', modified: '3d ago' },
              { name: 'Project.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '1.9 KB', modified: '2d ago' },
            ]},
            { name: 'utils', type: 'folder', children: [
              { name: 'validators.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '2.8 KB', modified: '4h ago' },
              { name: 'helpers.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '1.5 KB', modified: '1d ago' },
            ]},
          ]},
          { name: 'config', type: 'folder', children: [
            { name: 'database.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '0.8 KB', modified: '1w ago' },
            { name: 'env.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '0.5 KB', modified: '1w ago' },
          ]},
          { name: 'package.json', type: 'file', icon: <FileJson className="size-3.5 text-amber-400" />, size: '1.2 KB', modified: '3d ago' },
          { name: 'tsconfig.json', type: 'file', icon: <FileJson className="size-3.5 text-amber-400" />, size: '0.6 KB', modified: '1w ago' },
        ]
      case 'AI':
        return [
          { name: 'src', type: 'folder', children: [
            { name: 'agents', type: 'folder', children: [
              { name: 'coordinator.py', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '4.5 KB', modified: '1h ago' },
              { name: 'developer.py', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '6.2 KB', modified: '2h ago' },
              { name: 'reviewer.py', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '3.8 KB', modified: '3h ago' },
            ]},
            { name: 'models', type: 'folder', children: [
              { name: 'llm.py', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '5.1 KB', modified: '4h ago' },
              { name: 'embeddings.py', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '2.3 KB', modified: '1d ago' },
            ]},
            { name: 'tools', type: 'folder', children: [
              { name: 'search.py', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '3.2 KB', modified: '1d ago' },
              { name: 'code_gen.py', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '4.7 KB', modified: '30m ago' },
            ]},
            { name: 'api', type: 'folder', children: [
              { name: 'routes.py', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '2.9 KB', modified: '2h ago' },
            ]},
          ]},
          { name: 'data', type: 'folder', children: [
            { name: 'prompts.json', type: 'file', icon: <FileJson className="size-3.5 text-amber-400" />, size: '8.2 KB', modified: '1d ago' },
            { name: 'config.yaml', type: 'file', icon: <FileText className="size-3.5 text-blue-400" />, size: '1.1 KB', modified: '3d ago' },
          ]},
          { name: 'requirements.txt', type: 'file', icon: <FileText className="size-3.5 text-blue-400" />, size: '0.4 KB', modified: '1w ago' },
          { name: 'README.md', type: 'file', icon: <FileText className="size-3.5 text-blue-400" />, size: '2.8 KB', modified: '2d ago' },
        ]
      default:
        return [
          { name: 'src', type: 'folder', children: [
            { name: 'index.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '1.2 KB', modified: '1h ago' },
            { name: 'utils.ts', type: 'file', icon: <FileCode className="size-3.5 text-cyan-400" />, size: '0.8 KB', modified: '3h ago' },
          ]},
          { name: 'config', type: 'folder', children: [
            { name: 'default.json', type: 'file', icon: <FileJson className="size-3.5 text-amber-400" />, size: '0.5 KB', modified: '1w ago' },
          ]},
          { name: 'package.json', type: 'file', icon: <FileJson className="size-3.5 text-amber-400" />, size: '0.8 KB', modified: '2d ago' },
          { name: 'README.md', type: 'file', icon: <FileText className="size-3.5 text-blue-400" />, size: '1.0 KB', modified: '3d ago' },
        ]
    }
  }, [])

  // ─── WebSocket + Agent Simulation Effects ────────────────────────────────────

  useEffect(() => {
    if (view !== 'detail' || !selectedProject) return

    // Connect to WebSocket
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      // Connected to agent service
    })

    socket.on('agent:message', (msg: AgentMessage) => {
      setAgentMessages((prev) => [msg, ...prev].slice(0, 50))
    })

    socket.on('agent:status', (activity: AgentActivity) => {
      setAgentActivities((prev) => [activity, ...prev].slice(0, 30))
    })

    // Seed initial activities
    const initialActivities: AgentActivity[] = AGENT_NAMES.map((agent, i) => ({
      id: `init-${i}`,
      agentName: agent.name,
      agentType: agent.type,
      action: AGENT_ACTIONS[Math.floor(Math.random() * AGENT_ACTIONS.length)],
      timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
      status: (['active', 'idle', 'busy'] as const)[Math.floor(Math.random() * 3)],
    }))
    setAgentActivities(initialActivities)

    // Seed initial chat messages
    const initialMessages: AgentMessage[] = AGENT_CHAT_MESSAGES.slice(0, 4).map((msg, i) => ({
      ...msg,
      id: `init-msg-${i}`,
      timestamp: new Date(Date.now() - (4 - i) * 120000).toISOString(),
    }))
    setAgentMessages(initialMessages)

    // Simulate agent activities every 3-5 seconds
    const activityInterval = setInterval(() => {
      const agent = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)]
      const statuses: Array<'active' | 'idle' | 'busy'> = ['active', 'idle', 'busy']
      const newActivity: AgentActivity = {
        id: `act-${Date.now()}`,
        agentName: agent.name,
        agentType: agent.type,
        action: AGENT_ACTIONS[Math.floor(Math.random() * AGENT_ACTIONS.length)],
        timestamp: new Date().toISOString(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
      }
      setAgentActivities((prev) => [newActivity, ...prev].slice(0, 30))
    }, 3000 + Math.random() * 2000)

    // Simulate agent chat messages every 8-12 seconds
    const chatInterval = setInterval(() => {
      const msg = AGENT_CHAT_MESSAGES[Math.floor(Math.random() * AGENT_CHAT_MESSAGES.length)]
      const newMsg: AgentMessage = {
        id: `msg-${Date.now()}`,
        from: msg.from,
        fromType: msg.fromType,
        content: msg.content,
        timestamp: new Date().toISOString(),
      }
      setAgentMessages((prev) => [newMsg, ...prev].slice(0, 50))
    }, 8000 + Math.random() * 4000)

    return () => {
      clearInterval(activityInterval)
      clearInterval(chatInterval)
      socket.disconnect()
      socketRef.current = null
    }
  }, [view, selectedProject?.id])

  // Toggle folder expand/collapse
  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  // Agent type color mapping
  const getAgentColor = (type: string) => {
    switch (type) {
      case 'coordinator': return { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-400' }
      case 'developer': return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' }
      case 'security': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' }
      case 'data': return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' }
      case 'qa': return { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-400' }
      default: return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-400' }
    }
  }

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-400'
      case 'busy': return 'bg-amber-400'
      case 'error': return 'bg-red-400'
      default: return 'bg-slate-500'
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

  // Select project & fetch detail
  const handleSelectProject = async (project: ProjectData) => {
    setSelectedProject(project)
    setView('detail')
    setEditingProject(false)

    // Fetch full detail
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

  // Create project - auto-open detail view and show hint for AI generation
  const handleProjectCreated = (project: ProjectData) => {
    setProjects((prev) => [project, ...prev])
    // Auto-open the project detail view
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
        setAiTasksGenerated(data.tasksCreated)
        // Refresh the project detail
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
          {/* Stats Row */}
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

          {/* Project Grid */}
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

      {/* ─── Detail View ────────────────────────────────────────────────────── */}
      {view === 'detail' && selectedProject && (
        <div className="space-y-4">
          {/* Compact Project Header */}
          <Card className="bg-[#0d1117] border-neutral-800 py-0">
            <CardContent className="px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{selectedProject.icon || '📁'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-white truncate">{selectedProject.name}</h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 gap-1 ${STATUS_CONFIG[selectedProject.status].color} ${STATUS_CONFIG[selectedProject.status].bgColor} ${STATUS_CONFIG[selectedProject.status].borderColor}`}
                      >
                        {STATUS_CONFIG[selectedProject.status].icon}
                        {STATUS_CONFIG[selectedProject.status].label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 ${PRIORITY_CONFIG[selectedProject.priority].color} ${PRIORITY_CONFIG[selectedProject.priority].bgColor} border-neutral-700`}
                      >
                        {PRIORITY_CONFIG[selectedProject.priority].label}
                      </Badge>
                      {selectedProject.category && (
                        <Badge variant="outline" className="text-[10px] h-5 text-rose-300 bg-rose-500/10 border-rose-500/20">
                          {selectedProject.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{selectedProject.description || 'No description'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={selectedProject.status}
                    onValueChange={(v) => handleStatusChangeRequest(v as ProjectStatus)}
                  >
                    <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white h-7 text-xs w-32">
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
                  <Button variant="outline" size="sm" onClick={startEditing} className="border-neutral-700 text-slate-300 gap-1 h-7 text-xs">
                    <Edit3 className="size-3" />Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteProject(selectedProject.id)} className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 w-7 p-0">
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              {selectedProject.tasks && selectedProject.tasks.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{selectedProject.tasks.filter(t => t.status === 'done').length}/{selectedProject.tasks.length} tasks</span>
                    <span className="text-rose-400 font-medium">{calculateProgress(selectedProject.tasks)}%</span>
                  </div>
                  <Progress value={calculateProgress(selectedProject.tasks)} className="h-1.5 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-pink-500" />
                </div>
              )}

              {/* AI indicator */}
              {aiAnalyzing && (
                <div className="mt-3 flex items-center gap-2 text-xs text-violet-400 animate-pulse bg-violet-500/5 rounded-lg p-2 border border-violet-500/20">
                  <Loader2 className="size-3 animate-spin" />
                  <span>AI is analyzing your project and generating tasks...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={editingProject} onOpenChange={setEditingProject}>
            <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-rose-400">Edit Project</DialogTitle>
                <DialogDescription className="text-slate-400">Update project details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-slate-300">Name</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Description</Label>
                  <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white min-h-20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Category</Label>
                    <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
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
                    <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v as ProjectPriority })}>
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
                  <Label className="text-slate-300">Icon</Label>
                  <Input value={editForm.icon} onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white w-20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Requirements</Label>
                  <Textarea value={editForm.requirements} onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white min-h-16" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Notes</Label>
                  <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white min-h-16" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Due Date</Label>
                  <Input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingProject(false)} className="border-neutral-700 text-slate-300">Cancel</Button>
                <Button onClick={saveEdit} className="bg-rose-600 hover:bg-rose-700 text-white">Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Status Change Confirmation */}
          <StatusChangeDialog
            open={statusChangeDialogOpen}
            onOpenChange={setStatusChangeDialogOpen}
            newStatus={pendingStatus}
            onConfirm={() => {
              if (pendingStatus) applyStatusChange(pendingStatus)
              setPendingStatus(null)
            }}
          />

          {/* ── 3-Column Layout ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* ── LEFT PANEL: Agent Activity ──────────────────────────────── */}
            <Card className="bg-[#0d1117] border-neutral-800 py-0">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Bot className="size-4 text-rose-400" />
                    Agent Activity
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] h-5 gap-1 animate-pulse">
                      <span className="size-1.5 rounded-full bg-red-400 animate-ping" />
                      LIVE
                    </Badge>
                    <Badge variant="outline" className="text-[9px] h-5 text-slate-400 border-neutral-700 gap-1">
                      <Users className="size-2.5" />
                      {agentActivities.filter(a => a.status === 'active' || a.status === 'busy').length} active
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-1.5">
                    {agentActivities.map((activity) => {
                      const colors = getAgentColor(activity.agentType)
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-2 p-2 rounded-lg border border-neutral-800/50 bg-neutral-900/30 hover:bg-neutral-800/50 hover:border-neutral-700 transition-all"
                        >
                          <div className={`shrink-0 size-6 rounded-full ${colors.bg} flex items-center justify-center mt-0.5`}>
                            <Bot className={`size-3 ${colors.text}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-medium ${colors.text}`}>{activity.agentName}</span>
                              <span className={`size-1.5 rounded-full shrink-0 ${getStatusDot(activity.status)}`} />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{activity.action}</p>
                            <span className="text-[9px] text-slate-600">{formatRelativeTime(activity.timestamp)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* ── CENTER PANEL: Project Overview + Tasks ─────────────────── */}
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2">
                <Card className="bg-[#0d1117] border-neutral-800 py-2">
                  <CardContent className="flex items-center gap-2 px-3">
                    <ListChecks className="size-4 text-amber-400" />
                    <div>
                      <p className="text-sm font-bold text-white">{selectedProject.tasks?.length ?? selectedProject._count?.tasks ?? 0}</p>
                      <p className="text-[10px] text-slate-400">Tasks</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-[#0d1117] border-neutral-800 py-2">
                  <CardContent className="flex items-center gap-2 px-3">
                    <Sparkles className="size-4 text-violet-400" />
                    <div>
                      <p className="text-sm font-bold text-white">{selectedProject.skills?.length ?? selectedProject._count?.skills ?? 0}</p>
                      <p className="text-[10px] text-slate-400">Skills</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-[#0d1117] border-neutral-800 py-2">
                  <CardContent className="flex items-center gap-2 px-3">
                    <Server className="size-4 text-cyan-400" />
                    <div>
                      <p className="text-sm font-bold text-white">{selectedProject.mcpServers?.length ?? selectedProject._count?.mcpServers ?? 0}</p>
                      <p className="text-[10px] text-slate-400">MCP</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Project Info */}
              <Card className="bg-[#0d1117] border-neutral-800 py-0">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-white flex items-center gap-2">
                    <FolderKanban className="size-3.5 text-rose-400" />
                    Project Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  {selectedProject.category && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Category</span>
                      <Badge variant="outline" className="text-[10px] h-4 text-rose-300 bg-rose-500/10 border-rose-500/20">{selectedProject.category}</Badge>
                    </div>
                  )}
                  {selectedProject.dueDate && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Due Date</span>
                      <span className="text-slate-300 flex items-center gap-1"><Calendar className="size-3" />{formatDate(selectedProject.dueDate)}</span>
                    </div>
                  )}
                  {parseTechStack(selectedProject.techStack).length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 block mb-1">Tech Stack</span>
                      <div className="flex flex-wrap gap-1">
                        {parseTechStack(selectedProject.techStack).map((tech) => (
                          <Badge key={tech} variant="outline" className="text-[9px] h-4 border-neutral-700 text-slate-300 bg-neutral-800/50">{tech}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tasks */}
              <Card className="bg-[#0d1117] border-neutral-800 py-0">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-white flex items-center gap-2">
                    <ListChecks className="size-3.5 text-rose-400" />
                    Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  {/* Add task */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="New task..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="bg-neutral-900 border-neutral-700 text-white flex-1 h-8 text-xs"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask() }}
                    />
                    <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white gap-1 h-8 text-xs">
                      <Plus className="size-3" />Add
                    </Button>
                  </div>

                  {/* AI Generate */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAiAnalyze}
                    disabled={aiAnalyzing || !(selectedProject.description || selectedProject.requirements)}
                    className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 gap-1.5 h-7 text-[10px] w-full"
                  >
                    <Sparkles className="size-3" />
                    {aiAnalyzing ? 'AI Generating...' : 'Generate Tasks with AI'}
                  </Button>
                  {aiTasksGenerated > 0 && !aiAnalyzing && (
                    <span className="text-[10px] text-emerald-400 block">✨ {aiTasksGenerated} tasks generated by AI</span>
                  )}
                  {aiError && (
                    <span className="text-[10px] text-red-400 block">{aiError}</span>
                  )}

                  <Separator className="bg-neutral-800" />

                  {/* Task list */}
                  {(!selectedProject.tasks || selectedProject.tasks.length === 0) ? (
                    <div className="flex flex-col items-center py-4 text-slate-500">
                      <ListChecks className="size-6 mb-1 opacity-50" />
                      <p className="text-xs">No tasks yet</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-64">
                      <div className="space-y-1.5">
                        {selectedProject.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-2 transition-all hover:border-neutral-700"
                          >
                            <button
                              className={`size-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                task.status === 'done'
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                  : 'border-neutral-600 hover:border-rose-500/40'
                              }`}
                              onClick={() => handleToggleTask(task.id)}
                            >
                              {task.status === 'done' && <CheckCircle2 className="size-2.5" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-white'}`}>
                                {task.title}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[8px] h-3.5 px-1 shrink-0 ${
                                task.status === 'todo'
                                  ? 'text-slate-400 border-neutral-700'
                                  : task.status === 'in_progress'
                                    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                                    : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                              }`}
                            >
                              {task.status === 'todo' ? 'To Do' : task.status === 'in_progress' ? 'In Progress' : 'Done'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Automation Tools */}
              <Card className="bg-[#0d1117] border-neutral-800 py-0">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-white flex items-center gap-2">
                    <Wrench className="size-3.5 text-rose-400" />
                    Automation Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="grid grid-cols-2 gap-2">
                    {AUTOMATION_TOOLS.map((tool) => (
                      <div
                        key={tool.name}
                        className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-2 transition-all hover:border-rose-500/30 hover:bg-neutral-900/80 cursor-pointer group"
                        onClick={() => window.open(tool.url, '_blank')}
                      >
                        <span className="text-lg">{tool.icon}</span>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-slate-300 group-hover:text-rose-300 transition-colors block truncate">{tool.name}</span>
                          <span className="text-[8px] text-slate-500 line-clamp-1">{tool.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Skills & MCP inline */}
              <Card className="bg-[#0d1117] border-neutral-800 py-0">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs text-white flex items-center gap-2">
                      <Sparkles className="size-3.5 text-rose-400" />
                      Skills & MCP Servers
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setAddSkillDialogOpen(true)} className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 h-6 text-[9px] px-2">
                        <Plus className="size-2.5" />Skill
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAddMcpDialogOpen(true)} className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 h-6 text-[9px] px-2">
                        <Plus className="size-2.5" />MCP
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  {/* Skills */}
                  {selectedProject.skills && selectedProject.skills.length > 0 ? (
                    <div className="space-y-1">
                      {selectedProject.skills.map((sa) => (
                        <div key={sa.id} className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900/50 p-1.5">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] text-white">{sa.skill?.name || `Skill ${sa.skillId}`}</span>
                            {sa.role && <Badge variant="outline" className="text-[8px] h-3.5 ml-1 px-1 border-violet-500/30 text-violet-400 bg-violet-500/10">{sa.role}</Badge>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveSkill(sa.skillId)} className="text-red-400 hover:text-red-300 h-5 w-5 p-0 shrink-0">
                            <Trash2 className="size-2.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">No skills assigned</p>
                  )}

                  <Separator className="bg-neutral-800" />

                  {/* MCP Servers */}
                  {selectedProject.mcpServers && selectedProject.mcpServers.length > 0 ? (
                    <div className="space-y-1">
                      {selectedProject.mcpServers.map((ma) => (
                        <div key={ma.id} className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900/50 p-1.5">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] text-white">{ma.mcpServer?.name || `MCP ${ma.mcpServerId}`}</span>
                            {ma.role && <Badge variant="outline" className="text-[8px] h-3.5 ml-1 px-1 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">{ma.role}</Badge>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveMcp(ma.mcpServerId)} className="text-red-400 hover:text-red-300 h-5 w-5 p-0 shrink-0">
                            <Trash2 className="size-2.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">No MCP servers assigned</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── RIGHT PANEL: Code Explorer + Agent Chat ────────────────── */}
            <Card className="bg-[#0d1117] border-neutral-800 py-0">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-neutral-900 rounded-lg border border-neutral-800 p-0.5">
                    <button
                      className={`px-3 py-1 rounded-md text-xs transition-colors ${detailTab === 'code' ? 'bg-rose-600/20 text-rose-400' : 'text-slate-400 hover:text-white'}`}
                      onClick={() => setDetailTab('code')}
                    >
                      <FileCode className="size-3 inline mr-1" />
                      Code
                    </button>
                    <button
                      className={`px-3 py-1 rounded-md text-xs transition-colors ${detailTab === 'chat' ? 'bg-rose-600/20 text-rose-400' : 'text-slate-400 hover:text-white'}`}
                      onClick={() => setDetailTab('chat')}
                    >
                      <MessageSquare className="size-3 inline mr-1" />
                      Chat
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {detailTab === 'code' ? (
                  /* ── Code Explorer ── */
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-0.5">
                      {renderFileTree(generateFileTree(selectedProject))}
                    </div>
                  </ScrollArea>
                ) : (
                  /* ── Agent Chat ── */
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {agentMessages.map((msg) => {
                        const colors = getAgentColor(msg.fromType)
                        return (
                          <div key={msg.id} className="flex gap-2">
                            <div className={`shrink-0 size-6 rounded-full ${colors.bg} flex items-center justify-center mt-0.5`}>
                              <Bot className={`size-3 ${colors.text}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-xs font-medium ${colors.text}`}>{msg.from}</span>
                                <span className="text-[9px] text-slate-600">{formatRelativeTime(msg.timestamp)}</span>
                              </div>
                              <div className={`rounded-lg ${colors.bg} border ${colors.border} p-2`}>
                                <p className="text-xs text-slate-300 leading-relaxed">{msg.content}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add Skill Dialog */}
          <Dialog open={addSkillDialogOpen} onOpenChange={setAddSkillDialogOpen}>
            <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-rose-400">Add Skill</DialogTitle>
                <DialogDescription className="text-slate-400">Assign a skill to this project</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-slate-300">Skill</Label>
                  <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                    <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                      <SelectValue placeholder="Select a skill..." />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-700">
                      {installedSkills
                        .filter((s) => !(selectedProject.skills || []).some((ps) => ps.skillId === s.id))
                        .map((skill) => (
                          <SelectItem key={skill.id} value={skill.id} className="text-white focus:bg-neutral-800 focus:text-white">
                            {skill.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Role (optional)</Label>
                  <Input
                    placeholder="e.g. primary, fallback..."
                    value={newSkillRole}
                    onChange={(e) => setNewSkillRole(e.target.value)}
                    className="bg-neutral-900 border-neutral-700 text-white"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddSkillDialogOpen(false)} className="border-neutral-700 text-slate-300">Cancel</Button>
                <Button onClick={handleAddSkill} disabled={!selectedSkillId} className="bg-rose-600 hover:bg-rose-700 text-white">Add Skill</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add MCP Server Dialog */}
          <Dialog open={addMcpDialogOpen} onOpenChange={setAddMcpDialogOpen}>
            <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-rose-400">Add MCP Server</DialogTitle>
                <DialogDescription className="text-slate-400">Connect an MCP server to this project</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-slate-300">MCP Server</Label>
                  <Select value={selectedMcpId} onValueChange={setSelectedMcpId}>
                    <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                      <SelectValue placeholder="Select an MCP server..." />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-700">
                      {installedMcpServers
                        .filter((m) => !(selectedProject.mcpServers || []).some((pm) => pm.mcpServerId === m.id))
                        .map((mcp) => (
                          <SelectItem key={mcp.id} value={mcp.id} className="text-white focus:bg-neutral-800 focus:text-white">
                            {mcp.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Role (optional)</Label>
                  <Input
                    placeholder="e.g. primary, backup..."
                    value={newMcpRole}
                    onChange={(e) => setNewMcpRole(e.target.value)}
                    className="bg-neutral-900 border-neutral-700 text-white"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddMcpDialogOpen(false)} className="border-neutral-700 text-slate-300">Cancel</Button>
                <Button onClick={handleAddMcp} disabled={!selectedMcpId} className="bg-rose-600 hover:bg-rose-700 text-white">Add Server</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
        </div>
      </ScrollArea>
    </div>
  )
}
