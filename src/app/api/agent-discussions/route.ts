import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateAgentDiscussion, ensureDefaultAgents, type TaskAssignment } from '@/lib/orchestrator'

// ─── In-memory discussion cache ──────────────────────────────────────────────
// Maps projectId → AgentDiscussionMessage[]
const discussionCache = new Map<string, Array<{
  agentId: string
  agentName: string
  agentType: string
  content: string
  timestamp: string
}>>()

// GET /api/agent-discussions?projectId=xxx - List discussions for a project
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

    // Check cache first
    const cached = discussionCache.get(projectId)
    if (cached) {
      return NextResponse.json({
        projectId,
        projectName: project.name,
        messages: cached,
        total: cached.length,
      })
    }

    // No cached discussion - check if there are tasks with agents assigned
    const tasks = await db.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: { id: true, name: true, type: true, avatar: true },
        },
      },
    })

    // Return task-agent assignments even without a discussion
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

    return NextResponse.json({
      projectId,
      projectName: project.name,
      messages: [],
      assignments,
      total: 0,
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

    // Generate the discussion
    const discussion = await generateAgentDiscussion(projectId, taskAssignments)

    // Cache the discussion
    discussionCache.set(projectId, discussion)

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
