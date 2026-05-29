/**
 * AI Provider Abstraction Layer
 * 
 * Routes chat completion requests to the appropriate AI provider
 * based on the selected model. Supports:
 * - z-ai-web-dev-sdk (default/built-in)
 * - Mistral AI
 * - OpenAI
 * - Anthropic
 * - Google Gemini
 * - DeepSeek
 * - Local Ollama
 */

// ─── Provider Types ────────────────────────────────────────────────────────

export type ProviderId = 'zai' | 'mistral' | 'openai' | 'anthropic' | 'google' | 'deepseek' | 'ollama' | 'grok' | 'openrouter'

export interface ProviderConfig {
  id: ProviderId
  name: string
  envKey: string
  baseUrl?: string
  models: ModelDefinition[]
  isAvailable: boolean
}

export interface ModelDefinition {
  id: string
  name: string
  providerId: string
  providerName: string
  capabilities: ('chat' | 'code' | 'reasoning' | 'vision')[]
  contextWindow: string
  maxTokens: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

export interface ChatCompletionRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface ChatCompletionResponse {
  content: string
  model: string
  provider: ProviderId
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

// ─── Model-to-Provider Mapping ─────────────────────────────────────────────

const MODEL_PROVIDER_MAP: Record<string, ProviderId> = {
  // Z-AI built-in models
  'gpt4-turbo': 'zai',
  'gpt4o': 'zai',
  'claude-3.5-sonnet': 'zai',
  'claude-3-opus': 'zai',
  // Mistral AI models (with and without -latest suffix)
  'mistral-large': 'mistral',
  'mistral-large-latest': 'mistral',
  'mistral-medium': 'mistral',
  'mistral-medium-latest': 'mistral',
  'mistral-small': 'mistral',
  'mistral-small-latest': 'mistral',
  'open-mistral-nemo': 'mistral',
  'codestral': 'mistral',
  'codestral-latest': 'mistral',
  'mistral-tiny': 'mistral',
  'mistral-tiny-latest': 'mistral',
  'magistral-small-latest': 'mistral',
  'magistral-medium-latest': 'mistral',
  'devstral-latest': 'mistral',
  'devstral-medium-latest': 'mistral',
  // OpenAI models
  'gpt-4-turbo': 'openai',
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  // Anthropic models
  'claude-3-5-sonnet-20241022': 'anthropic',
  'claude-3-opus-20240229': 'anthropic',
  'claude-3-haiku-20240307': 'anthropic',
  // Google Gemini models
  'gemini-pro': 'google',
  'gemini-1.5-flash': 'google',
  // DeepSeek models
  'deepseek-chat': 'deepseek',
  'deepseek-v3': 'deepseek',
  'deepseek-coder': 'deepseek',
  'deepseek-reasoner': 'deepseek',
  // Ollama/Pi models
  'llama-3.1': 'ollama',
  'codellama': 'ollama',
  'ollama-mistral': 'ollama',
  'ollama-llama3.1': 'ollama',
  'ollama-codellama': 'ollama',
  // Grok (xAI) models
  'grok-3': 'grok',
  'grok-3-mini': 'grok',
  'grok-2': 'grok',
  'grok-2-mini': 'grok',
  // OpenRouter models (prefixed)
  'openrouter-auto': 'openrouter',
  'openrouter-claude-3.5-sonnet': 'openrouter',
  'openrouter-gpt-4o': 'openrouter',
  'openrouter-gemini-pro': 'openrouter',
  'openrouter-deepseek-chat': 'openrouter',
  'openrouter-grok-2': 'openrouter',
  'openrouter-llama-3.1': 'openrouter',
}

// Prefixes that identify a provider for model IDs not in the map
const MODEL_PREFIX_MAP: [string, ProviderId][] = [
  ['mistral-', 'mistral'],
  ['magistral-', 'mistral'],
  ['codestral-', 'mistral'],
  ['devstral-', 'mistral'],
  ['open-mistral-', 'mistral'],
  ['open-codestral-', 'mistral'],
  ['gpt-', 'openai'],
  ['claude-', 'anthropic'],
  ['gemini-', 'google'],
  ['deepseek-', 'deepseek'],
  ['ollama-', 'ollama'],
  ['grok-', 'grok'],
  ['openrouter-', 'openrouter'],
]

// ─── Z-AI Config Detection ──────────────────────────────────────────────────

import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * Check if Z-AI SDK configuration file exists and is valid.
 * The SDK searches for .z-ai-config in: project dir, home dir, /etc
 */
function isZaiConfigured(): boolean {
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
  ]
  for (const filePath of configPaths) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const config = JSON.parse(content)
      if (config.baseUrl && config.apiKey) {
        return true
      }
    } catch {
      // File doesn't exist or is invalid — continue
    }
  }
  return false
}

// Cache the result (config won't change at runtime)
const ZAI_AVAILABLE = isZaiConfigured()

/**
 * Find the best available fallback provider when Z-AI is not configured.
 * Priority: Mistral (if key set) > OpenAI > Anthropic > Google > DeepSeek > Ollama
 */
function getBestAvailableProvider(): ProviderId {
  if (process.env.MISTRAL_API_KEY) return 'mistral'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.GOOGLE_API_KEY) return 'google'
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek'
  if (process.env.XAI_API_KEY) return 'grok'
  if (process.env.OPENROUTER_API_KEY) return 'openrouter'
  return 'ollama'
}

// ─── Provider Definitions ──────────────────────────────────────────────────

export function getProviders(): ProviderConfig[] {
  return [
    {
      id: 'zai',
      name: ZAI_AVAILABLE ? 'Z-AI (Built-in)' : 'Z-AI (Not Configured)',
      envKey: '',
      models: [
        { id: 'gpt4-turbo', name: 'GPT-4 Turbo', providerId: 'zai', providerName: 'Z-AI', capabilities: ['chat', 'code', 'reasoning', 'vision'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'gpt4o', name: 'GPT-4o', providerId: 'zai', providerName: 'Z-AI', capabilities: ['chat', 'code', 'reasoning', 'vision'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', providerId: 'zai', providerName: 'Z-AI', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '200K', maxTokens: 4096 },
        { id: 'claude-3-opus', name: 'Claude 3 Opus', providerId: 'zai', providerName: 'Z-AI', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '200K', maxTokens: 4096 },
      ],
      isAvailable: ZAI_AVAILABLE,
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      envKey: 'MISTRAL_API_KEY',
      baseUrl: 'https://api.mistral.ai/v1',
      models: [
        { id: 'mistral-large-latest', name: 'Mistral Large', providerId: 'mistral', providerName: 'Mistral AI', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'mistral-medium-latest', name: 'Mistral Medium', providerId: 'mistral', providerName: 'Mistral AI', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '32K', maxTokens: 4096 },
        { id: 'mistral-small-latest', name: 'Mistral Small', providerId: 'mistral', providerName: 'Mistral AI', capabilities: ['chat', 'code'], contextWindow: '32K', maxTokens: 4096 },
        { id: 'open-mistral-nemo', name: 'Mistral Nemo', providerId: 'mistral', providerName: 'Mistral AI', capabilities: ['chat', 'code'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'codestral-latest', name: 'Codestral', providerId: 'mistral', providerName: 'Mistral AI', capabilities: ['code'], contextWindow: '32K', maxTokens: 4096 },
      ],
      isAvailable: !!process.env.MISTRAL_API_KEY,
    },
    {
      id: 'openai',
      name: 'OpenAI',
      envKey: 'OPENAI_API_KEY',
      baseUrl: 'https://api.openai.com/v1',
      models: [
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', providerId: 'openai', providerName: 'OpenAI', capabilities: ['chat', 'code', 'reasoning', 'vision'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'gpt-4o', name: 'GPT-4o', providerId: 'openai', providerName: 'OpenAI', capabilities: ['chat', 'code', 'reasoning', 'vision'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', providerId: 'openai', providerName: 'OpenAI', capabilities: ['chat', 'code'], contextWindow: '128K', maxTokens: 4096 },
      ],
      isAvailable: !!process.env.OPENAI_API_KEY,
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      envKey: 'ANTHROPIC_API_KEY',
      baseUrl: 'https://api.anthropic.com/v1',
      models: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', providerId: 'anthropic', providerName: 'Anthropic', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '200K', maxTokens: 4096 },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', providerId: 'anthropic', providerName: 'Anthropic', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '200K', maxTokens: 4096 },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', providerId: 'anthropic', providerName: 'Anthropic', capabilities: ['chat', 'code'], contextWindow: '200K', maxTokens: 4096 },
      ],
      isAvailable: !!process.env.ANTHROPIC_API_KEY,
    },
    {
      id: 'google',
      name: 'Google Gemini',
      envKey: 'GOOGLE_API_KEY',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      models: [
        { id: 'gemini-pro', name: 'Gemini Pro', providerId: 'google', providerName: 'Google', capabilities: ['chat', 'code', 'reasoning', 'vision'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', providerId: 'google', providerName: 'Google', capabilities: ['chat', 'code', 'reasoning', 'vision'], contextWindow: '1M', maxTokens: 8192 },
      ],
      isAvailable: !!process.env.GOOGLE_API_KEY,
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      envKey: 'DEEPSEEK_API_KEY',
      baseUrl: 'https://api.deepseek.com/v1',
      models: [
        { id: 'deepseek-chat', name: 'DeepSeek V3', providerId: 'deepseek', providerName: 'DeepSeek', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '64K', maxTokens: 4096 },
        { id: 'deepseek-coder', name: 'DeepSeek Coder', providerId: 'deepseek', providerName: 'DeepSeek', capabilities: ['code'], contextWindow: '64K', maxTokens: 4096 },
        { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', providerId: 'deepseek', providerName: 'DeepSeek', capabilities: ['reasoning'], contextWindow: '64K', maxTokens: 4096 },
      ],
      isAvailable: !!process.env.DEEPSEEK_API_KEY,
    },
    {
      id: 'ollama',
      name: 'Ollama (Local/Pi)',
      envKey: 'OLLAMA_BASE_URL',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      models: [
        { id: 'llama3.1', name: 'Llama 3.1', providerId: 'ollama', providerName: 'Ollama', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'codellama', name: 'CodeLlama', providerId: 'ollama', providerName: 'Ollama', capabilities: ['code'], contextWindow: '16K', maxTokens: 4096 },
        { id: 'mistral', name: 'Mistral 7B', providerId: 'ollama', providerName: 'Ollama', capabilities: ['chat', 'code'], contextWindow: '32K', maxTokens: 4096 },
        // Prefixed IDs for ChatModule selector routing
        { id: 'ollama-mistral', name: 'Mistral 7B (Ollama)', providerId: 'ollama', providerName: 'Ollama', capabilities: ['chat', 'code'], contextWindow: '32K', maxTokens: 4096 },
        { id: 'ollama-llama3.1', name: 'Llama 3.1 (Ollama)', providerId: 'ollama', providerName: 'Ollama', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'ollama-codellama', name: 'CodeLlama (Ollama)', providerId: 'ollama', providerName: 'Ollama', capabilities: ['code'], contextWindow: '16K', maxTokens: 4096 },
      ],
      isAvailable: false, // Will be checked at runtime
    },
    {
      id: 'grok',
      name: 'Grok (xAI)',
      envKey: 'XAI_API_KEY',
      baseUrl: 'https://api.x.ai/v1',
      models: [
        { id: 'grok-3', name: 'Grok 3', providerId: 'grok', providerName: 'Grok (xAI)', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '131K', maxTokens: 8192 },
        { id: 'grok-3-mini', name: 'Grok 3 Mini', providerId: 'grok', providerName: 'Grok (xAI)', capabilities: ['chat', 'code'], contextWindow: '131K', maxTokens: 8192 },
        { id: 'grok-2', name: 'Grok 2', providerId: 'grok', providerName: 'Grok (xAI)', capabilities: ['chat', 'code', 'reasoning', 'vision'], contextWindow: '131K', maxTokens: 4096 },
        { id: 'grok-2-mini', name: 'Grok 2 Mini', providerId: 'grok', providerName: 'Grok (xAI)', capabilities: ['chat', 'code'], contextWindow: '131K', maxTokens: 4096 },
      ],
      isAvailable: !!process.env.XAI_API_KEY,
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      envKey: 'OPENROUTER_API_KEY',
      baseUrl: 'https://openrouter.ai/api/v1',
      models: [
        { id: 'openrouter-auto', name: 'Auto (Cheapest)', providerId: 'openrouter', providerName: 'OpenRouter', capabilities: ['chat', 'code', 'reasoning'], contextWindow: 'Varies', maxTokens: 4096 },
        { id: 'openrouter-claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', providerId: 'openrouter', providerName: 'OpenRouter', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '200K', maxTokens: 4096 },
        { id: 'openrouter-gpt-4o', name: 'GPT-4o', providerId: 'openrouter', providerName: 'OpenRouter', capabilities: ['chat', 'code', 'reasoning', 'vision'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'openrouter-gemini-pro', name: 'Gemini Pro', providerId: 'openrouter', providerName: 'OpenRouter', capabilities: ['chat', 'code', 'reasoning', 'vision'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'openrouter-deepseek-chat', name: 'DeepSeek V3', providerId: 'openrouter', providerName: 'OpenRouter', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '64K', maxTokens: 4096 },
        { id: 'openrouter-grok-2', name: 'Grok 2', providerId: 'openrouter', providerName: 'OpenRouter', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '131K', maxTokens: 4096 },
        { id: 'openrouter-llama-3.1', name: 'Llama 3.1 70B', providerId: 'openrouter', providerName: 'OpenRouter', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '128K', maxTokens: 4096 },
      ],
      isAvailable: !!process.env.OPENROUTER_API_KEY,
    },
  ]
}

// ─── Get Provider Status (for API response) ────────────────────────────────

export function getProviderStatus(): Record<string, { available: boolean; keyConfigured: boolean; modelCount: number }> {
  const providers = getProviders()
  const status: Record<string, { available: boolean; keyConfigured: boolean; modelCount: number }> = {}
  for (const p of providers) {
    status[p.id] = {
      available: p.isAvailable,
      keyConfigured: p.id === 'zai' ? ZAI_AVAILABLE : !!process.env[p.envKey],
      modelCount: p.models.length,
    }
  }
  return status
}

// ─── Resolve Provider for a Model ──────────────────────────────────────────

export function resolveProvider(modelId: string): ProviderId {
  // 1. Exact match in the map
  if (MODEL_PROVIDER_MAP[modelId]) {
    return MODEL_PROVIDER_MAP[modelId]
  }
  // 2. Prefix match (e.g. "mistral-large-latest" matches "mistral-" prefix)
  for (const [prefix, provider] of MODEL_PREFIX_MAP) {
    if (modelId.startsWith(prefix)) {
      return provider
    }
  }
  // 3. Default to best available provider
  // If Z-AI is not configured, fall back to Mistral (or another available provider)
  if (!ZAI_AVAILABLE) {
    return getBestAvailableProvider()
  }
  return 'zai'
}

// ─── Chat Completion via Mistral API ───────────────────────────────────────

async function mistralChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured')

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: req.model || 'mistral-large-latest',
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Mistral API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model || req.model || 'mistral-large-latest',
    provider: 'mistral',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  }
}

// ─── Chat Completion via OpenAI API ────────────────────────────────────────

async function openaiChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: req.model || 'gpt-4o',
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model || req.model || 'gpt-4o',
    provider: 'openai',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  }
}

// ─── Chat Completion via Anthropic API ─────────────────────────────────────

async function anthropicChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')

  // Anthropic has a different API format
  const systemMsg = req.messages.find(m => m.role === 'system')
  const nonSystemMsgs = req.messages.filter(m => m.role !== 'system')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: req.model || 'claude-3-5-sonnet-20241022',
      max_tokens: req.maxTokens ?? 4096,
      system: systemMsg?.content || undefined,
      messages: nonSystemMsgs.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    content: data.content?.[0]?.text || '',
    model: data.model || req.model || 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    usage: data.usage ? {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
    } : undefined,
  }
}

// ─── Chat Completion via DeepSeek API ──────────────────────────────────────

async function deepseekChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not configured')

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: req.model || 'deepseek-chat',
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model || req.model || 'deepseek-chat',
    provider: 'deepseek',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  }
}

// ─── Chat Completion via Ollama (Local) ────────────────────────────────────

async function ollamaChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

  // Strip the 'ollama-' prefix from model name when sending to Ollama API
  // e.g. 'ollama-mistral' -> 'mistral', 'ollama-llama3.1' -> 'llama3.1'
  const ollamaModel = (req.model || 'llama3.1').replace(/^ollama-/, '')

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ollamaModel,
      messages: req.messages,
      stream: false,
      options: {
        temperature: req.temperature ?? 0.7,
        num_predict: req.maxTokens ?? 4096,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Ollama API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    content: data.message?.content || '',
    model: data.model || ollamaModel,
    provider: 'ollama',
  }
}

// ─── Chat Completion via Grok (xAI) API ─────────────────────────────────────

async function grokChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) throw new Error('XAI_API_KEY is not configured')

  // Map openrouter-prefixed model IDs to actual xAI model names
  const modelId = req.model || 'grok-3'
  const xaiModel = modelId.replace(/^grok-/, 'grok-') // already correct format

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: xaiModel,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Grok (xAI) API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model || xaiModel,
    provider: 'grok',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  }
}

// ─── Chat Completion via OpenRouter API ──────────────────────────────────────

async function openrouterChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured')

  // Map openrouter-prefixed model IDs to actual provider model names
  const openrouterModelMap: Record<string, string> = {
    'openrouter-auto': 'openrouter/auto',
    'openrouter-claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
    'openrouter-gpt-4o': 'openai/gpt-4o',
    'openrouter-gemini-pro': 'google/gemini-pro',
    'openrouter-deepseek-chat': 'deepseek/deepseek-chat',
    'openrouter-grok-2': 'x-ai/grok-2',
    'openrouter-llama-3.1': 'meta-llama/llama-3.1-70b-instruct',
  }

  const modelId = req.model || 'openrouter-auto'
  const actualModel = openrouterModelMap[modelId] || modelId.replace(/^openrouter-/, '')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://aios.app',
      'X-Title': 'AIOS - AI Operating System',
    },
    body: JSON.stringify({
      model: actualModel,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model || actualModel,
    provider: 'openrouter',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  }
}

// ─── Chat Completion via z-ai-web-dev-sdk (Default) ────────────────────────

async function zaiChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const MAX_RETRIES = 4
  const RETRY_DELAYS = [2000, 4000, 8000, 12000] // Exponential backoff

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      // Z-AI SDK uses 'assistant' role for system prompts, not 'system'
      // Also filter out 'tool' role which is not supported by Z-AI SDK
      const zaiMessages = req.messages
        .filter(m => m.role !== 'tool')
        .map(m => ({
          role: (m.role === 'system' ? 'assistant' : m.role) as 'user' | 'assistant',
          content: m.content,
        }))

      const completion = await zai.chat.completions.create({
        messages: zaiMessages,
        model: req.model || undefined,
        thinking: { type: 'disabled' },
      })

      const content = completion.choices[0]?.message?.content || ''
      if (!content) {
        throw new Error('Z-AI returned an empty response. The built-in AI may be temporarily unavailable.')
      }

      return {
        content,
        model: completion.model || req.model || 'zai-default',
        provider: 'zai',
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)

      // Retry on "pending state" errors (function still initializing)
      if (
        attempt < MAX_RETRIES &&
        (errMsg.includes('pending state') || errMsg.includes('PreconditionFailed') || errMsg.includes('please try later'))
      ) {
        console.log(`Z-AI function pending, retrying in ${RETRY_DELAYS[attempt]}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]))
        continue
      }

      if (errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed')) {
        throw new Error('Z-AI (built-in) could not connect to the server. Check your internet connection.')
      }
      if (errMsg.includes('API key') || errMsg.includes('api_key') || errMsg.includes('unauthorized') || errMsg.includes('401')) {
        throw new Error('Z-AI authentication failed. Try adding an external provider API key in .env.')
      }
      if (errMsg.includes('pending state') || errMsg.includes('PreconditionFailed')) {
        throw new Error('AI service is still starting up. Please wait a moment and try again.')
      }
      throw new Error(`Z-AI error: ${errMsg}`)
    }
  }

  // Should not reach here, but just in case
  throw new Error('Z-AI service is unavailable after multiple retries. Please try again later.')
}

// ─── Main Chat Completion Router ───────────────────────────────────────────

export async function chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  let providerId = req.model ? resolveProvider(req.model) : (ZAI_AVAILABLE ? 'zai' : getBestAvailableProvider())

  // If Z-AI is selected but not configured, fall back to best available
  if (providerId === 'zai' && !ZAI_AVAILABLE) {
    console.warn('Z-AI not configured (.z-ai-config missing), falling back to', getBestAvailableProvider())
    providerId = getBestAvailableProvider()
    // Update the model to match the fallback provider
    if (!req.model || resolveProvider(req.model) === 'zai') {
      req = { ...req, model: providerId === 'mistral' ? 'mistral-large-latest' : undefined }
    }
  }

  switch (providerId) {
    case 'mistral':
      return mistralChatCompletion(req)
    case 'openai':
      return openaiChatCompletion(req)
    case 'anthropic':
      return anthropicChatCompletion(req)
    case 'deepseek':
      return deepseekChatCompletion(req)
    case 'ollama':
      return ollamaChatCompletion(req)
    case 'grok':
      return grokChatCompletion(req)
    case 'openrouter':
      return openrouterChatCompletion(req)
    case 'zai':
    default:
      return zaiChatCompletion(req)
  }
}

// ─── Mask API Key for Display ──────────────────────────────────────────────

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? '••••••••' : ''
  return key.slice(0, 4) + '••••••••' + key.slice(-4)
}

// ─── Get Configured Keys Status (safe for frontend) ────────────────────────

export function getConfiguredKeysStatus(): Record<string, { configured: boolean; masked: string }> {
  return {
    MISTRAL_API_KEY: {
      configured: !!process.env.MISTRAL_API_KEY,
      masked: process.env.MISTRAL_API_KEY ? maskApiKey(process.env.MISTRAL_API_KEY) : '',
    },
    OPENAI_API_KEY: {
      configured: !!process.env.OPENAI_API_KEY,
      masked: process.env.OPENAI_API_KEY ? maskApiKey(process.env.OPENAI_API_KEY) : '',
    },
    ANTHROPIC_API_KEY: {
      configured: !!process.env.ANTHROPIC_API_KEY,
      masked: process.env.ANTHROPIC_API_KEY ? maskApiKey(process.env.ANTHROPIC_API_KEY) : '',
    },
    GOOGLE_API_KEY: {
      configured: !!process.env.GOOGLE_API_KEY,
      masked: process.env.GOOGLE_API_KEY ? maskApiKey(process.env.GOOGLE_API_KEY) : '',
    },
    DEEPSEEK_API_KEY: {
      configured: !!process.env.DEEPSEEK_API_KEY,
      masked: process.env.DEEPSEEK_API_KEY ? maskApiKey(process.env.DEEPSEEK_API_KEY) : '',
    },
    XAI_API_KEY: {
      configured: !!process.env.XAI_API_KEY,
      masked: process.env.XAI_API_KEY ? maskApiKey(process.env.XAI_API_KEY) : '',
    },
    OPENROUTER_API_KEY: {
      configured: !!process.env.OPENROUTER_API_KEY,
      masked: process.env.OPENROUTER_API_KEY ? maskApiKey(process.env.OPENROUTER_API_KEY) : '',
    },
    OLLAMA_BASE_URL: {
      configured: !!process.env.OLLAMA_BASE_URL,
      masked: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    },
  }
}
