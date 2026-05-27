import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/agent-discussions?projectId=xxx - List discussions for a project
// Uses AgentMessage model (which exists in the Prisma schema) as a proxy
// since AgentDiscussion model does not exist yet.
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

    // Fetch agent messages as discussion proxy
    const messages = await db.agentMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: 100,
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

    // Map AgentMessage records to discussion format
    const discussionMessages = messages.map((m) => ({
      agentId: m.fromAgentId || '',
      agentName: m.fromRole,
      agentType: m.fromRole,
      content: m.content,
      timestamp: m.createdAt.toISOString(),
      round: 0,
      type: m.type,
    }))

    return NextResponse.json({
      projectId,
      projectName: project.name,
      messages: discussionMessages,
      assignments,
      total: discussionMessages.length,
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
// NOTE: generateAgentDiscussion was removed from the orchestrator module.
// This endpoint returns a placeholder response until the feature is re-implemented.
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

    // Return existing agent messages as a fallback
    const messages = await db.agentMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    const discussionMessages = messages.map((m) => ({
      agentId: m.fromAgentId || '',
      agentName: m.fromRole,
      agentType: m.fromRole,
      content: m.content,
      timestamp: m.createdAt.toISOString(),
      round: 0,
      type: m.type,
    }))

    return NextResponse.json({
      success: true,
      projectId,
      projectName: project.name,
      messages: discussionMessages,
      total: discussionMessages.length,
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
