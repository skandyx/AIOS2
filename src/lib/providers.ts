/**
 * AI Provider Abstraction Layer
 * 
 * Routes chat completion requests to the appropriate AI provider
 * based on the selected model. Supports:
 * - z-ai-web-dev-sdk (default/built-in)
 * - Mistral AI
 * - OpenAI (ChatGPT)
 * - Anthropic (Claude)
 * - Google Gemini
 * - xAI Grok
 * - DeepSeek
 * - Local Ollama
 */

// ─── Provider Types ────────────────────────────────────────────────────────

export type ProviderId = 'zai' | 'mistral' | 'openai' | 'anthropic' | 'google' | 'deepseek' | 'ollama' | 'grok'

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
  'gpt4-turbo': 'zai',
  'gpt4o': 'zai',
  'claude-3.5-sonnet': 'zai',
  'claude-3-opus': 'zai',
  'mistral-large-latest': 'mistral',
  'mistral-medium-latest': 'mistral',
  'mistral-small-latest': 'mistral',
  'open-mistral-nemo': 'mistral',
  'codestral-latest': 'mistral',
  'gpt-4-turbo': 'openai',
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  'claude-3-5-sonnet-20241022': 'anthropic',
  'claude-3-opus-20240229': 'anthropic',
  'claude-3-haiku-20240307': 'anthropic',
  'gemini-pro': 'google',
  'gemini-1.5-flash': 'google',
  'gemini-2.0-flash': 'google',
  'grok-3': 'grok',
  'grok-3-mini': 'grok',
  'grok-2': 'grok',
  'deepseek-chat': 'deepseek',
  'deepseek-coder': 'deepseek',
  'deepseek-reasoner': 'deepseek',
  'llama3.1': 'ollama',
  'codellama': 'ollama',
}

// ─── Provider Definitions ──────────────────────────────────────────────────

export function getProviders(): ProviderConfig[] {
  return [
    {
      id: 'zai',
      name: 'Z-AI (Built-in)',
      envKey: '',
      models: [
        { id: 'gpt4-turbo', name: 'GPT-4 Turbo', providerId: 'zai', providerName: 'Z-AI', capabilities: ['chat', 'code', 'reasoning', 'vision'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'gpt4o', name: 'GPT-4o', providerId: 'zai', providerName: 'Z-AI', capabilities: ['chat', 'code', 'reasoning', 'vision'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', providerId: 'zai', providerName: 'Z-AI', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '200K', maxTokens: 4096 },
        { id: 'claude-3-opus', name: 'Claude 3 Opus', providerId: 'zai', providerName: 'Z-AI', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '200K', maxTokens: 4096 },
      ],
      isAvailable: true, // Always available - built-in SDK
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
      id: 'grok',
      name: 'xAI Grok',
      envKey: 'XAI_API_KEY',
      baseUrl: 'https://api.x.ai/v1',
      models: [
        { id: 'grok-3', name: 'Grok 3', providerId: 'grok', providerName: 'xAI', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '131K', maxTokens: 8192 },
        { id: 'grok-3-mini', name: 'Grok 3 Mini', providerId: 'grok', providerName: 'xAI', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '131K', maxTokens: 8192 },
        { id: 'grok-2', name: 'Grok 2', providerId: 'grok', providerName: 'xAI', capabilities: ['chat', 'code'], contextWindow: '131K', maxTokens: 4096 },
      ],
      isAvailable: !!process.env.XAI_API_KEY,
    },
    {
      id: 'ollama',
      name: 'Ollama (Local)',
      envKey: 'OLLAMA_BASE_URL',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      models: [
        { id: 'llama3.1', name: 'Llama 3.1', providerId: 'ollama', providerName: 'Ollama', capabilities: ['chat', 'code', 'reasoning'], contextWindow: '128K', maxTokens: 4096 },
        { id: 'codellama', name: 'CodeLlama', providerId: 'ollama', providerName: 'Ollama', capabilities: ['code'], contextWindow: '16K', maxTokens: 4096 },
        { id: 'mistral', name: 'Mistral 7B', providerId: 'ollama', providerName: 'Ollama', capabilities: ['chat', 'code'], contextWindow: '32K', maxTokens: 4096 },
      ],
      isAvailable: false, // Will be checked at runtime
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
      keyConfigured: p.id === 'zai' ? true : !!process.env[p.envKey],
      modelCount: p.models.length,
    }
  }
  return status
}

// ─── Resolve Provider for a Model ──────────────────────────────────────────

export function resolveProvider(modelId: string): ProviderId {
  return MODEL_PROVIDER_MAP[modelId] || 'zai'
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

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: req.model || 'llama3.1',
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
    model: data.model || req.model || 'llama3.1',
    provider: 'ollama',
  }
}

// ─── Chat Completion via xAI Grok API ──────────────────────────────────────

async function grokChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) throw new Error('XAI_API_KEY is not configured')

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: req.model || 'grok-3',
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`xAI Grok API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model || req.model || 'grok-3',
    provider: 'grok',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  }
}

// ─── Chat Completion via Google Gemini API ──────────────────────────────────

async function googleChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY is not configured')

  const model = req.model || 'gemini-pro'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  // Convert messages to Gemini format
  const contents = req.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const systemInstruction = req.messages.find(m => m.role === 'system')

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } } : {}),
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 4096,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google Gemini API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    model,
    provider: 'google',
    usage: data.usageMetadata ? {
      promptTokens: data.usageMetadata.promptTokenCount,
      completionTokens: data.usageMetadata.candidatesTokenCount,
      totalTokens: data.usageMetadata.totalTokenCount,
    } : undefined,
  }
}

// ─── Chat Completion via z-ai-web-dev-sdk (Default) ────────────────────────

async function zaiChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: req.messages,
      thinking: { type: 'disabled' },
    })

    const content = completion.choices[0]?.message?.content || ''
    if (!content) {
      throw new Error('Z-AI returned an empty response. The built-in AI may be temporarily unavailable.')
    }

    return {
      content,
      model: req.model || 'zai-default',
      provider: 'zai',
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    // Re-throw with a helpful message
    if (errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed')) {
      throw new Error('Z-AI (built-in) could not connect to the server. Check your internet connection. You can also configure an external provider (Mistral, OpenAI, etc.) in the .env file.')
    }
    if (errMsg.includes('API key') || errMsg.includes('api_key') || errMsg.includes('unauthorized') || errMsg.includes('401')) {
      throw new Error('Z-AI authentication failed. The built-in provider may need configuration. Try adding an external provider API key in .env.')
    }
    throw new Error(`Z-AI error: ${errMsg}`)
  }
}

// ─── Main Chat Completion Router ───────────────────────────────────────────

export async function chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const providerId = req.model ? resolveProvider(req.model) : 'zai'

  switch (providerId) {
    case 'mistral':
      return mistralChatCompletion(req)
    case 'openai':
      return openaiChatCompletion(req)
    case 'anthropic':
      return anthropicChatCompletion(req)
    case 'google':
      return googleChatCompletion(req)
    case 'grok':
      return grokChatCompletion(req)
    case 'deepseek':
      return deepseekChatCompletion(req)
    case 'ollama':
      return ollamaChatCompletion(req)
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
    XAI_API_KEY: {
      configured: !!process.env.XAI_API_KEY,
      masked: process.env.XAI_API_KEY ? maskApiKey(process.env.XAI_API_KEY) : '',
    },
    DEEPSEEK_API_KEY: {
      configured: !!process.env.DEEPSEEK_API_KEY,
      masked: process.env.DEEPSEEK_API_KEY ? maskApiKey(process.env.DEEPSEEK_API_KEY) : '',
    },
    OLLAMA_BASE_URL: {
      configured: !!process.env.OLLAMA_BASE_URL,
      masked: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    },
  }
}
