'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Plug,
  Plus,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Settings,
  Activity,
  Zap,
  Search,
} from 'lucide-react'

type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending_auth'

interface Integration {
  id: string
  name: string
  type: string
  emoji: string
  status: IntegrationStatus
  lastSync: string | null
  description: string
  hasOAuth: boolean
  capabilities: string[]
}

const INTEGRATIONS: Integration[] = [
  { id: '1', name: 'Gmail', type: 'gmail', emoji: '📧', status: 'connected', lastSync: '2 min ago', description: 'Read and send emails', hasOAuth: true, capabilities: ['read', 'send', 'search'] },
  { id: '2', name: 'Google Calendar', type: 'calendar', emoji: '📅', status: 'connected', lastSync: '5 min ago', description: 'Manage calendar events', hasOAuth: true, capabilities: ['read', 'create', 'update'] },
  { id: '3', name: 'Google Drive', type: 'drive', emoji: '💾', status: 'disconnected', lastSync: null, description: 'Access and manage files', hasOAuth: true, capabilities: ['read', 'write', 'share'] },
  { id: '4', name: 'Notion', type: 'notion', emoji: '📝', status: 'connected', lastSync: '1 min ago', description: 'Access Notion workspaces', hasOAuth: true, capabilities: ['read', 'write', 'search'] },
  { id: '5', name: 'Slack', type: 'slack', emoji: '💬', status: 'connected', lastSync: '30s ago', description: 'Send messages and read channels', hasOAuth: true, capabilities: ['read', 'send', 'channels'] },
  { id: '6', name: 'Discord', type: 'discord', emoji: '🎮', status: 'disconnected', lastSync: null, description: 'Bot integration for Discord', hasOAuth: true, capabilities: ['read', 'send', 'moderate'] },
  { id: '7', name: 'GitHub', type: 'github', emoji: '🐙', status: 'connected', lastSync: '10 min ago', description: 'Manage repos, issues, and PRs', hasOAuth: true, capabilities: ['repos', 'issues', 'prs', 'actions'] },
  { id: '8', name: 'GitLab', type: 'gitlab', emoji: '🦊', status: 'disconnected', lastSync: null, description: 'Access GitLab projects', hasOAuth: true, capabilities: ['repos', 'issues', 'pipelines'] },
  { id: '9', name: 'Jira', type: 'jira', emoji: '📋', status: 'error', lastSync: '1 hour ago', description: 'Track issues and projects', hasOAuth: true, capabilities: ['issues', 'projects', 'boards'] },
  { id: '10', name: 'Trello', type: 'trello', emoji: '📌', status: 'disconnected', lastSync: null, description: 'Manage boards and cards', hasOAuth: true, capabilities: ['boards', 'cards', 'lists'] },
  { id: '11', name: 'SQL Database', type: 'sql', emoji: '🗄️', status: 'connected', lastSync: 'Realtime', description: 'Direct database access', hasOAuth: false, capabilities: ['query', 'insert', 'update'] },
  { id: '12', name: 'REST API', type: 'rest', emoji: '🔗', status: 'pending_auth', lastSync: null, description: 'Custom REST endpoints', hasOAuth: false, capabilities: ['get', 'post', 'put', 'delete'] },
]

const SYNC_HISTORY = [
  { id: 's1', integration: 'Gmail', action: 'Synced 12 new emails', time: '2 min ago', status: 'success' },
  { id: 's2', integration: 'Slack', action: 'Processed 5 messages', time: '30s ago', status: 'success' },
  { id: 's3', integration: 'Notion', action: 'Updated 3 pages', time: '1 min ago', status: 'success' },
  { id: 's4', integration: 'Jira', action: 'Connection timeout', time: '1 hour ago', status: 'error' },
  { id: 's5', integration: 'GitHub', action: 'Fetched 8 notifications', time: '10 min ago', status: 'success' },
  { id: 's6', integration: 'Calendar', action: 'Synced upcoming events', time: '5 min ago', status: 'success' },
]

export default function IntegrationsModule() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<IntegrationStatus | 'all'>('all')
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const filteredIntegrations = integrations.filter(int => {
    const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || int.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const connectedCount = integrations.filter(i => i.status === 'connected').length
  const errorCount = integrations.filter(i => i.status === 'error').length

  const toggleConnection = useCallback((id: string) => {
    setIntegrations(prev => prev.map(int => {
      if (int.id === id) {
        const newStatus: IntegrationStatus = int.status === 'connected' ? 'disconnected' : 'connected'
        return { ...int, status: newStatus, lastSync: newStatus === 'connected' ? 'Just now' : null }
      }
      return int
    }))
  }, [])

  const getStatusColor = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'disconnected': return 'bg-neutral-600'
      case 'error': return 'bg-red-500'
      case 'pending_auth': return 'bg-amber-500'
    }
  }

  const getStatusBadge = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400 bg-green-500/10">Connected</Badge>
      case 'disconnected':
        return <Badge variant="outline" className="text-[10px] border-neutral-600/50 text-neutral-500 bg-neutral-800/50">Disconnected</Badge>
      case 'error':
        return <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10">Error</Badge>
      case 'pending_auth':
        return <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">Auth Required</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="size-3.5 text-green-400" />
      case 'error': return <AlertCircle className="size-3.5 text-red-400" />
      default: return <Clock className="size-3.5 text-neutral-400" />
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-[#0d1117] border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Plug className="size-4 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-100">{connectedCount}</p>
              <p className="text-[10px] text-neutral-500">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0d1117] border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-700/20 border border-neutral-600/20">
              <Unlink className="size-4 text-neutral-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-100">{integrations.filter(i => i.status === 'disconnected').length}</p>
              <p className="text-[10px] text-neutral-500">Disconnected</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0d1117] border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="size-4 text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-100">{errorCount}</p>
              <p className="text-[10px] text-neutral-500">Errors</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0d1117] border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Zap className="size-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-100">{integrations.length}</p>
              <p className="text-[10px] text-neutral-500">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#0d1117] border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-600"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'connected', 'disconnected', 'error', 'pending_auth'] as const).map(status => (
            <Button
              key={status}
              variant="ghost"
              size="sm"
              onClick={() => setFilterStatus(status)}
              className={`text-[11px] px-3 h-8 ${filterStatus === status ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              {status === 'all' ? 'All' : status === 'pending_auth' ? 'Auth' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1.5 h-8">
              <Plus className="size-3.5" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0d1117] border-neutral-800 text-neutral-200">
            <DialogHeader>
              <DialogTitle>Add Integration</DialogTitle>
              <DialogDescription className="text-neutral-500">
                Connect a new service to your AI OS
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-4">
              {INTEGRATIONS.filter(i => i.status === 'disconnected').map(int => (
                <button
                  key={int.id}
                  onClick={() => {
                    toggleConnection(int.id)
                    setAddDialogOpen(false)
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:border-cyan-500/30 hover:bg-neutral-800/50 transition-colors text-left"
                >
                  <span className="text-xl">{int.emoji}</span>
                  <div>
                    <p className="text-xs font-medium text-neutral-200">{int.name}</p>
                    <p className="text-[10px] text-neutral-500">{int.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" size="sm" className="text-neutral-400">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredIntegrations.map(int => (
          <Card
            key={int.id}
            className={`bg-[#0d1117] border-neutral-800 hover:border-neutral-700 transition-all duration-200 group ${
              int.status === 'connected' ? 'hover:shadow-lg hover:shadow-green-500/5' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="text-2xl">{int.emoji}</span>
                    <div className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#0d1117] ${getStatusColor(int.status)}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-200">{int.name}</p>
                    <p className="text-[10px] text-neutral-500">{int.type.toUpperCase()}</p>
                  </div>
                </div>
                {int.hasOAuth && (
                  <Badge variant="outline" className="text-[8px] border-neutral-700 text-neutral-500 px-1.5 py-0">
                    OAuth
                  </Badge>
                )}
              </div>

              <p className="text-[11px] text-neutral-400 mb-3 line-clamp-1">{int.description}</p>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1 mb-3">
                {int.capabilities.slice(0, 3).map(cap => (
                  <span key={cap} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-neutral-800/80 text-neutral-500 border border-neutral-800">
                    {cap}
                  </span>
                ))}
                {int.capabilities.length > 3 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-neutral-800/80 text-neutral-600 border border-neutral-800">
                    +{int.capabilities.length - 3}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {getStatusBadge(int.status)}
                  {int.lastSync && (
                    <span className="text-[9px] text-neutral-600 flex items-center gap-1">
                      <Clock className="size-2.5" />
                      {int.lastSync}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-neutral-600 hover:text-neutral-300"
                    onClick={() => {
                      setSelectedIntegration(int)
                      setConfigDialogOpen(true)
                    }}
                  >
                    <Settings className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-2 text-[10px] ${
                      int.status === 'connected'
                        ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10'
                        : 'text-green-400/70 hover:text-green-400 hover:bg-green-500/10'
                    }`}
                    onClick={() => toggleConnection(int.id)}
                  >
                    {int.status === 'connected' ? (
                      <Unlink className="size-3.5 mr-1" />
                    ) : (
                      <Link2 className="size-3.5 mr-1" />
                    )}
                    {int.status === 'connected' ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sync History */}
      <Card className="bg-[#0d1117] border-neutral-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <Activity className="size-4 text-cyan-400" />
              Sync History
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-[10px] text-neutral-500 h-7">
              <RefreshCw className="size-3 mr-1" />
              Refresh All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-40">
            <div className="px-6 pb-4 space-y-1">
              {SYNC_HISTORY.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-neutral-800/50 last:border-0">
                  {getStatusIcon(entry.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-300">
                      <span className="font-medium text-neutral-200">{entry.integration}</span> — {entry.action}
                    </p>
                  </div>
                  <span className="text-[10px] text-neutral-600 shrink-0">{entry.time}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="bg-[#0d1117] border-neutral-800 text-neutral-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIntegration && (
                <>
                  <span className="text-xl">{selectedIntegration.emoji}</span>
                  {selectedIntegration.name} Configuration
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-neutral-500">
              Manage integration settings and connection
            </DialogDescription>
          </DialogHeader>
          {selectedIntegration && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedIntegration.status)}
                {selectedIntegration.hasOAuth && (
                  <Badge variant="outline" className="text-[10px] border-neutral-700 text-neutral-500">
                    OAuth 2.0 Enabled
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Name</label>
                <Input
                  defaultValue={selectedIntegration.name}
                  className="bg-neutral-900 border-neutral-700 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Webhook URL</label>
                <Input
                  placeholder="https://..."
                  className="bg-neutral-900 border-neutral-700 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Capabilities</label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedIntegration.capabilities.map(cap => (
                    <Badge key={cap} variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator className="bg-neutral-800" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Last synced</span>
                <span className="text-xs text-neutral-300">{selectedIntegration.lastSync || 'Never'}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="text-neutral-400">Cancel</Button>
            </DialogClose>
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
