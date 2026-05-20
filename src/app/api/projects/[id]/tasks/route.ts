import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

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

// GET /api/projects/[id]/tasks - List all tasks for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    // Verify the project exists
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Fetch all tasks for this project, ordered by newest first
    const tasks = await db.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: {
          select: { id: true, name: true, type: true, avatar: true },
        },
      },
    })

    // Map DB status back to frontend status for each task
    const mappedTasks = tasks.map((task) => ({
      ...task,
      status: toFrontendStatus(task.status),
    }))

    return NextResponse.json(mappedTasks)
  } catch (error) {
    console.error('List project tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project tasks' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/tasks - Create a new task in a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()

    // Verify the project exists
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    // Map frontend status to DB status (default: todo → pending)
    const dbStatus = toDbStatus(body.status || 'todo')

    // Build the task data
    const taskData: Record<string, unknown> = {
      title: body.title,
      description: body.description || null,
      status: dbStatus,
      priority: body.priority || 'medium',
      type: body.type || null,
      projectId,
      creatorId: userId,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    }

    // Set startedAt if the initial status is in_progress
    if (dbStatus === 'in_progress') {
      taskData.startedAt = new Date()
    }

    // Set completedAt if the initial status is completed
    if (dbStatus === 'completed') {
      taskData.completedAt = new Date()
      taskData.progress = 100
    }

    const task = await db.task.create({ data: taskData })

    // Map DB status back to frontend status in the response
    const response = {
      ...task,
      status: toFrontendStatus(task.status),
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Create project task error:', error)
    return NextResponse.json(
      { error: 'Failed to create project task' },
      { status: 500 }
    )
  }
}
