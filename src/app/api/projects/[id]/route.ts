import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Map DB task status to frontend status
function mapTaskStatus(status: string): string {
  switch (status) {
    case 'pending': return 'todo'
    case 'in_progress': return 'in_progress'
    case 'completed': return 'done'
    case 'failed': return 'failed'
    default: return status
  }
}

// GET /api/projects/[id] - Get a specific project with all related data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignee: {
              select: { id: true, name: true, type: true, avatar: true },
            },
          },
        },
        projectSkills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                icon: true,
                category: true,
                isInstalled: true,
                isEnabled: true,
              },
            },
          },
        },
        projectMCPServers: {
          include: {
            mcpServer: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                icon: true,
                category: true,
                isInstalled: true,
                isEnabled: true,
                isRunning: true,
                transportType: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            projectSkills: true,
            projectMCPServers: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Map task statuses from DB format to frontend format
    const mappedProject = {
      ...project,
      tasks: project.tasks.map(task => ({
        ...task,
        status: mapTaskStatus(task.status),
      })),
    }

    return NextResponse.json(mappedProject)
  } catch (error) {
    console.error('Get project error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id] - Update a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const project = await db.project.findUnique({ where: { id } })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.status !== undefined) {
      updateData.status = body.status
      // Auto-set startedAt when project moves to in_progress
      if (body.status === 'in_progress' && !project.startedAt) {
        updateData.startedAt = new Date()
      }
      // Auto-set completedAt when project is completed
      if (body.status === 'completed') {
        updateData.completedAt = new Date()
      }
    }
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.category !== undefined) updateData.category = body.category
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.techStack !== undefined) updateData.techStack = JSON.stringify(body.techStack)
    if (body.requirements !== undefined) updateData.requirements = body.requirements
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags)
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null

    const updated = await db.project.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            tasks: true,
            projectSkills: true,
            projectMCPServers: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({ where: { id } })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    await db.project.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
