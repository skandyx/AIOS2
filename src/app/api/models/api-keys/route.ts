import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// ─── Provider → Env Variable Mapping ────────────────────────────────────────

const PROVIDER_ENV_MAP: Record<string, string> = {
  mistral: 'MISTRAL_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  grok: 'XAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  ollama: 'OLLAMA_BASE_URL',
}

const ENV_FILE_PATH = '/home/z/my-project/.env'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? '••••••••' : ''
  return key.slice(0, 4) + '••••••••' + key.slice(-4)
}

function readEnvFile(): string {
  try {
    return fs.readFileSync(ENV_FILE_PATH, 'utf-8')
  } catch {
    return ''
  }
}

function writeEnvFile(content: string): void {
  fs.writeFileSync(ENV_FILE_PATH, content, 'utf-8')
}

function parseEnvLines(content: string): Map<string, string> {
  const map = new Map<string, string>()
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    map.set(key, value)
  }
  return map
}

function buildEnvContent(entries: Map<string, string>, originalContent: string): string {
  // Preserve comments and blank lines from the original file
  const lines = originalContent.split('\n')
  const usedKeys = new Set<string>()
  const resultLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Keep comments and blank lines as-is
    if (!trimmed || trimmed.startsWith('#')) {
      resultLines.push(line)
      continue
    }
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) {
      resultLines.push(line)
      continue
    }
    const key = trimmed.slice(0, eqIndex).trim()
    if (entries.has(key)) {
      // Update this key with the new value
      const value = entries.get(key)!
      resultLines.push(`${key}=${value}`)
      usedKeys.add(key)
    } else {
      // Keep the original line (key was not in our entries map, so it was deleted or not touched)
      // If the key was removed from entries, skip it
      // We'll handle this by checking if the key was explicitly removed
      resultLines.push(line)
      usedKeys.add(key)
    }
  }

  // Add any new keys that weren't in the original file
  for (const [key, value] of entries) {
    if (!usedKeys.has(key)) {
      resultLines.push(`${key}=${value}`)
    }
  }

  // Ensure the file ends with a newline
  let result = resultLines.join('\n')
  if (!result.endsWith('\n')) {
    result += '\n'
  }
  return result
}

// ─── GET /api/models/api-keys ───────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: { params: Promise<Record<string, never>> }) {
  await params // consume the promise (no actual params for this route)

  try {
    const status: Record<string, { configured: boolean; masked: string; envKey: string }> = {}

    for (const [provider, envKey] of Object.entries(PROVIDER_ENV_MAP)) {
      const value = process.env[envKey]
      status[provider] = {
        configured: !!value,
        masked: value ? maskKey(value) : '',
        envKey,
      }
    }

    return NextResponse.json({ keys: status })
  } catch (error) {
    console.error('API keys GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve API key status' },
      { status: 500 }
    )
  }
}

// ─── POST /api/models/api-keys ──────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: { params: Promise<Record<string, never>> }) {
  await params

  try {
    const body = await request.json()
    const { provider, apiKey } = body

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and apiKey are required' },
        { status: 400 }
      )
    }

    const envKey = PROVIDER_ENV_MAP[provider]
    if (!envKey) {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}. Valid providers: ${Object.keys(PROVIDER_ENV_MAP).join(', ')}` },
        { status: 400 }
      )
    }

    // Read and parse the current .env file
    const currentContent = readEnvFile()
    const envEntries = parseEnvLines(currentContent)

    // Update the entry
    envEntries.set(envKey, apiKey)

    // Rebuild the .env file content preserving structure
    const newContent = buildEnvContent(envEntries, currentContent)
    writeEnvFile(newContent)

    // Update process.env so the change takes effect immediately
    process.env[envKey] = apiKey

    return NextResponse.json({
      success: true,
      provider,
      envKey,
      masked: maskKey(apiKey),
    })
  } catch (error) {
    console.error('API keys POST error:', error)
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/models/api-keys ────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: { params: Promise<Record<string, never>> }) {
  await params

  try {
    const body = await request.json()
    const { provider } = body

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      )
    }

    const envKey = PROVIDER_ENV_MAP[provider]
    if (!envKey) {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}. Valid providers: ${Object.keys(PROVIDER_ENV_MAP).join(', ')}` },
        { status: 400 }
      )
    }

    // Read and parse the current .env file
    const currentContent = readEnvFile()
    const lines = currentContent.split('\n')
    const filteredLines: string[] = []

    // Remove the line with the target env key
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        filteredLines.push(line)
        continue
      }
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) {
        filteredLines.push(line)
        continue
      }
      const key = trimmed.slice(0, eqIndex).trim()
      if (key === envKey) {
        // Skip this line — effectively deleting the variable
        continue
      }
      filteredLines.push(line)
    }

    // Write the updated .env file
    let newContent = filteredLines.join('\n')
    if (newContent && !newContent.endsWith('\n')) {
      newContent += '\n'
    }
    writeEnvFile(newContent)

    // Delete from process.env
    delete process.env[envKey]

    return NextResponse.json({
      success: true,
      provider,
      envKey,
    })
  } catch (error) {
    console.error('API keys DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
