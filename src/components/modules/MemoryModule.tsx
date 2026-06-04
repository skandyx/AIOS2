'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
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
  Search,
  Brain,
  Trash2,
  Clock,
  BarChart3,
  Eye,
  ChevronDown,
  ChevronUp,
  Hash,
  Star,
  Database,
  TrendingUp,
  Filter,
  Pencil,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type MemoryType =
  | 'all'
  | 'short_term'
  | 'long_term'
  | 'contextual'
  | 'procedural'
  | 'user'
  | 'system'
  | 'project'
  | 'error'
  | 'workflow'
  | 'skill'

interface MemoryData {
  id: string
  type: string
  key: string
  value: string
  summary?: string | null
  importance: number
  accessCount: number
  source?: string | null
  context?: string | null
  isArchived: boolean
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMORY_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
  short_term: { label: 'Short-term', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10', borderColor: 'border-l-cyan-400', icon: '⚡' },
  long_term: { label: 'Long-term', color: 'text-purple-400', bgColor: 'bg-purple-400/10', borderColor: 'border-l-purple-400', icon: '🧠' },
  contextual: { label: 'Contextual', color: 'text-amber-400', bgColor: 'bg-amber-400/10', borderColor: 'border-l-amber-400', icon: '🔗' },
  procedural: { label: 'Procedural', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10', borderColor: 'border-l-emerald-400', icon: '⚙️' },
  user: { label: 'User', color: 'text-pink-400', bgColor: 'bg-pink-400/10', borderColor: 'border-l-pink-400', icon: '👤' },
  system: { label: 'System', color: 'text-slate-400', bgColor: 'bg-slate-400/10', borderColor: 'border-l-slate-400', icon: '🖥️' },
  project: { label: 'Project', color: 'text-teal-400', bgColor: 'bg-teal-400/10', borderColor: 'border-l-teal-400', icon: '📁' },
  error: { label: 'Error', color: 'text-red-400', bgColor: 'bg-red-400/10', borderColor: 'border-l-red-400', icon: '❌' },
  workflow: { label: 'Workflow', color: 'text-orange-400', bgColor: 'bg-orange-400/10', borderColor: 'border-l-orange-400', icon: '🔄' },
  skill: { label: 'Skill', color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', borderColor: 'border-l-indigo-400', icon: '🎯' },
}

const MEMORY_TABS: { value: MemoryType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'short_term', label: 'Short-term' },
  { value: 'long_term', label: 'Long-term' },
  { value: 'contextual', label: 'Contextual' },
  { value: 'procedural', label: 'Procedural' },
  { value: 'user', label: 'User' },
  { value: 'system', label: 'System' },
  { value: 'project', label: 'Project' },
  { value: 'error', label: 'Error' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'skill', label: 'Skill' },
]



// ─── Importance Visualization ─────────────────────────────────────────────────

function ImportanceIndicator({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value))
  const percentage = Math.round(clamped * 100)
  const dots = Math.round(clamped * 5)

  let dotColor = 'bg-slate-500'
  if (clamped >= 0.8) dotColor = 'bg-emerald-400'
  else if (clamped >= 0.6) dotColor = 'bg-cyan-400'
  else if (clamped >= 0.4) dotColor = 'bg-amber-400'
  else dotColor = 'bg-red-400'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`size-1.5 rounded-full ${i < dots ? dotColor : 'bg-slate-700'}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-500">{percentage}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-800 text-white border-slate-600">
          Importance: {percentage}%
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Memory Card ──────────────────────────────────────────────────────────────

function MemoryCard({
  memory,
  isExpanded,
  onToggle,
  onDelete,
  onEdit,
}: {
  memory: MemoryData
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  const typeConfig = MEMORY_TYPE_CONFIG[memory.type] || MEMORY_TYPE_CONFIG.system

  return (
    <Card
      className={`bg-slate-900/80 border py-0 border-l-4 ${typeConfig.borderColor} border-t-slate-700/50 border-r-slate-700/50 border-b-slate-700/50 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/5 cursor-pointer`}
      onClick={onToggle}
    >
      <CardHeader className="pb-1 pt-3 px-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm text-white flex items-center gap-2 truncate">
              <span className="text-base">{typeConfig.icon}</span>
              <span className="truncate">{memory.key}</span>
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className={`text-[10px] h-5 ${typeConfig.color} border-current/20 ${typeConfig.bgColor}`}
              >
                {typeConfig.label}
              </Badge>
              <ImportanceIndicator value={memory.importance} />
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <Hash className="size-2.5" />
                {memory.accessCount}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-slate-500 hover:text-cyan-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit()
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 text-white border-slate-600">Edit memory</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-slate-500 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 text-white border-slate-600">Delete memory</TooltipContent>
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

      <CardContent className="px-4 pb-3 pt-0">
        <p className={`text-xs text-slate-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
          {memory.value}
        </p>

        {/* Importance progress bar - always visible */}
        <div className="flex items-center gap-2 mt-2">
          <Progress value={memory.importance * 100} className="h-1 flex-1 bg-slate-700" />
          <span className="text-[10px] text-slate-500">{Math.round(memory.importance * 100)}%</span>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-3 pt-3 border-t border-slate-700/50">
            {/* Summary */}
            {memory.summary && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Summary</p>
                <p className="text-xs text-slate-400 italic">{memory.summary}</p>
              </div>
            )}

            {/* Importance Bar */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Importance</p>
              <div className="flex items-center gap-2">
                <Progress value={memory.importance * 100} className="h-1.5 flex-1 bg-slate-700" />
                <span className="text-xs text-slate-400">{Math.round(memory.importance * 100)}%</span>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 rounded p-2">
                <p className="text-[10px] text-slate-500">Source</p>
                <p className="text-xs text-slate-300 capitalize">{memory.source || 'N/A'}</p>
              </div>
              <div className="bg-slate-800/50 rounded p-2">
                <p className="text-[10px] text-slate-500">Access Count</p>
                <p className="text-xs text-slate-300">{memory.accessCount}</p>
              </div>
              <div className="bg-slate-800/50 rounded p-2">
                <p className="text-[10px] text-slate-500">Created</p>
                <p className="text-xs text-slate-300">{new Date(memory.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="bg-slate-800/50 rounded p-2">
                <p className="text-[10px] text-slate-500">Updated</p>
                <p className="text-xs text-slate-300">{new Date(memory.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Context */}
            {memory.context && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Context</p>
                <div className="bg-slate-800/50 rounded p-2">
                  <pre className="text-[10px] text-slate-400 whitespace-pre-wrap overflow-hidden">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(memory.context), null, 2)
                      } catch {
                        return memory.context
                      }
                    })()}
                  </pre>
                </div>
              </div>
            )}

            {/* Expires */}
            {memory.expiresAt && (
              <div className="flex items-center gap-1 text-xs text-amber-400">
                <Clock className="size-3" />
                <span>Expires: {new Date(memory.expiresAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MemoryModule() {
  const [memories, setMemories] = useState<MemoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<MemoryType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newMemory, setNewMemory] = useState({
    key: '',
    content: '',
    type: 'short_term' as string,
    importance: 0.5,
  })
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingMemory, setEditingMemory] = useState<MemoryData | null>(null)
  const [editForm, setEditForm] = useState({ key: '', content: '', type: 'short_term' as string, importance: 0.5, summary: '' })
  const [saving, setSaving] = useState(false)

  // Fetch memories
  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch('/api/memory')
      if (res.ok) {
        const data: MemoryData[] = await res.json()
        setMemories(data)
      } else {
        setMemories([])
      }
    } catch {
      setMemories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  // Create memory
  const handleCreateMemory = async () => {
    if (!newMemory.key || !newMemory.content || !newMemory.type) return
    setCreating(true)
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemory),
      })
      if (res.ok) {
        const created = await res.json()
        setMemories((prev) => [created, ...prev])
        setNewMemory({ key: '', content: '', type: 'short_term', importance: 0.5 })
        setCreateDialogOpen(false)
      }
    } catch {
      // silently fail
    } finally {
      setCreating(false)
    }
  }

  // Delete memory
  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/memory?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id))
      }
    } catch {
      // silently fail
    }
  }

  // Edit memory
  const handleOpenEdit = (memory: MemoryData) => {
    setEditingMemory(memory)
    setEditForm({ key: memory.key, content: memory.value, type: memory.type, importance: memory.importance, summary: memory.summary || '' })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingMemory) return
    setSaving(true)
    try {
      const res = await fetch(`/api/memory?id=${editingMemory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: editForm.key,
          value: editForm.content,
          type: editForm.type,
          importance: editForm.importance,
          summary: editForm.summary || null,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setMemories((prev) => prev.map((m) => m.id === editingMemory.id ? { ...m, ...updated } : m))
        setEditDialogOpen(false)
        setEditingMemory(null)
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  // Filter & search
  const filteredMemories = useMemo(() => {
    let result = memories
    if (activeTab !== 'all') {
      result = result.filter((m) => m.type === activeTab)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.key.toLowerCase().includes(q) ||
          m.value.toLowerCase().includes(q) ||
          (m.summary && m.summary.toLowerCase().includes(q))
      )
    }
    return result
  }, [memories, activeTab, searchQuery])

  // Statistics
  const stats = useMemo(() => {
    const typeCounts: Record<string, number> = {}
    let totalImportance = 0
    let totalAccess = 0

    memories.forEach((m) => {
      typeCounts[m.type] = (typeCounts[m.type] || 0) + 1
      totalImportance += m.importance
      totalAccess += m.accessCount
    })

    return {
      total: memories.length,
      typeCounts,
      avgImportance: memories.length > 0 ? totalImportance / memories.length : 0,
      totalAccess,
    }
  }, [memories])

  // Timeline grouping
  const timelineGroups = useMemo(() => {
    const groups: Record<string, MemoryData[]> = {}
    filteredMemories.forEach((m) => {
      const date = new Date(m.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(m)
    })
    return Object.entries(groups).sort(([a], [b]) => {
      return new Date(b).getTime() - new Date(a).getTime()
    })
  }, [filteredMemories])

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="size-6 text-cyan-400" />
            Memory Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage and visualize AI memory store
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2">
              <Plus className="size-4" />
              New Memory
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">Create New Memory</DialogTitle>
              <DialogDescription className="text-slate-400">
                Store a new memory in the AI memory system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Key</Label>
                <Input
                  placeholder="e.g. user.preferences.theme"
                  value={newMemory.key}
                  onChange={(e) => setNewMemory({ ...newMemory, key: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Type</Label>
                <Select
                  value={newMemory.type}
                  onValueChange={(v) => setNewMemory({ ...newMemory, type: v })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {Object.entries(MEMORY_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-white focus:bg-slate-700 focus:text-white">
                        {config.icon} {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Content</Label>
                <Textarea
                  placeholder="Memory content..."
                  value={newMemory.content}
                  onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white min-h-24"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Importance: {Math.round(newMemory.importance * 100)}%</Label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newMemory.importance * 100}
                  onChange={(e) => setNewMemory({ ...newMemory, importance: parseInt(e.target.value) / 100 })}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-slate-600 text-slate-300">
                Cancel
              </Button>
              <Button onClick={handleCreateMemory} disabled={creating || !newMemory.key || !newMemory.content} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                {creating ? 'Creating...' : 'Create Memory'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Memories', value: stats.total, icon: Database, color: 'text-cyan-400' },
          { label: 'Avg Importance', value: `${Math.round(stats.avgImportance * 100)}%`, icon: Star, color: 'text-amber-400' },
          { label: 'Total Accesses', value: stats.totalAccess, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Types Used', value: Object.keys(stats.typeCounts).length, icon: Filter, color: 'text-purple-400' },
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

      {/* Type Breakdown Bar */}
      <Card className="bg-slate-900/80 border-slate-700/50 py-4 shadow-lg">
        <CardHeader className="pb-2 px-4">
          <CardTitle className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="size-3.5 text-cyan-400" />
            Memory Type Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
            {Object.entries(stats.typeCounts).map(([type, count]) => {
              const config = MEMORY_TYPE_CONFIG[type]
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <TooltipProvider key={type}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`${config?.bgColor || 'bg-slate-600'} transition-all hover:opacity-80`}
                        style={{ width: `${pct}%`, minWidth: pct > 0 ? '4px' : '0' }}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-800 text-white border-slate-600">
                      {config?.icon} {config?.label}: {count} ({Math.round(pct)}%)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(stats.typeCounts).map(([type, count]) => {
              const config = MEMORY_TYPE_CONFIG[type]
              return (
                <div key={type} className="flex items-center gap-1">
                  <span className="text-[10px]">{config?.icon}</span>
                  <span className={`text-[10px] ${config?.color || 'text-slate-400'}`}>
                    {config?.label}: {count}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-cyan-400" />
          <Input
            placeholder="Search memories by key, content, or summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-sm bg-slate-900/60 border-cyan-500/30 text-white backdrop-blur-sm placeholder:text-slate-500 focus:border-cyan-500/60"
          />
        </div>
        <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1 border border-slate-700/50">
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => setViewMode('grid')}
            className={`text-xs h-7 ${viewMode === 'grid' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
          >
            Grid
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'timeline' ? 'default' : 'ghost'}
            onClick={() => setViewMode('timeline')}
            className={`text-xs h-7 ${viewMode === 'timeline' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
          >
            Timeline
          </Button>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MemoryType)}>
        <ScrollArea className="w-full">
          <TabsList className="bg-slate-900/60 border border-slate-700/50 w-max">
            {MEMORY_TABS.map((tab) => {
              const config = tab.value !== 'all' ? MEMORY_TYPE_CONFIG[tab.value] : null
              const count = tab.value === 'all' ? stats.total : (stats.typeCounts[tab.value] || 0)
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-xs data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400"
                >
                  {config?.icon && <span className="mr-1">{config.icon}</span>}
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1 text-[10px] text-slate-500">({count})</span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </ScrollArea>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-slate-900/80 border-slate-700/50 animate-pulse py-3 border-l-4 border-l-slate-600">
                  <CardHeader className="pb-1 pt-2 px-4">
                    <div className="h-4 bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-700/50 rounded w-1/2" />
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="h-3 bg-slate-700/30 rounded w-full mb-2" />
                    <div className="h-3 bg-slate-700/30 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="text-center py-12">
              <Database className="size-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No memories found</p>
              <p className="text-slate-500 text-xs mt-1">
                {searchQuery ? 'Try adjusting your search query' : 'Create a new memory to get started'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  isExpanded={expandedMemory === memory.id}
                  onToggle={() =>
                    setExpandedMemory(expandedMemory === memory.id ? null : memory.id)
                  }
                  onDelete={() => handleDeleteMemory(memory.id)}
                  onEdit={() => handleOpenEdit(memory)}
                />
              ))}
            </div>
          ) : (
            /* Timeline View */
            <ScrollArea className="h-[600px]">
              <div className="space-y-6">
                {timelineGroups.map(([date, items]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="size-4 text-cyan-400" />
                      <h3 className="text-sm font-medium text-white">{date}</h3>
                      <Badge variant="outline" className="text-[10px] h-5 border-slate-600 text-slate-400">
                        {items.length} memories
                      </Badge>
                    </div>
                    <div className="space-y-2 ml-2 border-l border-slate-700/50 pl-4">
                      {items.map((memory) => {
                        const typeConfig = MEMORY_TYPE_CONFIG[memory.type] || MEMORY_TYPE_CONFIG.system
                        return (
                          <Card
                            key={memory.id}
                            className={`bg-slate-900/80 border py-0 border-l-4 ${typeConfig.borderColor} border-t-slate-700/50 border-r-slate-700/50 border-b-slate-700/50 cursor-pointer hover:shadow-lg hover:shadow-cyan-500/5 transition-all`}
                            onClick={() =>
                              setExpandedMemory(expandedMemory === memory.id ? null : memory.id)
                            }
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{typeConfig.icon}</span>
                                    <span className="text-sm font-medium text-white truncate">{memory.key}</span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] h-4 ${typeConfig.color} border-current/20 shrink-0`}
                                    >
                                      {typeConfig.label}
                                    </Badge>
                                  </div>
                                  <p className={`text-xs text-slate-400 mt-1 ${expandedMemory === memory.id ? '' : 'line-clamp-1'}`}>
                                    {memory.value}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <ImportanceIndicator value={memory.importance} />
                                    <span className="text-[10px] text-slate-500">
                                      {new Date(memory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                      <Hash className="size-2.5" />
                                      {memory.accessCount}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-slate-500 hover:text-red-400 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteMemory(memory.id)
                                  }}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>

                              {expandedMemory === memory.id && (
                                <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                                  {memory.summary && (
                                    <p className="text-xs text-slate-400 italic">{memory.summary}</p>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Progress value={memory.importance * 100} className="h-1 flex-1 bg-slate-700" />
                                    <span className="text-[10px] text-slate-400">{Math.round(memory.importance * 100)}%</span>
                                  </div>
                                  <div className="flex gap-4 text-[10px] text-slate-500">
                                    <span>Source: {memory.source || 'N/A'}</span>
                                    <span>Created: {new Date(memory.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Memory Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Edit Memory</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update memory content and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Key</Label>
              <Input
                value={editForm.key}
                onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Type</Label>
              <Select
                value={editForm.type}
                onValueChange={(v) => setEditForm({ ...editForm, type: v })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {Object.entries(MEMORY_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="text-white focus:bg-slate-700 focus:text-white">
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Content</Label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white min-h-24"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Summary (optional)</Label>
              <Input
                value={editForm.summary}
                onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Importance: {Math.round(editForm.importance * 100)}%</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={editForm.importance * 100}
                onChange={(e) => setEditForm({ ...editForm, importance: parseInt(e.target.value) / 100 })}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-cyan-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editForm.key || !editForm.content} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </ScrollArea>
    </div>
  )
}
