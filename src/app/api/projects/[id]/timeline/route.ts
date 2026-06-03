import { NextRequest, NextResponse } from 'next/server'

// GET /api/projects/[id]/timeline - Get timeline events for the project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    let getTimeline: (projectId: string) => Promise<Array<Record<string, unknown>>>
    try {
      const mod = await import('@/lib/agent-executor')
      getTimeline = (mod as Record<string, unknown>).getTimeline as typeof getTimeline
    } catch {
      return NextResponse.json({ events: [] })
    }

    const events = await getTimeline(id)

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Get timeline error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    )
  }
}
