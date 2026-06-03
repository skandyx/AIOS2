import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/projects/[id]/kanban - Get kanban board data (tasks grouped by column)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    let getKanbanBoard: (projectId: string) => Promise<Record<string, unknown> | null>
    try {
      const mod = await import('@/lib/agent-executor')
      getKanbanBoard = (mod as Record<string, unknown>).getKanbanBoard as typeof getKanbanBoard
    } catch {
      getKanbanBoard = async () => null
    }

    const board = await getKanbanBoard(id)

    if (!board) {
      return NextResponse.json({ error: 'Failed to build kanban board' }, { status: 500 })
    }

    return NextResponse.json(board)
  } catch (error) {
    console.error('Get kanban error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch kanban board' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id]/kanban - Move task between columns
export async function PATCH(
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
    const { taskId, column, status } = body

    if (!taskId || !column) {
      return NextResponse.json(
        { error: 'taskId and column are required' },
        { status: 400 }
      )
    }

    const validColumns = ['backlog', 'planned', 'in_progress', 'review', 'blocked', 'done']
    if (!validColumns.includes(column)) {
      return NextResponse.json(
        { error: `Invalid column. Must be one of: ${validColumns.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify task belongs to this project
    const task = await db.task.findFirst({
      where: { id: taskId, projectId: id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found in this project' }, { status: 404 })
    }

    // Map kanban column to task status if not explicitly provided
    let newStatus = status
    if (!newStatus) {
      switch (column) {
        case 'backlog':
        case 'planned':
          newStatus = 'pending'
          break
        case 'in_progress':
          newStatus = 'in_progress'
          break
        case 'review':
          newStatus = 'in_progress'
          break
        case 'blocked':
          newStatus = 'paused'
          break
        case 'done':
          newStatus = 'completed'
          break
        default:
          newStatus = task.status
      }
    }

    // Update task
    const updateData: Record<string, unknown> = {
      kanbanColumn: column,
      status: newStatus,
    }

    // Auto-set timestamps
    if (column === 'in_progress' && !task.startedAt) {
      updateData.startedAt = new Date()
    }
    if (column === 'done') {
      updateData.completedAt = new Date()
      updateData.progress = 100
    }

    // Track human override
    if (task.kanbanColumn !== column) {
      await db.project.update({
        where: { id },
        data: { humanOverrides: { increment: 1 } },
      })
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Move kanban task error:', error)
    return NextResponse.json(
      { error: 'Failed to move task' },
      { status: 500 }
    )
  }
}
