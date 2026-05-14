'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
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
  Clock,
  AlertCircle,
  Settings,
  Activity,
  Zap,
  Search,
  ExternalLink,
  Workflow,
  Sparkles,
  MessageCircle,
  Smartphone,
  Send,
  Loader2,
  Copy,
  Check,
  QrCode,
  Globe,
  Phone,
} from 'lucide-react'

type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending_auth'
type IntegrationCategory = 'communication' | 'productivity' | 'development' | 'automation' | 'data' | 'messaging'

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
  category: IntegrationCategory
  url?: string
  isFree?: boolean
}

// ─── Messaging Channel Config ──────────────────────────────────────────────────

interface MessagingChannel {
  id: string
  name: string
  type: string
  emoji: string
  description: string
  status: 'connected' | 'disconnected' | 'error' | 'pending_setup'
  features: string[]
  setupSteps: string[]
  color: string
  gradientFrom: string
  gradientTo: string
}

const MESSAGING_CHANNELS: MessagingChannel[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    type: 'telegram',
    emoji: '✈️',
    description: 'Chat with your AI assistant via Telegram. Send messages to your bot and get AI responses instantly.',
    status: 'pending_setup',
    features: ['Real-time chat', 'Voice messages', 'Group chats', 'Commands', 'File sharing'],
    setupSteps: [
      '1. Open Telegram and search for @BotFather',
      '2. Send /newbot and follow instructions to create a bot',
      '3. Copy the bot token (format: 123456:ABC-DEF...)',
      '4. Paste the token below and click "Configure"',
      '5. Click "Setup Webhook" to activate your bot',
    ],
    color: 'text-sky-400',
    gradientFrom: 'from-sky-500',
    gradientTo: 'to-cyan-500',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    type: 'whatsapp',
    emoji: '💬',
    description: 'Connect via WhatsApp using Twilio. Your contacts can chat with your AI assistant directly.',
    status: 'pending_setup',
    features: ['WhatsApp Business API', 'Two-way messaging', 'Media support', 'Templates', 'Auto-replies'],
    setupSteps: [
      '1. Create a Twilio account at twilio.com',
      '2. Enable WhatsApp Business API in your Twilio console',
      '3. Get your Account SID, Auth Token, and Phone Number',
      '4. Configure the webhook URL in Twilio console',
      '5. Enter your credentials below and click "Configure"',
    ],
    color: 'text-green-400',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-emerald-500',
  },
  {
    id: 'iphone',
    name: 'iPhone / iPad',
    type: 'pwa',
    emoji: '📱',
    description: 'Add AIOS to your iPhone home screen as a Progressive Web App. Works like a native app!',
    status: 'connected',
    features: ['Home screen icon', 'Standalone mode', 'Push notifications', 'Offline support', 'Dark mode'],
    setupSteps: [
      '1. Open AIOS in Safari on your iPhone',
      '2. Tap the Share button (square with arrow)',
      '3. Scroll down and tap "Add to Home Screen"',
      '4. Name it "AIOS" and tap "Add"',
      '5. AIOS now appears as an app on your home screen!',
    ],
    color: 'text-neutral-300',
    gradientFrom: 'from-neutral-400',
    gradientTo: 'to-neutral-600',
  },
]

const INTEGRATIONS: Integration[] = [
  { id: '1', name: 'Gmail', type: 'gmail', emoji: '📧', status: 'connected', lastSync: '2 min ago', description: 'Read and send emails', hasOAuth: true, capabilities: ['read', 'send', 'search'], category: 'communication' },
  { id: '2', name: 'Google Calendar', type: 'calendar', emoji: '📅', status: 'connected', lastSync: '5 min ago', description: 'Manage calendar events', hasOAuth: true, capabilities: ['read', 'create', 'update'], category: 'productivity' },
  { id: '3', name: 'Google Drive', type: 'drive', emoji: '💾', status: 'disconnected', lastSync: null, description: 'Access and manage files', hasOAuth: true, capabilities: ['read', 'write', 'share'], category: 'productivity' },
  { id: '4', name: 'Notion', type: 'notion', emoji: '📝', status: 'connected', lastSync: '1 min ago', description: 'Access Notion workspaces', hasOAuth: true, capabilities: ['read', 'write', 'search'], category: 'productivity' },
  { id: '5', name: 'Slack', type: 'slack', emoji: '💬', status: 'connected', lastSync: '30s ago', description: 'Send messages and read channels', hasOAuth: true, capabilities: ['read', 'send', 'channels'], category: 'communication' },
  { id: '6', name: 'Discord', type: 'discord', emoji: '🎮', status: 'disconnected', lastSync: null, description: 'Bot integration for Discord', hasOAuth: true, capabilities: ['read', 'send', 'moderate'], category: 'communication' },
  { id: '7', name: 'GitHub', type: 'github', emoji: '🐙', status: 'connected', lastSync: '10 min ago', description: 'Manage repos, issues, and PRs', hasOAuth: true, capabilities: ['repos', 'issues', 'prs', 'actions'], category: 'development' },
  { id: '8', name: 'GitLab', type: 'gitlab', emoji: '🦊', status: 'disconnected', lastSync: null, description: 'Access GitLab projects', hasOAuth: true, capabilities: ['repos', 'issues', 'pipelines'], category: 'development' },
  { id: '9', name: 'Jira', type: 'jira', emoji: '📋', status: 'error', lastSync: '1 hour ago', description: 'Track issues and projects', hasOAuth: true, capabilities: ['issues', 'projects', 'boards'], category: 'development' },
  { id: '10', name: 'Trello', type: 'trello', emoji: '📌', status: 'disconnected', lastSync: null, description: 'Manage boards and cards', hasOAuth: true, capabilities: ['boards', 'cards', 'lists'], category: 'productivity' },
  { id: '11', name: 'SQL Database', type: 'sql', emoji: '🗄️', status: 'connected', lastSync: 'Realtime', description: 'Direct database access', hasOAuth: false, capabilities: ['query', 'insert', 'update'], category: 'data' },
  { id: '12', name: 'REST API', type: 'rest', emoji: '🔗', status: 'pending_auth', lastSync: null, description: 'Custom REST endpoints', hasOAuth: false, capabilities: ['get', 'post', 'put', 'delete'], category: 'data' },
  // Automation Platforms
  { id: '13', name: 'Activepieces', type: 'activepieces', emoji: '🧩', status: 'disconnected', lastSync: null, description: 'Open-source workflow automation with visual builder', hasOAuth: false, capabilities: ['Workflows', 'Triggers', 'Actions', 'API'], category: 'automation', url: 'http://localhost:4200', isFree: true },
  { id: '14', name: 'Node-RED', type: 'node-red', emoji: '🔴', status: 'disconnected', lastSync: null, description: 'Flow-based programming for IoT and automation', hasOAuth: false, capabilities: ['Workflows', 'Nodes', 'Flows', 'API'], category: 'automation', url: 'http://localhost:1880', isFree: true },
  { id: '15', name: 'Huginn', type: 'huginn', emoji: '🦅', status: 'disconnected', lastSync: null, description: 'Self-hosted agent for automated data processing', hasOAuth: false, capabilities: ['Agents', 'Triggers', 'Events', 'API'], category: 'automation', url: 'http://localhost:3100', isFree: true },
  { id: '16', name: 'n8n', type: 'n8n', emoji: '⚡', status: 'disconnected', lastSync: null, description: 'Extendable workflow automation platform', hasOAuth: false, capabilities: ['Workflows', 'Triggers', 'Actions', 'API'], category: 'automation', url: 'http://localhost:5678', isFree: true },
]

const SYNC_HISTORY = [
  { id: 's1', integration: 'Gmail', action: 'Synced 12 new emails', time: '2 min ago', status: 'success' },
  { id: 's2', integration: 'Slack', action: 'Processed 5 messages', time: '30s ago', status: 'success' },
  { id: 's3', integration: 'Notion', action: 'Updated 3 pages', time: '1 min ago', status: 'success' },
  { id: 's4', integration: 'Jira', action: 'Connection timeout', time: '1 hour ago', status: 'error' },
  { id: 's5', integration: 'GitHub', action: 'Fetched 8 notifications', time: '10 min ago', status: 'success' },
  { id: 's6', integration: 'Calendar', action: 'Synced upcoming events', time: '5 min ago', status: 'success' },
]

const CATEGORY_LABELS: Record<IntegrationCategory | 'all', string> = {
  all: 'All',
  communication: 'Communication',
  productivity: 'Productivity',
  development: 'Development',
  automation: 'Automation',
  data: 'Data',
  messaging: 'Messaging',
}

// ─── Telegram Config Dialog ────────────────────────────────────────────────────

function TelegramConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [token, setToken] = useState('')
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [isSettingWebhook, setIsSettingWebhook] = useState(false)
  const [configStatus, setConfigStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [botInfo, setBotInfo] = useState<{ username: string; name: string } | null>(null)
  const [webhookStatus, setWebhookStatus] = useState<string>('')

  // Check existing config on open
  useEffect(() => {
    if (open) {
      fetch('/api/channels/telegram')
        .then(res => res.json())
        .then(data => {
          if (data.isConfigured) {
            if (data.integration) {
              setBotInfo({ username: 'configured', name: data.integration.name })
            }
            setConfigStatus('success')
          }
        })
        .catch(() => {})
    }
  }, [open])

  const handleConfigure = async () => {
    if (!token.trim()) return
    setIsConfiguring(true)
    setConfigStatus('idle')
    setErrorMessage('')
    try {
      const res = await fetch('/api/channels/telegram', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Configuration failed')
      setBotInfo(data.botInfo || { username: data.username, name: data.name })
      setConfigStatus('success')
      setToken('')
    } catch (err) {
      setConfigStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to configure')
    } finally {
      setIsConfiguring(false)
    }
  }

  const handleSetupWebhook = async () => {
    setIsSettingWebhook(true)
    try {
      const res = await fetch('/api/channels/telegram/setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Webhook setup failed')
      setWebhookStatus('Webhook configured successfully! Your bot is now active.')
    } catch (err) {
      setWebhookStatus(`Error: ${err instanceof Error ? err.message : 'Failed to setup webhook'}`)
    } finally {
      setIsSettingWebhook(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1117] border-sky-500/20 text-neutral-200 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sky-400">
            <span className="text-2xl">✈️</span>
            Telegram Bot Configuration
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            Connect your Telegram bot to chat with your AI assistant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status */}
          {configStatus === 'success' && botInfo && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="size-4 text-green-400 shrink-0" />
              <div>
                <p className="text-xs text-green-300 font-medium">Bot Connected</p>
                <p className="text-[10px] text-green-400/70">@{botInfo.username} ({botInfo.name})</p>
              </div>
            </div>
          )}

          {configStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="size-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">{errorMessage}</p>
            </div>
          )}

          {/* Setup Guide */}
          <div className="space-y-2">
            <Label className="text-neutral-400 text-xs">Setup Guide</Label>
            <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
              {MESSAGING_CHANNELS.find(c => c.id === 'telegram')?.setupSteps.map((step, i) => (
                <p key={i} className="text-[11px] text-neutral-400 leading-relaxed">{step}</p>
              ))}
            </div>
          </div>

          <Separator className="bg-neutral-800" />

          {/* Token Input */}
          <div className="space-y-2">
            <Label className="text-neutral-400 text-xs">Bot Token</Label>
            <div className="flex gap-2">
              <Input
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                type="password"
                className="flex-1 bg-neutral-900 border-neutral-700 text-sm font-mono"
              />
              <Button
                onClick={handleConfigure}
                disabled={!token.trim() || isConfiguring}
                className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5"
              >
                {isConfiguring ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Configure
              </Button>
            </div>
            <p className="text-[10px] text-neutral-600">Get your token from @BotFather on Telegram</p>
          </div>

          {/* Webhook Setup */}
          {configStatus === 'success' && (
            <div className="space-y-2">
              <Label className="text-neutral-400 text-xs">Webhook</Label>
              <Button
                onClick={handleSetupWebhook}
                disabled={isSettingWebhook}
                variant="outline"
                className="w-full border-sky-500/30 text-sky-400 hover:bg-sky-500/10 gap-1.5"
              >
                {isSettingWebhook ? <Loader2 className="size-3.5 animate-spin" /> : <Globe className="size-3.5" />}
                Setup Webhook
              </Button>
              {webhookStatus && (
                <p className={`text-[10px] ${webhookStatus.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                  {webhookStatus}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm" className="text-neutral-400">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── WhatsApp Config Dialog ────────────────────────────────────────────────────

function WhatsAppConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [accountSid, setAccountSid] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [configStatus, setConfigStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')

  // Check existing config on open
  useEffect(() => {
    if (open) {
      fetch('/api/channels/whatsapp')
        .then(res => res.json())
        .then(data => {
          if (data.configured || data.isConfigured) {
            setConfigStatus('success')
            if (data.phoneNumber) setPhoneNumber(data.phoneNumber)
            else if (data.maskedPhone) setPhoneNumber(data.maskedPhone)
            if (data.webhookUrl) setWebhookUrl(data.webhookUrl)
          }
        })
        .catch(() => {})
    }
  }, [open])

  const handleConfigure = async () => {
    if (!accountSid.trim() || !authToken.trim() || !phoneNumber.trim()) return
    setIsConfiguring(true)
    setConfigStatus('idle')
    setErrorMessage('')
    try {
      const res = await fetch('/api/channels/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: accountSid.trim(),
          authToken: authToken.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Configuration failed')
      setConfigStatus('success')
      if (data.webhookUrl) setWebhookUrl(data.webhookUrl)
      setAccountSid('')
      setAuthToken('')
    } catch (err) {
      setConfigStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to configure')
    } finally {
      setIsConfiguring(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1117] border-green-500/20 text-neutral-200 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-400">
            <span className="text-2xl">💬</span>
            WhatsApp (Twilio) Configuration
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            Connect WhatsApp via Twilio Business API
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status */}
          {configStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="size-4 text-green-400 shrink-0" />
              <p className="text-xs text-green-300 font-medium">Twilio WhatsApp connected</p>
            </div>
          )}

          {configStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="size-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">{errorMessage}</p>
            </div>
          )}

          {/* Setup Guide */}
          <div className="space-y-2">
            <Label className="text-neutral-400 text-xs">Setup Guide</Label>
            <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
              {MESSAGING_CHANNELS.find(c => c.id === 'whatsapp')?.setupSteps.map((step, i) => (
                <p key={i} className="text-[11px] text-neutral-400 leading-relaxed">{step}</p>
              ))}
            </div>
          </div>

          <Separator className="bg-neutral-800" />

          {/* Credentials */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs">Account SID</Label>
              <Input
                value={accountSid}
                onChange={e => setAccountSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="bg-neutral-900 border-neutral-700 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs">Auth Token</Label>
              <Input
                value={authToken}
                onChange={e => setAuthToken(e.target.value)}
                placeholder="Your Twilio Auth Token"
                type="password"
                className="bg-neutral-900 border-neutral-700 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs">WhatsApp Phone Number</Label>
              <Input
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="bg-neutral-900 border-neutral-700 text-sm font-mono"
              />
            </div>
          </div>

          <Button
            onClick={handleConfigure}
            disabled={!accountSid.trim() || !authToken.trim() || !phoneNumber.trim() || isConfiguring}
            className="w-full bg-green-600 hover:bg-green-700 text-white gap-1.5"
          >
            {isConfiguring ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Configure WhatsApp
          </Button>

          {/* Webhook URL for Twilio */}
          {webhookUrl && (
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs">Webhook URL (set this in Twilio Console)</Label>
              <div className="flex items-center gap-2 p-2 rounded bg-neutral-900 border border-neutral-800">
                <code className="text-[10px] text-green-400 font-mono flex-1 truncate">{webhookUrl}</code>
                <CopyButton text={webhookUrl} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm" className="text-neutral-400">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── iPhone PWA Dialog ─────────────────────────────────────────────────────────

function IphonePWADialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1117] border-neutral-500/20 text-neutral-200 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-neutral-200">
            <span className="text-2xl">📱</span>
            iPhone / iPad Setup
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            Add AIOS to your home screen as a Progressive Web App
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Already ready */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="size-4 text-green-400 shrink-0" />
            <div>
              <p className="text-xs text-green-300 font-medium">PWA Ready!</p>
              <p className="text-[10px] text-green-400/70">AIOS is already configured as a Progressive Web App</p>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="space-y-2">
            <Label className="text-neutral-400 text-xs">How to add to Home Screen</Label>
            <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
              {MESSAGING_CHANNELS.find(c => c.id === 'iphone')?.setupSteps.map((step, i) => (
                <p key={i} className="text-[11px] text-neutral-400 leading-relaxed">{step}</p>
              ))}
            </div>
          </div>

          <Separator className="bg-neutral-800" />

          {/* Features */}
          <div className="space-y-2">
            <Label className="text-neutral-400 text-xs">Features</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '🏠', label: 'Home Screen Icon' },
                { icon: '📱', label: 'Standalone Mode' },
                { icon: '🔔', label: 'Push Notifications' },
                { icon: '📴', label: 'Offline Support' },
                { icon: '🌙', label: 'Dark Mode' },
                { icon: '⚡', label: 'Fast Loading' },
              ].map(feat => (
                <div key={feat.label} className="flex items-center gap-2 p-2 rounded bg-neutral-900/40 border border-neutral-800/50">
                  <span className="text-sm">{feat.icon}</span>
                  <span className="text-[10px] text-neutral-400">{feat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QR Code hint */}
          <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 text-center">
            <QrCode className="size-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-[11px] text-neutral-400">
              Scan the QR code or open this page on your iPhone Safari browser
            </p>
            <p className="text-[10px] text-neutral-600 mt-1">
              Works best in Safari on iOS 16.4+
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm" className="text-neutral-400">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Copy Button Helper ────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 w-6 p-0 text-neutral-500 hover:text-neutral-300">
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </Button>
  )
}

// ─── Main Module ───────────────────────────────────────────────────────────────

export default function IntegrationsModule() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<IntegrationStatus | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<IntegrationCategory | 'all'>('all')
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Messaging channel dialogs
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false)
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false)
  const [iphoneDialogOpen, setIphoneDialogOpen] = useState(false)

  const automationPlatforms = integrations.filter(i => i.category === 'automation')
  const regularIntegrations = integrations.filter(i => i.category !== 'automation')

  const filteredIntegrations = regularIntegrations.filter(int => {
    const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || int.status === filterStatus
    const matchesCategory = filterCategory === 'all' || int.category === filterCategory
    return matchesSearch && matchesFilter && matchesCategory
  })

  const filteredAutomationPlatforms = automationPlatforms.filter(int => {
    const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || int.status === filterStatus
    const matchesCategory = filterCategory === 'all' || int.category === filterCategory
    return matchesSearch && matchesFilter && matchesCategory
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
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 p-6">

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

      {/* ═══════ Messaging Channels Section ═══════ */}
      <Card className="bg-[#0d1117] border-cyan-500/20 relative overflow-hidden">
        {/* Cyan gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
        <CardHeader className="pb-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                <MessageCircle className="size-4 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                  Messaging Channels
                  <Badge variant="outline" className="text-[8px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10 px-1.5 py-0">
                    <Sparkles className="size-2.5 mr-0.5" />
                    Talk to Your AI
                  </Badge>
                </CardTitle>
                <p className="text-[10px] text-neutral-500 mt-0.5">Chat with your AI assistant from any platform</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MESSAGING_CHANNELS.map(channel => (
              <div
                key={channel.id}
                className={`relative group rounded-lg border bg-neutral-900/60 hover:bg-neutral-900/80 transition-all duration-200 p-4 overflow-hidden ${
                  channel.id === 'telegram' ? 'border-sky-500/20 hover:border-sky-500/40' :
                  channel.id === 'whatsapp' ? 'border-green-500/20 hover:border-green-500/40' :
                  'border-neutral-700 hover:border-neutral-600'
                }`}
              >
                {/* Top accent gradient line */}
                <div className={`absolute top-0 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent ${
                  channel.id === 'telegram' ? 'via-sky-500/50' :
                  channel.id === 'whatsapp' ? 'via-green-500/50' :
                  'via-neutral-400/30'
                } to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

                <div className="flex items-start gap-3 mb-3">
                  <div className="relative">
                    <span className="text-2xl">{channel.emoji}</span>
                    <div className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#0d1117] ${
                      channel.status === 'connected' ? 'bg-green-500' :
                      channel.status === 'pending_setup' ? 'bg-amber-500' :
                      channel.status === 'error' ? 'bg-red-500' : 'bg-neutral-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-neutral-200 truncate">{channel.name}</p>
                    </div>
                    <p className="text-[10px] text-neutral-500">{channel.type.toUpperCase()}</p>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400 mb-3 line-clamp-2">{channel.description}</p>

                {/* Features */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {channel.features.slice(0, 3).map(feat => (
                    <span key={feat} className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                      channel.id === 'telegram' ? 'bg-sky-500/10 text-sky-400/80 border-sky-500/10' :
                      channel.id === 'whatsapp' ? 'bg-green-500/10 text-green-400/80 border-green-500/10' :
                      'bg-neutral-800/80 text-neutral-500 border-neutral-800'
                    }`}>
                      {feat}
                    </span>
                  ))}
                  {channel.features.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-neutral-800/80 text-neutral-600 border border-neutral-800">
                      +{channel.features.length - 3}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-[10px] ${
                    channel.status === 'connected' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                    channel.status === 'pending_setup' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                    'border-neutral-600/50 text-neutral-500 bg-neutral-800/50'
                  }`}>
                    {channel.status === 'connected' ? 'Ready' :
                     channel.status === 'pending_setup' ? 'Setup Required' :
                     channel.status === 'error' ? 'Error' : 'Disconnected'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-7 px-2 text-[10px] gap-1 ${
                      channel.id === 'telegram' ? 'border-sky-500/30 text-sky-400 hover:bg-sky-500/10' :
                      channel.id === 'whatsapp' ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' :
                      'border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                    }`}
                    onClick={() => {
                      if (channel.id === 'telegram') setTelegramDialogOpen(true)
                      else if (channel.id === 'whatsapp') setWhatsappDialogOpen(true)
                      else if (channel.id === 'iphone') setIphoneDialogOpen(true)
                    }}
                  >
                    <Settings className="size-3" />
                    Configure
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Automation Platforms Section */}
      <Card className="bg-[#0d1117] border-amber-500/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />
        <CardHeader className="pb-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                <Workflow className="size-4 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                  Automation Platforms
                  <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-400 bg-amber-500/10 px-1.5 py-0">
                    <Sparkles className="size-2.5 mr-0.5" />
                    Free &amp; Open Source
                  </Badge>
                </CardTitle>
                <p className="text-[10px] text-neutral-500 mt-0.5">Free alternatives for workflow automation</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredAutomationPlatforms.map(platform => (
              <div
                key={platform.id}
                className="relative group rounded-lg border border-neutral-800 bg-neutral-900/60 hover:border-amber-500/30 hover:bg-neutral-900/80 transition-all duration-200 p-4"
              >
                <div className="absolute top-0 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative">
                    <span className="text-2xl">{platform.emoji}</span>
                    <div className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#0d1117] ${getStatusColor(platform.status)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-neutral-200 truncate">{platform.name}</p>
                      <Badge variant="outline" className="text-[8px] border-green-500/30 text-green-400 bg-green-500/10 px-1.5 py-0 shrink-0">
                        Free
                      </Badge>
                    </div>
                    <p className="text-[10px] text-amber-400/70 font-mono">{platform.type}</p>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400 mb-3 line-clamp-2">{platform.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {platform.capabilities.map(cap => (
                    <span key={cap} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-400/80 border border-amber-500/10">
                      {cap}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 mb-3 px-2 py-1 rounded bg-neutral-800/50 border border-neutral-800">
                  <ExternalLink className="size-2.5 text-neutral-600 shrink-0" />
                  <span className="text-[9px] font-mono text-neutral-500 truncate">{platform.url}</span>
                </div>
                <div className="flex items-center justify-between">
                  {getStatusBadge(platform.status)}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-neutral-600 hover:text-neutral-300"
                      onClick={() => {
                        setSelectedIntegration(platform)
                        setConfigDialogOpen(true)
                      }}
                    >
                      <Settings className="size-3.5" />
                    </Button>
                    {platform.status === 'connected' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => toggleConnection(platform.id)}
                      >
                        <Unlink className="size-3.5 mr-1" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 px-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white gap-1"
                        onClick={() => {
                          if (platform.url) {
                            window.open(platform.url, '_blank', 'noopener,noreferrer')
                          }
                          toggleConnection(platform.id)
                        }}
                      >
                        <ExternalLink className="size-3" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'communication', 'productivity', 'development', 'automation', 'data'] as const).map(cat => (
            <Button
              key={cat}
              variant="ghost"
              size="sm"
              onClick={() => setFilterCategory(cat)}
              className={`text-[11px] px-3 h-8 ${filterCategory === cat ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              {CATEGORY_LABELS[cat]}
            </Button>
          ))}
          <Separator orientation="vertical" className="h-8 mx-1 bg-neutral-800" />
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
            <ScrollArea className="max-h-80">
              <div className="grid grid-cols-2 gap-3 py-4">
                {INTEGRATIONS.filter(i => i.status === 'disconnected').map(int => (
                  <button
                    key={int.id}
                    onClick={() => {
                      if (int.isFree && int.url) {
                        window.open(int.url, '_blank', 'noopener,noreferrer')
                      }
                      toggleConnection(int.id)
                      setAddDialogOpen(false)
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:border-cyan-500/30 hover:bg-neutral-800/50 transition-colors text-left"
                  >
                    <span className="text-xl">{int.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-neutral-200 truncate">{int.name}</p>
                        {int.isFree && (
                          <Badge variant="outline" className="text-[7px] border-green-500/30 text-green-400 bg-green-500/10 px-1 py-0 shrink-0">
                            Free
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-500 truncate">{int.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
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
                {selectedIntegration.isFree && (
                  <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400 bg-green-500/10">
                    Free &amp; Open Source
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
                <label className="text-xs font-medium text-neutral-400">
                  {selectedIntegration.isFree ? 'Platform URL' : 'Webhook URL'}
                </label>
                <Input
                  defaultValue={selectedIntegration.url || ''}
                  placeholder={selectedIntegration.isFree ? 'http://localhost:...' : 'https://...'}
                  className="bg-neutral-900 border-neutral-700 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Capabilities</label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedIntegration.capabilities.map(cap => (
                    <Badge key={cap} variant="outline" className={`text-[10px] ${
                      selectedIntegration.isFree
                        ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                        : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                    }`}>
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
              {selectedIntegration.url && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Platform</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] text-amber-400 hover:text-amber-300 h-7 px-2"
                    onClick={() => window.open(selectedIntegration.url!, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="size-3 mr-1" />
                    Open Dashboard
                  </Button>
                </div>
              )}
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
      </ScrollArea>

      {/* Messaging Channel Dialogs */}
      <TelegramConfigDialog open={telegramDialogOpen} onOpenChange={setTelegramDialogOpen} />
      <WhatsAppConfigDialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen} />
      <IphonePWADialog open={iphoneDialogOpen} onOpenChange={setIphoneDialogOpen} />
    </div>
  )
}
