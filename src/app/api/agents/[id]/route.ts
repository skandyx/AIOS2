import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/agents/[id] - Get agent details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tasksAssigned: true,
            messages: true,
            conversations: true,
          },
        },
      },
    })

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Get agent error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    )
  }
}

// PATCH /api/agents/[id] - Update agent (status, config)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const agent = await db.agent.findUnique({ where: { id } })

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.config !== undefined) updateData.config = JSON.stringify(body.config)
    if (body.description !== undefined) updateData.description = body.description
    if (body.capabilities !== undefined) updateData.capabilities = JSON.stringify(body.capabilities)
    if (body.systemPrompt !== undefined) updateData.systemPrompt = body.systemPrompt
    if (body.model !== undefined) updateData.model = body.model
    if (body.name !== undefined) updateData.name = body.name

    const updated = await db.agent.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update agent error:', error)
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    )
  }
}

// DELETE /api/agents/[id] - Remove agent
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const agent = await db.agent.findUnique({ where: { id } })

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    await db.agent.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete agent error:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    )
  }
}
