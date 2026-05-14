'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Search,
  Download,
  Star,
  Settings,
  Shield,
  Server,
  Package,
  Loader2,
  Play,
  Square,
  Trash2,
  Wrench,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Wifi,
  Cable,
  Radio,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type MCPCategory = 'all' | 'database' | 'file' | 'web' | 'ai' | 'communication' | 'automation' | 'development' | 'utility'
type TransportType = 'stdio' | 'sse' | 'websocket'

interface MCPSearchResult {
  name: string
  fullName?: string
  description: string
  url?: string
  stars: number
  language?: string
  category: string
  transportType: TransportType
  packageName: string
  command?: string
  args?: string
  source?: string
}

interface InstalledMCPServer {
  id: string
  name: string
  slug: string
  description?: string | null
  version?: string | null
  author?: string | null
  category?: string | null
  icon?: string | null
  tags?: string | null
  permissions?: string | null
  config?: string | null
  sourceType: string
  repoUrl?: string | null
  packageName?: string | null
  transportType: string
  command?: string | null
  args?: string | null
  envVars?: string | null
  isInstalled: boolean
  isEnabled: boolean
  isRunning: boolean
  isVerified: boolean
  stars?: number | null
  createdAt: string
  updatedAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: { id: MCPCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '📦' },
  { id: 'database', label: 'Database', icon: '🗄️' },
  { id: 'file', label: 'File', icon: '📁' },
  { id: 'web', label: 'Web', icon: '🌐' },
  { id: 'ai', label: 'AI', icon: '🤖' },
  { id: 'communication', label: 'Communication', icon: '💬' },
  { id: 'automation', label: 'Automation', icon: '⚡' },
  { id: 'development', label: 'Development', icon: '🛠️' },
  { id: 'utility', label: 'Utility', icon: '🔧' },
]

const CATEGORY_ICONS: Record<string, string> = {
  database: '🗄️',
  file: '📁',
  web: '🌐',
  ai: '🤖',
  communication: '💬',
  automation: '⚡',
  development: '🛠️',
  utility: '🔧',
}

const TRANSPORT_CONFIG: Record<TransportType, { label: string; icon: React.ReactNode; color: string }> = {
  stdio: { label: 'STDIO', icon: <Cable className="h-3 w-3" />, color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  sse: { label: 'SSE', icon: <Radio className="h-3 w-3" />, color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
  websocket: { label: 'WebSocket', icon: <Wifi className="h-3 w-3" />, color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function formatStars(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

function parseJsonField<T>(field: string | null | undefined, fallback: T): T {
  if (!field) return fallback
  try {
    return JSON.parse(field) as T
  } catch {
    return fallback
  }
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function TransportBadge({ type }: { type: string }) {
  const config = TRANSPORT_CONFIG[type as TransportType] || TRANSPORT_CONFIG.stdio
  return (
    <Badge variant="outline" className={`gap-1 text-[9px] ${config.color}`}>
      {config.icon}
      {config.label}
    </Badge>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const icon = CATEGORY_ICONS[category] || '📦'
  return (
    <Badge variant="secondary" className="gap-1 text-[9px]">
      <span className="text-[10px]">{icon}</span>
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </Badge>
  )
}

// ─── Registry Card ───────────────────────────────────────────────────────────

function RegistryCard({
  server,
  isInstalled,
  isInstalling,
  onInstall,
}: {
  server: MCPSearchResult
  isInstalled: boolean
  isInstalling: boolean
  onInstall: (server: MCPSearchResult) => void
}) {
  return (
    <Card className="border-neutral-800 bg-[#0d1117] backdrop-blur-sm transition-all hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/10 text-xl">
              {CATEGORY_ICONS[server.category] || '📦'}
            </div>
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="truncate">{server.name}</span>
              </CardTitle>
              <CardDescription className="line-clamp-1 text-xs">
                {server.fullName || server.author || 'Community'}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{server.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <TransportBadge type={server.transportType} />
          <CategoryBadge category={server.category} />
        </div>

        {server.packageName && (
          <p className="mt-2 truncate text-[10px] font-mono text-muted-foreground/60">
            {server.packageName}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 text-amber-400" />
            <span>{formatStars(server.stars)}</span>
          </div>
          {isInstalled ? (
            <Badge variant="outline" className="gap-1 text-[10px] text-emerald-400 border-emerald-400/30">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Installed
            </Badge>
          ) : (
            <Button
              size="sm"
              className="gap-1 bg-amber-500 text-xs text-black hover:bg-amber-400"
              disabled={isInstalling}
              onClick={() => onInstall(server)}
            >
              {isInstalling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              Install
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Installed Card ──────────────────────────────────────────────────────────

function InstalledCard({
  server,
  isToggling,
  onToggleEnabled,
  onToggleRunning,
  onConfigure,
  onUninstall,
}: {
  server: InstalledMCPServer
  isToggling: boolean
  onToggleEnabled: (id: string, enabled: boolean) => void
  onToggleRunning: (id: string, running: boolean) => void
  onConfigure: (server: InstalledMCPServer) => void
  onUninstall: (server: InstalledMCPServer) => void
}) {
  return (
    <Card className="border-neutral-800 bg-[#0d1117] backdrop-blur-sm transition-all hover:border-amber-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/10 text-xl">
              {(server.icon as string) || CATEGORY_ICONS[server.category || ''] || '📦'}
            </div>
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="truncate">{server.name}</span>
                {server.isRunning && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <CardDescription className="text-xs">
                  {server.author || 'Unknown'}
                </CardDescription>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className={`gap-1 text-[9px] ${
                server.isRunning
                  ? 'text-emerald-400 border-emerald-400/30'
                  : server.isEnabled
                  ? 'text-amber-400 border-amber-400/30'
                  : 'text-neutral-500 border-neutral-600'
              }`}
            >
              {server.isRunning ? 'Running' : server.isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {server.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{server.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <TransportBadge type={server.transportType} />
          {server.category && <CategoryBadge category={server.category} />}
          {server.version && (
            <Badge variant="outline" className="text-[9px] text-neutral-400">
              v{server.version}
            </Badge>
          )}
        </div>

        <Separator className="my-3 bg-neutral-800" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={server.isEnabled}
                onCheckedChange={(checked) => onToggleEnabled(server.id, checked)}
                disabled={isToggling}
                className="data-[state=checked]:bg-amber-500"
              />
              <span className="text-[10px] text-muted-foreground">
                {server.isEnabled ? 'On' : 'Off'}
              </span>
            </div>

            {/* Start/Stop Button */}
            {server.isEnabled && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 gap-1 text-[11px] ${
                  server.isRunning
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-400/10'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10'
                }`}
                onClick={() => onToggleRunning(server.id, !server.isRunning)}
                disabled={isToggling}
              >
                {isToggling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : server.isRunning ? (
                  <Square className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {server.isRunning ? 'Stop' : 'Start'}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Configure */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-amber-400"
              onClick={() => onConfigure(server)}
            >
              <Wrench className="h-3 w-3" />
            </Button>

            {/* Uninstall */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-red-400"
              onClick={() => onUninstall(server)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Install Confirmation Dialog ─────────────────────────────────────────────

function InstallDialog({
  server,
  open,
  onOpenChange,
  onConfirm,
  isInstalling,
}: {
  server: MCPSearchResult | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  isInstalling: boolean
}) {
  if (!server) return null

  const parsedArgs = parseJsonField<string[]>(server.args, [])
  const envVarHints: string[] = []
  // Detect common env vars from package name patterns
  if (server.packageName?.includes('github')) envVarHints.push('GITHUB_PERSONAL_ACCESS_TOKEN')
  if (server.packageName?.includes('brave')) envVarHints.push('BRAVE_API_KEY')
  if (server.packageName?.includes('slack')) envVarHints.push('SLACK_BOT_TOKEN', 'SLACK_TEAM_ID')
  if (server.packageName?.includes('postgres')) envVarHints.push('POSTGRES_CONNECTION_STRING')
  if (server.packageName?.includes('gdrive')) envVarHints.push('GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET')

  const requiredPermissions: string[] = []
  if (server.category === 'database') requiredPermissions.push('network:access', 'data:read', 'data:write')
  if (server.category === 'file') requiredPermissions.push('file:read', 'file:write')
  if (server.category === 'web') requiredPermissions.push('network:access')
  if (server.category === 'automation') requiredPermissions.push('network:access', 'browser:control')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-[#0d1117] backdrop-blur-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-2xl">
              {CATEGORY_ICONS[server.category] || '📦'}
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2 text-amber-400">
                {server.name}
              </DialogTitle>
              <DialogDescription>
                by {server.fullName || 'Community'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <p className="mt-1 text-sm text-foreground">{server.description}</p>
          </div>

          <Separator className="bg-neutral-800" />

          {/* Transport & Command */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Transport</Label>
              <div className="mt-1">
                <TransportBadge type={server.transportType} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Command</Label>
              <p className="mt-1 text-xs font-mono text-foreground">
                {server.command || 'npx'}
              </p>
            </div>
          </div>

          {parsedArgs.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Arguments</Label>
              <div className="mt-1 rounded-md border border-neutral-800 bg-neutral-900/50 p-2">
                <code className="text-[10px] text-amber-300/80">
                  {parsedArgs.join(' ')}
                </code>
              </div>
            </div>
          )}

          {/* Required Environment Variables */}
          {envVarHints.length > 0 && (
            <div>
              <Label className="flex items-center gap-2 text-xs text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Required Environment Variables
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {envVarHints.map((env) => (
                  <Badge key={env} variant="outline" className="text-[10px] border-amber-400/30 text-amber-300">
                    {env}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Permissions */}
          {requiredPermissions.length > 0 && (
            <div>
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                Permissions
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {requiredPermissions.map((perm) => (
                  <Badge key={perm} variant="outline" className="text-[10px]">
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-neutral-700">
              Cancel
            </Button>
          </DialogClose>
          <Button
            className="gap-2 bg-amber-500 text-black hover:bg-amber-400"
            onClick={onConfirm}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Confirm Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Configure Dialog ────────────────────────────────────────────────────────

function ConfigureDialog({
  server,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  server: InstalledMCPServer | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (id: string, updates: { envVars?: Record<string, string>; args?: string[]; command?: string }) => void
  isSaving: boolean
}) {
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [args, setArgs] = useState<string[]>([])
  const [command, setCommand] = useState('')

  useEffect(() => {
    if (server) {
      const sync = () => {
        setEnvVars(parseJsonField<Record<string, string>>(server.envVars, {}))
        setArgs(parseJsonField<string[]>(server.args, []))
        setCommand(server.command || '')
      }
      sync()
    }
  }, [server])

  if (!server) return null

  const handleAddEnvVar = () => {
    setEnvVars((prev) => ({ ...prev, ['']: '' }))
  }

  const handleRemoveEnvVar = (key: string) => {
    setEnvVars((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleEnvKeyChange = (oldKey: string, newKey: string) => {
    setEnvVars((prev) => {
      const entries = Object.entries(prev)
      const updated = entries.map(([k, v]) => (k === oldKey ? [newKey, v] : [k, v]))
      return Object.fromEntries(updated)
    })
  }

  const handleEnvValueChange = (key: string, value: string) => {
    setEnvVars((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddArg = () => {
    setArgs((prev) => [...prev, ''])
  }

  const handleRemoveArg = (index: number) => {
    setArgs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleArgChange = (index: number, value: string) => {
    setArgs((prev) => prev.map((a, i) => (i === index ? value : a)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-[#0d1117] backdrop-blur-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Settings className="h-5 w-5" />
            Configure {server.name}
          </DialogTitle>
          <DialogDescription>
            Modify server configuration, environment variables, and arguments
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-4 pr-4">
            {/* Command */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Command</Label>
              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="border-neutral-800 bg-neutral-900/50 font-mono text-xs"
                placeholder="npx"
              />
            </div>

            {/* Arguments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Arguments</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-amber-400 hover:text-amber-300"
                  onClick={handleAddArg}
                >
                  + Add Arg
                </Button>
              </div>
              <div className="space-y-1.5">
                {args.map((arg, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      value={arg}
                      onChange={(e) => handleArgChange(i, e.target.value)}
                      className="h-7 border-neutral-800 bg-neutral-900/50 font-mono text-[11px]"
                      placeholder={`arg[${i}]`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-neutral-500 hover:text-red-400"
                      onClick={() => handleRemoveArg(i)}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {args.length === 0 && (
                  <p className="text-[10px] text-neutral-600">No arguments configured</p>
                )}
              </div>
            </div>

            <Separator className="bg-neutral-800" />

            {/* Environment Variables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Environment Variables</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-amber-400 hover:text-amber-300"
                  onClick={handleAddEnvVar}
                >
                  + Add Var
                </Button>
              </div>
              <div className="space-y-1.5">
                {Object.entries(envVars).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <Input
                      value={key}
                      onChange={(e) => handleEnvKeyChange(key, e.target.value)}
                      className="h-7 w-1/3 border-neutral-800 bg-neutral-900/50 font-mono text-[11px]"
                      placeholder="KEY"
                    />
                    <Input
                      value={value}
                      onChange={(e) => handleEnvValueChange(key, e.target.value)}
                      className="h-7 flex-1 border-neutral-800 bg-neutral-900/50 font-mono text-[11px]"
                      placeholder="value"
                      type="password"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-neutral-500 hover:text-red-400"
                      onClick={() => handleRemoveEnvVar(key)}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {Object.keys(envVars).length === 0 && (
                  <p className="text-[10px] text-neutral-600">No environment variables configured</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-neutral-700">
              Cancel
            </Button>
          </DialogClose>
          <Button
            className="gap-2 bg-amber-500 text-black hover:bg-amber-400"
            onClick={() => onSave(server.id, { envVars, args, command })}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Uninstall Confirmation Dialog ───────────────────────────────────────────

function UninstallDialog({
  server,
  open,
  onOpenChange,
  onConfirm,
  isUninstalling,
}: {
  server: InstalledMCPServer | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  isUninstalling: boolean
}) {
  if (!server) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-[#0d1117] backdrop-blur-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <Trash2 className="h-5 w-5" />
            Uninstall {server.name}
          </DialogTitle>
          <DialogDescription>
            This will remove the MCP server and all its configuration. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>{server.name}</strong> will be permanently removed from your system.
                {server.isRunning && ' The running server will be stopped first.'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-neutral-700">
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={onConfirm}
            disabled={isUninstalling}
          >
            {isUninstalling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Uninstall
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MCPModule() {
  // State
  const [activeTab, setActiveTab] = useState<string>('registry')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<MCPCategory>('all')
  const [registryResults, setRegistryResults] = useState<MCPSearchResult[]>([])
  const [installedServers, setInstalledServers] = useState<InstalledMCPServer[]>([])
  const [registryLoading, setRegistryLoading] = useState(false)
  const [installedLoading, setInstalledLoading] = useState(true)
  const [installingSlug, setInstallingSlug] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Dialogs
  const [installDialogOpen, setInstallDialogOpen] = useState(false)
  const [selectedForInstall, setSelectedForInstall] = useState<MCPSearchResult | null>(null)
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false)
  const [selectedForConfigure, setSelectedForConfigure] = useState<InstalledMCPServer | null>(null)
  const [uninstallDialogOpen, setUninstallDialogOpen] = useState(false)
  const [selectedForUninstall, setSelectedForUninstall] = useState<InstalledMCPServer | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUninstalling, setIsUninstalling] = useState(false)

  // ─── Fetch Installed Servers ──────────────────────────────────────────────

  const fetchInstalled = useCallback(async () => {
    try {
      setInstalledLoading(true)
      setError(null)
      const res = await fetch('/api/mcp')
      if (res.ok) {
        const data = await res.json()
        setInstalledServers(Array.isArray(data) ? data : [])
      } else {
        setError('Failed to load installed servers')
        setInstalledServers([])
      }
    } catch {
      setError('Failed to load installed servers')
      setInstalledServers([])
    } finally {
      setInstalledLoading(false)
    }
  }, [])

  // ─── Search Registry ──────────────────────────────────────────────────────

  const searchRegistry = useCallback(async (query: string) => {
    try {
      setRegistryLoading(true)
      setError(null)
      const url = query ? `/api/mcp/search?q=${encodeURIComponent(query)}` : '/api/mcp/search'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRegistryResults(data.results || [])
      } else {
        setError('Failed to search MCP registry')
        setRegistryResults([])
      }
    } catch {
      setError('Failed to search MCP registry')
      setRegistryResults([])
    } finally {
      setRegistryLoading(false)
    }
  }, [])

  // ─── Initial Load ─────────────────────────────────────────────────────────

  useEffect(() => {
    fetchInstalled()
    searchRegistry('')
  }, [fetchInstalled, searchRegistry])

  // ─── Debounced Search ─────────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      searchRegistry(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchRegistry])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const installedSlugs = new Set(installedServers.map((s) => s.slug))

  const filteredRegistryResults = registryResults.filter((r) => {
    if (activeCategory === 'all') return true
    return r.category === activeCategory
  })

  const filteredInstalled = installedServers.filter((s) => {
    if (activeCategory === 'all') return true
    return s.category === activeCategory
  })

  // ─── Install ──────────────────────────────────────────────────────────────

  const handleInstallClick = (server: MCPSearchResult) => {
    setSelectedForInstall(server)
    setInstallDialogOpen(true)
  }

  const handleConfirmInstall = async () => {
    if (!selectedForInstall) return

    const slug = generateSlug(selectedForInstall.name)
    setInstallingSlug(slug)

    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedForInstall.name,
          slug,
          description: selectedForInstall.description,
          version: '1.0.0',
          author: selectedForInstall.fullName || 'Community',
          category: selectedForInstall.category,
          sourceType: selectedForInstall.source || 'registry',
          repoUrl: selectedForInstall.url || null,
          packageName: selectedForInstall.packageName || null,
          transportType: selectedForInstall.transportType,
          command: selectedForInstall.command || 'npx',
          args: selectedForInstall.args ? JSON.parse(selectedForInstall.args) : selectedForInstall.packageName ? [selectedForInstall.packageName] : [],
          envVars: {},
          permissions: [],
          config: {},
          icon: CATEGORY_ICONS[selectedForInstall.category] || '📦',
          tags: [selectedForInstall.category],
        }),
      })

      if (res.ok) {
        // Refresh both lists
        await fetchInstalled()
        await searchRegistry(searchQuery)
      }
    } catch {
      // Silently fail
    } finally {
      setInstallingSlug(null)
      setInstallDialogOpen(false)
      setSelectedForInstall(null)
    }
  }

  // ─── Toggle Enabled ───────────────────────────────────────────────────────

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/mcp/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: enabled }),
      })
      if (res.ok) {
        setInstalledServers((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isEnabled: enabled, isRunning: enabled ? s.isRunning : false } : s))
        )
      }
    } catch {
      // Silently fail
    } finally {
      setTogglingId(null)
    }
  }

  // ─── Toggle Running ───────────────────────────────────────────────────────

  const handleToggleRunning = async (id: string, running: boolean) => {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/mcp/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRunning: running }),
      })
      if (res.ok) {
        setInstalledServers((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isRunning: running } : s))
        )
      }
    } catch {
      // Silently fail
    } finally {
      setTogglingId(null)
    }
  }

  // ─── Configure ────────────────────────────────────────────────────────────

  const handleConfigure = (server: InstalledMCPServer) => {
    setSelectedForConfigure(server)
    setConfigureDialogOpen(true)
  }

  const handleSaveConfig = async (id: string, updates: { envVars?: Record<string, string>; args?: string[]; command?: string }) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/mcp/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envVars: updates.envVars,
          args: updates.args,
          command: updates.command,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setInstalledServers((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
        )
        setConfigureDialogOpen(false)
        setSelectedForConfigure(null)
      }
    } catch {
      // Silently fail
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Uninstall ────────────────────────────────────────────────────────────

  const handleUninstallClick = (server: InstalledMCPServer) => {
    setSelectedForUninstall(server)
    setUninstallDialogOpen(true)
  }

  const handleConfirmUninstall = async () => {
    if (!selectedForUninstall) return

    setIsUninstalling(true)
    try {
      const res = await fetch(`/api/mcp/${selectedForUninstall.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setInstalledServers((prev) =>
          prev.filter((s) => s.id !== selectedForUninstall.id)
        )
        // Refresh registry to update "Installed" badges
        await searchRegistry(searchQuery)
      }
    } catch {
      // Silently fail
    } finally {
      setIsUninstalling(false)
      setUninstallDialogOpen(false)
      setSelectedForUninstall(null)
    }
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  const runningCount = installedServers.filter((s) => s.isRunning).length
  const enabledCount = installedServers.filter((s) => s.isEnabled).length

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Server className="h-5 w-5 text-amber-400" />
            MCP Registry
          </h2>
          <p className="text-sm text-muted-foreground">
            Browse, install, and manage Model Context Protocol servers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-amber-400/30 text-amber-400">
            <Package className="h-3 w-3" />
            {installedServers.length} installed
          </Badge>
          <Badge variant="outline" className="gap-1 border-emerald-400/30 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {runningCount} running
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-400"
            onClick={() => { fetchInstalled(); searchRegistry(searchQuery) }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="border-b border-neutral-800 px-6 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search MCP servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-neutral-800 bg-neutral-900/50 pl-9"
            />
            {registryLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-amber-400" />
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-black'
                  : 'bg-neutral-800/50 text-muted-foreground hover:bg-neutral-800 hover:text-foreground'
              }`}
            >
              <span className="text-[10px]">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-neutral-800 px-6">
          <TabsList className="h-9 bg-transparent p-0">
            <TabsTrigger
              value="registry"
              className="relative rounded-none border-b-2 border-transparent px-4 pb-2.5 pt-2 text-xs data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:shadow-none"
            >
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Registry
            </TabsTrigger>
            <TabsTrigger
              value="installed"
              className="relative rounded-none border-b-2 border-transparent px-4 pb-2.5 pt-2 text-xs data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:shadow-none"
            >
              <Package className="mr-1.5 h-3.5 w-3.5" />
              Installed
              {installedServers.length > 0 && (
                <Badge variant="outline" className="ml-1.5 h-4 min-w-4 rounded-full px-1 text-[9px] border-amber-400/30 text-amber-400">
                  {installedServers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Registry Tab */}
        <TabsContent value="registry" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              {error && !registryLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertTriangle className="mb-3 h-12 w-12 text-amber-400/50" />
                  <p className="text-sm">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-neutral-700 text-xs"
                    onClick={() => searchRegistry(searchQuery)}
                  >
                    <RefreshCw className="mr-1.5 h-3 w-3" />
                    Retry
                  </Button>
                </div>
              ) : !registryLoading && filteredRegistryResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="mb-3 h-12 w-12 opacity-30" />
                  <p className="text-sm">No MCP servers found</p>
                  <p className="text-xs">Try adjusting your search or category filter</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {registryLoading && filteredRegistryResults.length === 0
                    ? // Loading skeletons
                      Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="animate-pulse border-neutral-800 bg-[#0d1117]">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-neutral-800" />
                              <div className="space-y-2">
                                <div className="h-4 w-28 rounded bg-neutral-800" />
                                <div className="h-3 w-20 rounded bg-neutral-800/60" />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              <div className="h-3 w-full rounded bg-neutral-800/40" />
                              <div className="h-3 w-3/4 rounded bg-neutral-800/40" />
                            </div>
                            <div className="mt-3 flex gap-1.5">
                              <div className="h-5 w-14 rounded-full bg-neutral-800/40" />
                              <div className="h-5 w-16 rounded-full bg-neutral-800/40" />
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    : filteredRegistryResults.map((server) => {
                        const slug = generateSlug(server.name)
                        return (
                          <RegistryCard
                            key={server.packageName || server.name}
                            server={server}
                            isInstalled={installedSlugs.has(slug)}
                            isInstalling={installingSlug === slug}
                            onInstall={handleInstallClick}
                          />
                        )
                      })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Installed Tab */}
        <TabsContent value="installed" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              {installedLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="animate-pulse border-neutral-800 bg-[#0d1117]">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-neutral-800" />
                          <div className="space-y-2">
                            <div className="h-4 w-28 rounded bg-neutral-800" />
                            <div className="h-3 w-20 rounded bg-neutral-800/60" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="h-3 w-full rounded bg-neutral-800/40" />
                        <div className="mt-3 flex gap-1.5">
                          <div className="h-5 w-14 rounded-full bg-neutral-800/40" />
                          <div className="h-5 w-16 rounded-full bg-neutral-800/40" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredInstalled.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="mb-3 h-12 w-12 opacity-30" />
                  <p className="text-sm">No MCP servers installed</p>
                  <p className="text-xs">
                    Browse the registry to find and install MCP servers
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-neutral-700 text-xs"
                    onClick={() => setActiveTab('registry')}
                  >
                    <Search className="mr-1.5 h-3 w-3" />
                    Browse Registry
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredInstalled.map((server) => (
                    <InstalledCard
                      key={server.id}
                      server={server}
                      isToggling={togglingId === server.id}
                      onToggleEnabled={handleToggleEnabled}
                      onToggleRunning={handleToggleRunning}
                      onConfigure={handleConfigure}
                      onUninstall={handleUninstallClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InstallDialog
        server={selectedForInstall}
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        onConfirm={handleConfirmInstall}
        isInstalling={!!installingSlug}
      />

      <ConfigureDialog
        server={selectedForConfigure}
        open={configureDialogOpen}
        onOpenChange={setConfigureDialogOpen}
        onSave={handleSaveConfig}
        isSaving={isSaving}
      />

      <UninstallDialog
        server={selectedForUninstall}
        open={uninstallDialogOpen}
        onOpenChange={setUninstallDialogOpen}
        onConfirm={handleConfirmUninstall}
        isUninstalling={isUninstalling}
      />
    </div>
  )
}
