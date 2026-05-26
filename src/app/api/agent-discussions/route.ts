import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateAgentDiscussion, ensureDefaultAgents, type TaskAssignment } from '@/lib/orchestrator'

// GET /api/agent-discussions?projectId=xxx - List discussions for a project
// Reads persisted discussions from the database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Fetch persisted discussions from the database
    const discussions = await db.agentDiscussion.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    })

    // Also get task-agent assignments for context
    const tasks = await db.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: { id: true, name: true, type: true, avatar: true },
        },
      },
    })

    // Return task-agent assignments
    const assignments = tasks
      .filter((t) => t.assignee)
      .map((t) => ({
        taskId: t.id,
        taskTitle: t.title,
        taskType: t.type,
        agentId: t.assignee!.id,
        agentName: t.assignee!.name,
        agentType: t.assignee!.type,
      }))

    // Map DB records to the expected message format
    const messages = discussions.map((d) => ({
      agentId: d.agentId || '',
      agentName: d.agentName,
      agentType: d.agentType,
      content: d.content,
      timestamp: d.createdAt.toISOString(),
      round: d.round,
      type: d.type,
    }))

    return NextResponse.json({
      projectId,
      projectName: project.name,
      messages,
      assignments,
      total: messages.length,
    })
  } catch (error) {
    console.error('Get agent discussions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent discussions' },
      { status: 500 }
    )
  }
}

// POST /api/agent-discussions - Generate new discussion for a project
// The discussion is persisted to DB by generateAgentDiscussion itself
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Ensure agents exist
    await ensureDefaultAgents()

    // Get tasks with their agent assignments
    const tasks = await db.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: { id: true, name: true, type: true, avatar: true },
        },
      },
    })

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: 'No tasks found for this project. Run orchestration first.' },
        { status: 400 }
      )
    }

    // Build task assignments for discussion generation
    const taskAssignments: TaskAssignment[] = tasks
      .filter((t) => t.assignee)
      .map((t) => ({
        taskId: t.id,
        taskTitle: t.title,
        taskType: t.type || 'development',
        taskPriority: t.priority,
        agentId: t.assignee!.id,
        agentName: t.assignee!.name,
        agentType: t.assignee!.type,
      }))

    if (taskAssignments.length === 0) {
      return NextResponse.json(
        { error: 'No agents assigned to tasks. Run orchestration first.' },
        { status: 400 }
      )
    }

    // Generate the discussion (persists to DB internally)
    const discussion = await generateAgentDiscussion(projectId, taskAssignments)

    // No longer need in-memory cache - discussions are persisted to DB

    return NextResponse.json({
      success: true,
      projectId,
      projectName: project.name,
      messages: discussion,
      total: discussion.length,
    })
  } catch (error) {
    console.error('Generate agent discussion error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate discussion',
      },
      { status: 500 }
    )
  }
}
