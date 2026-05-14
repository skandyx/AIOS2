import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/tasks - List tasks with optional status filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }

    const tasks = await db.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: {
          select: { id: true, name: true, type: true, avatar: true },
        },
        subTasks: {
          select: { id: true, title: true, status: true, progress: true },
        },
        _count: {
          select: { subTasks: true, memories: true },
        },
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('List tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, priority, type, agentId, parentId } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'medium',
        type: type || null,
        status: 'pending',
        assigneeId: agentId || null,
        parentTaskId: parentId || null,
        creatorId: userId,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
