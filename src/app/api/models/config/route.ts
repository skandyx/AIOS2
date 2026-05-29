import { NextRequest, NextResponse } from 'next/server'
import { getProviders, getProviderStatus, getConfiguredKeysStatus } from '@/lib/providers'

/**
 * GET /api/models/config
 * Returns all provider configurations, their models, and API key status
 */
export async function GET() {
  try {
    const providers = getProviders()
    const providerStatus = getProviderStatus()
    const keysStatus = getConfiguredKeysStatus()

    // Build safe response (never expose raw API keys)
    const safeProviders = providers.map(p => ({
      id: p.id,
      name: p.name,
      envKey: p.envKey,
      baseUrl: p.id === 'ollama' ? (process.env.OLLAMA_BASE_URL || 'http://localhost:11434') : undefined,
      models: p.models.map(m => ({
        id: m.id,
        name: m.name,
        providerId: m.providerId,
        providerName: m.providerName,
        capabilities: m.capabilities,
        contextWindow: m.contextWindow,
        maxTokens: m.maxTokens,
      })),
      isAvailable: p.isAvailable,
    }))

    return NextResponse.json({
      providers: safeProviders,
      providerStatus,
      keysStatus,
    })
  } catch (error) {
    console.error('Models config GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load model configurations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/models/config
 * Validates an API key for a given provider without saving it
 * (API keys must be set via .env file for security)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, apiKey } = body

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 }
      )
    }

    // Validate the API key by making a test request
    let isValid = false
    let errorMessage = ''

    switch (provider) {
      case 'mistral': {
        try {
          const res = await fetch('https://api.mistral.ai/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          })
          isValid = res.ok
          if (!isValid) errorMessage = `Mistral API returned ${res.status}`
        } catch {
          errorMessage = 'Failed to connect to Mistral API'
        }
        break
      }
      case 'openai': {
        try {
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          })
          isValid = res.ok
          if (!isValid) errorMessage = `OpenAI API returned ${res.status}`
        } catch {
          errorMessage = 'Failed to connect to OpenAI API'
        }
        break
      }
      case 'deepseek': {
        try {
          const res = await fetch('https://api.deepseek.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          })
          isValid = res.ok
          if (!isValid) errorMessage = `DeepSeek API returned ${res.status}`
        } catch {
          errorMessage = 'Failed to connect to DeepSeek API'
        }
        break
      }
      case 'ollama': {
        try {
          const res = await fetch(`${apiKey}/api/tags`)
          isValid = res.ok
          if (!isValid) errorMessage = `Ollama at ${apiKey} returned ${res.status}`
        } catch {
          errorMessage = `Failed to connect to Ollama at ${apiKey}`
        }
        break
      }
      case 'grok': {
        try {
          const res = await fetch('https://api.x.ai/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          })
          isValid = res.ok
          if (!isValid) errorMessage = `Grok (xAI) API returned ${res.status}`
        } catch {
          errorMessage = 'Failed to connect to Grok (xAI) API'
        }
        break
      }
      case 'openrouter': {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          })
          isValid = res.ok
          if (!isValid) errorMessage = `OpenRouter API returned ${res.status}`
        } catch {
          errorMessage = 'Failed to connect to OpenRouter API'
        }
        break
      }
      default: {
        errorMessage = `Validation not supported for provider: ${provider}`
      }
    }

    return NextResponse.json({
      valid: isValid,
      error: isValid ? undefined : errorMessage,
      message: isValid
        ? 'API key is valid! Add it to your .env file to activate this provider.'
        : `API key validation failed: ${errorMessage}`,
    })
  } catch (error) {
    console.error('Models config POST error:', error)
    return NextResponse.json(
      { error: 'Failed to validate API key' },
      { status: 500 }
    )
  }
}
