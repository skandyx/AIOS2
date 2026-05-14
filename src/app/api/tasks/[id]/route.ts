import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/tasks/[id] - Get task details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const task = await db.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, type: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        parentTask: {
          select: { id: true, title: true, status: true },
        },
        subTasks: true,
        memories: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Get task error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

// PATCH /api/tasks/[id] - Update task (status, progress, output)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const task = await db.task.findUnique({ where: { id } })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === 'in_progress' && !task.startedAt) {
        updateData.startedAt = new Date()
      }
      if (body.status === 'completed') {
        updateData.completedAt = new Date()
        updateData.progress = 100
      }
    }
    if (body.progress !== undefined) updateData.progress = body.progress
    if (body.result !== undefined) updateData.result = body.result
    if (body.error !== undefined) updateData.error = body.error
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.description !== undefined) updateData.description = body.description
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId

    const updated = await db.task.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id] - Remove task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const task = await db.task.findUnique({ where: { id } })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    await db.task.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
