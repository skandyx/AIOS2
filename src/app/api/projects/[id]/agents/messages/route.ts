import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/projects/[id]/agents/messages - Get all agent messages for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') || undefined
    const fromRole = searchParams.get('fromRole') || undefined
    const toRole = searchParams.get('toRole') || undefined

    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = { projectId: id }
    if (type) where.type = type
    if (fromRole) where.fromRole = fromRole
    if (toRole) where.toRole = toRole

    const [messages, total] = await Promise.all([
      db.agentMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          fromAgent: { select: { id: true, name: true, type: true, avatar: true } },
          toAgent: { select: { id: true, name: true, type: true, avatar: true } },
        },
      }),
      db.agentMessage.count({ where }),
    ])

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get agent messages error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent messages' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/agents/messages - Send a new agent message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()

    if (!body.content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const message = await db.agentMessage.create({
      data: {
        projectId: id,
        fromRole: body.fromRole || 'user',
        toRole: body.toRole || 'all',
        type: body.type || 'instruction',
        content: body.content,
        fromAgentId: body.fromAgentId || null,
        toAgentId: body.toAgentId || null,
        taskIds: body.taskIds ? JSON.stringify(body.taskIds) : null,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      },
      include: {
        fromAgent: { select: { id: true, name: true, type: true, avatar: true } },
        toAgent: { select: { id: true, name: true, type: true, avatar: true } },
      },
    })

    // Log the message in orchestrator log
    const log: Array<{ timestamp: string; event: string; details?: unknown }> = JSON.parse(
      project.orchestratorLog || '[]'
    )
    log.push({
      timestamp: new Date().toISOString(),
      event: 'agent_message_sent',
      details: {
        messageId: message.id,
        fromRole: message.fromRole,
        toRole: message.toRole,
        type: message.type,
      },
    })
    await db.project.update({
      where: { id },
      data: { orchestratorLog: JSON.stringify(log) },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Create agent message error:', error)
    return NextResponse.json(
      { error: 'Failed to create agent message' },
      { status: 500 }
    )
  }
}
