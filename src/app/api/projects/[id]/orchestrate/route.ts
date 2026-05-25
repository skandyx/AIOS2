import { NextRequest, NextResponse } from 'next/server'
import {
  orchestrateProject,
  generateAgentDiscussion,
  simulateAgentWork,
  getOrchestrationStatus,
  type TaskAssignment,
} from '@/lib/orchestrator'
import { db } from '@/lib/db'

// GET /api/projects/[id]/orchestrate - Get orchestration status for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const status = await getOrchestrationStatus(id)

    return NextResponse.json(status)
  } catch (error) {
    console.error('Get orchestration status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orchestration status' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/orchestrate - Start orchestration for a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const {
      includeDiscussion = true,
      simulateWork = false,
    } = body

    // 1. Orchestrate the project (generate tasks + assign agents)
    const plan = await orchestrateProject(id)

    // 2. Optionally generate agent discussion
    let discussion = undefined
    if (includeDiscussion && plan.assignments.length > 0) {
      try {
        discussion = await generateAgentDiscussion(id, plan.assignments)
      } catch (error) {
        console.error('Failed to generate agent discussion:', error)
        // Non-fatal: continue without discussion
      }
    }

    // 3. Optionally simulate work on the first few tasks
    let workProgress = undefined
    if (simulateWork && plan.assignments.length > 0) {
      const tasksToSimulate = plan.assignments
        .filter((a: TaskAssignment) => a.agentId)
        .slice(0, 3) // Simulate work on up to 3 tasks

      workProgress = []
      for (const assignment of tasksToSimulate) {
        try {
          const progress = await simulateAgentWork(assignment.taskId, assignment.agentId!)
          workProgress.push(...progress)
        } catch (error) {
          console.error(`Failed to simulate work for task ${assignment.taskId}:`, error)
        }
      }
    }

    // 4. Broadcast orchestration event via WebSocket
    try {
      await fetch(`/api/projects/${id}/orchestrate?XTransformPort=3003`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'orchestration:complete',
          projectId: id,
          tasksCreated: plan.tasksCreated,
        }),
      }).catch(() => {
        // WebSocket broadcast is best-effort
      })
    } catch {
      // Ignore WebSocket broadcast failures
    }

    return NextResponse.json({
      success: true,
      plan,
      discussion,
      workProgress,
    })
  } catch (error) {
    console.error('Orchestration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Orchestration failed',
      },
      { status: 500 }
    )
  }
}
