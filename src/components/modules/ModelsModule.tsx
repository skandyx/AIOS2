'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
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
import { Separator } from '@/components/ui/separator'
import {
  Brain,
  Cpu,
  Sparkles,
  Zap,
  Eye,
  Code2,
  ArrowRightLeft,
  Settings,
  Check,
  Star,
  TrendingUp,
  Gauge,
  Coins,
  Server,
  Activity,
  ChevronDown,
  Layers,
  Wifi,
  WifiOff,
  GripVertical,
  Key,
  EyeOff,
  Eye as EyeIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Save,
  ExternalLink,
} from 'lucide-react'

type Provider = 'OpenAI' | 'Anthropic' | 'Mistral' | 'Google' | 'DeepSeek' | 'Local' | 'Grok' | 'OpenRouter'

interface AIModel {
  id: string
  name: string
  provider: Provider
  emoji: string
  providerColor: string
  description: string
  capabilities: ('chat' | 'code' | 'reasoning' | 'vision')[]
  speedRating: number // 1-5
  qualityRating: number // 1-5
  costTier: number // 1-5 (1=cheapest, 5=most expensive)
  isActive: boolean
  isLocal: boolean
  contextWindow: string
  status: 'available' | 'loading' | 'offline'
  providerId: string
}

interface ProviderKeyStatus {
  configured: boolean
  masked: string
}

interface ModelsConfig {
  providers: Array<{
    id: string
    name: string
    envKey: string
    baseUrl?: string
    models: Array<{
      id: string
      name: string
      providerId: string
      providerName: string
      capabilities: string[]
      contextWindow: string
      maxTokens: number
    }>
    isAvailable: boolean
  }>
  keysStatus: Record<string, ProviderKeyStatus>
}

const STATIC_MODELS: AIModel[] = [
  {
    id: 'gpt4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    emoji: '🧠',
    providerColor: '#10b981',
    description: 'Best for complex reasoning and analysis',
    capabilities: ['chat', 'code', 'reasoning', 'vision'],
    speedRating: 3,
    qualityRating: 5,
    costTier: 4,
    isActive: true,
    isLocal: false,
    contextWindow: '128K',
    status: 'available',
    providerId: 'zai',
  },
  {
    id: 'gpt4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    emoji: '⚡',
    providerColor: '#10b981',
    description: 'Fast multimodal model',
    capabilities: ['chat', 'code', 'reasoning', 'vision'],
    speedRating: 5,
    qualityRating: 4,
    costTier: 3,
    isActive: false,
    isLocal: false,
    contextWindow: '128K',
    status: 'available',
    providerId: 'zai',
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    emoji: '🎭',
    providerColor: '#f59e0b',
    description: 'Balanced performance and quality',
    capabilities: ['chat', 'code', 'reasoning'],
    speedRating: 4,
    qualityRating: 4,
    costTier: 3,
    isActive: false,
    isLocal: false,
    contextWindow: '200K',
    status: 'available',
    providerId: 'zai',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    emoji: '🏛️',
    providerColor: '#f59e0b',
    description: 'Deep analysis and thorough reasoning',
    capabilities: ['chat', 'code', 'reasoning'],
    speedRating: 2,
    qualityRating: 5,
    costTier: 5,
    isActive: false,
    isLocal: false,
    contextWindow: '200K',
    status: 'available',
    providerId: 'zai',
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral',
    emoji: '🌊',
    providerColor: '#06b6d4',
    description: 'European compliance-focused model',
    capabilities: ['chat', 'code', 'reasoning'],
    speedRating: 3,
    qualityRating: 4,
    costTier: 3,
    isActive: false,
    isLocal: false,
    contextWindow: '128K',
    status: 'available',
    providerId: 'mistral',
  },
  {
    id: 'mistral-small',
    name: 'Mistral Small',
    provider: 'Mistral',
    emoji: '💧',
    providerColor: '#06b6d4',
    description: 'Fast and efficient Mistral model',
    capabilities: ['chat', 'code'],
    speedRating: 5,
    qualityRating: 3,
    costTier: 1,
    isActive: false,
    isLocal: false,
    contextWindow: '32K',
    status: 'available',
    providerId: 'mistral',
  },
  {
    id: 'codestral',
    name: 'Codestral',
    provider: 'Mistral',
    emoji: '💻',
    providerColor: '#06b6d4',
    description: 'Mistral code generation specialist',
    capabilities: ['code'],
    speedRating: 4,
    qualityRating: 4,
    costTier: 2,
    isActive: false,
    isLocal: false,
    contextWindow: '32K',
    status: 'available',
    providerId: 'mistral',
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    emoji: '💎',
    providerColor: '#8b5cf6',
    description: 'Multimodal capabilities',
    capabilities: ['chat', 'code', 'reasoning', 'vision'],
    speedRating: 4,
    qualityRating: 4,
    costTier: 2,
    isActive: false,
    isLocal: false,
    contextWindow: '128K',
    status: 'available',
    providerId: 'google',
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    emoji: '🔍',
    providerColor: '#ec4899',
    description: 'Code specialist model',
    capabilities: ['chat', 'code', 'reasoning'],
    speedRating: 4,
    qualityRating: 4,
    costTier: 1,
    isActive: false,
    isLocal: false,
    contextWindow: '64K',
    status: 'available',
    providerId: 'deepseek',
  },
  {
    id: 'llama-3.1',
    name: 'Llama 3.1',
    provider: 'Local',
    emoji: '🦙',
    providerColor: '#64748b',
    description: 'Privacy-first local model',
    capabilities: ['chat', 'code', 'reasoning'],
    speedRating: 3,
    qualityRating: 3,
    costTier: 0,
    isActive: false,
    isLocal: true,
    contextWindow: '128K',
    status: 'offline',
    providerId: 'ollama',
  },
  {
    id: 'codellama',
    name: 'CodeLlama',
    provider: 'Local',
    emoji: '🖥️',
    providerColor: '#64748b',
    description: 'Code generation specialist (local)',
    capabilities: ['code'],
    speedRating: 3,
    qualityRating: 3,
    costTier: 0,
    isActive: false,
    isLocal: true,
    contextWindow: '16K',
    status: 'offline',
    providerId: 'ollama',
  },
  {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'Grok',
    emoji: '🚀',
    providerColor: '#ef4444',
    description: 'xAI latest flagship model',
    capabilities: ['chat', 'code', 'reasoning'],
    speedRating: 4,
    qualityRating: 5,
    costTier: 3,
    isActive: false,
    isLocal: false,
    contextWindow: '131K',
    status: 'available',
    providerId: 'grok',
  },
  {
    id: 'grok-3-mini',
    name: 'Grok 3 Mini',
    provider: 'Grok',
    emoji: '☄️',
    providerColor: '#ef4444',
    description: 'Fast and affordable Grok model',
    capabilities: ['chat', 'code'],
    speedRating: 5,
    qualityRating: 4,
    costTier: 1,
    isActive: false,
    isLocal: false,
    contextWindow: '131K',
    status: 'available',
    providerId: 'grok',
  },
  {
    id: 'grok-2',
    name: 'Grok 2',
    provider: 'Grok',
    emoji: '⚡',
    providerColor: '#ef4444',
    description: 'Multimodal Grok with vision',
    capabilities: ['chat', 'code', 'reasoning', 'vision'],
    speedRating: 4,
    qualityRating: 4,
    costTier: 2,
    isActive: false,
    isLocal: false,
    contextWindow: '131K',
    status: 'available',
    providerId: 'grok',
  },
  {
    id: 'openrouter-auto',
    name: 'Auto (Cheapest)',
    provider: 'OpenRouter',
    emoji: '🔀',
    providerColor: '#6366f1',
    description: 'Automatically selects cheapest provider',
    capabilities: ['chat', 'code', 'reasoning'],
    speedRating: 4,
    qualityRating: 4,
    costTier: 1,
    isActive: false,
    isLocal: false,
    contextWindow: 'Varies',
    status: 'available',
    providerId: 'openrouter',
  },
  {
    id: 'openrouter-gpt-4o',
    name: 'GPT-4o (OpenRouter)',
    provider: 'OpenRouter',
    emoji: '⚡',
    providerColor: '#6366f1',
    description: 'GPT-4o via OpenRouter',
    capabilities: ['chat', 'code', 'reasoning', 'vision'],
    speedRating: 5,
    qualityRating: 4,
    costTier: 2,
    isActive: false,
    isLocal: false,
    contextWindow: '128K',
    status: 'available',
    providerId: 'openrouter',
  },
  {
    id: 'openrouter-claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet (OR)',
    provider: 'OpenRouter',
    emoji: '🎭',
    providerColor: '#6366f1',
    description: 'Claude 3.5 Sonnet via OpenRouter',
    capabilities: ['chat', 'code', 'reasoning'],
    speedRating: 4,
    qualityRating: 4,
    costTier: 2,
    isActive: false,
    isLocal: false,
    contextWindow: '200K',
    status: 'available',
    providerId: 'openrouter',
  },
  {
    id: 'openrouter-grok-2',
    name: 'Grok 2 (OpenRouter)',
    provider: 'OpenRouter',
    emoji: '🚀',
    providerColor: '#6366f1',
    description: 'Grok 2 via OpenRouter',
    capabilities: ['chat', 'code', 'reasoning'],
    speedRating: 4,
    qualityRating: 4,
    costTier: 2,
    isActive: false,
    isLocal: false,
    contextWindow: '131K',
    status: 'available',
    providerId: 'openrouter',
  },
]

const PROVIDERS: Provider[] = ['OpenAI', 'Anthropic', 'Mistral', 'Google', 'DeepSeek', 'Grok', 'OpenRouter', 'Local']

const PROVIDER_LINKS: Record<string, string> = {
  MISTRAL_API_KEY: 'https://console.mistral.ai/',
  OPENAI_API_KEY: 'https://platform.openai.com/api-keys',
  ANTHROPIC_API_KEY: 'https://console.anthropic.com/',
  GOOGLE_API_KEY: 'https://aistudio.google.com/apikey',
  DEEPSEEK_API_KEY: 'https://platform.deepseek.com/',
  XAI_API_KEY: 'https://console.x.ai/',
  OPENROUTER_API_KEY: 'https://openrouter.ai/keys',
}

const TASK_MODELS: Record<string, string> = {
  chat: 'gpt4o',
  code: 'deepseek-v3',
  reasoning: 'gpt4-turbo',
  vision: 'gpt4o',
}

function RatingBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 w-3 rounded-full transition-all"
          style={{
            backgroundColor: i < value ? color : '#1e293b',
          }}
        />
      ))}
    </div>
  )
}

export default function ModelsModule() {
  const [models, setModels] = useState<AIModel[]>(STATIC_MODELS)
  const [providerFilter, setProviderFilter] = useState<Provider | 'all'>('all')
  const [compareMode, setCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [configModel, setConfigModel] = useState<AIModel | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [temperature, setTemperature] = useState([0.7])
  const [maxTokens, setMaxTokens] = useState([4096])
  const [fallbackChain, setFallbackChain] = useState<string[]>(['gpt4-turbo', 'claude-3.5-sonnet', 'gpt4o'])
  const [taskModelOverrides, setTaskModelOverrides] = useState<Record<string, string>>(TASK_MODELS)

  // API Key management state
  const [keysStatus, setKeysStatus] = useState<Record<string, ProviderKeyStatus>>({})
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string>('mistral')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)

  // Save state tracking
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Fetch provider config on mount
  const fetchConfig = useCallback(async () => {
    setIsLoadingConfig(true)
    try {
      const res = await fetch('/api/models/config')
      if (res.ok) {
        const data: ModelsConfig = await res.json()
        setKeysStatus(data.keysStatus || {})

        // Update model statuses based on provider availability
        setModels(prev => prev.map(m => {
          const providerId = m.providerId
          const isProviderAvailable = data.providers.find(p => p.id === providerId)?.isAvailable ?? false
          let newStatus = m.status
          if (m.isLocal) {
            // Keep local models as offline unless ollama is detected
            newStatus = 'offline'
          } else if (providerId === 'zai') {
            newStatus = 'available'
          } else {
            newStatus = isProviderAvailable ? 'available' : 'offline'
          }
          return { ...m, status: newStatus as AIModel['status'] }
        }))
      }
    } catch (err) {
      console.error('Failed to fetch model config:', err)
    } finally {
      setIsLoadingConfig(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // Load saved preferences on mount
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const res = await fetch('/api/models/preferences')
        if (res.ok) {
          const data = await res.json()
          if (data.activeModelId) {
            setModels(prev => prev.map(m => ({ ...m, isActive: m.id === data.activeModelId })))
          }
          if (data.taskModelOverrides) setTaskModelOverrides(data.taskModelOverrides)
          if (data.fallbackChain) setFallbackChain(data.fallbackChain)
        }
      } catch {}
    }
    loadPrefs()
  }, [])

  const filteredModels = useMemo(() => {
    if (providerFilter === 'all') return models
    return models.filter(m => m.provider === providerFilter)
  }, [models, providerFilter])

  const compareModels = useMemo(() => {
    return models.filter(m => compareIds.includes(m.id))
  }, [models, compareIds])

  const setActiveModel = (id: string) => {
    setModels(prev => prev.map(m => ({ ...m, isActive: m.id === id })))
    setIsDirty(true)
  }

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  const getCapabilityLabel = (cap: string) => {
    switch (cap) {
      case 'chat': return '💬 Chat'
      case 'code': return '💻 Code'
      case 'reasoning': return '🧠 Reasoning'
      case 'vision': return '👁️ Vision'
      default: return cap
    }
  }

  const getCostLabel = (tier: number) => {
    if (tier === 0) return 'Free'
    if (tier <= 1) return '$'
    if (tier <= 2) return '$$'
    if (tier <= 3) return '$$$'
    if (tier <= 4) return '$$$$'
    return '$$$$$'
  }

  // Validate AND save API key
  const handleValidateKey = async () => {
    if (!apiKeyInput.trim()) return
    setIsValidating(true)
    setValidationResult(null)
    try {
      // First validate the key
      const res = await fetch('/api/models/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: selectedProvider === 'ollama' ? apiKeyInput : apiKeyInput,
        }),
      })
      const data = await res.json()
      setValidationResult({
        valid: data.valid,
        message: data.message,
      })

      // If valid (or even if we can't validate), save the key to .env
      if (data.valid || selectedProvider === 'ollama') {
        try {
          const saveRes = await fetch('/api/models/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: selectedProvider,
              apiKey: apiKeyInput.trim(),
            }),
          })
          if (saveRes.ok) {
            const saveData = await saveRes.json()
            setValidationResult({
              valid: true,
              message: `API key validated and saved to .env (${saveData.envKey}). The key is now active!`,
            })
            // Refresh provider status
            fetchConfig()
          } else {
            const errData = await saveRes.json().catch(() => ({ error: 'Failed to save' }))
            setValidationResult({
              valid: data.valid,
              message: `Key is valid but failed to save to .env: ${errData.error || 'Unknown error'}. Add it manually to your .env file.`,
            })
          }
        } catch {
          setValidationResult({
            valid: data.valid,
            message: 'Key is valid but could not save to .env (network error). Add it manually to your .env file.',
          })
        }
      }
    } catch {
      setValidationResult({
        valid: false,
        message: 'Failed to validate API key - network error',
      })
    } finally {
      setIsValidating(false)
    }
  }

  // Save model configuration
  const handleSaveModelConfig = async () => {
    setIsSaving(true)
    try {
      const activeModel = models.find(m => m.isActive)
      const res = await fetch('/api/models/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeModelId: activeModel?.id || 'gpt4-turbo',
          taskModelOverrides,
          fallbackChain,
        }),
      })
      if (res.ok) {
        setIsDirty(false)
        toast({ title: 'Configuration saved', description: 'Model preferences updated successfully' })
      } else {
        toast({ title: 'Save failed', description: 'Could not save model configuration', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Save failed', description: 'Network error', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  // Provider key info
  const providerKeyMap: Record<string, { envKey: string; label: string; placeholder: string }> = {
    mistral: { envKey: 'MISTRAL_API_KEY', label: 'Mistral AI', placeholder: 'Enter your Mistral API key...' },
    openai: { envKey: 'OPENAI_API_KEY', label: 'OpenAI', placeholder: 'sk-...' },
    anthropic: { envKey: 'ANTHROPIC_API_KEY', label: 'Anthropic', placeholder: 'sk-ant-...' },
    google: { envKey: 'GOOGLE_API_KEY', label: 'Google Gemini', placeholder: 'AIza...' },
    deepseek: { envKey: 'DEEPSEEK_API_KEY', label: 'DeepSeek', placeholder: 'Enter your DeepSeek API key...' },
    grok: { envKey: 'XAI_API_KEY', label: 'Grok (xAI)', placeholder: 'xai-...' },
    openrouter: { envKey: 'OPENROUTER_API_KEY', label: 'OpenRouter', placeholder: 'sk-or-...' },
    ollama: { envKey: 'OLLAMA_BASE_URL', label: 'Ollama (Local)', placeholder: 'http://localhost:11434' },
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 p-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`text-[11px] h-8 px-3 ${providerFilter === 'all' ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500'}`}
              onClick={() => setProviderFilter('all')}
            >
              All
            </Button>
            {PROVIDERS.map(p => (
              <Button
                key={p}
                variant="ghost"
                size="sm"
                className={`text-[11px] h-8 px-3 ${providerFilter === p ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500'}`}
                onClick={() => setProviderFilter(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* API Keys Button */}
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] h-8 gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
            onClick={() => {
              setApiKeyDialogOpen(true)
              setValidationResult(null)
              setApiKeyInput('')
              setShowApiKey(false)
            }}
          >
            <Key className="size-3.5" />
            API Keys
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`text-[11px] h-8 gap-1.5 ${isDirty ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20' : 'border-neutral-700 text-neutral-500'}`}
            onClick={handleSaveModelConfig}
            disabled={!isDirty || isSaving}
          >
            <Save className="size-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant={compareMode ? 'default' : 'outline'}
            size="sm"
            className={`text-[11px] h-8 gap-1.5 ${compareMode ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'border-neutral-700 text-neutral-400'}`}
            onClick={() => {
              setCompareMode(!compareMode)
              if (compareMode) setCompareIds([])
            }}
          >
            <ArrowRightLeft className="size-3.5" />
            {compareMode ? 'Comparing' : 'Compare'}
            {compareIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0">{compareIds.length}</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredModels.map(model => (
          <Card
            key={model.id}
            className={`bg-[#0d1117] border-neutral-800 transition-all duration-200 group relative overflow-hidden ${
              model.isActive
                ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                : 'hover:border-neutral-700'
            } ${compareIds.includes(model.id) ? 'ring-1 ring-cyan-500/50' : ''}`}
          >
            {/* Provider color accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ backgroundColor: model.providerColor }}
            />

            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{model.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-200">{model.name}</p>
                      {model.isActive && (
                        <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border px-1.5">
                          ACTIVE
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          color: model.providerColor,
                          backgroundColor: `${model.providerColor}15`,
                        }}
                      >
                        {model.provider}
                      </span>
                      {model.isLocal && (
                        <Badge variant="outline" className="text-[9px] border-neutral-700 text-neutral-500 px-1.5">
                          LOCAL
                        </Badge>
                      )}
                      <span className="text-[10px] text-neutral-600">{model.contextWindow}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {model.status === 'available' ? (
                    <Wifi className="size-3.5 text-green-400" />
                  ) : model.status === 'loading' ? (
                    <Activity className="size-3.5 text-amber-400 animate-pulse" />
                  ) : (
                    <WifiOff className="size-3.5 text-neutral-600" />
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-neutral-400 mb-3">{model.description}</p>

              {/* API Key Status for this provider */}
              {model.providerId !== 'zai' && (
                <div className="mb-3 flex items-center gap-2">
                  <Key className="size-3 text-neutral-500" />
                  {keysStatus[providerKeyMap[model.providerId]?.envKey]?.configured ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="size-2.5" />
                      Key configured
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <AlertCircle className="size-2.5" />
                      No API key
                    </span>
                  )}
                </div>
              )}

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1 mb-3">
                {model.capabilities.map(cap => (
                  <span key={cap} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-neutral-800/80 text-neutral-400 border border-neutral-800">
                    {getCapabilityLabel(cap)}
                  </span>
                ))}
              </div>

              {/* Ratings */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                    <Zap className="size-2.5" /> Speed
                  </span>
                  <RatingBar value={model.speedRating} color="#22d3ee" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                    <Star className="size-2.5" /> Quality
                  </span>
                  <RatingBar value={model.qualityRating} color="#a78bfa" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                    <Coins className="size-2.5" /> Cost
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">{getCostLabel(model.costTier)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {model.isActive ? (
                  <Button size="sm" className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] gap-1.5" disabled>
                    <Check className="size-3.5" />
                    Active Model
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="flex-1 h-8 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] gap-1.5 border border-neutral-700"
                    onClick={() => setActiveModel(model.id)}
                    disabled={model.status === 'offline' && !model.isLocal}
                  >
                    <Cpu className="size-3.5" />
                    {model.status === 'offline' ? 'Offline' : 'Select'}
                  </Button>
                )}
                {compareMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 w-8 p-0 ${compareIds.includes(model.id) ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-neutral-700 text-neutral-500'}`}
                    onClick={() => toggleCompare(model.id)}
                    disabled={!compareIds.includes(model.id) && compareIds.length >= 3}
                  >
                    <Check className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-neutral-600 hover:text-neutral-300"
                  onClick={() => {
                    setConfigModel(model)
                    setTemperature([0.7])
                    setMaxTokens([4096])
                    setConfigOpen(true)
                  }}
                >
                  <Settings className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison View */}
      {compareMode && compareIds.length >= 2 && (
        <Card className="bg-[#0d1117] border-cyan-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
              <ArrowRightLeft className="size-4" />
              Model Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left py-2 pr-4 text-neutral-500 font-medium">Metric</th>
                    {compareModels.map(m => (
                      <th key={m.id} className="text-center py-2 px-3 font-medium" style={{ color: m.providerColor }}>
                        {m.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-800/50">
                    <td className="py-2 pr-4 text-neutral-400">Provider</td>
                    {compareModels.map(m => <td key={m.id} className="text-center py-2 px-3 text-neutral-300">{m.provider}</td>)}
                  </tr>
                  <tr className="border-b border-neutral-800/50">
                    <td className="py-2 pr-4 text-neutral-400">Context</td>
                    {compareModels.map(m => <td key={m.id} className="text-center py-2 px-3 text-neutral-300">{m.contextWindow}</td>)}
                  </tr>
                  <tr className="border-b border-neutral-800/50">
                    <td className="py-2 pr-4 text-neutral-400 flex items-center gap-1"><Zap className="size-3" /> Speed</td>
                    {compareModels.map(m => <td key={m.id} className="text-center py-2 px-3"><RatingBar value={m.speedRating} color="#22d3ee" /></td>)}
                  </tr>
                  <tr className="border-b border-neutral-800/50">
                    <td className="py-2 pr-4 text-neutral-400 flex items-center gap-1"><Star className="size-3" /> Quality</td>
                    {compareModels.map(m => <td key={m.id} className="text-center py-2 px-3"><RatingBar value={m.qualityRating} color="#a78bfa" /></td>)}
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-neutral-400 flex items-center gap-1"><Coins className="size-3" /> Cost</td>
                    {compareModels.map(m => <td key={m.id} className="text-center py-2 px-3 text-neutral-300 font-mono">{getCostLabel(m.costTier)}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Row: Task Assignment + Fallback Chain + Local Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task-to-Model Assignment */}
        <Card className="bg-[#0d1117] border-neutral-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <Layers className="size-4 text-amber-400" />
              Task Model Assignment
            </CardTitle>
            <CardDescription className="text-[10px] text-neutral-500">
              Choose which model handles each task type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(['chat', 'code', 'reasoning', 'vision'] as const).map(task => {
                const currentModelId = taskModelOverrides[task] || 'gpt4-turbo'
                const currentModel = models.find(m => m.id === currentModelId)
                return (
                  <div key={task} className="flex items-center justify-between py-2 border-b border-neutral-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-300">{getCapabilityLabel(task)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono" style={{ color: currentModel?.providerColor }}>
                        {currentModel?.emoji} {currentModel?.name}
                      </span>
                      <select
                        value={currentModelId}
                        onChange={e => { setTaskModelOverrides(prev => ({ ...prev, [task]: e.target.value })); setIsDirty(true) }}
                        className="bg-neutral-900 border border-neutral-700 text-[10px] text-neutral-400 rounded px-1.5 py-1 h-6 outline-none cursor-pointer"
                      >
                        {models.filter(m => m.capabilities.includes(task) && m.status !== 'offline').map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Fallback Chain + Local Status */}
        <div className="flex flex-col gap-4">
          {/* Fallback Chain */}
          <Card className="bg-[#0d1117] border-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <GripVertical className="size-4 text-neutral-500" />
                Fallback Chain
              </CardTitle>
              <CardDescription className="text-[10px] text-neutral-500">
                Priority order if primary model is unavailable
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fallbackChain.map((modelId, index) => {
                  const model = models.find(m => m.id === modelId)
                  if (!model) return null
                  return (
                    <div key={modelId} className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-600 font-mono w-4">{index + 1}.</span>
                      <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg bg-neutral-900/50 border border-neutral-800">
                        <span>{model.emoji}</span>
                        <span className="text-xs text-neutral-300">{model.name}</span>
                        <span className="text-[9px] text-neutral-600 ml-auto">{model.provider}</span>
                      </div>
                      {index < fallbackChain.length - 1 && (
                        <span className="text-neutral-700 text-[10px]">→</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Local Model Status */}
          <Card className="bg-[#0d1117] border-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <Server className="size-4 text-orange-400" />
                Local Models (Ollama)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Connection</span>
                  <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10">
                    Offline
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">GPU Usage</span>
                  <span className="text-xs text-neutral-500 font-mono">N/A</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Models Loaded</span>
                  <span className="text-xs text-neutral-500 font-mono">0 / 2</span>
                </div>
                <Button variant="outline" size="sm" className="w-full h-8 text-[11px] border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600">
                  <Activity className="size-3.5 mr-1.5" />
                  Start Ollama
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* API Keys Configuration Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent className="bg-[#0d1117] border-neutral-800 text-neutral-200 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-5 text-cyan-400" />
              API Key Configuration
            </DialogTitle>
            <DialogDescription className="text-neutral-500">
              Configure API keys for different AI providers. Keys are stored securely in your .env file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
              <Sparkles className="size-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-[11px] text-neutral-400">
                <p className="text-neutral-300 font-medium mb-1">How API keys work</p>
                <p>API keys are validated and automatically saved to your <code className="text-cyan-400 bg-cyan-500/10 px-1 rounded">.env</code> file on the server. They take effect immediately — no restart needed.</p>
              </div>
            </div>

            {/* Provider Tabs */}
            <Tabs value={selectedProvider} onValueChange={(v) => { setSelectedProvider(v); setValidationResult(null); setApiKeyInput(''); setShowApiKey(false); }}>
              <TabsList className="bg-neutral-900 border border-neutral-800 w-full h-auto flex-wrap">
                {Object.entries(providerKeyMap).map(([id, info]) => {
                  const keyInfo = keysStatus[info.envKey]
                  return (
                    <TabsTrigger
                      key={id}
                      value={id}
                      className="text-[11px] data-[state=active]:bg-neutral-800 data-[state=active]:text-cyan-400 flex items-center gap-1.5"
                    >
                      {keyInfo?.configured ? (
                        <CheckCircle2 className="size-3 text-emerald-400" />
                      ) : (
                        <AlertCircle className="size-3 text-neutral-600" />
                      )}
                      {info.label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {Object.entries(providerKeyMap).map(([id, info]) => (
                <TabsContent key={id} value={id} className="mt-4 space-y-4">
                  {/* Current Status */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/50 border border-neutral-800">
                    <div>
                      <p className="text-xs text-neutral-400">Current Status</p>
                      <p className="text-sm text-neutral-200 flex items-center gap-2 mt-1">
                        {keysStatus[info.envKey]?.configured ? (
                          <>
                            <CheckCircle2 className="size-4 text-emerald-400" />
                            <span className="text-emerald-400">Configured</span>
                            <span className="text-[10px] text-neutral-500 font-mono">({keysStatus[info.envKey].masked})</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="size-4 text-amber-400" />
                            <span className="text-amber-400">Not configured</span>
                          </>
                        )}
                      </p>
                    </div>
                    {PROVIDER_LINKS[info.envKey] && (
                      <a
                        href={PROVIDER_LINKS[info.envKey]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Get API Key
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>

                  {/* Input */}
                  <div className="space-y-2">
                    <Label className="text-xs text-neutral-400">
                      {id === 'ollama' ? 'Ollama Base URL' : `${info.label} API Key`}
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKeyInput}
                          onChange={(e) => { setApiKeyInput(e.target.value); setValidationResult(null) }}
                          placeholder={info.placeholder}
                          className="bg-neutral-900 border-neutral-700 text-neutral-200 pr-10"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-neutral-500 hover:text-neutral-300"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-[11px] gap-1.5 border-neutral-700 text-neutral-300 hover:text-cyan-400 hover:border-cyan-500/30"
                        onClick={handleValidateKey}
                        disabled={!apiKeyInput.trim() || isValidating}
                      >
                        {isValidating ? (
                          <RefreshCw className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        Validate & Save
                      </Button>
                    </div>
                  </div>

                  {/* Validation Result */}
                  {validationResult && (
                    <div className={`flex items-start gap-2 p-3 rounded-lg border ${
                      validationResult.valid
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-red-500/5 border-red-500/20'
                    }`}>
                      {validationResult.valid ? (
                        <CheckCircle2 className="size-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="size-4 text-red-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className={`text-xs font-medium ${validationResult.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                          {validationResult.valid ? 'Valid API Key!' : 'Invalid API Key'}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{validationResult.message}</p>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="p-3 rounded-lg bg-neutral-900/30 border border-neutral-800/50">
                    <p className="text-[11px] text-neutral-500 mb-2 font-medium">Setup Instructions:</p>
                    <ol className="text-[11px] text-neutral-400 space-y-1.5 list-decimal list-inside">
                      <li>
                        {id === 'ollama'
                          ? 'Install Ollama from ollama.com and start it on your machine'
                          : `Sign up at ${PROVIDER_LINKS[info.envKey]?.replace('https://', '') || 'the provider website'} and create an API key`
                        }
                      </li>
                      <li>Copy the API key and paste it above to validate</li>
                      <li>
                        Add it to your <code className="text-cyan-400 bg-cyan-500/10 px-1 rounded">.env</code> file:
                        <div className="mt-1.5 p-2 rounded bg-neutral-900 border border-neutral-800 font-mono text-[10px] text-cyan-300">
                          {info.envKey}={'<your-api-key>'}
                        </div>
                      </li>
                      <li>Restart the dev server for the changes to take effect</li>
                    </ol>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-400"
              onClick={() => fetchConfig()}
            >
              <RefreshCw className="size-3.5 mr-1.5" />
              Refresh Status
            </Button>
            <DialogClose asChild>
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="bg-[#0d1117] border-neutral-800 text-neutral-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {configModel && (
                <>
                  <span className="text-xl">{configModel.emoji}</span>
                  {configModel.name} Configuration
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-neutral-500">
              Fine-tune model parameters
            </DialogDescription>
          </DialogHeader>
          {configModel && (
            <div className="space-y-5 py-4">
              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-400">Temperature</label>
                  <span className="text-xs text-neutral-300 font-mono">{temperature[0].toFixed(2)}</span>
                </div>
                <Slider
                  value={temperature}
                  onValueChange={setTemperature}
                  min={0}
                  max={2}
                  step={0.05}
                  className="[&_[role=slider]]:bg-cyan-500 [&_[role=slider]]:border-cyan-400"
                />
                <div className="flex justify-between text-[9px] text-neutral-600">
                  <span>Precise (0)</span>
                  <span>Creative (2)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-400">Max Tokens</label>
                  <span className="text-xs text-neutral-300 font-mono">{maxTokens[0].toLocaleString()}</span>
                </div>
                <Slider
                  value={maxTokens}
                  onValueChange={setMaxTokens}
                  min={256}
                  max={32768}
                  step={256}
                  className="[&_[role=slider]]:bg-cyan-500 [&_[role=slider]]:border-cyan-400"
                />
                <div className="flex justify-between text-[9px] text-neutral-600">
                  <span>256</span>
                  <span>32,768</span>
                </div>
              </div>

              <Separator className="bg-neutral-800" />

              {/* Model Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800">
                  <p className="text-[10px] text-neutral-500">Provider</p>
                  <p className="text-xs text-neutral-300 mt-0.5" style={{ color: configModel.providerColor }}>{configModel.provider}</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800">
                  <p className="text-[10px] text-neutral-500">Context Window</p>
                  <p className="text-xs text-neutral-300 mt-0.5 font-mono">{configModel.contextWindow}</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800">
                  <p className="text-[10px] text-neutral-500">Speed</p>
                  <div className="mt-1"><RatingBar value={configModel.speedRating} color="#22d3ee" /></div>
                </div>
                <div className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800">
                  <p className="text-[10px] text-neutral-500">Quality</p>
                  <div className="mt-1"><RatingBar value={configModel.qualityRating} color="#a78bfa" /></div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="text-neutral-400">Cancel</Button>
            </DialogClose>
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => { handleSaveModelConfig(); setConfigOpen(false) }}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </ScrollArea>
    </div>
  )
}
