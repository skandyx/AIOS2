import { NextRequest, NextResponse } from 'next/server'
import { executeAgentTasks, getProjectExecutionStatus } from '@/lib/agent-executor'

// POST /api/projects/[id]/execute - Execute the next agent task step
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await executeAgentTasks(id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Execution failed', ...result },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Execute agent task error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 }
    )
  }
}

// GET /api/projects/[id]/execute - Get current execution status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const status = await getProjectExecutionStatus(id)

    if (!status) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Get execution status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch execution status' },
      { status: 500 }
    )
  }
}
