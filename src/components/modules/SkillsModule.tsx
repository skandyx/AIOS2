'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Star,
  Download,
  Settings,
  Shield,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Sparkles,
  Zap,
  Bot,
  Code2,
  Database,
  MessageSquare,
  Wrench,
  Github,
  XCircle,
  ToggleLeft,
  ToggleRight,
  FolderOpen,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type SkillCategory = 'Automation' | 'Development' | 'AI' | 'Data' | 'Productivity' | 'Communication' | 'Utility'

interface SearchResult {
  name: string
  fullName: string
  description: string
  url: string
  stars: number
  language: string
  category: SkillCategory
  topics: string[]
  source: 'github' | 'curated'
}

interface InstalledSkill {
  id: string
  name: string
  slug: string
  description: string
  category: SkillCategory
  sourceType: string
  repoUrl: string | null
  repoOwner: string | null
  repoName: string | null
  stars: number | null
  permissions: string[]
  config: Record<string, unknown>
  isEnabled: boolean
  createdAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: { id: SkillCategory | 'All'; label: string; icon: React.ReactNode }[] = [
  { id: 'All', label: 'All', icon: <Sparkles className="h-3 w-3" /> },
  { id: 'Automation', label: 'Automation', icon: <Zap className="h-3 w-3" /> },
  { id: 'Development', label: 'Development', icon: <Code2 className="h-3 w-3" /> },
  { id: 'AI', label: 'AI', icon: <Bot className="h-3 w-3" /> },
  { id: 'Data', label: 'Data', icon: <Database className="h-3 w-3" /> },
  { id: 'Productivity', label: 'Productivity', icon: <Package className="h-3 w-3" /> },
  { id: 'Communication', label: 'Communication', icon: <MessageSquare className="h-3 w-3" /> },
  { id: 'Utility', label: 'Utility', icon: <Wrench className="h-3 w-3" /> },
]

const CATEGORY_EMOJIS: Record<SkillCategory, string> = {
  Automation: '⚡',
  Development: '💻',
  AI: '🤖',
  Data: '📊',
  Productivity: '🚀',
  Communication: '💬',
  Utility: '🔧',
}

const DEFAULT_PERMISSIONS: Record<SkillCategory, string[]> = {
  Automation: ['network:access', 'file:read'],
  Development: ['code:execute', 'file:read', 'file:write'],
  AI: ['api:call', 'data:read'],
  Data: ['data:read', 'data:write', 'file:access'],
  Productivity: ['file:read', 'file:write'],
  Communication: ['network:access', 'api:call'],
  Utility: ['system:access'],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function formatStars(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

function parseRepoParts(fullName: string): { owner: string; name: string } {
  const parts = fullName.split('/')
  return {
    owner: parts[0] || 'unknown',
    name: parts.slice(1).join('/') || fullName,
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SkillCard({
  skill,
  isInstalled,
  onInstall,
  installing,
}: {
  skill: SearchResult
  isInstalled: boolean
  onInstall: (skill: SearchResult) => void
  installing: boolean
}) {
  const emoji = CATEGORY_EMOJIS[skill.category] || '📦'

  return (
    <Card className="bg-[#0d1117] border-neutral-800 transition-all duration-200 hover:border-neutral-700 hover:shadow-lg hover:shadow-cyan-500/5 group relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500/60 to-emerald-500/60 opacity-0 group-hover:opacity-100 transition-opacity" />

      <CardContent className="p-4">
        {/* Header: emoji + name + author */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-800/80 text-lg">
            {emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-neutral-200 truncate">{skill.name}</p>
              {skill.source === 'curated' && (
                <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border px-1.5 shrink-0">
                  CURATED
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 truncate">
              by {skill.fullName.split('/')[0]}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-[11px] text-neutral-400 line-clamp-2 mb-3">
          {skill.description || 'No description available'}
        </p>

        {/* Stars + Language */}
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center gap-1 text-[10px] text-neutral-500">
            <Star className="h-3 w-3 text-amber-400" />
            {formatStars(skill.stars)}
          </span>
          {skill.language && (
            <Badge variant="outline" className="text-[9px] border-neutral-700 text-neutral-400 px-1.5">
              {skill.language}
            </Badge>
          )}
        </div>

        {/* Category + Source badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge className="text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20 border px-1.5">
            {skill.category}
          </Badge>
          <Badge variant="outline" className="text-[9px] border-neutral-700 text-neutral-500 px-1.5 flex items-center gap-1">
            {skill.source === 'github' ? (
              <Github className="h-2.5 w-2.5" />
            ) : (
              <Shield className="h-2.5 w-2.5" />
            )}
            {skill.source === 'github' ? 'GitHub' : 'Curated'}
          </Badge>
        </div>

        {/* Install button */}
        {isInstalled ? (
          <Button
            size="sm"
            className="w-full h-8 text-[11px] gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 hover:text-emerald-300"
            disabled
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Installed
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full h-8 text-[11px] gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
            onClick={() => onInstall(skill)}
            disabled={installing}
          >
            {installing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {installing ? 'Installing...' : 'Install'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function InstalledSkillCard({
  skill,
  onToggle,
  onConfigure,
  onUninstall,
  toggling,
}: {
  skill: InstalledSkill
  onToggle: (id: string, enabled: boolean) => void
  onConfigure: (skill: InstalledSkill) => void
  onUninstall: (skill: InstalledSkill) => void
  toggling: boolean
}) {
  const emoji = CATEGORY_EMOJIS[skill.category] || '📦'

  return (
    <Card
      className={`bg-[#0d1117] border-neutral-800 transition-all duration-200 hover:border-neutral-700 ${
        skill.isEnabled ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-neutral-700'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-800/80 text-lg">
            {emoji}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-neutral-200 truncate">{skill.name}</p>
              <Badge className="text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20 border px-1.5 shrink-0">
                {skill.category}
              </Badge>
              <Badge
                className={`text-[9px] px-1.5 shrink-0 ${
                  skill.isEnabled
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border'
                    : 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30 border'
                }`}
              >
                {skill.isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <p className="text-[11px] text-neutral-500 line-clamp-1 mb-2">{skill.description}</p>
            <div className="flex items-center gap-3 text-[10px] text-neutral-600">
              <span>Installed {formatDate(skill.createdAt)}</span>
              {skill.stars !== null && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 text-amber-500/60" />
                  {formatStars(skill.stars)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle */}
            <div className="flex items-center gap-1.5">
              <Switch
                checked={skill.isEnabled}
                onCheckedChange={(checked) => onToggle(skill.id, checked)}
                disabled={toggling}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>

            {/* Configure */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-neutral-500 hover:text-cyan-400 hover:bg-cyan-500/10"
              onClick={() => onConfigure(skill)}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>

            {/* Uninstall */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-neutral-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => onUninstall(skill)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InstallConfirmDialog({
  skill,
  open,
  onOpenChange,
  onConfirm,
  installing,
}: {
  skill: SearchResult | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  installing: boolean
}) {
  if (!skill) return null

  const permissions = DEFAULT_PERMISSIONS[skill.category] || []
  const { owner, name } = parseRepoParts(skill.fullName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1117] border-neutral-800 text-neutral-200 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-cyan-400" />
            Install Skill
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            Review the skill details before installing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Skill Info */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-900/50 border border-neutral-800">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-2xl">
              {CATEGORY_EMOJIS[skill.category] || '📦'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-200">{skill.name}</p>
              <p className="text-[11px] text-neutral-500">by {owner}</p>
              <p className="text-[11px] text-neutral-400 mt-1 line-clamp-3">{skill.description}</p>
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-[10px] text-neutral-500 mb-1.5 font-medium">Category</p>
            <Badge className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20 border px-2">
              {skill.category}
            </Badge>
          </div>

          <Separator className="bg-neutral-800" />

          {/* Permissions */}
          <div>
            <p className="text-[10px] text-neutral-500 mb-2 font-medium flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Required Permissions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {permissions.length > 0 ? (
                permissions.map((perm) => (
                  <Badge key={perm} variant="outline" className="text-[10px] border-neutral-700 text-neutral-400 px-2">
                    {perm}
                  </Badge>
                ))
              ) : (
                <span className="text-[11px] text-neutral-600">No special permissions required</span>
              )}
            </div>
          </div>

          {/* Source */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 font-medium">Source:</span>
            <Badge variant="outline" className="text-[9px] border-neutral-700 text-neutral-400 px-1.5 flex items-center gap-1">
              {skill.source === 'github' ? <Github className="h-2.5 w-2.5" /> : <Shield className="h-2.5 w-2.5" />}
              {skill.source === 'github' ? `github.com/${owner}/${name}` : 'Curated Collection'}
            </Badge>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-amber-400 font-medium">Review Permissions</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                Make sure you trust this skill and review the permissions it requires before installing. Skills can access system resources based on their permission level.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600"
            onClick={() => onOpenChange(false)}
            disabled={installing}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-[11px] gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
            onClick={onConfirm}
            disabled={installing}
          >
            {installing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {installing ? 'Installing...' : 'Confirm Install'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UninstallConfirmDialog({
  skill,
  open,
  onOpenChange,
  onConfirm,
  uninstalling,
}: {
  skill: InstalledSkill | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  uninstalling: boolean
}) {
  if (!skill) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1117] border-neutral-800 text-neutral-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-400" />
            Uninstall Skill
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            This action cannot be undone
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-red-400 font-medium">
                Remove {skill.name}?
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                This will remove the skill and all its configuration. You can reinstall it from the marketplace later.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600"
            onClick={() => onOpenChange(false)}
            disabled={uninstalling}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-[11px] gap-1.5 bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={uninstalling}
          >
            {uninstalling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {uninstalling ? 'Removing...' : 'Uninstall'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfigureDialog({
  skill,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  skill: InstalledSkill | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (id: string, config: Record<string, unknown>) => void
  saving: boolean
}) {
  const [configJson, setConfigJson] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => {
    if (skill && open) {
      const sync = () => {
        setConfigJson(JSON.stringify(skill.config || {}, null, 2))
        setParseError(null)
      }
      sync()
    }
  }, [skill, open])

  if (!skill) return null

  const handleSave = () => {
    try {
      const parsed = JSON.parse(configJson)
      setParseError(null)
      onSave(skill.id, parsed)
    } catch {
      setParseError('Invalid JSON format')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1117] border-neutral-800 text-neutral-200 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-400" />
            Configure {skill.name}
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            Edit the skill configuration in JSON format
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {/* Skill Info */}
          <div className="flex items-center gap-2 text-[11px]">
            <Badge className="text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20 border px-1.5">
              {skill.category}
            </Badge>
            <Badge
              className={`text-[9px] px-1.5 ${
                skill.isEnabled
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border'
                  : 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30 border'
              }`}
            >
              {skill.isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <Separator className="bg-neutral-800" />

          {/* JSON Editor */}
          <div>
            <p className="text-[10px] text-neutral-500 mb-1.5 font-medium">Configuration (JSON)</p>
            <textarea
              value={configJson}
              onChange={(e) => {
                setConfigJson(e.target.value)
                setParseError(null)
              }}
              className="w-full h-48 rounded-lg bg-neutral-900 border border-neutral-700 text-[11px] text-neutral-300 font-mono p-3 resize-none outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              spellCheck={false}
            />
            {parseError && (
              <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {parseError}
              </p>
            )}
          </div>

          {/* Permissions Info */}
          {skill.permissions && skill.permissions.length > 0 && (
            <div>
              <p className="text-[10px] text-neutral-500 mb-1.5 font-medium flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Permissions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {skill.permissions.map((perm) => (
                  <Badge key={perm} variant="outline" className="text-[10px] border-neutral-700 text-neutral-400 px-2">
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-[11px] gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
            onClick={handleSave}
            disabled={saving || !!parseError}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {saving ? 'Saving...' : 'Save Config'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SkillsModule() {
  // State
  const [activeTab, setActiveTab] = useState<'marketplace' | 'installed'>('marketplace')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<SkillCategory | 'All'>('All')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingInstalled, setLoadingInstalled] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [installError, setInstallError] = useState<string | null>(null)

  // Dialog state
  const [installTarget, setInstallTarget] = useState<SearchResult | null>(null)
  const [installDialogOpen, setInstallDialogOpen] = useState(false)
  const [installing, setInstalling] = useState(false)

  const [uninstallTarget, setUninstallTarget] = useState<InstalledSkill | null>(null)
  const [uninstallDialogOpen, setUninstallDialogOpen] = useState(false)
  const [uninstalling, setUninstalling] = useState(false)

  const [configTarget, setConfigTarget] = useState<InstalledSkill | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [installingSlug, setInstallingSlug] = useState<string | null>(null)

  // ── Fetch installed skills ──
  const fetchInstalled = useCallback(async () => {
    setLoadingInstalled(true)
    try {
      const res = await fetch('/api/skills')
      if (res.ok) {
        const data = await res.json()
        setInstalledSkills(Array.isArray(data) ? data : [])
      } else {
        setInstalledSkills([])
      }
    } catch {
      setInstalledSkills([])
    } finally {
      setLoadingInstalled(false)
    }
  }, [])

  // ── Search GitHub for skills ──
  const searchSkills = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchError(null)
      return
    }

    setSearching(true)
    setSearchError(null)
    try {
      const res = await fetch(`/api/skills/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(Array.isArray(data.results) ? data.results : [])
      } else {
        setSearchError('Search failed. Please try again.')
        setSearchResults([])
      }
    } catch {
      setSearchError('Network error. Please check your connection.')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  // ── Initial load ──
  useEffect(() => {
    fetchInstalled()
  }, [fetchInstalled])

  // ── Debounced search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'marketplace' && searchQuery.trim()) {
        searchSkills(searchQuery)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery, activeTab, searchSkills])

  // ── Computed ──
  const installedSlugs = new Set(installedSkills.map((s) => s.slug))

  const filteredResults = searchResults.filter((r) => {
    if (activeCategory === 'All') return true
    return r.category === activeCategory
  })

  const filteredInstalled = installedSkills.filter((s) => {
    if (activeCategory === 'All') return true
    return s.category === activeCategory
  })

  const installedCount = installedSkills.length
  const enabledCount = installedSkills.filter((s) => s.isEnabled).length

  // ── Handlers ──

  const handleInstallClick = (skill: SearchResult) => {
    setInstallTarget(skill)
    setInstallDialogOpen(true)
    setInstallError(null)
  }

  const handleConfirmInstall = async () => {
    if (!installTarget) return

    const slug = generateSlug(installTarget.name)
    const { owner, name: repoName } = parseRepoParts(installTarget.fullName)
    const permissions = DEFAULT_PERMISSIONS[installTarget.category] || []

    setInstalling(true)
    setInstallError(null)
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: installTarget.name,
          slug,
          description: installTarget.description,
          category: installTarget.category,
          sourceType: 'github',
          repoUrl: installTarget.url,
          repoOwner: owner,
          repoName,
          stars: installTarget.stars,
          permissions,
          config: {},
        }),
      })

      if (res.ok) {
        setInstallDialogOpen(false)
        setInstallTarget(null)
        // Refresh both lists
        await fetchInstalled()
      } else {
        const data = await res.json().catch(() => ({}))
        setInstallError(data.error || 'Installation failed. Please try again.')
      }
    } catch {
      setInstallError('Network error during installation.')
    } finally {
      setInstalling(false)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: enabled }),
      })

      if (res.ok) {
        setInstalledSkills((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isEnabled: enabled } : s))
        )
      } else {
        // Still update locally for responsiveness
        setInstalledSkills((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isEnabled: enabled } : s))
        )
      }
    } catch {
      // Update locally on error
      setInstalledSkills((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isEnabled: enabled } : s))
      )
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfigure = (skill: InstalledSkill) => {
    setConfigTarget(skill)
    setConfigDialogOpen(true)
  }

  const handleSaveConfig = async (id: string, config: Record<string, unknown>) => {
    setSavingConfig(true)
    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })

      if (res.ok) {
        setInstalledSkills((prev) =>
          prev.map((s) => (s.id === id ? { ...s, config } : s))
        )
        setConfigDialogOpen(false)
        setConfigTarget(null)
      }
    } catch {
      // Silently fail — local state already updated
      setInstalledSkills((prev) =>
        prev.map((s) => (s.id === id ? { ...s, config } : s))
      )
      setConfigDialogOpen(false)
    } finally {
      setSavingConfig(false)
    }
  }

  const handleUninstallClick = (skill: InstalledSkill) => {
    setUninstallTarget(skill)
    setUninstallDialogOpen(true)
  }

  const handleConfirmUninstall = async () => {
    if (!uninstallTarget) return

    setUninstalling(true)
    try {
      const res = await fetch(`/api/skills/${uninstallTarget.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setUninstallDialogOpen(false)
        setUninstallTarget(null)
        await fetchInstalled()
      }
    } catch {
      // Remove locally on error
      setInstalledSkills((prev) => prev.filter((s) => s.id !== uninstallTarget.id))
      setUninstallDialogOpen(false)
      setUninstallTarget(null)
    } finally {
      setUninstalling(false)
    }
  }

  // ── Render ──

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-200">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            Skills Marketplace
          </h2>
          <p className="text-sm text-neutral-500">
            Browse, install, and manage AI skills from GitHub and curated sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-neutral-700 text-neutral-400">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px]">{installedCount} installed</span>
          </Badge>
          <Badge variant="outline" className="gap-1 border-neutral-700 text-neutral-400">
            <ToggleRight className="h-3 w-3 text-cyan-400" />
            <span className="text-[10px]">{enabledCount} active</span>
          </Badge>
        </div>
      </div>

      {/* Tabs + Search + Category Filter */}
      <div className="border-b border-neutral-800 px-6 py-3 space-y-3">
        {/* Tabs + Search row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'marketplace' | 'installed')}
          >
            <TabsList className="h-8 bg-neutral-900 border border-neutral-800">
              <TabsTrigger
                value="marketplace"
                className="text-[11px] data-[state=active]:bg-neutral-800 data-[state=active]:text-cyan-400 gap-1.5 px-3"
              >
                <Search className="h-3 w-3" />
                Marketplace
              </TabsTrigger>
              <TabsTrigger
                value="installed"
                className="text-[11px] data-[state=active]:bg-neutral-800 data-[state=active]:text-emerald-400 gap-1.5 px-3"
              >
                <Package className="h-3 w-3" />
                Installed
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'marketplace' && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder="Search GitHub for AI skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-neutral-800 bg-neutral-900/50 pl-9 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-cyan-500/50 focus:ring-cyan-500/20"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400 animate-spin" />
              )}
            </div>
          )}
        </div>

        {/* Category pills */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'bg-neutral-900/50 text-neutral-500 border border-neutral-800 hover:bg-neutral-800 hover:text-neutral-300'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* ── Marketplace Tab ── */}
          {activeTab === 'marketplace' && (
            <>
              {/* Empty: no search query yet */}
              {!searchQuery.trim() && searchResults.length === 0 && !searching && (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                  <Search className="mb-4 h-12 w-12 opacity-20" />
                  <p className="text-sm font-medium text-neutral-400">Search for AI Skills</p>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    Type a query to search GitHub for skills, agents, and automations
                  </p>
                </div>
              )}

              {/* Searching state */}
              {searching && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                  <Loader2 className="mb-4 h-10 w-10 text-cyan-400 animate-spin" />
                  <p className="text-sm font-medium text-neutral-400">Searching GitHub...</p>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    Looking for skills matching &quot;{searchQuery}&quot;
                  </p>
                </div>
              )}

              {/* Error state */}
              {searchError && (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                  <AlertCircle className="mb-4 h-10 w-10 text-red-400/50" />
                  <p className="text-sm font-medium text-red-400">{searchError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-[11px] border-neutral-700 text-neutral-400 hover:text-cyan-400 hover:border-cyan-500/30"
                    onClick={() => searchSkills(searchQuery)}
                  >
                    Retry Search
                  </Button>
                </div>
              )}

              {/* Install error inline */}
              {installError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/5 border border-red-500/20 p-3">
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400">{installError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0 text-neutral-500 hover:text-red-400"
                    onClick={() => setInstallError(null)}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Results grid */}
              {!searching && searchQuery.trim() && searchResults.length > 0 && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[11px] text-neutral-500">
                      {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
                      {activeCategory !== 'All' && (
                        <span> in <span className="text-cyan-400">{activeCategory}</span></span>
                      )}
                    </p>
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredResults.map((skill) => (
                      <SkillCard
                        key={skill.fullName}
                        skill={skill}
                        isInstalled={installedSlugs.has(generateSlug(skill.name))}
                        onInstall={handleInstallClick}
                        installing={installingSlug === generateSlug(skill.name)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* No results */}
              {!searching && searchQuery.trim() && searchResults.length === 0 && !searchError && (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                  <FolderOpen className="mb-4 h-12 w-12 opacity-20" />
                  <p className="text-sm font-medium text-neutral-400">No skills found</p>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    Try a different search term or category
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Installed Tab ── */}
          {activeTab === 'installed' && (
            <>
              {/* Loading */}
              {loadingInstalled && installedSkills.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                  <Loader2 className="mb-4 h-10 w-10 text-emerald-400 animate-spin" />
                  <p className="text-sm font-medium text-neutral-400">Loading installed skills...</p>
                </div>
              )}

              {/* Empty state */}
              {!loadingInstalled && installedSkills.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                  <Package className="mb-4 h-12 w-12 opacity-20" />
                  <p className="text-sm font-medium text-neutral-400">No skills installed</p>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    Switch to the Marketplace tab to browse and install AI skills
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 text-[11px] gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                    onClick={() => setActiveTab('marketplace')}
                  >
                    <Search className="h-3.5 w-3.5" />
                    Browse Marketplace
                  </Button>
                </div>
              )}

              {/* Installed list */}
              {installedSkills.length > 0 && (
                <>
                  {filteredInstalled.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                      <FolderOpen className="mb-4 h-12 w-12 opacity-20" />
                      <p className="text-sm font-medium text-neutral-400">
                        No {activeCategory !== 'All' ? activeCategory : ''} skills found
                      </p>
                      <p className="text-[11px] text-neutral-600 mt-1">
                        Try a different category filter
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredInstalled.map((skill) => (
                        <InstalledSkillCard
                          key={skill.id}
                          skill={skill}
                          onToggle={handleToggle}
                          onConfigure={handleConfigure}
                          onUninstall={handleUninstallClick}
                          toggling={togglingId === skill.id}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <InstallConfirmDialog
        skill={installTarget}
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        onConfirm={handleConfirmInstall}
        installing={installing}
      />

      <UninstallConfirmDialog
        skill={uninstallTarget}
        open={uninstallDialogOpen}
        onOpenChange={setUninstallDialogOpen}
        onConfirm={handleConfirmUninstall}
        uninstalling={uninstalling}
      />

      <ConfigureDialog
        skill={configTarget}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={handleSaveConfig}
        saving={savingConfig}
      />
    </div>
  )
}
