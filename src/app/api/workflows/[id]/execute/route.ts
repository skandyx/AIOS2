import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/workflows/[id]/execute - Run a workflow execution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const workflow = await db.workflow.findUnique({ where: { id } })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    if (workflow.status !== 'active') {
      return NextResponse.json(
        { error: 'Workflow must be active to execute' },
        { status: 400 }
      )
    }

    // Create a new execution record
    const execution = await db.workflowExecution.create({
      data: {
        workflowId: id,
        status: 'running',
        input: body.input ? JSON.stringify(body.input) : null,
        nodeStates: workflow.nodes, // Copy current node structure
      },
    })

    // Simulate async execution completion after a delay
    // In production, this would be handled by a background job
    setTimeout(async () => {
      try {
        const duration = Math.floor(5000 + Math.random() * 15000)
        const success = Math.random() > 0.15 // 85% success rate

        await db.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: success ? 'completed' : 'failed',
            completedAt: new Date(),
            duration,
            output: success ? JSON.stringify({ result: 'Execution completed successfully' }) : null,
            error: success ? null : 'Simulated execution failure',
          },
        })
      } catch (err) {
        console.error('Workflow execution completion error:', err)
      }
    }, 3000)

    return NextResponse.json(execution, { status: 201 })
  } catch (error) {
    console.error('Execute workflow error:', error)
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    )
  }
}
