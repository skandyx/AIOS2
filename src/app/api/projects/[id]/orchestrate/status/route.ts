import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/projects/[id]/orchestrate/status - Get orchestrator status for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        orchestratorStatus: true,
        orchestratorLog: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Parse orchestrator log
    let log: unknown[] = []
    try {
      log = JSON.parse(project.orchestratorLog || '[]')
    } catch {
      log = []
    }

    // Get recent agent messages (last 20)
    const recentMessages = await db.agentMessage.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        fromAgent: { select: { id: true, name: true, type: true, avatar: true } },
        toAgent: { select: { id: true, name: true, type: true, avatar: true } },
      },
    })

    // Get task progress summary
    const tasks = await db.task.findMany({
      where: { projectId: id },
      select: { status: true, priority: true, type: true },
    })

    const statusCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}
    for (const task of tasks) {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1
      typeCounts[task.type || 'untyped'] = (typeCounts[task.type || 'untyped'] || 0) + 1
    }

    const totalTasks = tasks.length
    const completedTasks = statusCounts['completed'] || 0
    const inProgressTasks = statusCounts['in_progress'] || 0
    const pendingTasks = statusCounts['pending'] || 0
    const failedTasks = statusCounts['failed'] || 0

    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      projectStatus: project.status,
      orchestratorStatus: project.orchestratorStatus || 'idle',
      orchestratorLog: log,
      recentMessages,
      taskProgress: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks,
        failed: failedTasks,
        completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        statusCounts,
        typeCounts,
      },
    })
  } catch (error) {
    console.error('Get orchestrator status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orchestrator status' },
      { status: 500 }
    )
  }
}
