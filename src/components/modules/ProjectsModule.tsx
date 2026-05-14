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
  { name: 'Huginn', icon: '🦅', url: 'http://localhost:3000', description: 'Agent-based automation system' },
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

  // Create project
  const handleProjectCreated = (project: ProjectData) => {
    setProjects((prev) => [project, ...prev])
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
    const newTask: TaskData = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      status: 'todo',
      createdAt: new Date().toISOString(),
    }

    const updated = {
      ...selectedProject,
      tasks: [...(selectedProject.tasks || []), newTask],
      _count: { ...selectedProject._count!, tasks: (selectedProject._count?.tasks ?? 0) + 1 },
    }
    setSelectedProject(updated)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setNewTaskTitle('')
    setNewTaskDesc('')

    try {
      await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTask.title, description: newTask.description }),
      })
    } catch {
      // optimistically added
    }
  }

  // Toggle task status
  const handleToggleTask = async (taskId: string) => {
    if (!selectedProject) return
    const tasks = (selectedProject.tasks || []).map((t) =>
      t.id === taskId ? { ...t, status: t.status === 'done' ? 'todo' as const : 'done' as const } : t
    )
    const updated = { ...selectedProject, tasks }
    setSelectedProject(updated)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

    try {
      await fetch(`/api/projects/${selectedProject.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: tasks.find(t => t.id === taskId)?.status }),
      })
    } catch {
      // silently fail
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
    <div className="space-y-6">
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
          {/* Project Header */}
          <Card className="bg-[#0d1117] border-neutral-800 py-0">
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedProject.icon || '📁'}</span>
                  <div>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      {selectedProject.name}
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
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-400 mt-1">
                      {selectedProject.description || 'No description'}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status change */}
                  <Select
                    value={selectedProject.status}
                    onValueChange={(v) => handleStatusChangeRequest(v as ProjectStatus)}
                  >
                    <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white h-8 text-xs w-36">
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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditing}
                    className="border-neutral-700 text-slate-300 gap-1 h-8"
                  >
                    <Edit3 className="size-3" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProject(selectedProject.id)}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1 h-8"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Progress bar */}
            {selectedProject.tasks && selectedProject.tasks.length > 0 && (
              <CardContent className="px-4 pb-4 pt-0">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {selectedProject.tasks.filter(t => t.status === 'done').length} / {selectedProject.tasks.length} tasks complete
                    </span>
                    <span className="text-rose-400 font-medium">{calculateProgress(selectedProject.tasks)}%</span>
                  </div>
                  <Progress value={calculateProgress(selectedProject.tasks)} className="h-2 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-pink-500" />
                </div>
              </CardContent>
            )}
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

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-neutral-900 border border-neutral-800">
              <TabsTrigger value="overview" className="data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400 gap-1">
                <LayoutGrid className="size-3" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400 gap-1">
                <ListChecks className="size-3" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="skills" className="data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400 gap-1">
                <Sparkles className="size-3" />
                Skills
              </TabsTrigger>
              <TabsTrigger value="mcp" className="data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400 gap-1">
                <Server className="size-3" />
                MCP Servers
              </TabsTrigger>
            </TabsList>

            {/* ── Overview Tab ── */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Project Info */}
                <Card className="bg-[#0d1117] border-neutral-800 py-0">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm text-white flex items-center gap-2">
                      <FolderKanban className="size-4 text-rose-400" />
                      Project Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {selectedProject.category && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Category</span>
                        <Badge variant="outline" className="text-[10px] h-5 text-rose-300 bg-rose-500/10 border-rose-500/20">
                          {selectedProject.category}
                        </Badge>
                      </div>
                    )}
                    {selectedProject.dueDate && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Due Date</span>
                        <span className="text-slate-300 flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDate(selectedProject.dueDate)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Created</span>
                      <span className="text-slate-300">{formatDate(selectedProject.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Last Updated</span>
                      <span className="text-slate-300">{formatRelativeTime(selectedProject.updatedAt)}</span>
                    </div>

                    {parseTechStack(selectedProject.techStack).length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs text-slate-400 block mb-1.5">Tech Stack</span>
                        <div className="flex flex-wrap gap-1">
                          {parseTechStack(selectedProject.techStack).map((tech) => (
                            <Badge key={tech} variant="outline" className="text-[10px] h-5 border-neutral-700 text-slate-300 bg-neutral-800/50">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Requirements & Notes */}
                <Card className="bg-[#0d1117] border-neutral-800 py-0">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm text-white flex items-center gap-2">
                      <AlertCircle className="size-4 text-rose-400" />
                      Requirements & Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {selectedProject.requirements ? (
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">Requirements</span>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap bg-neutral-900/50 rounded-md p-3 border border-neutral-800">
                          {selectedProject.requirements}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No requirements specified</p>
                    )}
                    <Separator className="bg-neutral-800" />
                    {selectedProject.notes ? (
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">Notes</span>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap bg-neutral-900/50 rounded-md p-3 border border-neutral-800">
                          {selectedProject.notes}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No notes</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-[#0d1117] border-neutral-800 py-3">
                  <CardContent className="flex items-center gap-3 px-4">
                    <ListChecks className="size-5 text-amber-400" />
                    <div>
                      <p className="text-lg font-bold text-white">{selectedProject.tasks?.length ?? selectedProject._count?.tasks ?? 0}</p>
                      <p className="text-xs text-slate-400">Tasks</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-[#0d1117] border-neutral-800 py-3">
                  <CardContent className="flex items-center gap-3 px-4">
                    <Sparkles className="size-5 text-violet-400" />
                    <div>
                      <p className="text-lg font-bold text-white">{selectedProject.skills?.length ?? selectedProject._count?.skills ?? 0}</p>
                      <p className="text-xs text-slate-400">Skills</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-[#0d1117] border-neutral-800 py-3">
                  <CardContent className="flex items-center gap-3 px-4">
                    <Server className="size-5 text-cyan-400" />
                    <div>
                      <p className="text-lg font-bold text-white">{selectedProject.mcpServers?.length ?? selectedProject._count?.mcpServers ?? 0}</p>
                      <p className="text-xs text-slate-400">MCP Servers</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Automation Tools Section */}
              <Card className="bg-[#0d1117] border-neutral-800 py-0">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Wrench className="size-4 text-rose-400" />
                    Automation Tools
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Quick access to installed automation services
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {AUTOMATION_TOOLS.map((tool) => (
                      <div
                        key={tool.name}
                        className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 transition-all hover:border-rose-500/30 hover:bg-neutral-900/80 cursor-pointer group"
                        onClick={() => window.open(tool.url, '_blank')}
                      >
                        <span className="text-2xl">{tool.icon}</span>
                        <span className="text-xs font-medium text-slate-300 group-hover:text-rose-300 transition-colors">
                          {tool.name}
                        </span>
                        <span className="text-[10px] text-slate-500 text-center line-clamp-2">
                          {tool.description}
                        </span>
                        <ExternalLink className="size-3 text-slate-600 group-hover:text-rose-400 transition-colors" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tasks Tab ── */}
            <TabsContent value="tasks" className="space-y-4">
              <Card className="bg-[#0d1117] border-neutral-800 py-0">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <ListChecks className="size-4 text-rose-400" />
                    Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {/* Add task form */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="New task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="bg-neutral-900 border-neutral-700 text-white flex-1 h-9 text-sm"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask() }}
                    />
                    <Button
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim()}
                      size="sm"
                      className="bg-rose-600 hover:bg-rose-700 text-white gap-1 h-9"
                    >
                      <Plus className="size-3" />
                      Add
                    </Button>
                  </div>
                  {newTaskTitle.trim() && (
                    <Input
                      placeholder="Description (optional)..."
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm"
                    />
                  )}

                  <Separator className="bg-neutral-800" />

                  {/* Tasks list */}
                  {(!selectedProject.tasks || selectedProject.tasks.length === 0) ? (
                    <div className="flex flex-col items-center py-8 text-slate-500">
                      <ListChecks className="size-8 mb-2 opacity-50" />
                      <p className="text-sm">No tasks yet</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-96">
                      <div className="space-y-2">
                        {selectedProject.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 transition-all hover:border-neutral-700"
                          >
                            <button
                              className={`size-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                task.status === 'done'
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                  : 'border-neutral-600 hover:border-rose-500/40'
                              }`}
                              onClick={() => handleToggleTask(task.id)}
                            >
                              {task.status === 'done' && <CheckCircle2 className="size-3" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-white'}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[9px] h-4 px-1.5 shrink-0 ${
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
            </TabsContent>

            {/* ── Skills Tab ── */}
            <TabsContent value="skills" className="space-y-4">
              <Card className="bg-[#0d1117] border-neutral-800 py-0">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-white flex items-center gap-2">
                      <Sparkles className="size-4 text-rose-400" />
                      Assigned Skills
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddSkillDialogOpen(true)}
                      className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1 h-7 text-xs"
                    >
                      <Plus className="size-3" />
                      Add Skill
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {(!selectedProject.skills || selectedProject.skills.length === 0) ? (
                    <div className="flex flex-col items-center py-8 text-slate-500">
                      <Sparkles className="size-8 mb-2 opacity-50" />
                      <p className="text-sm">No skills assigned</p>
                      <p className="text-xs text-slate-600 mt-1">Add skills to give this project capabilities</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-96">
                      <div className="space-y-2">
                        {selectedProject.skills.map((skillAssignment) => (
                          <div
                            key={skillAssignment.id}
                            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 transition-all hover:border-neutral-700"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white">
                                {skillAssignment.skill?.name || `Skill ${skillAssignment.skillId}`}
                              </p>
                              {skillAssignment.skill?.description && (
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{skillAssignment.skill.description}</p>
                              )}
                              {skillAssignment.role && (
                                <Badge variant="outline" className="text-[9px] h-4 mt-1 px-1.5 border-violet-500/30 text-violet-400 bg-violet-500/10">
                                  {skillAssignment.role}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSkill(skillAssignment.skillId)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0 shrink-0"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

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
            </TabsContent>

            {/* ── MCP Servers Tab ── */}
            <TabsContent value="mcp" className="space-y-4">
              <Card className="bg-[#0d1117] border-neutral-800 py-0">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-white flex items-center gap-2">
                      <Server className="size-4 text-rose-400" />
                      Assigned MCP Servers
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddMcpDialogOpen(true)}
                      className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1 h-7 text-xs"
                    >
                      <Plus className="size-3" />
                      Add MCP Server
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {(!selectedProject.mcpServers || selectedProject.mcpServers.length === 0) ? (
                    <div className="flex flex-col items-center py-8 text-slate-500">
                      <Server className="size-8 mb-2 opacity-50" />
                      <p className="text-sm">No MCP servers assigned</p>
                      <p className="text-xs text-slate-600 mt-1">Add MCP servers to connect this project to external tools</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-96">
                      <div className="space-y-2">
                        {selectedProject.mcpServers.map((mcpAssignment) => (
                          <div
                            key={mcpAssignment.id}
                            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 transition-all hover:border-neutral-700"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white">
                                {mcpAssignment.mcpServer?.name || `MCP Server ${mcpAssignment.mcpServerId}`}
                              </p>
                              {mcpAssignment.mcpServer?.description && (
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{mcpAssignment.mcpServer.description}</p>
                              )}
                              {mcpAssignment.mcpServer?.url && (
                                <p className="text-[10px] text-cyan-400/60 mt-0.5 truncate">{mcpAssignment.mcpServer.url}</p>
                              )}
                              {mcpAssignment.role && (
                                <Badge variant="outline" className="text-[9px] h-4 mt-1 px-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                                  {mcpAssignment.role}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMcp(mcpAssignment.mcpServerId)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0 shrink-0"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

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
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
