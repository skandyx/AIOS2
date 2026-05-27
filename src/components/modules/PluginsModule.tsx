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
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Download,
  Star,
  StarHalf,
  Users,
  Settings,
  Shield,
  Plug,
  Sparkles,
  Eye,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  Crown,
  Package,
  ExternalLink,
  ChevronRight,
  Link2,
  AlertCircle,
} from 'lucide-react'
import GitHubUrlVerifier, { type VerificationData } from '@/components/GitHubUrlVerifier'

// ─── Types ───────────────────────────────────────────────────────────────────

type PluginCategory = 'all' | 'ai' | 'voice' | 'vision' | 'automation' | 'development' | 'integration' | 'productivity'

interface Plugin {
  id: string
  name: string
  slug: string
  description: string
  version: string
  author: string
  category: PluginCategory
  icon: string
  isInstalled: boolean
  isEnabled: boolean
  isOfficial: boolean
  rating: number
  downloads: number
  permissions: string[]
  tags: string[]
  featured?: boolean
  configSchema?: Record<string, unknown>
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_PLUGINS: Plugin[] = [
  {
    id: 'p1',
    name: 'GPT-4 Turbo',
    slug: 'gpt4-turbo',
    description: 'Advanced reasoning model with improved accuracy and reduced latency. Supports 128K context window, function calling, and structured outputs for complex AI tasks.',
    version: '2.1.0',
    author: 'OpenAI',
    category: 'ai',
    icon: '🔮',
    isInstalled: true,
    isEnabled: true,
    isOfficial: true,
    rating: 4.8,
    downloads: 52400,
    permissions: ['api:call', 'data:read', 'data:write'],
    tags: ['llm', 'reasoning', 'chat'],
    featured: true,
  },
  {
    id: 'p2',
    name: 'DALL-E 3',
    slug: 'dalle-3',
    description: 'State-of-the-art image generation model. Create stunning visuals from text descriptions with enhanced prompt understanding and photorealistic output.',
    version: '1.5.0',
    author: 'OpenAI',
    category: 'vision',
    icon: '🎭',
    isInstalled: true,
    isEnabled: true,
    isOfficial: true,
    rating: 4.7,
    downloads: 38200,
    permissions: ['api:call', 'image:generate'],
    tags: ['image', 'generation', 'creative'],
    featured: true,
  },
  {
    id: 'p3',
    name: 'Whisper',
    slug: 'whisper',
    description: 'High-accuracy speech recognition and transcription. Supports 99 languages with automatic language detection, timestamping, and translation capabilities.',
    version: '3.2.1',
    author: 'OpenAI',
    category: 'voice',
    icon: '🎤',
    isInstalled: true,
    isEnabled: false,
    isOfficial: true,
    rating: 4.6,
    downloads: 29100,
    permissions: ['microphone', 'api:call'],
    tags: ['speech', 'transcription', 'audio'],
  },
  {
    id: 'p4',
    name: 'Web Search',
    slug: 'web-search',
    description: 'Real-time web search integration with content extraction. Access up-to-date information from across the internet with smart result parsing and summarization.',
    version: '2.0.0',
    author: 'Z.ai',
    category: 'automation',
    icon: '🔍',
    isInstalled: true,
    isEnabled: true,
    isOfficial: true,
    rating: 4.5,
    downloads: 41800,
    permissions: ['network:access', 'data:read'],
    tags: ['search', 'web', 'realtime'],
    featured: true,
  },
  {
    id: 'p5',
    name: 'Gmail Connector',
    slug: 'gmail-connector',
    description: 'Seamless Gmail integration for email management. Read, send, and organize emails directly from your AI assistant with full OAuth2 security.',
    version: '1.3.0',
    author: 'Z.ai',
    category: 'integration',
    icon: '📧',
    isInstalled: false,
    isEnabled: false,
    isOfficial: true,
    rating: 4.3,
    downloads: 15600,
    permissions: ['email:read', 'email:send', 'email:manage'],
    tags: ['email', 'gmail', 'communication'],
  },
  {
    id: 'p6',
    name: 'Calendar Sync',
    slug: 'calendar-sync',
    description: 'Smart calendar management with natural language scheduling. Create, modify, and query calendar events across Google Calendar and Outlook.',
    version: '1.2.0',
    author: 'Z.ai',
    category: 'productivity',
    icon: '📅',
    isInstalled: false,
    isEnabled: false,
    isOfficial: true,
    rating: 4.2,
    downloads: 12300,
    permissions: ['calendar:read', 'calendar:write'],
    tags: ['calendar', 'scheduling', 'productivity'],
  },
  {
    id: 'p7',
    name: 'GitHub Integration',
    slug: 'github-integration',
    description: 'Deep GitHub integration for code management. Create PRs, review code, manage issues, and trigger workflows directly from conversations.',
    version: '2.4.0',
    author: 'Z.ai',
    category: 'development',
    icon: '🐙',
    isInstalled: true,
    isEnabled: true,
    isOfficial: true,
    rating: 4.7,
    downloads: 33500,
    permissions: ['github:read', 'github:write', 'repo:access'],
    tags: ['github', 'code', 'git', 'development'],
    featured: true,
  },
  {
    id: 'p8',
    name: 'Slack Bot',
    slug: 'slack-bot',
    description: 'Team communication automation with Slack. Post messages, monitor channels, and create interactive workflows across your team workspace.',
    version: '1.6.0',
    author: 'Community',
    category: 'integration',
    icon: '💬',
    isInstalled: false,
    isEnabled: false,
    isOfficial: false,
    rating: 4.1,
    downloads: 9800,
    permissions: ['slack:read', 'slack:write', 'slack:channels'],
    tags: ['slack', 'messaging', 'team'],
  },
  {
    id: 'p9',
    name: 'Data Analyzer',
    slug: 'data-analyzer',
    description: 'Advanced data processing and statistical analysis. Load CSV/JSON data, run analyses, generate visualizations, and export reports with natural language queries.',
    version: '1.8.0',
    author: 'Community',
    category: 'productivity',
    icon: '📊',
    isInstalled: true,
    isEnabled: true,
    isOfficial: false,
    rating: 4.4,
    downloads: 18900,
    permissions: ['data:read', 'data:write', 'file:access'],
    tags: ['data', 'analysis', 'statistics', 'visualization'],
  },
  {
    id: 'p10',
    name: 'Security Scanner',
    slug: 'security-scanner',
    description: 'Automated vulnerability detection and security auditing. Scan code, dependencies, and infrastructure for known vulnerabilities and compliance issues.',
    version: '2.1.0',
    author: 'Z.ai',
    category: 'development',
    icon: '🔐',
    isInstalled: true,
    isEnabled: true,
    isOfficial: true,
    rating: 4.6,
    downloads: 27300,
    permissions: ['network:access', 'file:read', 'security:scan'],
    tags: ['security', 'vulnerability', 'audit'],
  },
  {
    id: 'p11',
    name: 'Audio Processor',
    slug: 'audio-processor',
    description: 'Comprehensive audio processing toolkit. Convert formats, apply effects, extract metadata, and perform audio analysis on various file types.',
    version: '1.1.0',
    author: 'Community',
    category: 'voice',
    icon: '🎵',
    isInstalled: false,
    isEnabled: false,
    isOfficial: false,
    rating: 3.9,
    downloads: 6200,
    permissions: ['file:read', 'file:write', 'audio:process'],
    tags: ['audio', 'processing', 'music'],
  },
  {
    id: 'p12',
    name: 'Document Parser',
    slug: 'document-parser',
    description: 'Intelligent document analysis and extraction. Parse PDFs, Word docs, and spreadsheets with OCR support and structured data output.',
    version: '1.4.0',
    author: 'Z.ai',
    category: 'productivity',
    icon: '📄',
    isInstalled: false,
    isEnabled: false,
    isOfficial: true,
    rating: 4.3,
    downloads: 21400,
    permissions: ['file:read', 'file:write'],
    tags: ['document', 'pdf', 'parsing', 'ocr'],
  },
]

const CATEGORIES: { id: PluginCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <Sparkles className="h-3 w-3" /> },
  { id: 'ai', label: 'AI Models', icon: <Sparkles className="h-3 w-3" /> },
  { id: 'voice', label: 'Voice', icon: <Plug className="h-3 w-3" /> },
  { id: 'vision', label: 'Vision', icon: <Eye className="h-3 w-3" /> },
  { id: 'automation', label: 'Automation', icon: <Settings className="h-3 w-3" /> },
  { id: 'development', label: 'Development', icon: <Package className="h-3 w-3" /> },
  { id: 'integration', label: 'Integration', icon: <ExternalLink className="h-3 w-3" /> },
  { id: 'productivity', label: 'Productivity', icon: <Plug className="h-3 w-3" /> },
]

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatDownloads(num: number) {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

function RatingStars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.5

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>
          {i < full ? (
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          ) : i === full && hasHalf ? (
            <StarHalf className="h-3 w-3 fill-amber-400 text-amber-400" />
          ) : (
            <Star className="h-3 w-3 text-muted-foreground/30" />
          )}
        </span>
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  )
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function PluginCard({
  plugin,
  onToggle,
  onSelect,
  onInstall,
}: {
  plugin: Plugin
  onToggle: (id: string, enabled: boolean) => void
  onSelect: (plugin: Plugin) => void
  onInstall: (plugin: Plugin) => void
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <Card
        className="cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
        onClick={() => onSelect(plugin)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-xl">
                {plugin.icon}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  {plugin.name}
                  {plugin.isOfficial && (
                    <Badge variant="outline" className="gap-1 text-[9px] text-primary">
                      <Crown className="h-2.5 w-2.5" /> Official
                    </Badge>
                  )}
                  {plugin.featured && (
                    <Badge variant="outline" className="gap-1 text-[9px] text-amber-400">
                      <Sparkles className="h-2.5 w-2.5" /> Featured
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="line-clamp-1 text-xs">
                  {plugin.description}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {formatDownloads(plugin.downloads)}
            </span>
            <span>v{plugin.version}</span>
            <span>{plugin.author}</span>
          </div>

          <div className="mt-2">
            <RatingStars rating={plugin.rating} />
          </div>

          <div className="mt-3 flex flex-wrap gap-1">
            {plugin.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px]">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            {plugin.isInstalled ? (
              <div className="flex items-center gap-2">
                <Switch
                  checked={plugin.isEnabled}
                  onCheckedChange={(checked) => onToggle(plugin.id, checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <span className="text-xs text-muted-foreground">
                  {plugin.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ) : (
              <Button
                size="sm"
                className="gap-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onInstall(plugin)
                }}
              >
                <Download className="h-3 w-3" />
                Install
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(plugin)
              }}
            >
              Details <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PluginDetailDialog({
  plugin,
  open,
  onOpenChange,
  onToggle,
  onInstall,
}: {
  plugin: Plugin | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onToggle: (id: string, enabled: boolean) => void
  onInstall: (plugin: Plugin) => void
}) {
  if (!plugin) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/50 bg-card/95 backdrop-blur-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-2xl">
              {plugin.icon}
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {plugin.name}
                {plugin.isOfficial && (
                  <Badge variant="outline" className="gap-1 text-[9px] text-primary">
                    <Crown className="h-2.5 w-2.5" /> Official
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                by {plugin.author} • v{plugin.version}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <p className="mt-1 text-sm text-foreground">{plugin.description}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <RatingStars rating={plugin.rating} />
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Download className="h-3 w-3" />
              {formatDownloads(plugin.downloads)} downloads
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* Permissions */}
          <div>
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              Required Permissions
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {plugin.permissions.map((perm) => (
                <Badge key={perm} variant="outline" className="text-[10px]">
                  {perm}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {plugin.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Configuration hint */}
          {plugin.isInstalled && (
            <div>
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Settings className="h-3 w-3" />
                Configuration
              </Label>
              <div className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Plugin configuration can be managed through the settings panel after enabling the plugin.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {plugin.isInstalled ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {plugin.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={plugin.isEnabled}
                onCheckedChange={(checked) => {
                  onToggle(plugin.id, checked)
                }}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          ) : (
            <Button
              className="gap-2"
              onClick={() => {
                onInstall(plugin)
                onOpenChange(false)
              }}
            >
              <Download className="h-4 w-4" />
              Install Plugin
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PluginsModule() {
  const [plugins, setPlugins] = useState<Plugin[]>(MOCK_PLUGINS)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<PluginCategory>('all')
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [view, setView] = useState<'marketplace' | 'installed' | 'url'>('marketplace')
  const [githubVerification, setGithubVerification] = useState<VerificationData | null>(null)
  const [installingFromUrl, setInstallingFromUrl] = useState(false)

  // Fetch plugins from API
  const fetchPlugins = useCallback(async () => {
    try {
      const res = await fetch('/api/plugins')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          // Merge API data with mock data for richer display
          const apiSlugs = new Set(data.map((p: { slug: string }) => p.slug))
          const merged = [
            ...data.map((p: Record<string, unknown>) => ({
              ...MOCK_PLUGINS.find((mp) => mp.slug === p.slug) || {},
              ...p,
              isInstalled: true,
              rating: (p as Record<string, unknown>).rating as number || (MOCK_PLUGINS.find((mp) => mp.slug === p.slug)?.rating ?? 4.0),
              downloads: (p as Record<string, unknown>).downloads as number || (MOCK_PLUGINS.find((mp) => mp.slug === p.slug)?.downloads ?? 0),
              icon: (p as Record<string, unknown>).icon as string || (MOCK_PLUGINS.find((mp) => mp.slug === p.slug)?.icon ?? '📦'),
              permissions: (() => { try { return JSON.parse((p as Record<string, unknown>).permissions as string || '[]') } catch { return [] } })(),
              tags: (() => { try { return JSON.parse((p as Record<string, unknown>).tags as string || '[]') } catch { return [] } })(),
              author: (p as Record<string, unknown>).author as string || (MOCK_PLUGINS.find((mp) => mp.slug === p.slug)?.author ?? 'Unknown'),
              category: (p as Record<string, unknown>).category as PluginCategory || (MOCK_PLUGINS.find((mp) => mp.slug === p.slug)?.category ?? 'productivity'),
              featured: MOCK_PLUGINS.find((mp) => mp.slug === p.slug)?.featured || false,
              isOfficial: (p as Record<string, unknown>).isOfficial as boolean || false,
            })),
            ...MOCK_PLUGINS.filter((mp) => !apiSlugs.has(mp.slug)),
          ]
          setPlugins(merged as Plugin[])
        }
      }
    } catch {
      // Use mock data on error
    }
  }, [])

  useEffect(() => {
    fetchPlugins()
  }, [fetchPlugins])

  // Filtered plugins
  const filteredPlugins = plugins.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = activeCategory === 'all' || p.category === activeCategory

    const matchesView =
      view === 'marketplace' || p.isInstalled

    return matchesSearch && matchesCategory && matchesView
  })

  const featuredPlugins = plugins.filter((p) => p.featured && !p.isInstalled)
  const installedCount = plugins.filter((p) => p.isInstalled).length
  const enabledCount = plugins.filter((p) => p.isEnabled).length

  const handleToggle = async (id: string, enabled: boolean) => {
    setLoading((prev) => ({ ...prev, [id]: true }))

    try {
      const res = await fetch(`/api/plugins/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: enabled }),
      })

      if (res.ok) {
        setPlugins((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isEnabled: enabled } : p))
        )
      } else {
        // Update locally on API error
        setPlugins((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isEnabled: enabled } : p))
        )
      }
    } catch {
      // Update locally on error
      setPlugins((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isEnabled: enabled } : p))
      )
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleInstall = async (plugin: Plugin) => {
    setLoading((prev) => ({ ...prev, [plugin.id]: true }))

    try {
      const res = await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: plugin.name,
          slug: plugin.slug,
          description: plugin.description,
          version: plugin.version,
          permissions: plugin.permissions,
          icon: plugin.icon,
          category: plugin.category,
        }),
      })

      if (res.ok) {
        const newPlugin = await res.json()
        setPlugins((prev) =>
          prev.map((p) =>
            p.id === plugin.id
              ? { ...p, isInstalled: true, isEnabled: true, id: newPlugin.id || p.id }
              : p
          )
        )
      } else {
        // Update locally on error
        setPlugins((prev) =>
          prev.map((p) =>
            p.id === plugin.id ? { ...p, isInstalled: true, isEnabled: true } : p
          )
        )
      }
    } catch {
      // Update locally on error
      setPlugins((prev) =>
        prev.map((p) =>
          p.id === plugin.id ? { ...p, isInstalled: true, isEnabled: true } : p
        )
      )
    } finally {
      setLoading((prev) => ({ ...prev, [plugin.id]: false }))
    }
  }

  const handleSelectPlugin = (plugin: Plugin) => {
    setSelectedPlugin(plugin)
    setDetailOpen(true)
  }

  // ── Install from GitHub URL ──
  const handleInstallFromGithub = async (data: VerificationData) => {
    if (!data.repoInfo) return

    setInstallingFromUrl(true)
    try {
      const repo = data.repoInfo
      const slug = repo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

      const res = await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repo.name,
          slug,
          description: repo.description || `Plugin from ${repo.full_name}`,
          version: data.packageJson?.version || '1.0.0',
          author: repo.owner.login,
          category: 'development',
          icon: '🔌',
          permissions: [],
          tags: repo.topics.slice(0, 5),
        }),
      })

      if (res.ok) {
        await fetchPlugins()
        setGithubVerification(null)
      }
    } catch {
      // Silently fail
    } finally {
      setInstallingFromUrl(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Plug className="h-5 w-5 text-primary" />
            Plugin Marketplace
          </h2>
          <p className="text-sm text-muted-foreground">
            Extend your AI OS with powerful plugins and skills
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            {installedCount} installed
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ToggleRight className="h-3 w-3 text-sky-400" />
            {enabledCount} enabled
          </Badge>
        </div>
      </div>

      {/* Featured Section */}
      {view === 'marketplace' && featuredPlugins.length > 0 && !searchQuery && activeCategory === 'all' && (
        <div className="border-b border-border/50 px-6 py-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Featured Plugins
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {featuredPlugins.map((plugin) => (
              <motion.div
                key={plugin.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="shrink-0"
              >
                <Card
                  className="w-64 cursor-pointer border-amber-500/20 bg-amber-500/5 backdrop-blur-sm"
                  onClick={() => handleSelectPlugin(plugin)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{plugin.icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{plugin.name}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {plugin.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <RatingStars rating={plugin.rating} />
                      <Button
                        size="sm"
                        className="h-7 gap-1 text-[11px]"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleInstall(plugin)
                        }}
                        disabled={loading[plugin.id]}
                      >
                        {loading[plugin.id] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Install
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="border-b border-border/50 px-6 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border/50 bg-muted/30 pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as 'marketplace' | 'installed' | 'url')}>
              <TabsList className="h-8 bg-muted/50">
                <TabsTrigger value="marketplace" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="installed" className="text-xs">Installed</TabsTrigger>
                <TabsTrigger value="url" className="text-xs gap-1"><Link2 className="h-3 w-3" />From URL</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plugin Grid / From URL */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6">
          {view === 'url' ? (
            /* From URL Tab */
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Link2 className="h-6 w-6 text-primary" />
                  <h3 className="text-lg font-semibold">Install Plugin from GitHub URL</h3>
                </div>
                <p className="text-[12px] text-muted-foreground max-w-md mx-auto">
                  Paste a GitHub repository URL and we&apos;ll verify if it&apos;s a useful Plugin, MCP, or Skill — checking compatibility, activity, and whether it&apos;s already installed.
                </p>
              </div>
              <GitHubUrlVerifier
                onVerified={setGithubVerification}
                onInstall={handleInstallFromGithub}
                installing={installingFromUrl}
                placeholder="https://github.com/owner/plugin-repo"
              />
              {!githubVerification && (
                <div className="space-y-3 pt-4">
                  <p className="text-[10px] text-muted-foreground text-center">What gets verified:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-medium">Repository Validity</p>
                        <p className="text-[10px] text-muted-foreground">Confirms the repo exists and is accessible</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-medium">Auto-Detection</p>
                        <p className="text-[10px] text-muted-foreground">Identifies if it&apos;s a Plugin, MCP, or Skill</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <Shield className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-medium">Usefulness Score</p>
                        <p className="text-[10px] text-muted-foreground">Stars, activity, docs, license analysis</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-medium">Duplicate Check</p>
                        <p className="text-[10px] text-muted-foreground">Warns if already installed in your system</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            filteredPlugins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">No plugins found</p>
              <p className="text-xs">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filteredPlugins.map((plugin) => (
                  <motion.div
                    key={plugin.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PluginCard
                      plugin={plugin}
                      onToggle={handleToggle}
                      onSelect={handleSelectPlugin}
                      onInstall={handleInstall}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
          )}
        </div>
      </ScrollArea>

      {/* Detail Dialog */}
      <PluginDetailDialog
        plugin={selectedPlugin}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onToggle={handleToggle}
        onInstall={handleInstall}
      />
    </div>
  )
}
