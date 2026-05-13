'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
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
} from 'lucide-react'

type Provider = 'OpenAI' | 'Anthropic' | 'Mistral' | 'Google' | 'DeepSeek' | 'Local'

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
}

const MODELS: AIModel[] = [
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
    contextWindow: '32K',
    status: 'available',
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
  },
  {
    id: 'codellama',
    name: 'CodeLlama',
    provider: 'Local',
    emoji: '💻',
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
  },
]

const PROVIDERS: Provider[] = ['OpenAI', 'Anthropic', 'Mistral', 'Google', 'DeepSeek', 'Local']

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
  const [models, setModels] = useState<AIModel[]>(MODELS)
  const [providerFilter, setProviderFilter] = useState<Provider | 'all'>('all')
  const [compareMode, setCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [configModel, setConfigModel] = useState<AIModel | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [temperature, setTemperature] = useState([0.7])
  const [maxTokens, setMaxTokens] = useState([4096])
  const [fallbackChain, setFallbackChain] = useState<string[]>(['gpt4-turbo', 'claude-3.5-sonnet', 'gpt4o'])
  const [taskModelOverrides, setTaskModelOverrides] = useState<Record<string, string>>(TASK_MODELS)

  const filteredModels = useMemo(() => {
    if (providerFilter === 'all') return models
    return models.filter(m => m.provider === providerFilter)
  }, [models, providerFilter])

  const compareModels = useMemo(() => {
    return models.filter(m => compareIds.includes(m.id))
  }, [models, compareIds])

  const setActiveModel = (id: string) => {
    setModels(prev => prev.map(m => ({ ...m, isActive: m.id === id })))
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

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>
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
                    disabled={model.status === 'offline'}
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
                        onChange={e => setTaskModelOverrides(prev => ({ ...prev, [task]: e.target.value }))}
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
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white">Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
