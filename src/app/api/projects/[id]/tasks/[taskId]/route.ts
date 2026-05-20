import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Status mapping: frontend ↔ database
function toDbStatus(frontendStatus: string): string {
  switch (frontendStatus) {
    case 'todo':
      return 'pending'
    case 'done':
      return 'completed'
    case 'in_progress':
      return 'in_progress'
    default:
      return frontendStatus
  }
}

function toFrontendStatus(dbStatus: string): string {
  switch (dbStatus) {
    case 'pending':
      return 'todo'
    case 'completed':
      return 'done'
    case 'in_progress':
      return 'in_progress'
    default:
      return dbStatus
  }
}

// PATCH /api/projects/[id]/tasks/[taskId] - Update a task within a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params
    const body = await request.json()

    // Verify the task exists and belongs to this project
    const task = await db.task.findUnique({ where: { id: taskId } })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    if (task.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Task does not belong to this project' },
        { status: 403 }
      )
    }

    // Build the update data
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.type !== undefined) updateData.type = body.type
    if (body.result !== undefined) updateData.result = body.result
    if (body.error !== undefined) updateData.error = body.error
    if (body.progress !== undefined) updateData.progress = body.progress
    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
    }

    // Handle status changes with frontend ↔ DB mapping
    if (body.status !== undefined) {
      const dbStatus = toDbStatus(body.status)
      updateData.status = dbStatus

      // Set completedAt when status changes to completed
      if (dbStatus === 'completed') {
        updateData.completedAt = new Date()
        updateData.progress = 100
      }

      // Set startedAt when status changes to in_progress (only if not already set)
      if (dbStatus === 'in_progress' && !task.startedAt) {
        updateData.startedAt = new Date()
      }
    }

    const updated = await db.task.update({
      where: { id: taskId },
      data: updateData,
    })

    // Map DB status back to frontend status in the response
    const response = {
      ...updated,
      status: toFrontendStatus(updated.status),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Update project task error:', error)
    return NextResponse.json(
      { error: 'Failed to update project task' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/tasks/[taskId] - Delete a task from a project
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params

    // Verify the task exists and belongs to this project
    const task = await db.task.findUnique({ where: { id: taskId } })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    if (task.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Task does not belong to this project' },
        { status: 403 }
      )
    }

    await db.task.delete({ where: { id: taskId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete project task error:', error)
    return NextResponse.json(
      { error: 'Failed to delete project task' },
      { status: 500 }
    )
  }
}
