import { NextRequest, NextResponse } from 'next/server'

// POST /api/projects/[id]/orchestrate - Trigger orchestrator for a project (full 6-phase orchestration)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Pre-flight check: verify an AI provider is configured before attempting orchestration
    try {
      const { getProviderStatus } = await import('@/lib/providers')
      const status = await getProviderStatus()
      // Check if at least one provider is available (has an API key configured)
      const anyAvailable = Object.values(status).some((s: { available: boolean; keyConfigured: boolean }) => s.available || s.keyConfigured)
      if (!anyAvailable) {
        return NextResponse.json(
          { error: 'No AI provider configured. Please add an API key in AI Models → API Keys to enable orchestration.' },
          { status: 400 }
        )
      }
    } catch {
      // If we can't check provider status via the helper, check env vars directly
      if (!process.env.MISTRAL_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_API_KEY && !process.env.DEEPSEEK_API_KEY && !process.env.XAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
        return NextResponse.json(
          { error: 'No AI provider configured. Please add an API key in AI Models → API Keys to enable orchestration.' },
          { status: 400 }
        )
      }
    }

    let runOrchestration: (projectId: string, options?: { skipDocumentation?: boolean; phase?: string }) => Promise<Record<string, unknown>>
    try {
      const mod = await import('@/lib/orchestrator')
      runOrchestration = (mod as Record<string, unknown>).runOrchestration as typeof runOrchestration
    } catch (importError) {
      console.error('Failed to load orchestrator module:', importError)
      return NextResponse.json(
        { error: 'Orchestrator module is unavailable. Please check server configuration.' },
        { status: 503 }
      )
    }

    const result = await runOrchestration(id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Orchestration failed', ...result },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Orchestrate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Orchestration failed' },
      { status: 500 }
    )
  }
}

// GET /api/projects/[id]/orchestrate - Get orchestration status with current phase, agent activities, progress
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    let getOrchestrationStatus: (projectId: string) => Promise<Record<string, unknown> | null>
    try {
      const mod = await import('@/lib/orchestrator')
      getOrchestrationStatus = (mod as Record<string, unknown>).getOrchestrationStatus as typeof getOrchestrationStatus
    } catch (importError) {
      console.error('Failed to load orchestrator module:', importError)
      return NextResponse.json(
        { error: 'Orchestrator module is unavailable.' },
        { status: 503 }
      )
    }

    const status = await getOrchestrationStatus(id)

    if (!status) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Get orchestrate status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orchestration status' },
      { status: 500 }
    )
  }
}
