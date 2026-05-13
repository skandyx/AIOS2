import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/monitoring - Get system stats with simulated real-time metrics
export async function GET() {
  try {
    const userId = await getDefaultUserId()

    const [
      totalConversations,
      totalMessages,
      totalMemories,
      totalAgents,
      activeAgents,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      failedTasks,
      totalWorkflows,
      activeWorkflows,
      totalPlugins,
      enabledPlugins,
      totalIntegrations,
      connectedIntegrations,
    ] = await Promise.all([
      db.conversation.count({ where: { userId } }),
      db.message.count({
        where: { conversation: { userId } },
      }),
      db.memory.count({ where: { userId, isArchived: false } }),
      db.agent.count(),
      db.agent.count({ where: { isActive: true } }),
      db.task.count({ where: { creatorId: userId } }),
      db.task.count({ where: { creatorId: userId, status: 'pending' } }),
      db.task.count({ where: { creatorId: userId, status: 'in_progress' } }),
      db.task.count({ where: { creatorId: userId, status: 'completed' } }),
      db.task.count({ where: { creatorId: userId, status: 'failed' } }),
      db.workflow.count({ where: { userId } }),
      db.workflow.count({ where: { userId, status: 'active' } }),
      db.plugin.count(),
      db.plugin.count({ where: { isEnabled: true } }),
      db.integration.count({ where: { userId } }),
      db.integration.count({ where: { userId, status: 'connected' } }),
    ])

    // Simulated system metrics (in production, these would come from actual system monitoring)
    const cpuUsage = 25 + Math.random() * 45
    const ramUsage = 40 + Math.random() * 35
    const cpuStatus = cpuUsage < 50 ? 'good' : cpuUsage < 80 ? 'warning' : 'critical'
    const ramStatus = ramUsage < 60 ? 'good' : ramUsage < 85 ? 'warning' : 'critical'

    // Health score calculation
    const totalTasksAll = pendingTasks + inProgressTasks + completedTasks + failedTasks
    const healthScore = totalTasksAll > 0
      ? Math.max(0, Math.min(100, 100 - (failedTasks / totalTasksAll) * 100))
      : 100

    return NextResponse.json({
      conversations: {
        total: totalConversations,
      },
      messages: {
        total: totalMessages,
      },
      memories: {
        total: totalMemories,
      },
      agents: {
        total: totalAgents,
        active: activeAgents,
      },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        failed: failedTasks,
      },
      workflows: {
        total: totalWorkflows,
        active: activeWorkflows,
      },
      plugins: {
        total: totalPlugins,
        enabled: enabledPlugins,
      },
      integrations: {
        total: totalIntegrations,
        connected: connectedIntegrations,
      },
      system: {
        cpu: {
          usage: parseFloat(cpuUsage.toFixed(1)),
          status: cpuStatus,
        },
        ram: {
          usage: parseFloat(ramUsage.toFixed(1)),
          status: ramStatus,
        },
        health: parseFloat(healthScore.toFixed(0)),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Monitoring stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system stats' },
      { status: 500 }
    )
  }
}
