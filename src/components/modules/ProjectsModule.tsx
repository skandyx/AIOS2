'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  Play,
  Activity,
  MessageSquare,
  FileText,
  Upload,
  Download,
  Github,
  BookOpen,
  File,
  FileCode,
  FileJson,
  FileImage,
  Folder,
  Send,
  RefreshCw,
  GitBranch,
  ArrowUpFromLine,
  Copy,
  Eye,
  X,
  Circle,
  Clock,
  Settings,
  Timer,
  Users,
  HardDrive,
  Globe,
  ChevronRight,
  ChevronDown,
  Shield,
  Tag,
  Hash,
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

interface AgentMessage {
  id: string
  fromRole: string
  toRole: string
  type: string
  content: string
  createdAt: string
  fromAgent?: { id: string; name: string; type: string; avatar?: string | null } | null
  toAgent?: { id: string; name: string; type: string; avatar?: string | null } | null
  metadata?: string | null
}

interface ProjectFileData {
  id: string
  name: string
  path: string
  language?: string | null
  size: number
  mimeType?: string | null
  isDirectory: boolean
  source?: string | null
  createdAt: string
  updatedAt: string
}

interface GitHubRepoInfo {
  owner: string
  name: string
  fullName?: string
  description?: string
  branch: string
  private?: boolean
  stars?: number
  forks?: number
  language?: string
  url?: string
}

interface OrchestratorLogEntry {
  timestamp: string
  event: string
  details?: unknown
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
  orchestratorStatus?: string | null
  orchestratorLog?: string | null
  repoUrl?: string | null
  repoOwner?: string | null
  repoName?: string | null
  repoBranch?: string | null
  githubToken?: string | null
  localPath?: string | null
  documentation?: string | null
  readme?: string | null
  _count?: {
    tasks: number
    projectSkills: number
    projectMCPServers: number
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

const ORCHESTRATOR_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; pulse: boolean }> = {
  idle: { label: 'Idle', color: 'text-slate-400', bgColor: 'bg-slate-500/15', borderColor: 'border-slate-500/30', pulse: false },
  analyzing: { label: 'Analyzing', color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30', pulse: true },
  assigning: { label: 'Assigning', color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30', pulse: true },
  running: { label: 'Running', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30', pulse: true },
  completed: { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30', pulse: false },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/15', borderColor: 'border-red-500/30', pulse: false },
}

const MESSAGE_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  instruction: { label: 'Instruction', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: <Zap className="size-3" /> },
  result: { label: 'Result', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: <CheckCircle2 className="size-3" /> },
  discussion: { label: 'Discussion', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', icon: <MessageSquare className="size-3" /> },
  status: { label: 'Status', color: 'text-slate-400', bgColor: 'bg-slate-500/10', icon: <Activity className="size-3" /> },
}

const ROLE_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  orchestrator: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  agent: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  user: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  system: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
}

const FILE_ICON_MAP: Record<string, React.ReactNode> = {
  typescript: <FileCode className="size-4 text-blue-400" />,
  javascript: <FileCode className="size-4 text-yellow-400" />,
  python: <FileCode className="size-4 text-green-400" />,
  html: <FileCode className="size-4 text-orange-400" />,
  css: <FileCode className="size-4 text-purple-400" />,
  json: <FileJson className="size-4 text-yellow-300" />,
  markdown: <FileText className="size-4 text-slate-300" />,
  yaml: <FileText className="size-4 text-pink-400" />,
  image: <FileImage className="size-4 text-emerald-400" />,
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
  } catch { /* not JSON */ }
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return dateStr }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return dateStr }
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileIcon(language: string | null | undefined, name: string): React.ReactNode {
  if (language && FILE_ICON_MAP[language]) return FILE_ICON_MAP[language]
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) return FILE_ICON_MAP.image
  if (['ts', 'tsx'].includes(ext)) return FILE_ICON_MAP.typescript
  if (['js', 'jsx'].includes(ext)) return FILE_ICON_MAP.javascript
  if (['py'].includes(ext)) return FILE_ICON_MAP.python
  if (['json'].includes(ext)) return FILE_ICON_MAP.json
  if (['md'].includes(ext)) return FILE_ICON_MAP.markdown
  if (['yml', 'yaml'].includes(ext)) return FILE_ICON_MAP.yaml
  return <File className="size-4 text-slate-400" />
}

// ─── File Tree Builder ─────────────────────────────────────────────────────────

interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children: FileTreeNode[]
  file?: ProjectFileData
}

function buildFileTree(files: ProjectFileData[]): FileTreeNode[] {
  const root: FileTreeNode[] = []
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean)
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join('/')
      let node = current.find(n => n.name === part && n.isDirectory === !isLast)
      if (!node) {
        node = { name: part, path: currentPath, isDirectory: !isLast, children: [], file: isLast ? file : undefined }
        current.push(node)
      }
      if (!isLast) {
        current = node.children
      }
    }
  }
  // Sort: directories first, then alphabetically
  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    }).map(n => ({ ...n, children: sortNodes(n.children) }))
  }
  return sortNodes(root)
}

// ─── Syntax Highlighting ───────────────────────────────────────────────────────

function highlightSyntax(code: string, language: string | null | undefined): React.ReactNode {
  if (!code) return <span className="text-slate-500">(empty file)</span>

  const lang = language || ''
  const keywords = getKeywords(lang)
  const commentPatterns = getCommentPatterns(lang)
  const stringPattern = /(["'`])(?:(?!\1|\\).|\\.)*\1/g

  // Simple approach: split code into lines and highlight
  const lines = code.split('\n')
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className="table-row">
          <span className="table-cell pr-4 text-right text-slate-600 select-none w-8 shrink-0 text-[10px]">{i + 1}</span>
          <span className="table-cell">{highlightLine(line, keywords, commentPatterns, stringPattern)}</span>
        </div>
      ))}
    </>
  )
}

function getKeywords(lang: string): Set<string> {
  const kw: Record<string, string[]> = {
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'implements', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'interface', 'type', 'enum', 'namespace', 'abstract', 'readonly', 'public', 'private', 'protected', 'static', 'super', 'yield', 'of', 'in', 'as', 'is', 'void', 'delete', 'null', 'undefined', 'true', 'false'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'super', 'yield', 'of', 'in', 'void', 'delete', 'null', 'undefined', 'true', 'false'],
    python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'raise', 'import', 'from', 'as', 'with', 'async', 'await', 'yield', 'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'self', 'global', 'nonlocal', 'assert', 'del'],
    html: ['DOCTYPE', 'html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'select', 'option', 'textarea', 'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'nav', 'main', 'section', 'article', 'aside'],
    css: ['color', 'background', 'margin', 'padding', 'border', 'display', 'position', 'width', 'height', 'font', 'text', 'flex', 'grid', 'align', 'justify', 'overflow', 'opacity', 'transform', 'transition', 'animation', 'box-shadow', 'important', 'none', 'auto', 'inherit', 'initial', 'relative', 'absolute', 'fixed', 'sticky'],
    json: [],
    yaml: [],
    markdown: [],
  }
  return new Set(kw[lang] || kw['typescript'] || [])
}

function getCommentPatterns(lang: string): { single: string; multiStart?: string; multiEnd?: string } {
  const patterns: Record<string, { single: string; multiStart?: string; multiEnd?: string }> = {
    typescript: { single: '//', multiStart: '/*', multiEnd: '*/' },
    javascript: { single: '//', multiStart: '/*', multiEnd: '*/' },
    python: { single: '#', multiStart: '"""', multiEnd: '"""' },
    css: { single: '', multiStart: '/*', multiEnd: '*/' },
    html: { single: '', multiStart: '<!--', multiEnd: '-->' },
    yaml: { single: '#' },
    json: { single: '' },
    markdown: { single: '' },
  }
  return patterns[lang] || { single: '//' }
}

function highlightLine(line: string, keywords: Set<string>, commentPatterns: { single: string; multiStart?: string; multiEnd?: string }, stringPattern: RegExp): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = line
  let keyIdx = 0

  // Check for single-line comment first
  if (commentPatterns.single && remaining.trimStart().startsWith(commentPatterns.single)) {
    return <span className="text-slate-500 italic">{remaining}</span>
  }

  while (remaining.length > 0) {
    // Try to match string
    stringPattern.lastIndex = 0
    const strMatch = stringPattern.exec(remaining)
    const strIdx = strMatch ? strMatch.index : -1

    // Try to match comment
    let commentIdx = -1
    if (commentPatterns.single) {
      commentIdx = remaining.indexOf(commentPatterns.single)
    }

    // Find earliest match
    let earliest = -1
    let matchType: 'string' | 'comment' | 'none' = 'none'
    if (strIdx >= 0 && (commentIdx < 0 || strIdx <= commentIdx)) {
      earliest = strIdx
      matchType = 'string'
    } else if (commentIdx >= 0) {
      earliest = commentIdx
      matchType = 'comment'
    }

    if (earliest > 0) {
      // Process text before match for keywords
      parts.push(highlightKeywords(remaining.slice(0, earliest), keywords, keyIdx))
      keyIdx++
    }

    if (matchType === 'string' && strMatch) {
      parts.push(<span key={`s${keyIdx++}`} className="text-emerald-400">{strMatch[0]}</span>)
      remaining = remaining.slice(earliest + strMatch[0].length)
    } else if (matchType === 'comment') {
      parts.push(<span key={`c${keyIdx++}`} className="text-slate-500 italic">{remaining.slice(earliest)}</span>)
      remaining = ''
    } else {
      // No matches - just keyword-highlight the rest
      parts.push(highlightKeywords(remaining, keywords, keyIdx))
      remaining = ''
    }
  }

  return <>{parts}</>
}

function highlightKeywords(text: string, keywords: Set<string>, startKey: number): React.ReactNode {
  const tokenPattern = /(\b\w+\b|[^\w\s]|\s+)/g
  const tokens = text.match(tokenPattern) || [text]
  return (
    <>
      {tokens.map((token, i) => {
        if (keywords.has(token)) {
          return <span key={`k${startKey}-${i}`} className="text-rose-400 font-medium">{token}</span>
        }
        // Numbers
        if (/^\d+(\.\d+)?$/.test(token)) {
          return <span key={`k${startKey}-${i}`} className="text-amber-300">{token}</span>
        }
        // Punctuation
        if (/^[{}()[\];,.]$/.test(token)) {
          return <span key={`k${startKey}-${i}`} className="text-slate-500">{token}</span>
        }
        // Decorators / annotations
        if (token.startsWith('@')) {
          return <span key={`k${startKey}-${i}`} className="text-violet-400">{token}</span>
        }
        return <span key={`k${startKey}-${i}`} className="text-slate-300">{token}</span>
      })}
    </>
  )
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: ProjectData; onClick: () => void }) {
  const statusConf = STATUS_CONFIG[project.status]
  const priorityConf = PRIORITY_CONFIG[project.priority]
  const techStack = parseTechStack(project.techStack)
  const progress = project.tasks ? calculateProgress(project.tasks) : 0
  const taskCount = project._count?.tasks ?? project.tasks?.length ?? 0
  const skillCount = project._count?.projectSkills ?? project.skills?.length ?? 0
  const mcpCount = project._count?.projectMCPServers ?? project.mcpServers?.length ?? 0

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
          <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${statusConf.color} ${statusConf.bgColor} ${statusConf.borderColor}`}>
            {statusConf.icon} {statusConf.label}
          </Badge>
          <Badge variant="outline" className={`text-[10px] h-5 ${priorityConf.color} ${priorityConf.bgColor} border-neutral-700`}>
            {priorityConf.label}
          </Badge>
          {project.category && (
            <Badge variant="outline" className="text-[10px] h-5 text-rose-300 bg-rose-500/10 border-rose-500/20">
              {project.category}
            </Badge>
          )}
        </div>
        {techStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {techStack.slice(0, 4).map((tech) => (
              <Badge key={tech} variant="outline" className="text-[9px] h-4 px-1.5 border-neutral-700 text-slate-300 bg-neutral-800/50">{tech}</Badge>
            ))}
            {techStack.length > 4 && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-neutral-700 text-slate-500">+{techStack.length - 4}</Badge>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><ListChecks className="size-3" />{taskCount}</span>
          <span className="flex items-center gap-1"><Sparkles className="size-3" />{skillCount}</span>
          <span className="flex items-center gap-1"><Server className="size-3" />{mcpCount}</span>
          {project.dueDate && (
            <span className="flex items-center gap-1 ml-auto"><Calendar className="size-3" />{formatDate(project.dueDate)}</span>
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

function CreateProjectDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreated: (project: ProjectData) => void
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
  const [sourceGithubUrl, setSourceGithubUrl] = useState('')
  const [sourceGithubToken, setSourceGithubToken] = useState('')
  const [sourceLocalPath, setSourceLocalPath] = useState('')

  const resetForm = () => {
    setName(''); setDescription(''); setCategory('Web App'); setPriority('medium')
    setIcon('📁'); setTechStack(''); setRequirements(''); setNotes(''); setDueDate('')
    setSourceGithubUrl(''); setSourceGithubToken(''); setSourceLocalPath('')
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(), description: description.trim() || undefined, status: 'planning',
        priority, category, icon,
        techStack: techStack.trim() ? JSON.stringify(techStack.split(',').map(s => s.trim()).filter(Boolean)) : undefined,
        requirements: requirements.trim() || undefined, notes: notes.trim() || undefined, dueDate: dueDate || undefined,
        localPath: sourceLocalPath.trim() || undefined,
      }
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        const created = await res.json()
        onCreated(created)
        resetForm()
        onOpenChange(false)

        // Auto-connect GitHub and import if URL provided
        if (sourceGithubUrl.trim()) {
          try {
            // Connect GitHub repo
            const connectRes = await fetch(`/api/projects/${created.id}/github`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ repoUrl: sourceGithubUrl.trim(), githubToken: sourceGithubToken.trim() || undefined }),
            })
            if (connectRes.ok) {
              // Import files from the repo
              await fetch(`/api/projects/${created.id}/github/clone`, { method: 'POST' })
              // Trigger orchestrator to analyze and improve
              await fetch(`/api/projects/${created.id}/orchestrate`, { method: 'POST' })
            }
          } catch {
            // GitHub connection may fail, that's fine
          }
        }
      }
    } catch { /* silently fail */ } finally { setCreating(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-rose-400 flex items-center gap-2"><FolderKanban className="size-5" /> New Project</DialogTitle>
          <DialogDescription className="text-slate-400">Create a new project to organize tasks, skills, and MCP servers</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-slate-300">Name *</Label>
            <Input placeholder="Project name..." value={name} onChange={(e) => setName(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Description</Label>
            <Textarea placeholder="What is this project about..." value={description} onChange={(e) => setDescription(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white min-h-20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ProjectCategory)}>
                <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {CATEGORY_OPTIONS.map((cat) => (<SelectItem key={cat} value={cat} className="text-white focus:bg-neutral-800 focus:text-white">{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ProjectPriority)}>
                <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {PRIORITY_OPTIONS.map((p) => (<SelectItem key={p} value={p} className="text-white focus:bg-neutral-800 focus:text-white">{PRIORITY_CONFIG[p].label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Icon / Emoji</Label>
            <Input placeholder="📁" value={icon} onChange={(e) => setIcon(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white w-20" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Tech Stack (comma-separated)</Label>
            <Input placeholder="React, Node.js, PostgreSQL..." value={techStack} onChange={(e) => setTechStack(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Requirements</Label>
            <Textarea placeholder="Project requirements..." value={requirements} onChange={(e) => setRequirements(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white min-h-16" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Notes</Label>
            <Textarea placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white min-h-16" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white" />
          </div>
          <Separator className="bg-neutral-800" />
          <div className="space-y-3">
            <Label className="text-slate-300 flex items-center gap-2"><GitBranch className="size-4 text-slate-400" /> Source (Optional)</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Github className="size-4 text-slate-500 shrink-0" />
                <Input placeholder="https://github.com/owner/repo" value={sourceGithubUrl} onChange={(e) => setSourceGithubUrl(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white text-sm" />
              </div>
              {sourceGithubUrl.trim() && (
                <div className="flex items-center gap-2 ml-6">
                  <Label className="text-[10px] text-slate-500 shrink-0">Token</Label>
                  <Input placeholder="ghp_... (optional, for private repos)" value={sourceGithubToken} onChange={(e) => setSourceGithubToken(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white text-xs h-7" type="password" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Folder className="size-4 text-slate-500 shrink-0" />
                <Input placeholder="/path/to/your/project" value={sourceLocalPath} onChange={(e) => setSourceLocalPath(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white text-sm" />
              </div>
              {sourceGithubUrl.trim() && (
                <p className="text-[10px] text-slate-600 ml-6">GitHub repo will be auto-connected, files imported, and orchestrator started after creation.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }} className="border-neutral-700 text-slate-300">Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()} className="bg-rose-600 hover:bg-rose-700 text-white">
            {creating ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatusChangeDialog({ open, onOpenChange, newStatus, onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void; newStatus: ProjectStatus | null; onConfirm: () => void
}) {
  if (!newStatus) return null
  const isCompleted = newStatus === 'completed'
  const isInProgress = newStatus === 'in_progress'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className={isCompleted ? 'text-emerald-400' : 'text-amber-400'}>
            {isCompleted ? <span className="flex items-center gap-2"><PartyPopper className="size-5" /> Project Completed!</span>
              : isInProgress ? <span className="flex items-center gap-2"><Rocket className="size-5" /> Start Project?</span>
              : <span className="flex items-center gap-2"><AlertCircle className="size-5" /> Change Status</span>}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isCompleted ? 'Marking this project as completed is a great milestone.'
              : isInProgress ? 'Are you ready to start working on this project?'
              : `Change project status to ${STATUS_CONFIG[newStatus].label}?`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-neutral-700 text-slate-300">Cancel</Button>
          <Button onClick={() => { onConfirm(); onOpenChange(false) }}
            className={isCompleted ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : isInProgress ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Code Browser Component ──────────────────────────────────────────────────

function CodeBrowser({ files, filesLoading, viewingFile, setViewingFile, onRefresh, onUpload, uploadingFiles, onViewFile, onDeleteFile, onDownloadZip, onPushGithub, githubConnected, githubPushing, downloadLoading, currentOrchestratorStatus, onStartOrchestrator, orchestratorLoading }: {
  files: ProjectFileData[]
  filesLoading: boolean
  viewingFile: { id: string; name: string; content: string; path: string } | null
  setViewingFile: (v: { id: string; name: string; content: string; path: string } | null) => void
  onRefresh: () => void
  onUpload: () => void
  uploadingFiles: boolean
  onViewFile: (id: string, name: string, path: string) => void
  onDeleteFile: (id: string) => void
  onDownloadZip: () => void
  onPushGithub: () => void
  githubConnected: boolean
  githubPushing: boolean
  downloadLoading: boolean
  currentOrchestratorStatus: string
  onStartOrchestrator: () => void
  orchestratorLoading: boolean
}) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    const tree = buildFileTree(files)
    tree.forEach(n => { if (n.isDirectory) initial.add(n.path) })
    return initial
  })
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const fileTree = buildFileTree(files)

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleFileClick = (file: ProjectFileData) => {
    setSelectedFileId(file.id)
    onViewFile(file.id, file.name, file.path)
  }

  const renderTreeNode = (node: FileTreeNode, depth: number = 0) => (
    <div key={node.path}>
      {node.isDirectory ? (
        <div
          className="flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer hover:bg-neutral-800/60 text-xs text-slate-300 transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => toggleDir(node.path)}
        >
          {expandedDirs.has(node.path) ? (
            <ChevronDown className="size-3 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="size-3 text-slate-500 shrink-0" />
          )}
          <Folder className="size-3.5 text-amber-400/70 shrink-0" />
          <span className="truncate">{node.name}</span>
        </div>
      ) : (
        <div
          className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer hover:bg-neutral-800/60 text-xs transition-colors ${
            selectedFileId === node.file?.id ? 'bg-rose-500/10 text-rose-300' : 'text-slate-300'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => node.file && handleFileClick(node.file)}
        >
          <span className="w-3 shrink-0" />
          {node.file ? getFileIcon(node.file.language, node.file.name) : <File className="size-3.5 text-slate-400" />}
          <span className="truncate">{node.name}</span>
        </div>
      )}
      {node.isDirectory && expandedDirs.has(node.path) && (
        <div>
          {node.children.map(child => renderTreeNode(child, depth + 1))}
        </div>
      )}
    </div>
  )

  const currentFile = viewingFile ? files.find(f => f.id === viewingFile.id) : null

  return (
    <Card className="bg-[#0d1117] border-neutral-800 py-0">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm text-white flex items-center gap-2"><FileCode className="size-4 text-rose-400" /> Code Browser</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onDownloadZip} disabled={downloadLoading} className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 h-8 gap-1 text-xs">
              {downloadLoading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}Download ZIP
            </Button>
            <Button variant="outline" size="sm" onClick={onPushGithub} disabled={!githubConnected || githubPushing} className={`h-8 gap-1 text-xs ${githubConnected ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-neutral-800 text-neutral-600 cursor-not-allowed'}`}>
              {githubPushing ? <Loader2 className="size-3 animate-spin" /> : <Github className="size-3" />}Push to GitHub
            </Button>
            <Button variant="outline" size="sm" onClick={onUpload} disabled={uploadingFiles} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-8 gap-1 text-xs">
              {uploadingFiles ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}Upload
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh} className="border-neutral-700 text-slate-300 h-8 gap-1 text-xs">
              <RefreshCw className="size-3" />Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {filesLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (<div key={i} className="h-12 bg-neutral-800/50 rounded-lg animate-pulse" />))}
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-slate-500">
            <Folder className="size-8 mb-2 opacity-50" />
            <p className="text-sm">No files yet</p>
            <p className="text-xs text-slate-600 mt-1">Start the orchestrator to let agents generate code, or upload files manually</p>
            <div className="flex items-center gap-2 mt-3">
              {currentOrchestratorStatus === 'idle' && (
                <Button variant="outline" size="sm" onClick={onStartOrchestrator} disabled={orchestratorLoading} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-8 gap-1 text-xs">
                  <Play className="size-3" />Start Orchestrator
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onUpload} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-8 gap-1 text-xs">
                <Upload className="size-3" />Upload Files
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-0 border border-neutral-800 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
            {/* File Tree - Left Pane */}
            <div className="w-56 shrink-0 border-r border-neutral-800 bg-neutral-900/50 overflow-y-auto max-h-[500px] custom-scrollbar">
              <div className="py-1">
                {fileTree.map(node => renderTreeNode(node))}
              </div>
            </div>
            {/* Code Viewer - Right Pane */}
            <div className="flex-1 min-w-0 bg-[#0d1117] overflow-hidden flex flex-col">
              {viewingFile ? (
                <>
                  {/* File header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/30 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {currentFile ? getFileIcon(currentFile.language, currentFile.name) : <File className="size-4 text-slate-400" />}
                      <span className="text-xs text-white truncate font-medium">{viewingFile.name}</span>
                      <span className="text-[10px] text-slate-600 truncate">{viewingFile.path}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {currentFile && (
                        <>
                          <span className="text-[10px] text-slate-500">{formatBytes(currentFile.size)}</span>
                          {currentFile.language && <Badge variant="outline" className="text-[8px] h-4 px-1 text-slate-400 bg-neutral-800 border-neutral-700">{currentFile.language}</Badge>}
                          <span className="text-[10px] text-slate-600 hidden sm:inline">{formatRelativeTime(currentFile.updatedAt)}</span>
                          {currentFile.source === 'generated' && (
                            <Badge variant="outline" className="text-[8px] h-4 px-1 text-cyan-400 bg-cyan-500/10 border-cyan-500/20">AI Generated</Badge>
                          )}
                          {currentFile.source === 'upload' && (
                            <Badge variant="outline" className="text-[8px] h-4 px-1 text-emerald-400 bg-emerald-500/10 border-emerald-500/20">Uploaded</Badge>
                          )}
                          {currentFile.source === 'github' && (
                            <Badge variant="outline" className="text-[8px] h-4 px-1 text-slate-400 bg-slate-500/10 border-slate-600">GitHub</Badge>
                          )}
                        </>
                      )}
                      {currentFile && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => onDeleteFile(currentFile.id)} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 h-6 w-6 p-0">
                            <Trash2 className="size-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setViewingFile(null)} className="text-slate-400 hover:text-white hover:bg-neutral-800 h-6 w-6 p-0">
                            <X className="size-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Code content */}
                  <ScrollArea className="flex-1 max-h-[460px]">
                    <pre className="text-xs font-mono p-3 table w-full">
                      {highlightSyntax(viewingFile.content, currentFile?.language)}
                    </pre>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <FileCode className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Select a file from the tree to view its content</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiTasksGenerated, setAiTasksGenerated] = useState(0)
  const [aiError, setAiError] = useState<string | null>(null)

  // Enhanced feature states
  const [orchestratorLoading, setOrchestratorLoading] = useState(false)
  const [orchestratorResult, setOrchestratorResult] = useState<string | null>(null)
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([])
  const [agentMessagesLoading, setAgentMessagesLoading] = useState(false)
  const [newAgentMessage, setNewAgentMessage] = useState('')
  const [projectFiles, setProjectFiles] = useState<ProjectFileData[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [viewingFile, setViewingFile] = useState<{ id: string; name: string; content: string; path: string } | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [githubRepoInfo, setGithubRepoInfo] = useState<GitHubRepoInfo | null>(null)
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubRepoUrl, setGithubRepoUrl] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [githubCloning, setGithubCloning] = useState(false)
  const [githubPushing, setGithubPushing] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ─── Auto-refresh for orchestrator activity + agent execution ──────────
  useEffect(() => {
    if (!selectedProject) return
    const status = selectedProject.orchestratorStatus
    if (status !== 'analyzing' && status !== 'running' && status !== 'assigning') return

    const interval = setInterval(async () => {
      // Refresh orchestrator status
      await fetchOrchestratorStatus(selectedProject.id)
      // Refresh agent messages
      await fetchAgentMessages(selectedProject.id)
      // Refresh project files (agents may have generated code)
      await fetchProjectFiles(selectedProject.id)

      // Trigger next agent task execution step
      if (status === 'running') {
        try {
          await fetch(`/api/projects/${selectedProject.id}/execute`, { method: 'POST' })
          // Refresh project detail after execution
          const detailRes = await fetch(`/api/projects/${selectedProject.id}`)
          if (detailRes.ok) {
            const detail = await detailRes.json()
            setSelectedProject(detail)
            setProjects((prev) => prev.map((p) => (p.id === detail.id ? detail : p)))
          }
        } catch {
          // Execution may fail if AI is not available, that's fine
        }
      }
    }, 6000) // Every 6 seconds - process one task step at a time

    return () => clearInterval(interval)
  }, [selectedProject?.id, selectedProject?.orchestratorStatus])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentMessages])

  // ─── Fetchers ──────────────────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setProjects(data)
      }
    } catch { /* */ } finally { setLoading(false) }
  }, [])

  const fetchInstalledSkills = useCallback(async () => {
    try {
      const res = await fetch('/api/skills')
      if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setInstalledSkills(data) }
    } catch { /* */ }
  }, [])

  const fetchInstalledMcp = useCallback(async () => {
    try {
      const res = await fetch('/api/mcp')
      if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setInstalledMcpServers(data) }
    } catch { /* */ }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])
  useEffect(() => { fetchInstalledSkills(); fetchInstalledMcp() }, [fetchInstalledSkills, fetchInstalledMcp])

  const handleSelectProject = async (project: ProjectData) => {
    setSelectedProject(project)
    setView('detail')
    setOrchestratorResult(null)
    try {
      const res = await fetch(`/api/projects/${project.id}`)
      if (res.ok) { const detail = await res.json(); setSelectedProject(detail) }
    } catch { /* */ }
    fetchAgentMessages(project.id)
    fetchProjectFiles(project.id)
    fetchGithubInfo(project.id)
  }

  const fetchAgentMessages = async (projectId: string) => {
    setAgentMessagesLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/agents/messages?limit=100`)
      if (res.ok) { const data = await res.json(); setAgentMessages(data.messages || []) }
    } catch { /* */ } finally { setAgentMessagesLoading(false) }
  }

  const fetchProjectFiles = async (projectId: string) => {
    setFilesLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/files`)
      if (res.ok) {
        const data = await res.json()
        // API returns { files: [...] } but also handle bare array for robustness
        const files = Array.isArray(data) ? data : (data.files || [])
        setProjectFiles(files)
      }
    } catch { /* */ } finally { setFilesLoading(false) }
  }

  const fetchGithubInfo = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/github`)
      if (res.ok) { const data = await res.json(); setGithubConnected(data.connected || false); setGithubRepoInfo(data.repo || null) }
    } catch { /* */ }
  }

  const fetchOrchestratorStatus = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/orchestrate/status`)
      if (res.ok) {
        const data = await res.json()
        setSelectedProject(prev => prev ? { ...prev, orchestratorStatus: data.orchestratorStatus, orchestratorLog: data.orchestratorLog } : prev)
      }
    } catch { /* */ }
  }

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleStartOrchestrator = async () => {
    if (!selectedProject) return
    setOrchestratorLoading(true); setOrchestratorResult(null)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/orchestrate`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setOrchestratorResult(`Orchestrator started! ${data.tasksCreated} tasks created, ${data.messagesCreated} agent messages sent.`)
        const detailRes = await fetch(`/api/projects/${selectedProject.id}`)
        if (detailRes.ok) { const detail = await detailRes.json(); setSelectedProject(detail); setProjects((prev) => prev.map((p) => (p.id === detail.id ? detail : p))) }
        fetchAgentMessages(selectedProject.id)
      } else { setOrchestratorResult(`Error: ${data.error || 'Orchestration failed'}`) }
    } catch { setOrchestratorResult('Error: Failed to connect to orchestrator service') }
    finally { setOrchestratorLoading(false) }
  }

  const handleSendAgentMessage = async () => {
    if (!selectedProject || !newAgentMessage.trim()) return
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/agents/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromRole: 'user', toRole: 'all', type: 'instruction', content: newAgentMessage.trim() }),
      })
      if (res.ok) { setNewAgentMessage(''); fetchAgentMessages(selectedProject.id) }
    } catch { /* */ }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!selectedProject || !files || files.length === 0) return
    setUploadingFiles(true)
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) formData.append('files', files[i])
      const res = await fetch(`/api/projects/${selectedProject.id}/files`, { method: 'POST', body: formData })
      if (res.ok) fetchProjectFiles(selectedProject.id)
    } catch { /* */ } finally { setUploadingFiles(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!selectedProject) return
    try { await fetch(`/api/projects/${selectedProject.id}/files/${fileId}`, { method: 'DELETE' }); setProjectFiles(prev => prev.filter(f => f.id !== fileId)) } catch { /* */ }
  }

  const handleViewFile = async (fileId: string, fileName: string, filePath: string) => {
    if (!selectedProject) return
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/files/${fileId}`)
      if (res.ok) { const data = await res.json(); setViewingFile({ id: fileId, name: fileName, content: data.content || '', path: filePath }) }
    } catch { /* */ }
  }

  const handleGithubConnect = async () => {
    if (!selectedProject || !githubRepoUrl.trim()) return
    setGithubLoading(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/github`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: githubRepoUrl.trim(), githubToken: githubToken.trim() || undefined }),
      })
      const data = await res.json()
      if (data.connected) {
        setGithubConnected(true); setGithubRepoInfo(data.repo)
        const detailRes = await fetch(`/api/projects/${selectedProject.id}`)
        if (detailRes.ok) { const detail = await detailRes.json(); setSelectedProject(detail) }
      }
    } catch { /* */ } finally { setGithubLoading(false) }
  }

  const handleGithubClone = async () => {
    if (!selectedProject) return
    setGithubCloning(true)
    try { const res = await fetch(`/api/projects/${selectedProject.id}/github/clone`, { method: 'POST' }); const data = await res.json(); if (data.success) fetchProjectFiles(selectedProject.id) } catch { /* */ } finally { setGithubCloning(false) }
  }

  const handleGithubPush = async () => {
    if (!selectedProject) return
    setGithubPushing(true)
    try { await fetch(`/api/projects/${selectedProject.id}/github/push`, { method: 'POST' }) } catch { /* */ } finally { setGithubPushing(false) }
  }

  const handleDownloadZip = async () => {
    if (!selectedProject) return
    setDownloadLoading(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/download`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `${selectedProject.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.zip`
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
      }
    } catch { /* */ } finally { setDownloadLoading(false) }
  }

  const handleGenerateDocs = async () => {
    if (!selectedProject) return
    setDocsLoading(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/document`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const detailRes = await fetch(`/api/projects/${selectedProject.id}`)
        if (detailRes.ok) { const detail = await detailRes.json(); setSelectedProject(detail) }
      }
    } catch { /* */ } finally { setDocsLoading(false) }
  }

  const handleProjectCreated = (project: ProjectData) => {
    setProjects((prev) => [project, ...prev]); handleSelectProject(project)
  }

  const handleDeleteProject = async (projectId: string) => {
    try { await fetch(`/api/projects/${projectId}`, { method: 'DELETE' }) } catch { /* */ }
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    if (selectedProject?.id === projectId) { setSelectedProject(null); setView('list') }
  }

  const handleStatusChangeRequest = (newStatus: ProjectStatus) => {
    if (newStatus === 'in_progress' || newStatus === 'completed') { setPendingStatus(newStatus); setStatusChangeDialogOpen(true) }
    else applyStatusChange(newStatus)
  }

  const applyStatusChange = async (newStatus: ProjectStatus) => {
    if (!selectedProject) return
    const updated = { ...selectedProject, status: newStatus }
    setSelectedProject(updated); setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    try { await fetch(`/api/projects/${selectedProject.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) }) } catch { /* */ }
  }

  const handleAddTask = async () => {
    if (!selectedProject || !newTaskTitle.trim()) return
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle.trim(), description: newTaskDesc.trim() || undefined }),
      })
      if (res.ok) {
        const newTask = await res.json()
        const updated = { ...selectedProject, tasks: [...(selectedProject.tasks || []), newTask], _count: { ...selectedProject._count!, tasks: (selectedProject._count?.tasks ?? 0) + 1 } }
        setSelectedProject(updated); setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      }
    } catch { /* */ }
    setNewTaskTitle(''); setNewTaskDesc('')
  }

  const handleToggleTask = async (taskId: string) => {
    if (!selectedProject) return
    const task = (selectedProject.tasks || []).find(t => t.id === taskId)
    if (!task) return
    const newStatus: 'todo' | 'in_progress' | 'done' = task.status === 'done' ? 'todo' : 'done'
    const tasks = (selectedProject.tasks || []).map((t) => t.id === taskId ? { ...t, status: newStatus as 'todo' | 'in_progress' | 'done' } : t)
    const updated = { ...selectedProject, tasks }
    setSelectedProject(updated); setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    try { await fetch(`/api/projects/${selectedProject.id}/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) }) } catch { /* */ }
  }

  const handleAiAnalyze = async () => {
    if (!selectedProject) return
    setAiAnalyzing(true); setAiError(null)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/analyze`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setAiTasksGenerated(data.tasksCreated)
        const detailRes = await fetch(`/api/projects/${selectedProject.id}`)
        if (detailRes.ok) { const detail = await detailRes.json(); setSelectedProject(detail); setProjects((prev) => prev.map((p) => (p.id === detail.id ? detail : p))) }
      } else { setAiError(data.error || 'AI analysis failed') }
    } catch { setAiError('Failed to connect to AI service') } finally { setTimeout(() => setAiAnalyzing(false), 1500) }
  }

  const handleAddSkill = async () => {
    if (!selectedProject || !selectedSkillId) return
    const skill = installedSkills.find((s) => s.id === selectedSkillId)
    const newSkill: SkillAssignment = { id: `ps-${Date.now()}`, skillId: selectedSkillId, role: newSkillRole.trim() || undefined, skill: skill ? { id: skill.id, name: skill.name, description: skill.description } : undefined }
    const updated = { ...selectedProject, skills: [...(selectedProject.skills || []), newSkill], _count: { ...selectedProject._count!, projectSkills: (selectedProject._count?.projectSkills ?? 0) + 1 } }
    setSelectedProject(updated); setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedSkillId(''); setNewSkillRole(''); setAddSkillDialogOpen(false)
    try { await fetch(`/api/projects/${selectedProject.id}/skills`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skillId: selectedSkillId, role: newSkillRole.trim() || undefined }) }) } catch { /* */ }
  }

  const handleRemoveSkill = async (skillId: string) => {
    if (!selectedProject) return
    const skills = (selectedProject.skills || []).filter((s) => s.skillId !== skillId)
    const updated = { ...selectedProject, skills, _count: { ...selectedProject._count!, projectSkills: Math.max(0, (selectedProject._count?.projectSkills ?? 1) - 1) } }
    setSelectedProject(updated); setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    try { await fetch(`/api/projects/${selectedProject.id}/skills`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skillId }) }) } catch { /* */ }
  }

  const handleAddMcp = async () => {
    if (!selectedProject || !selectedMcpId) return
    const mcp = installedMcpServers.find((m) => m.id === selectedMcpId)
    const newMcp: McpAssignment = { id: `pm-${Date.now()}`, mcpServerId: selectedMcpId, role: newMcpRole.trim() || undefined, mcpServer: mcp ? { id: mcp.id, name: mcp.name, description: mcp.description, url: mcp.url } : undefined }
    const updated = { ...selectedProject, mcpServers: [...(selectedProject.mcpServers || []), newMcp], _count: { ...selectedProject._count!, projectMCPServers: (selectedProject._count?.projectMCPServers ?? 0) + 1 } }
    setSelectedProject(updated); setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedMcpId(''); setNewMcpRole(''); setAddMcpDialogOpen(false)
    try { await fetch(`/api/projects/${selectedProject.id}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mcpServerId: selectedMcpId, role: newMcpRole.trim() || undefined }) }) } catch { /* */ }
  }

  const handleRemoveMcp = async (mcpServerId: string) => {
    if (!selectedProject) return
    const mcpServers = (selectedProject.mcpServers || []).filter((m) => m.mcpServerId !== mcpServerId)
    const updated = { ...selectedProject, mcpServers, _count: { ...selectedProject._count!, projectMCPServers: Math.max(0, (selectedProject._count?.projectMCPServers ?? 1) - 1) } }
    setSelectedProject(updated); setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    try { await fetch(`/api/projects/${selectedProject.id}/mcp`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mcpServerId }) }) } catch { /* */ }
  }

  // ─── Derived Data ──────────────────────────────────────────────────────

  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === 'in_progress').length
  const completedProjects = projects.filter((p) => p.status === 'completed').length
  const planningProjects = projects.filter((p) => p.status === 'planning').length

  const orchestratorLogEntries: OrchestratorLogEntry[] = (() => {
    try { const raw = selectedProject?.orchestratorLog; if (!raw) return []; const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
  })()

  const currentOrchestratorStatus = selectedProject?.orchestratorStatus || 'idle'
  const orchestratorStatusConf = ORCHESTRATOR_STATUS_CONFIG[currentOrchestratorStatus] || ORCHESTRATOR_STATUS_CONFIG.idle

  // Build timeline events from project data
  const timelineEvents: { id: string; timestamp: string; title: string; description: string; icon: React.ReactNode; color: string }[] = (() => {
    if (!selectedProject) return []
    const events: { id: string; timestamp: string; title: string; description: string; icon: React.ReactNode; color: string }[] = []
    events.push({ id: 'created', timestamp: selectedProject.createdAt, title: 'Project Created', description: `"${selectedProject.name}" was created`, icon: <FolderKanban className="size-4" />, color: 'text-rose-400' })
    if (selectedProject.orchestratorStatus && selectedProject.orchestratorStatus !== 'idle') {
      events.push({ id: 'orchestrator', timestamp: selectedProject.updatedAt, title: 'Orchestrator Started', description: `Status: ${ORCHESTRATOR_STATUS_CONFIG[selectedProject.orchestratorStatus]?.label || selectedProject.orchestratorStatus}`, icon: <Activity className="size-4" />, color: 'text-amber-400' })
    }
    if (selectedProject.tasks && selectedProject.tasks.length > 0) {
      events.push({ id: 'tasks-created', timestamp: selectedProject.tasks[0].createdAt, title: 'Tasks Created', description: `${selectedProject.tasks.length} tasks defined`, icon: <ListChecks className="size-4" />, color: 'text-cyan-400' })
      const doneTasks = selectedProject.tasks.filter(t => t.status === 'done')
      if (doneTasks.length > 0) {
        events.push({ id: 'tasks-completed', timestamp: doneTasks[doneTasks.length - 1].createdAt, title: 'Tasks Completed', description: `${doneTasks.length}/${selectedProject.tasks.length} tasks done`, icon: <CheckCircle2 className="size-4" />, color: 'text-emerald-400' })
      }
    }
    if (selectedProject.documentation) {
      events.push({ id: 'docs-generated', timestamp: selectedProject.updatedAt, title: 'Documentation Generated', description: 'AI-generated README and architecture docs', icon: <BookOpen className="size-4" />, color: 'text-violet-400' })
    }
    if (githubConnected) {
      events.push({ id: 'github-connected', timestamp: selectedProject.updatedAt, title: 'GitHub Connected', description: `Repo: ${githubRepoInfo?.fullName || selectedProject.repoUrl}`, icon: <Github className="size-4" />, color: 'text-slate-300' })
    }
    if (projectFiles.length > 0) {
      events.push({ id: 'files-uploaded', timestamp: projectFiles[0].createdAt, title: 'Files Added', description: `${projectFiles.length} file${projectFiles.length !== 1 ? 's' : ''} in project`, icon: <FileText className="size-4" />, color: 'text-orange-400' })
    }
    // Add orchestrator log entries
    orchestratorLogEntries.forEach((entry, idx) => {
      events.push({ id: `log-${idx}`, timestamp: entry.timestamp, title: entry.event, description: typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details || ''), icon: <Zap className="size-4" />, color: 'text-amber-400' })
    })
    // Sort by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return events
  })()

  // ─── Render ────────────────────────────────────────────────────────────

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
              <p className="text-sm text-slate-400 mt-1">Manage projects, assign skills and MCP servers, track progress</p>
            </div>
            {view === 'detail' ? (
              <Button variant="outline" onClick={() => { setView('list'); setSelectedProject(null) }} className="border-neutral-700 text-slate-300 gap-2">
                <ChevronLeft className="size-4" /> Back to Projects
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button className="bg-rose-600 hover:bg-rose-700 text-white gap-2" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="size-4" /> New Project
                </Button>
                <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onCreated={handleProjectCreated} />
              </div>
            )}
          </div>

          {/* ─── List View ────────────────────────────────────────────────── */}
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
                      <CardHeader className="pb-2"><div className="h-5 bg-neutral-800 rounded w-3/4" /><div className="h-3 bg-neutral-800/50 rounded w-1/2" /></CardHeader>
                      <CardContent><div className="h-3 bg-neutral-800/30 rounded w-full mb-2" /><div className="h-3 bg-neutral-800/30 rounded w-2/3" /></CardContent>
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
                      <Plus className="size-4" /> New Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project) => (<ProjectCard key={project.id} project={project} onClick={() => handleSelectProject(project)} />))}
                </div>
              )}
            </>
          )}

          {/* ─── Detail View ──────────────────────────────────────────────── */}
          {view === 'detail' && selectedProject && (
            <div className="space-y-4">
              {/* Project Header Bar */}
              <Card className="bg-[#0d1117] border-neutral-800 py-0">
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{selectedProject.icon || '📁'}</span>
                      <div>
                        <CardTitle className="text-lg text-white flex items-center gap-2 flex-wrap">
                          {selectedProject.name}
                          <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${STATUS_CONFIG[selectedProject.status].color} ${STATUS_CONFIG[selectedProject.status].bgColor} ${STATUS_CONFIG[selectedProject.status].borderColor}`}>
                            {STATUS_CONFIG[selectedProject.status].icon} {STATUS_CONFIG[selectedProject.status].label}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] h-5 ${PRIORITY_CONFIG[selectedProject.priority].color} ${PRIORITY_CONFIG[selectedProject.priority].bgColor} border-neutral-700`}>
                            {PRIORITY_CONFIG[selectedProject.priority].label}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-sm text-slate-400 mt-1">{selectedProject.description || 'No description'}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Select value={selectedProject.status} onValueChange={(v) => handleStatusChangeRequest(v as ProjectStatus)}>
                        <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-700">
                          {STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s} className="text-white focus:bg-neutral-800 focus:text-white text-xs">{STATUS_CONFIG[s].label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(true)} className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1 h-8">
                            <Trash2 className="size-3" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Delete Project</TooltipContent></Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Delete Confirmation */}
              <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="bg-[#0d1117] border-neutral-800 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-400">Delete Project?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      This will permanently delete &quot;{selectedProject.name}&quot; and all its data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-neutral-700 text-slate-300 bg-transparent hover:bg-neutral-800">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { handleDeleteProject(selectedProject.id); setDeleteConfirmOpen(false) }} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* File Viewer Dialog */}
              <Dialog open={!!viewingFile} onOpenChange={(open) => { if (!open) setViewingFile(null) }}>
                <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-3xl max-h-[85vh]">
                  <DialogHeader>
                    <DialogTitle className="text-rose-400 flex items-center gap-2"><FileText className="size-5" />{viewingFile?.name}</DialogTitle>
                    <DialogDescription className="text-slate-400">{viewingFile?.path}</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh]">
                    <pre className="text-xs text-slate-300 bg-neutral-900 p-4 rounded-md border border-neutral-800 whitespace-pre-wrap font-mono">{viewingFile?.content || '(empty file)'}</pre>
                  </ScrollArea>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setViewingFile(null)} className="border-neutral-700 text-slate-300">Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Status Change Confirmation */}
              <StatusChangeDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen} newStatus={pendingStatus}
                onConfirm={() => { if (pendingStatus) applyStatusChange(pendingStatus); setPendingStatus(null) }} />

              {/* Add Skill Dialog */}
              <Dialog open={addSkillDialogOpen} onOpenChange={setAddSkillDialogOpen}>
                <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-sm">
                  <DialogHeader><DialogTitle className="text-rose-400">Add Skill</DialogTitle><DialogDescription className="text-slate-400">Assign a skill to this project</DialogDescription></DialogHeader>
                  <div className="space-y-3 py-2">
                    <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                      <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white"><SelectValue placeholder="Select skill..." /></SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        {installedSkills.filter(s => !(selectedProject.skills || []).some(ps => ps.skillId === s.id)).map((s) => (<SelectItem key={s.id} value={s.id} className="text-white focus:bg-neutral-800 focus:text-white">{s.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Role (optional)..." value={newSkillRole} onChange={(e) => setNewSkillRole(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddSkillDialogOpen(false)} className="border-neutral-700 text-slate-300">Cancel</Button>
                    <Button onClick={handleAddSkill} disabled={!selectedSkillId} className="bg-rose-600 hover:bg-rose-700 text-white">Add</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Add MCP Dialog */}
              <Dialog open={addMcpDialogOpen} onOpenChange={setAddMcpDialogOpen}>
                <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-sm">
                  <DialogHeader><DialogTitle className="text-rose-400">Add MCP Server</DialogTitle><DialogDescription className="text-slate-400">Assign an MCP server to this project</DialogDescription></DialogHeader>
                  <div className="space-y-3 py-2">
                    <Select value={selectedMcpId} onValueChange={setSelectedMcpId}>
                      <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white"><SelectValue placeholder="Select MCP server..." /></SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        {installedMcpServers.filter(m => !(selectedProject.mcpServers || []).some(pm => pm.mcpServerId === m.id)).map((m) => (<SelectItem key={m.id} value={m.id} className="text-white focus:bg-neutral-800 focus:text-white">{m.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Role (optional)..." value={newMcpRole} onChange={(e) => setNewMcpRole(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddMcpDialogOpen(false)} className="border-neutral-700 text-slate-300">Cancel</Button>
                    <Button onClick={handleAddMcp} disabled={!selectedMcpId} className="bg-rose-600 hover:bg-rose-700 text-white">Add</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* ═══ TABS ════════════════════════════════════════════════════ */}
              {/* Action Bar - visible regardless of active tab */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleDownloadZip} disabled={downloadLoading} className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 h-8 gap-1.5 text-xs">
                  {downloadLoading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3.5" />}Download ZIP
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleGithubPush} disabled={!githubConnected || githubPushing} className={`h-8 gap-1.5 text-xs ${githubConnected ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-neutral-800 text-neutral-600 cursor-not-allowed'}`}>
                        {githubPushing ? <Loader2 className="size-3 animate-spin" /> : <Github className="size-3.5" />}Push to GitHub
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{githubConnected ? 'Push generated code to the connected GitHub repo' : 'Connect a GitHub repo in Settings to enable'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button variant="outline" size="sm" onClick={handleGenerateDocs} disabled={docsLoading} className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 h-8 gap-1.5 text-xs">
                  {docsLoading ? <Loader2 className="size-3 animate-spin" /> : <BookOpen className="size-3.5" />}Generate Docs
                </Button>
              </div>

              <Tabs defaultValue="overview" className="space-y-4">
                <ScrollArea className="w-full">
                  <TabsList className="bg-neutral-900 border border-neutral-800 flex-wrap h-auto gap-1 p-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400 gap-1.5 text-xs px-3">
                      <LayoutGrid className="size-3.5" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="agents" className="data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400 gap-1.5 text-xs px-3">
                      <Users className="size-3.5" /> Agents & Activity
                    </TabsTrigger>
                    <TabsTrigger value="files" className="data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400 gap-1.5 text-xs px-3">
                      <FileCode className="size-3.5" /> Code
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400 gap-1.5 text-xs px-3">
                      <Timer className="size-3.5" /> Timeline
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-400 gap-1.5 text-xs px-3">
                      <Settings className="size-3.5" /> Settings
                    </TabsTrigger>
                  </TabsList>
                </ScrollArea>

                {/* ════════════════════════════════════════════════════════════
                    1. OVERVIEW TAB
                    ════════════════════════════════════════════════════════════ */}
                <TabsContent value="overview" className="space-y-4">
                  {/* Orchestrator Status Card */}
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`size-10 rounded-lg flex items-center justify-center ${orchestratorStatusConf.bgColor} border ${orchestratorStatusConf.borderColor}`}>
                            {orchestratorStatusConf.pulse ? (
                              <div className="relative">
                                <Activity className={`size-5 ${orchestratorStatusConf.color}`} />
                                <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 animate-ping" />
                              </div>
                            ) : (
                              <Activity className={`size-5 ${orchestratorStatusConf.color}`} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">Orchestrator</span>
                              <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${orchestratorStatusConf.color} ${orchestratorStatusConf.bgColor} ${orchestratorStatusConf.borderColor}`}>
                                {orchestratorStatusConf.pulse && <span className="size-1.5 rounded-full bg-current animate-pulse" />}
                                {orchestratorStatusConf.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {currentOrchestratorStatus === 'running' ? 'Agents are actively working on tasks — watch progress below...' :
                               currentOrchestratorStatus === 'analyzing' ? 'Analyzing project requirements with AI...' :
                               currentOrchestratorStatus === 'assigning' ? 'Assigning tasks to specialized agents...' :
                               currentOrchestratorStatus === 'completed' ? 'All tasks completed successfully!' :
                               currentOrchestratorStatus === 'failed' ? 'Orchestration encountered an error' :
                               'Click Start Orchestrator to begin'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {currentOrchestratorStatus === 'idle' && (
                            <Button size="sm" onClick={handleStartOrchestrator} disabled={orchestratorLoading} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 h-8 text-xs">
                              {orchestratorLoading ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                              Start Orchestrator
                            </Button>
                          )}
                          {currentOrchestratorStatus === 'running' && (
                            <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 gap-1.5 h-8 px-3 text-xs">
                              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                              Auto-running
                            </Badge>
                          )}
                        </div>
                      </div>
                      {orchestratorResult && (
                        <div className={`mt-3 text-xs p-2.5 rounded-lg border ${orchestratorResult.startsWith('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                          {orchestratorResult}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Progress + Live Agent Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Progress Card */}
                    <Card className="bg-[#0d1117] border-neutral-800 py-0 lg:col-span-2">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm text-white flex items-center gap-2"><ListChecks className="size-4 text-rose-400" /> Task Progress</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">
                            {selectedProject.tasks ? `${selectedProject.tasks.filter(t => t.status === 'done').length} / ${selectedProject.tasks.length} tasks complete` : 'No tasks yet'}
                          </span>
                          <span className="text-rose-400 font-bold text-lg">{calculateProgress(selectedProject.tasks)}%</span>
                        </div>
                        <Progress value={calculateProgress(selectedProject.tasks)} className="h-3 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-pink-500" />

                        {/* Task breakdown bar */}
                        {selectedProject.tasks && selectedProject.tasks.length > 0 && (
                          <div className="flex gap-0.5 h-3 rounded overflow-hidden">
                            {selectedProject.tasks.map((task) => (
                              <div
                                key={task.id}
                                className={`flex-1 transition-colors duration-500 ${
                                  task.status === 'done' ? 'bg-emerald-500' :
                                  task.status === 'in_progress' ? 'bg-amber-500 animate-pulse' :
                                  'bg-neutral-700'
                                }`}
                                title={`${task.title}: ${task.status === 'done' ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'Pending'}`}
                              />
                            ))}
                          </div>
                        )}

                        {currentOrchestratorStatus === 'running' && (
                          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 rounded-lg p-2.5 border border-amber-500/20">
                            <Loader2 className="size-4 animate-spin" />
                            <span>Agents are working on tasks — check the <strong>Agents & Activity</strong> tab for live updates</span>
                          </div>
                        )}
                        {aiAnalyzing && (
                          <div className="flex items-center gap-2 text-xs text-violet-400 animate-pulse bg-violet-500/5 rounded-lg p-2.5 border border-violet-500/20">
                            <Loader2 className="size-4 animate-spin" /><span>AI is analyzing your project and generating tasks...</span>
                          </div>
                        )}
                        {aiTasksGenerated > 0 && !aiAnalyzing && (
                          <span className="text-xs text-emerald-400">&#10024; {aiTasksGenerated} tasks generated by AI</span>
                        )}
                        {aiError && <span className="text-xs text-red-400">{aiError}</span>}
                      </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card className="bg-[#0d1117] border-neutral-800 py-0">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm text-white flex items-center gap-2"><Hash className="size-4 text-rose-400" /> Quick Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5"><ListChecks className="size-3 text-amber-400" />Tasks</span>
                          <span className="text-white font-medium">{selectedProject.tasks?.length ?? selectedProject._count?.tasks ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5"><Users className="size-3 text-emerald-400" />Agents Active</span>
                          <span className="text-white font-medium">{selectedProject.tasks?.filter(t => t.status === 'in_progress').length ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5"><HardDrive className="size-3 text-cyan-400" />Files Generated</span>
                          <span className="text-white font-medium">{projectFiles.filter(f => f.source === 'generated').length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5"><MessageSquare className="size-3 text-violet-400" />Agent Messages</span>
                          <span className="text-white font-medium">{agentMessages.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5"><Sparkles className="size-3 text-rose-400" />Skills</span>
                          <span className="text-white font-medium">{selectedProject.skills?.length ?? selectedProject._count?.projectSkills ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5"><Server className="size-3 text-blue-400" />MCP Servers</span>
                          <span className="text-white font-medium">{selectedProject.mcpServers?.length ?? selectedProject._count?.projectMCPServers ?? 0}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Live Agent Activity Feed (mini version on overview) */}
                  {agentMessages.length > 0 && (
                    <Card className="bg-[#0d1117] border-neutral-800 py-0">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white flex items-center gap-2">
                            <Activity className="size-4 text-rose-400" /> Live Activity
                            {currentOrchestratorStatus === 'running' && (
                              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                          </CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => {
                            const agentsTab = document.querySelector('[data-value="agents"]') as HTMLButtonElement
                            agentsTab?.click()
                          }} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 text-xs gap-1">
                            View All <ExternalLink className="size-3" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ScrollArea className="max-h-48">
                          <div className="space-y-2">
                            {agentMessages.slice(0, 5).map((msg) => {
                              const roleConf = ROLE_COLOR[msg.fromRole] || ROLE_COLOR.system
                              const typeConf = MESSAGE_TYPE_CONFIG[msg.type] || MESSAGE_TYPE_CONFIG.status
                              return (
                                <div key={msg.id} className={`rounded-lg border p-2.5 ${roleConf.bg} ${roleConf.border}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-medium ${roleConf.text}`}>
                                      {msg.fromAgent?.name || msg.fromRole.charAt(0).toUpperCase() + msg.fromRole.slice(1)}
                                    </span>
                                    <Badge variant="outline" className={`text-[9px] h-4 px-1.5 gap-0.5 ${typeConf.color} ${typeConf.bgColor} border-current/20`}>
                                      {typeConf.icon} {typeConf.label}
                                    </Badge>
                                    <span className="text-[10px] text-slate-500 ml-auto shrink-0">{formatRelativeTime(msg.createdAt)}</span>
                                  </div>
                                  <p className="text-xs text-slate-300 line-clamp-2">{msg.content}</p>
                                </div>
                              )
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tasks Section */}
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-white flex items-center gap-2"><ListChecks className="size-4 text-rose-400" /> Tasks</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      {currentOrchestratorStatus !== 'running' && (
                        <div className="flex gap-2">
                          <Input placeholder="New task title..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white flex-1 h-9 text-sm" onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask() }} />
                          <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white gap-1 h-9"><Plus className="size-3" />Add</Button>
                        </div>
                      )}
                      {newTaskTitle.trim() && currentOrchestratorStatus !== 'running' && (
                        <Input placeholder="Description (optional)..." value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm" />
                      )}
                      <Separator className="bg-neutral-800" />
                      {(!selectedProject.tasks || selectedProject.tasks.length === 0) ? (
                        <div className="flex flex-col items-center py-6 text-slate-500">
                          <ListChecks className="size-8 mb-2 opacity-50" />
                          <p className="text-sm">No tasks yet</p>
                          <p className="text-xs text-slate-600 mt-1">Start the orchestrator to generate tasks automatically</p>
                        </div>
                      ) : (
                        <ScrollArea className="max-h-64">
                          <div className="space-y-1.5">
                            {selectedProject.tasks.map((task) => (
                              <div key={task.id} className={`flex items-center gap-3 rounded-lg border p-2.5 transition-all ${
                                task.status === 'in_progress'
                                  ? 'border-amber-500/30 bg-amber-500/5'
                                  : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                              }`}>
                                <div className="shrink-0">
                                  {task.status === 'done' ? (
                                    <div className="size-5 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                      <CheckCircle2 className="size-3 text-emerald-400" />
                                    </div>
                                  ) : task.status === 'in_progress' ? (
                                    <div className="size-5 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                                      <Loader2 className="size-3 text-amber-400 animate-spin" />
                                    </div>
                                  ) : (
                                    <button className="size-5 rounded border border-neutral-600 hover:border-rose-500/40" onClick={() => handleToggleTask(task.id)} />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm ${task.status === 'done' ? 'text-slate-500 line-through' : task.status === 'in_progress' ? 'text-amber-300' : 'text-white'}`}>
                                    {task.title}
                                  </p>
                                  {task.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>}
                                </div>
                                <Badge variant="outline" className={`text-[9px] h-4 px-1.5 shrink-0 ${
                                  task.status === 'done' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                  task.status === 'in_progress' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse' :
                                  'text-slate-400 bg-slate-500/10 border-slate-500/20'
                                }`}>
                                  {task.status === 'done' ? 'Done' : task.status === 'in_progress' ? 'Working...' : 'Pending'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  {/* Generated Files Preview (on Overview) */}
                  {projectFiles.filter(f => f.source === 'generated').length > 0 && (
                    <Card className="bg-[#0d1117] border-neutral-800 py-0">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white flex items-center gap-2"><FileCode className="size-4 text-cyan-400" /> Generated Code</CardTitle>
                          <Badge variant="outline" className="text-[10px] text-cyan-400 bg-cyan-500/10 border-cyan-500/20">
                            {projectFiles.filter(f => f.source === 'generated').length} files
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ScrollArea className="max-h-48">
                          <div className="space-y-1.5">
                            {projectFiles.filter(f => f.source === 'generated').map((file) => (
                              <div key={file.id} className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-2.5 hover:border-cyan-500/30 cursor-pointer transition-all" onClick={() => handleViewFile(file.id, file.name, file.path)}>
                                <div className="shrink-0">{getFileIcon(file.language, file.name)}</div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-white truncate">{file.name}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{file.path}</p>
                                </div>
                                <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded shrink-0">generated</span>
                                <Eye className="size-3 text-slate-500" />
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-white flex items-center gap-2"><Zap className="size-4 text-rose-400" /> Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex flex-wrap gap-2">
                        {currentOrchestratorStatus === 'idle' && (
                          <Button variant="outline" size="sm" onClick={handleStartOrchestrator} disabled={orchestratorLoading} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-1.5 h-9 text-xs">
                            {orchestratorLoading ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}Start Orchestrator
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={handleGenerateDocs} disabled={docsLoading} className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 gap-1.5 h-9 text-xs">
                          {docsLoading ? <Loader2 className="size-3 animate-spin" /> : <BookOpen className="size-3" />}Generate Docs
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadZip} disabled={downloadLoading || projectFiles.length === 0} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5 h-9 text-xs">
                          {downloadLoading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}Download ZIP
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleGithubPush} disabled={githubPushing || !githubConnected} className="border-slate-500/30 text-slate-300 hover:bg-slate-500/10 gap-1.5 h-9 text-xs">
                          {githubPushing ? <Loader2 className="size-3 animate-spin" /> : <ArrowUpFromLine className="size-3" />}Push to GitHub
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Skills & MCP Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Skills */}
                    <Card className="bg-[#0d1117] border-neutral-800 py-0">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white flex items-center gap-2"><Sparkles className="size-4 text-violet-400" /> Skills</CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => setAddSkillDialogOpen(true)} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 text-xs gap-1"><Plus className="size-3" />Add</Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {(!selectedProject.skills || selectedProject.skills.length === 0) ? (
                          <p className="text-xs text-slate-500 italic py-4 text-center">No skills assigned</p>
                        ) : (
                          <div className="space-y-1.5">
                            {selectedProject.skills.map((s) => (
                              <div key={s.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 p-2.5">
                                <div className="min-w-0">
                                  <p className="text-xs text-white truncate">{s.skill?.name || 'Unknown Skill'}</p>
                                  {s.role && <p className="text-[10px] text-slate-500">Role: {s.role}</p>}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleRemoveSkill(s.skillId)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 w-6 p-0"><X className="size-3" /></Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* MCP Servers */}
                    <Card className="bg-[#0d1117] border-neutral-800 py-0">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white flex items-center gap-2"><Server className="size-4 text-cyan-400" /> MCP Servers</CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => setAddMcpDialogOpen(true)} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 text-xs gap-1"><Plus className="size-3" />Add</Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {(!selectedProject.mcpServers || selectedProject.mcpServers.length === 0) ? (
                          <p className="text-xs text-slate-500 italic py-4 text-center">No MCP servers assigned</p>
                        ) : (
                          <div className="space-y-1.5">
                            {selectedProject.mcpServers.map((m) => (
                              <div key={m.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 p-2.5">
                                <div className="min-w-0">
                                  <p className="text-xs text-white truncate">{m.mcpServer?.name || 'Unknown Server'}</p>
                                  {m.role && <p className="text-[10px] text-slate-500">Role: {m.role}</p>}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleRemoveMcp(m.mcpServerId)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 w-6 p-0"><X className="size-3" /></Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Automation Tools */}
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-white flex items-center gap-2"><Wrench className="size-4 text-rose-400" /> Automation Tools</CardTitle>
                      <CardDescription className="text-xs text-slate-400">Quick access to installed automation services</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {AUTOMATION_TOOLS.map((tool) => (
                          <div key={tool.name} className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 transition-all hover:border-rose-500/30 hover:bg-neutral-900/80 cursor-pointer group" onClick={() => window.open(tool.url, '_blank')}>
                            <span className="text-2xl">{tool.icon}</span>
                            <span className="text-xs font-medium text-slate-300 group-hover:text-rose-300 transition-colors">{tool.name}</span>
                            <span className="text-[10px] text-slate-500 text-center line-clamp-2">{tool.description}</span>
                            <ExternalLink className="size-3 text-slate-600 group-hover:text-rose-400 transition-colors" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ════════════════════════════════════════════════════════════
                    2. AGENTS & ACTIVITY TAB
                    ════════════════════════════════════════════════════════════ */}
                <TabsContent value="agents" className="space-y-4">
                  {/* Orchestrator Controls */}
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`size-9 rounded-lg flex items-center justify-center ${orchestratorStatusConf.bgColor} border ${orchestratorStatusConf.borderColor}`}>
                            {orchestratorStatusConf.pulse ? (
                              <div className="relative"><Activity className={`size-4 ${orchestratorStatusConf.color}`} /><span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 animate-ping" /></div>
                            ) : <Activity className={`size-4 ${orchestratorStatusConf.color}`} />}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-white">Orchestrator Status: </span>
                            <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${orchestratorStatusConf.color} ${orchestratorStatusConf.bgColor} ${orchestratorStatusConf.borderColor}`}>
                              {orchestratorStatusConf.pulse && <span className="size-1.5 rounded-full bg-current animate-pulse" />}{orchestratorStatusConf.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" onClick={handleStartOrchestrator} disabled={orchestratorLoading} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 h-8 text-xs">
                            {orchestratorLoading ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}Start
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => selectedProject && fetchOrchestratorStatus(selectedProject.id)} className="border-neutral-700 text-slate-300 h-8 gap-1 text-xs">
                            <RefreshCw className="size-3" />Refresh
                          </Button>
                        </div>
                      </div>
                      {orchestratorResult && (
                        <div className={`mt-3 text-xs p-2.5 rounded-lg border ${orchestratorResult.startsWith('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                          {orchestratorResult}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Agent Messages Feed */}
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-white flex items-center gap-2"><MessageSquare className="size-4 text-rose-400" /> Agent Activity</CardTitle>
                        {agentMessagesLoading && <Loader2 className="size-4 animate-spin text-rose-400" />}
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <ScrollArea className="max-h-96">
                        {agentMessages.length === 0 ? (
                          <div className="flex flex-col items-center py-8 text-slate-500">
                            <MessageSquare className="size-8 mb-2 opacity-50" />
                            <p className="text-sm">No agent messages yet</p>
                            <p className="text-xs text-slate-600 mt-1">Start the orchestrator to generate activity</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {agentMessages.map((msg) => {
                              const roleConf = ROLE_COLOR[msg.fromRole] || ROLE_COLOR.system
                              const typeConf = MESSAGE_TYPE_CONFIG[msg.type] || MESSAGE_TYPE_CONFIG.status
                              return (
                                <div key={msg.id} className={`rounded-lg border p-3 ${roleConf.bg} ${roleConf.border}`}>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`text-xs font-medium ${roleConf.text}`}>
                                      {msg.fromAgent?.name || msg.fromRole.charAt(0).toUpperCase() + msg.fromRole.slice(1)}
                                    </span>
                                    <Badge variant="outline" className={`text-[9px] h-4 px-1.5 gap-0.5 ${typeConf.color} ${typeConf.bgColor} border-current/20`}>
                                      {typeConf.icon} {typeConf.label}
                                    </Badge>
                                    {msg.toRole !== 'all' && (
                                      <span className="text-[10px] text-slate-500">→ {msg.toRole}</span>
                                    )}
                                    <span className="text-[10px] text-slate-500 ml-auto shrink-0">{formatRelativeTime(msg.createdAt)}</span>
                                  </div>
                                  <p className="text-xs text-slate-300 whitespace-pre-wrap">{msg.content}</p>
                                </div>
                              )
                            })}
                            <div ref={messagesEndRef} />
                          </div>
                        )}
                      </ScrollArea>

                      {/* Message Input */}
                      <Separator className="bg-neutral-800" />
                      <div className="flex gap-2">
                        <Input placeholder="Send a message to agents..." value={newAgentMessage} onChange={(e) => setNewAgentMessage(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white flex-1 h-9 text-sm" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendAgentMessage() } }} />
                        <Button onClick={handleSendAgentMessage} disabled={!newAgentMessage.trim()} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white h-9 gap-1.5">
                          <Send className="size-3" />Send
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ════════════════════════════════════════════════════════════
                    3. FILES TAB
                    ════════════════════════════════════════════════════════════ */}
                <TabsContent value="files" className="space-y-4">
                  <CodeBrowser
                    files={projectFiles}
                    filesLoading={filesLoading}
                    viewingFile={viewingFile}
                    setViewingFile={setViewingFile}
                    onRefresh={() => selectedProject && fetchProjectFiles(selectedProject.id)}
                    onUpload={() => fileInputRef.current?.click()}
                    uploadingFiles={uploadingFiles}
                    onViewFile={handleViewFile}
                    onDeleteFile={handleDeleteFile}
                    onDownloadZip={handleDownloadZip}
                    onPushGithub={handleGithubPush}
                    githubConnected={githubConnected}
                    githubPushing={githubPushing}
                    downloadLoading={downloadLoading}
                    currentOrchestratorStatus={currentOrchestratorStatus}
                    onStartOrchestrator={handleStartOrchestrator}
                    orchestratorLoading={orchestratorLoading}
                  />
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
                </TabsContent>

                {/* ════════════════════════════════════════════════════════════
                    4. TIMELINE TAB
                    ════════════════════════════════════════════════════════════ */}
                <TabsContent value="timeline" className="space-y-4">
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-white flex items-center gap-2"><Timer className="size-4 text-rose-400" /> Project Timeline</CardTitle>
                      <CardDescription className="text-xs text-slate-400">Visual history of project lifecycle events</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {timelineEvents.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-slate-500">
                          <Clock className="size-8 mb-2 opacity-50" />
                          <p className="text-sm">No timeline events yet</p>
                          <p className="text-xs text-slate-600 mt-1">Events will appear as the project progresses</p>
                        </div>
                      ) : (
                        <ScrollArea className="max-h-96">
                          <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-neutral-800" />
                            <div className="space-y-4">
                              {timelineEvents.map((event) => (
                                <div key={event.id} className="flex items-start gap-4 relative">
                                  <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 bg-[#0d1117] border border-neutral-800 z-10 ${event.color}`}>
                                    {event.icon}
                                  </div>
                                  <div className="flex-1 min-w-0 pb-2">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-sm font-medium text-white">{event.title}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-1">{event.description}</p>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <Clock className="size-2.5" />{formatDateTime(event.timestamp)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  {/* Documentation Preview (if available) */}
                  {selectedProject.documentation && (
                    <Card className="bg-[#0d1117] border-neutral-800 py-0">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white flex items-center gap-2"><BookOpen className="size-4 text-violet-400" /> Generated Documentation</CardTitle>
                          <Button variant="outline" size="sm" onClick={handleGenerateDocs} disabled={docsLoading} className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 h-7 text-xs gap-1">
                            {docsLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}Regenerate
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ScrollArea className="max-h-64">
                          <div className="text-xs text-slate-300 whitespace-pre-wrap bg-neutral-900 p-4 rounded-lg border border-neutral-800">{selectedProject.documentation}</div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {selectedProject.readme && (
                    <Card className="bg-[#0d1117] border-neutral-800 py-0">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm text-white flex items-center gap-2"><FileText className="size-4 text-emerald-400" /> README</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ScrollArea className="max-h-64">
                          <div className="text-xs text-slate-300 whitespace-pre-wrap bg-neutral-900 p-4 rounded-lg border border-neutral-800">{selectedProject.readme}</div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ════════════════════════════════════════════════════════════
                    5. SETTINGS TAB
                    ════════════════════════════════════════════════════════════ */}
                <TabsContent value="settings" className="space-y-4">
                  {/* Edit Project Details */}
                  <ProjectSettingsEditor
                    project={selectedProject}
                    onSave={async (updated) => {
                      setSelectedProject(updated)
                      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                      try {
                        await fetch(`/api/projects/${selectedProject.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
                      } catch { /* */ }
                    }}
                  />

                  {/* GitHub Connection */}
                  <Card className="bg-[#0d1117] border-neutral-800 py-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-white flex items-center gap-2"><Github className="size-4 text-rose-400" /> GitHub Connection</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      {githubConnected && githubRepoInfo ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                            <GitBranch className="size-5 text-emerald-400" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white font-medium">{githubRepoInfo.fullName}</p>
                              <p className="text-xs text-slate-400">{githubRepoInfo.branch} branch{githubRepoInfo.private ? ' · Private' : ' · Public'}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] h-5 text-emerald-400 bg-emerald-500/10 border-emerald-500/20">Connected</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={handleGithubClone} disabled={githubCloning} className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 gap-1.5 h-8 text-xs">
                              {githubCloning ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}Import Files
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleGithubPush} disabled={githubPushing} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-1.5 h-8 text-xs">
                              {githubPushing ? <Loader2 className="size-3 animate-spin" /> : <ArrowUpFromLine className="size-3" />}Push Changes
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-900/50">
                            <Github className="size-5 text-slate-500" />
                            <div><p className="text-sm text-slate-400">No GitHub repository connected</p><p className="text-xs text-slate-500">Connect a repository to import and push files</p></div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-300 text-xs">Repository URL</Label>
                            <Input placeholder="https://github.com/owner/repo" value={githubRepoUrl} onChange={(e) => setGithubRepoUrl(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-300 text-xs">GitHub Token (optional)</Label>
                            <Input type="password" placeholder="ghp_..." value={githubToken} onChange={(e) => setGithubToken(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm" />
                          </div>
                          <Button onClick={handleGithubConnect} disabled={githubLoading || !githubRepoUrl.trim()} className="bg-slate-700 hover:bg-slate-600 text-white gap-1.5 h-9 text-xs">
                            {githubLoading ? <Loader2 className="size-3 animate-spin" /> : <Github className="size-3" />}Connect Repository
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Danger Zone */}
                  <Card className="bg-[#0d1117] border-red-500/20 py-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm text-red-400 flex items-center gap-2"><Shield className="size-4" /> Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                        <div>
                          <p className="text-sm text-white">Delete Project</p>
                          <p className="text-xs text-slate-400">Permanently delete this project and all its data</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(true)} className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs">Delete</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Settings Editor Sub-Component ──────────────────────────────────────────

function ProjectSettingsEditor({ project, onSave }: { project: ProjectData; onSave: (updated: ProjectData) => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', requirements: '', notes: '', icon: '', category: '', priority: 'medium' as ProjectPriority, dueDate: '', techStack: '',
  })

  const startEditing = () => {
    setForm({
      name: project.name || '', description: project.description || '', requirements: project.requirements || '',
      notes: project.notes || '', icon: project.icon || '', category: project.category || '',
      priority: project.priority || 'medium', dueDate: project.dueDate ? project.dueDate.split('T')[0] : '',
      techStack: parseTechStack(project.techStack).join(', '),
    })
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const updated = {
      ...project,
      name: form.name, description: form.description, requirements: form.requirements,
      notes: form.notes, icon: form.icon, category: form.category, priority: form.priority,
      dueDate: form.dueDate || null,
      techStack: form.techStack.trim() ? JSON.stringify(form.techStack.split(',').map(s => s.trim()).filter(Boolean)) : null,
    }
    onSave(updated)
    setEditing(false)
    setSaving(false)
  }

  if (!editing) {
    return (
      <Card className="bg-[#0d1117] border-neutral-800 py-0">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-white flex items-center gap-2"><Settings className="size-4 text-rose-400" /> Project Details</CardTitle>
            <Button variant="outline" size="sm" onClick={startEditing} className="border-neutral-700 text-slate-300 gap-1 h-7 text-xs"><Edit3 className="size-3" />Edit</Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Name</span>
              <p className="text-sm text-white mt-0.5">{project.name}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Category</span>
              <p className="text-sm text-white mt-0.5">{project.category || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Priority</span>
              <p className="text-sm mt-0.5"><Badge variant="outline" className={`text-[10px] h-5 ${PRIORITY_CONFIG[project.priority].color} ${PRIORITY_CONFIG[project.priority].bgColor} border-neutral-700`}>{PRIORITY_CONFIG[project.priority].label}</Badge></p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Due Date</span>
              <p className="text-sm text-white mt-0.5">{project.dueDate ? formatDate(project.dueDate) : '—'}</p>
            </div>
          </div>
          {project.description && (
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Description</span>
              <p className="text-sm text-slate-300 mt-0.5 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
          {parseTechStack(project.techStack).length > 0 && (
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Tech Stack</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {parseTechStack(project.techStack).map((tech) => (<Badge key={tech} variant="outline" className="text-[10px] h-5 border-neutral-700 text-slate-300 bg-neutral-800/50">{tech}</Badge>))}
              </div>
            </div>
          )}
          {project.requirements && (
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Requirements</span>
              <p className="text-xs text-slate-300 mt-0.5 whitespace-pre-wrap bg-neutral-900/50 rounded-md p-3 border border-neutral-800">{project.requirements}</p>
            </div>
          )}
          {project.notes && (
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Notes</span>
              <p className="text-xs text-slate-300 mt-0.5 whitespace-pre-wrap bg-neutral-900/50 rounded-md p-3 border border-neutral-800">{project.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#0d1117] border-neutral-800 py-0">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm text-white flex items-center gap-2"><Edit3 className="size-4 text-rose-400" /> Edit Project</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-slate-300 text-xs">Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300 text-xs">Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white min-h-20 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {CATEGORY_OPTIONS.map((cat) => (<SelectItem key={cat} value={cat} className="text-white focus:bg-neutral-800 focus:text-white">{cat}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as ProjectPriority })}>
              <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {PRIORITY_OPTIONS.map((p) => (<SelectItem key={p} value={p} className="text-white focus:bg-neutral-800 focus:text-white">{PRIORITY_CONFIG[p].label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300 text-xs">Icon</Label>
          <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white w-20 h-9 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300 text-xs">Tech Stack (comma-separated)</Label>
          <Input value={form.techStack} onChange={(e) => setForm({ ...form, techStack: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300 text-xs">Requirements</Label>
          <Textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white min-h-16 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300 text-xs">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white min-h-16 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300 text-xs">Due Date</Label>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm" />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-rose-600 hover:bg-rose-700 text-white h-9 text-sm gap-1.5">
            {saving ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}Save Changes
          </Button>
          <Button variant="outline" onClick={() => setEditing(false)} className="border-neutral-700 text-slate-300 h-9 text-sm">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  )
}
