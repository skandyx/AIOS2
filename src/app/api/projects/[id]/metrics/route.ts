import { NextRequest, NextResponse } from 'next/server'

// GET /api/projects/[id]/metrics - Get project metrics
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    let getProjectMetrics: (projectId: string) => Promise<Record<string, unknown> | null>
    try {
      const mod = await import('@/lib/agent-executor')
      getProjectMetrics = (mod as Record<string, unknown>).getProjectMetrics as typeof getProjectMetrics
    } catch {
      return NextResponse.json({ error: 'Metrics module unavailable' }, { status: 503 })
    }

    const metrics = await getProjectMetrics(id)

    if (!metrics) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Get metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project metrics' },
      { status: 500 }
    )
  }
}
