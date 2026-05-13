import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workflows/[id] - Get workflow with nodes/edges
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const workflow = await db.workflow.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { tasks: true },
        },
      },
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(workflow)
  } catch (error) {
    console.error('Get workflow error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    )
  }
}

// PATCH /api/workflows/[id] - Update workflow
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const workflow = await db.workflow.findUnique({ where: { id } })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.status !== undefined) updateData.status = body.status
    if (body.nodes !== undefined) {
      updateData.nodes = typeof body.nodes === 'string' ? body.nodes : JSON.stringify(body.nodes)
    }
    if (body.edges !== undefined) {
      updateData.edges = typeof body.edges === 'string' ? body.edges : JSON.stringify(body.edges)
    }
    if (body.variables !== undefined) {
      updateData.variables = typeof body.variables === 'string' ? body.variables : JSON.stringify(body.variables)
    }
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.category !== undefined) updateData.category = body.category
    if (body.isTemplate !== undefined) updateData.isTemplate = body.isTemplate

    const updated = await db.workflow.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update workflow error:', error)
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    )
  }
}

// DELETE /api/workflows/[id] - Delete workflow
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const workflow = await db.workflow.findUnique({ where: { id } })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    await db.workflow.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete workflow error:', error)
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    )
  }
}
