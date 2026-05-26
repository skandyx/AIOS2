import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Map DB task status to frontend status
function mapTaskStatus(status: string): string {
  switch (status) {
    case 'pending': return 'todo'
    case 'completed': return 'done'
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
        // Include files from ProjectFile model
        files: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            filename: true,
            path: true,
            mimeType: true,
            size: true,
            encoding: true,
            source: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        // Include latest 20 discussions from AgentDiscussion model
        discussions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            agent: {
              select: { id: true, name: true, type: true, avatar: true },
            },
          },
        },
        // Include latest 20 activities from AgentActivity model
        activities: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            agent: {
              select: { id: true, name: true, type: true, avatar: true },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            projectSkills: true,
            projectMCPServers: true,
            files: true,
            discussions: true,
            activities: true,
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
      // Format discussions for frontend consumption
      discussions: project.discussions.map(d => ({
        id: d.id,
        agentId: d.agentId,
        agentName: d.agentName,
        agentType: d.agentType,
        agentAvatar: d.agent?.avatar || null,
        content: d.content,
        round: d.round,
        type: d.type,
        metadata: d.metadata ? JSON.parse(d.metadata) : null,
        timestamp: d.createdAt.toISOString(),
      })),
      // Format activities for frontend consumption
      activities: project.activities.map(a => ({
        id: a.id,
        agentId: a.agentId,
        agentName: a.agentName,
        agentType: a.agentType,
        agentAvatar: a.agent?.avatar || null,
        action: a.action,
        type: a.type,
        status: a.status,
        metadata: a.metadata ? JSON.parse(a.metadata) : null,
        timestamp: a.createdAt.toISOString(),
      })),
      // Expose orchestrator fields explicitly
      orchestratorStatus: project.orchestratorStatus,
      orchestratorStartedAt: project.orchestratorStartedAt?.toISOString() || null,
      orchestratorCompletedAt: project.orchestratorCompletedAt?.toISOString() || null,
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
            files: true,
            discussions: true,
            activities: true,
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
