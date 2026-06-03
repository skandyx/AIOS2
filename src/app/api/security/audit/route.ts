import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

/**
 * GET /api/security/audit
 * Returns the security audit log derived from recent agent activities in the DB.
 * Query params:
 *   - limit: number of entries to return (default 50, max 200)
 *   - status: filter by status ("allowed" | "denied" | "pending")
 *   - risk: filter by risk level ("low" | "medium" | "high")
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getDefaultUserId()
    const { searchParams } = new URL(request.url)

    const limitParam = searchParams.get('limit')
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 200)

    const statusFilter = searchParams.get('status') // "allowed" | "denied" | "pending"
    const riskFilter = searchParams.get('risk')     // "low" | "medium" | "high"

    // Fetch recent agent messages (representing agent actions/decisions) and tasks
    const [agentMessages, recentTasks] = await Promise.all([
      db.agentMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          fromAgent: { select: { name: true, type: true } },
          toAgent: { select: { name: true, type: true } },
        },
      }),
      db.task.findMany({
        where: { creatorId: userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: {
          assignee: { select: { name: true, type: true } },
        },
      }),
    ])

    // Build audit entries from agent messages
    const messageAuditEntries = agentMessages.map((msg) => {
      const agentName = msg.fromAgent?.name || msg.fromRole || 'System'
      const action = formatActionFromMessage(msg.type, msg.content)
      const risk = assessRisk(msg.type, msg.priority)
      const status = mapMessageStatus(msg.type)

      return {
        id: msg.id,
        action,
        agent: agentName,
        agentType: msg.fromAgent?.type || msg.fromRole,
        timestamp: msg.createdAt.toISOString(),
        status,
        risk,
        type: 'agent_message' as const,
        metadata: {
          messageType: msg.type,
          priority: msg.priority,
          phase: msg.phase,
          projectId: msg.projectId,
        },
      }
    })

    // Build audit entries from tasks (representing action outcomes)
    const taskAuditEntries = recentTasks.map((task) => {
      const agentName = task.assignee?.name || 'Unassigned'
      const action = `Task: ${task.title}`
      const risk = assessTaskRisk(task.priority, task.type)
      const status = mapTaskStatus(task.status)

      return {
        id: task.id,
        action,
        agent: agentName,
        agentType: task.assignee?.type || null,
        timestamp: task.updatedAt.toISOString(),
        status,
        risk,
        type: 'task' as const,
        metadata: {
          taskStatus: task.status,
          taskPriority: task.priority,
          taskType: task.type,
          progress: task.progress,
        },
      }
    })

    // Merge and sort all entries by timestamp (most recent first)
    let allEntries = [...messageAuditEntries, ...taskAuditEntries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    // Apply filters
    if (statusFilter) {
      allEntries = allEntries.filter(e => e.status === statusFilter)
    }
    if (riskFilter) {
      allEntries = allEntries.filter(e => e.risk === riskFilter)
    }

    // Summary stats
    const totalEntries = allEntries.length
    const allowedCount = allEntries.filter(e => e.status === 'allowed').length
    const deniedCount = allEntries.filter(e => e.status === 'denied').length
    const pendingCount = allEntries.filter(e => e.status === 'pending').length

    return NextResponse.json({
      entries: allEntries,
      summary: {
        total: totalEntries,
        allowed: allowedCount,
        denied: deniedCount,
        pending: pendingCount,
      },
    })
  } catch (error) {
    console.error('Security audit GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load security audit log' },
      { status: 500 }
    )
  }
}

/** Format a human-readable action description from an agent message */
function formatActionFromMessage(type: string, content: string): string {
  const truncated = content.length > 80 ? content.slice(0, 77) + '...' : content
  switch (type) {
    case 'instruction':
      return `Instruction: ${truncated}`
    case 'result':
      return `Result: ${truncated}`
    case 'discussion':
      return `Discussion: ${truncated}`
    case 'status':
      return `Status update: ${truncated}`
    case 'question':
      return `Question: ${truncated}`
    case 'error':
      return `Error: ${truncated}`
    default:
      return truncated
  }
}

/** Assess risk level based on message type and priority */
function assessRisk(type: string, priority: string): 'low' | 'medium' | 'high' {
  if (type === 'error' || priority === 'critical') return 'high'
  if (type === 'instruction' || priority === 'high') return 'medium'
  return 'low'
}

/** Map agent message type to audit status */
function mapMessageStatus(type: string): 'allowed' | 'denied' | 'pending' {
  switch (type) {
    case 'error':
      return 'denied'
    case 'result':
    case 'status':
      return 'allowed'
    case 'instruction':
    case 'question':
      return 'pending'
    default:
      return 'allowed'
  }
}

/** Assess risk level for a task based on priority and type */
function assessTaskRisk(priority: string, type: string | null): 'low' | 'medium' | 'high' {
  if (priority === 'critical') return 'high'
  if (priority === 'high' || type === 'automation' || type === 'system') return 'medium'
  return 'low'
}

/** Map task status to audit status */
function mapTaskStatus(status: string): 'allowed' | 'denied' | 'pending' {
  switch (status) {
    case 'completed':
      return 'allowed'
    case 'failed':
    case 'cancelled':
      return 'denied'
    case 'pending':
    case 'in_progress':
    case 'paused':
    default:
      return 'pending'
  }
}
