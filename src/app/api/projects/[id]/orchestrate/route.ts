import { NextRequest, NextResponse } from 'next/server'
import { runOrchestration } from '@/lib/orchestrator'

// POST /api/projects/[id]/orchestrate - Trigger orchestrator for a project
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
