import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/projects/[id]/agents/control - Human oversight actions
export async function POST(
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
    const { action, agentId, taskId, priority, reason } = body

    if (!action) {
      return NextResponse.json(
        { error: 'action is required. Valid actions: pause_agent, resume_agent, approve_action, reject_action, modify_priority, create_agent, remove_agent' },
        { status: 400 }
      )
    }

    // Track human override
    await db.project.update({
      where: { id },
      data: { humanOverrides: { increment: 1 } },
    })

    switch (action) {
      case 'pause_agent': {
        if (!agentId) {
          return NextResponse.json({ error: 'agentId is required for pause_agent' }, { status: 400 })
        }

        const agent = await db.agent.findUnique({ where: { id: agentId } })
        if (!agent) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
        }

        await db.agent.update({
          where: { id: agentId },
          data: { currentStatus: 'blocked', lastActiveAt: new Date() },
        })

        // Log the action
        const log: Array<{ timestamp: string; event: string; details?: unknown }> = JSON.parse(project.orchestratorLog || '[]')
        log.push({
          timestamp: new Date().toISOString(),
          event: 'agent_paused',
          details: { agentId, agentName: agent.name, reason },
        })
        await db.project.update({
          where: { id },
          data: { orchestratorLog: JSON.stringify(log) },
        })

        return NextResponse.json({ success: true, action: 'pause_agent', agentId, agentName: agent.name })
      }

      case 'resume_agent': {
        if (!agentId) {
          return NextResponse.json({ error: 'agentId is required for resume_agent' }, { status: 400 })
        }

        const agent = await db.agent.findUnique({ where: { id: agentId } })
        if (!agent) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
        }

        await db.agent.update({
          where: { id: agentId },
          data: { currentStatus: 'idle', currentTaskId: null, lastActiveAt: new Date() },
        })

        const log: Array<{ timestamp: string; event: string; details?: unknown }> = JSON.parse(project.orchestratorLog || '[]')
        log.push({
          timestamp: new Date().toISOString(),
          event: 'agent_resumed',
          details: { agentId, agentName: agent.name },
        })
        await db.project.update({
          where: { id },
          data: { orchestratorLog: JSON.stringify(log) },
        })

        return NextResponse.json({ success: true, action: 'resume_agent', agentId, agentName: agent.name })
      }

      case 'approve_action': {
        if (!taskId) {
          return NextResponse.json({ error: 'taskId is required for approve_action' }, { status: 400 })
        }

        const task = await db.task.findFirst({ where: { id: taskId, projectId: id } })
        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Move task to in_progress or review as approved
        await db.task.update({
          where: { id: taskId },
          data: { kanbanColumn: 'in_progress', status: 'in_progress' },
        })

        const log: Array<{ timestamp: string; event: string; details?: unknown }> = JSON.parse(project.orchestratorLog || '[]')
        log.push({
          timestamp: new Date().toISOString(),
          event: 'action_approved',
          details: { taskId, taskTitle: task.title },
        })
        await db.project.update({
          where: { id },
          data: { orchestratorLog: JSON.stringify(log) },
        })

        return NextResponse.json({ success: true, action: 'approve_action', taskId })
      }

      case 'reject_action': {
        if (!taskId) {
          return NextResponse.json({ error: 'taskId is required for reject_action' }, { status: 400 })
        }

        const task = await db.task.findFirst({ where: { id: taskId, projectId: id } })
        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Move task back to backlog or blocked
        await db.task.update({
          where: { id: taskId },
          data: { kanbanColumn: 'blocked', status: 'paused', error: reason || 'Rejected by human' },
        })

        const log: Array<{ timestamp: string; event: string; details?: unknown }> = JSON.parse(project.orchestratorLog || '[]')
        log.push({
          timestamp: new Date().toISOString(),
          event: 'action_rejected',
          details: { taskId, taskTitle: task.title, reason },
        })
        await db.project.update({
          where: { id },
          data: { orchestratorLog: JSON.stringify(log) },
        })

        return NextResponse.json({ success: true, action: 'reject_action', taskId })
      }

      case 'modify_priority': {
        if (!taskId) {
          return NextResponse.json({ error: 'taskId is required for modify_priority' }, { status: 400 })
        }
        if (!priority || !['low', 'medium', 'high', 'critical'].includes(priority)) {
          return NextResponse.json({ error: 'Valid priority is required: low, medium, high, critical' }, { status: 400 })
        }

        const task = await db.task.findFirst({ where: { id: taskId, projectId: id } })
        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        const oldPriority = task.priority
        await db.task.update({
          where: { id: taskId },
          data: { priority },
        })

        const log: Array<{ timestamp: string; event: string; details?: unknown }> = JSON.parse(project.orchestratorLog || '[]')
        log.push({
          timestamp: new Date().toISOString(),
          event: 'priority_modified',
          details: { taskId, taskTitle: task.title, from: oldPriority, to: priority },
        })
        await db.project.update({
          where: { id },
          data: { orchestratorLog: JSON.stringify(log) },
        })

        return NextResponse.json({ success: true, action: 'modify_priority', taskId, oldPriority, newPriority: priority })
      }

      case 'create_agent': {
        const { name, type, description, agentRole, capabilities } = body

        if (!name || !type) {
          return NextResponse.json({ error: 'name and type are required for create_agent' }, { status: 400 })
        }

        const newAgent = await db.agent.create({
          data: {
            name,
            type,
            description: description || null,
            capabilities: capabilities ? JSON.stringify(capabilities) : null,
            isActive: true,
            isDefault: false,
            agentRole: agentRole || 'specialist',
            currentStatus: 'idle',
            workload: 0,
            successRate: 0.0,
            avgCompletionTime: 0.0,
            totalTasksCompleted: 0,
            totalTasksFailed: 0,
          },
        })

        const log: Array<{ timestamp: string; event: string; details?: unknown }> = JSON.parse(project.orchestratorLog || '[]')
        log.push({
          timestamp: new Date().toISOString(),
          event: 'agent_created_by_human',
          details: { agentId: newAgent.id, agentName: name, type },
        })
        await db.project.update({
          where: { id },
          data: { orchestratorLog: JSON.stringify(log) },
        })

        return NextResponse.json({ success: true, action: 'create_agent', agent: newAgent }, { status: 201 })
      }

      case 'remove_agent': {
        if (!agentId) {
          return NextResponse.json({ error: 'agentId is required for remove_agent' }, { status: 400 })
        }

        const agent = await db.agent.findUnique({ where: { id: agentId } })
        if (!agent) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
        }

        // Don't delete, just deactivate
        await db.agent.update({
          where: { id: agentId },
          data: { isActive: false, currentStatus: 'idle', currentTaskId: null, workload: 0 },
        })

        const log: Array<{ timestamp: string; event: string; details?: unknown }> = JSON.parse(project.orchestratorLog || '[]')
        log.push({
          timestamp: new Date().toISOString(),
          event: 'agent_removed_by_human',
          details: { agentId, agentName: agent.name },
        })
        await db.project.update({
          where: { id },
          data: { orchestratorLog: JSON.stringify(log) },
        })

        return NextResponse.json({ success: true, action: 'remove_agent', agentId, agentName: agent.name })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: pause_agent, resume_agent, approve_action, reject_action, modify_priority, create_agent, remove_agent` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Agent control error:', error)
    return NextResponse.json(
      { error: 'Failed to execute control action' },
      { status: 500 }
    )
  }
}
