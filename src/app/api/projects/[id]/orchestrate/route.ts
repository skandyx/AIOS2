import { NextRequest, NextResponse } from 'next/server'

// POST /api/projects/[id]/orchestrate - Trigger orchestrator for a project
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Dynamic import so a broken orchestrator module returns a clear error
    // instead of crashing this route at module-load time.
    let runOrchestration: (projectId: string, options?: { skipDocumentation?: boolean }) => Promise<Record<string, unknown>>
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
