import { NextRequest, NextResponse } from 'next/server'
import {
  orchestrateProject,
  generateAgentDiscussion,
  simulateAgentWork,
  type TaskAssignment,
} from '@/lib/orchestrator'
import { db } from '@/lib/db'

// GET /api/projects/[id]/orchestrate - Get detailed orchestration status for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get orchestrator status fields
    const orchestratorStatus = project.orchestratorStatus || 'pending'
    const orchestratorStartedAt = project.orchestratorStartedAt?.toISOString() || null
    const orchestratorCompletedAt = project.orchestratorCompletedAt?.toISOString() || null

    // Get agent instructions (AgentActivity with type "instruction")
    const instructions = await db.agentActivity.findMany({
      where: {
        projectId: id,
        type: 'instruction',
      },
      orderBy: { createdAt: 'asc' },
      include: {
        agent: {
          select: { id: true, name: true, type: true, avatar: true },
        },
      },
    })

    // Get discussion messages from AgentDiscussion model
    const discussions = await db.agentDiscussion.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        agent: {
          select: { id: true, name: true, type: true, avatar: true },
        },
      },
    })

    // Get task assignments with agent details
    const tasks = await db.task.findMany({
      where: { projectId: id },
      include: {
        assignee: {
          select: { id: true, name: true, type: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Calculate overall progress
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
    const pendingTasks = tasks.filter(t => t.status === 'pending').length
    const failedTasks = tasks.filter(t => t.status === 'failed').length

    // Overall progress: weighted average of task progress
    const overallProgress = totalTasks > 0
      ? Math.round(
          tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks
        )
      : 0

    // Agent utilization
    const agentUtilization: Record<string, {
      agentId: string
      agentName: string
      agentType: string
      agentAvatar: string | null
      taskCount: number
      completedCount: number
      inProgressCount: number
      pendingCount: number
    }> = {}

    for (const task of tasks) {
      if (task.assignee) {
        const key = task.assignee.id
        if (!agentUtilization[key]) {
          agentUtilization[key] = {
            agentId: task.assignee.id,
            agentName: task.assignee.name,
            agentType: task.assignee.type,
            agentAvatar: task.assignee.avatar,
            taskCount: 0,
            completedCount: 0,
            inProgressCount: 0,
            pendingCount: 0,
          }
        }
        agentUtilization[key].taskCount++
        if (task.status === 'completed') agentUtilization[key].completedCount++
        if (task.status === 'in_progress') agentUtilization[key].inProgressCount++
        if (task.status === 'pending') agentUtilization[key].pendingCount++
      }
    }

    // Task assignments
    const taskAssignments = tasks
      .filter(t => t.assignee)
      .map(t => ({
        taskId: t.id,
        taskTitle: t.title,
        taskType: t.type,
        taskPriority: t.priority,
        taskStatus: t.status,
        taskProgress: t.progress,
        agentId: t.assignee!.id,
        agentName: t.assignee!.name,
        agentType: t.assignee!.type,
        agentAvatar: t.assignee!.avatar,
      }))

    // Format discussions for response
    const formattedDiscussions = discussions.map(d => ({
      id: d.id,
      agentId: d.agentId,
      agentName: d.agentName,
      agentType: d.agentType,
      agentAvatar: d.agent?.avatar || null,
      content: d.content,
      round: d.round,
      type: d.type,
      timestamp: d.createdAt.toISOString(),
    }))

    // Format instructions for response
    const formattedInstructions = instructions.map(i => ({
      id: i.id,
      agentId: i.agentId,
      agentName: i.agentName,
      agentType: i.agentType,
      agentAvatar: i.agent?.avatar || null,
      content: i.action,
      status: i.status,
      timestamp: i.createdAt.toISOString(),
    }))

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      projectStatus: project.status,
      orchestratorStatus,
      orchestratorStartedAt,
      orchestratorCompletedAt,
      overallProgress,
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks,
        failed: failedTasks,
      },
      taskAssignments,
      agentUtilization,
      discussions: formattedDiscussions,
      instructions: formattedInstructions,
      discussionCount: discussions.length,
      instructionCount: instructions.length,
    })
  } catch (error) {
    console.error('Get orchestration status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orchestration status' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/orchestrate - Start orchestration for a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const {
      includeDiscussion = true,
      simulateWork = false,
    } = body

    // Update orchestrator status to "analyzing"
    await db.project.update({
      where: { id },
      data: {
        orchestratorStatus: 'analyzing',
        orchestratorStartedAt: new Date(),
      },
    })

    try {
      // 1. Orchestrate the project (generate tasks + assign agents)
      await db.project.update({
        where: { id },
        data: { orchestratorStatus: 'assigning' },
      })

      const plan = await orchestrateProject(id)

      // 2. Optionally generate agent discussion
      let discussion = undefined
      if (includeDiscussion && plan.assignments.length > 0) {
        try {
          await db.project.update({
            where: { id },
            data: { orchestratorStatus: 'discussing' },
          })

          discussion = await generateAgentDiscussion(id, plan.assignments)

          // Save discussion messages to DB
          for (let i = 0; i < discussion.length; i++) {
            const msg = discussion[i]
            const round = Math.floor(i / plan.assignments.length) + 1
            await db.agentDiscussion.create({
              data: {
                projectId: id,
                agentId: msg.agentId,
                agentName: msg.agentName,
                agentType: msg.agentType,
                content: msg.content,
                round,
                type: 'discussion',
                metadata: JSON.stringify({
                  timestamp: msg.timestamp,
                  generatedAt: new Date().toISOString(),
                }),
              },
            })
          }
        } catch (error) {
          console.error('Failed to generate agent discussion:', error)
          // Non-fatal: continue without discussion
        }
      }

      // 3. Optionally simulate work on the first few tasks
      let workProgress = undefined
      if (simulateWork && plan.assignments.length > 0) {
        try {
          await db.project.update({
            where: { id },
            data: { orchestratorStatus: 'working' },
          })
        } catch {
          // Ignore
        }

        const tasksToSimulate = plan.assignments
          .filter((a: TaskAssignment) => a.agentId)
          .slice(0, 3)

        workProgress = []
        for (const assignment of tasksToSimulate) {
          try {
            const progress = await simulateAgentWork(assignment.taskId, assignment.agentId!)
            workProgress.push(...progress)
          } catch (error) {
            console.error(`Failed to simulate work for task ${assignment.taskId}:`, error)
          }
        }
      }

      // 4. Mark orchestration as completed
      await db.project.update({
        where: { id },
        data: {
          orchestratorStatus: 'completed',
          orchestratorCompletedAt: new Date(),
        },
      })

      // 5. Create agent activity for orchestration completion
      try {
        await db.agentActivity.create({
          data: {
            agentName: 'Orchestrator',
            agentType: 'coordinator',
            projectId: id,
            action: `Completed orchestration: ${plan.tasksCreated} tasks created and assigned`,
            type: 'milestone',
            status: 'completed',
            metadata: JSON.stringify({
              tasksCreated: plan.tasksCreated,
              discussionGenerated: !!discussion,
              workSimulated: !!workProgress,
            }),
          },
        })
      } catch {
        // Non-fatal
      }

      return NextResponse.json({
        success: true,
        plan,
        discussion,
        workProgress,
      })
    } catch (orchestrationError) {
      // Mark as failed
      await db.project.update({
        where: { id },
        data: {
          orchestratorStatus: 'failed',
          orchestratorCompletedAt: new Date(),
        },
      })

      throw orchestrationError
    }
  } catch (error) {
    console.error('Orchestration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Orchestration failed',
      },
      { status: 500 }
    )
  }
}
