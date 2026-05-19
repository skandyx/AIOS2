import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// In-memory cache to reduce DB load (TTL: 30s)
let cachedStats: any = null
let cacheTime = 0
const CACHE_TTL = 30000 // 30 seconds

// GET /api/monitoring - Get system stats with simulated real-time metrics
export async function GET() {
  try {
    // Return cached data if fresh
    const now = Date.now()
    if (cachedStats && (now - cacheTime) < CACHE_TTL) {
      // Update only simulated metrics (CPU/RAM) on cached data
      const cpuUsage = 25 + Math.random() * 45
      const ramUsage = 40 + Math.random() * 35
      cachedStats.system.cpu = {
        usage: parseFloat(cpuUsage.toFixed(1)),
        status: cpuUsage < 50 ? 'good' : cpuUsage < 80 ? 'warning' : 'critical',
      }
      cachedStats.system.ram = {
        usage: parseFloat(ramUsage.toFixed(1)),
        status: ramUsage < 60 ? 'good' : ramUsage < 85 ? 'warning' : 'critical',
      }
      cachedStats.timestamp = new Date().toISOString()
      return NextResponse.json(cachedStats)
    }

    const userId = await getDefaultUserId()

    // Optimized: use groupBy instead of 16 separate count queries
    const [
      totalConversations,
      totalMessages,
      totalMemories,
      agentStats,
      taskStats,
      workflowStats,
      pluginStats,
      integrationStats,
    ] = await Promise.all([
      db.conversation.count({ where: { userId } }),
      db.message.count({ where: { conversation: { userId } } }),
      db.memory.count({ where: { userId, isArchived: false } }),
      db.agent.groupBy({ by: ['isActive'], _count: true }),
      db.task.groupBy({ by: ['status'], where: { creatorId: userId }, _count: true }),
      db.workflow.groupBy({ by: ['status'], where: { userId }, _count: true }),
      db.plugin.groupBy({ by: ['isEnabled'], _count: true }),
      db.integration.groupBy({ by: ['status'], where: { userId }, _count: true }),
    ])

    // Parse grouped results
    const totalAgents = agentStats.reduce((s: number, g: any) => s + g._count, 0)
    const activeAgents = agentStats.find((g: any) => g.isActive === true)?._count ?? 0

    const totalTasks = taskStats.reduce((s: number, g: any) => s + g._count, 0)
    const pendingTasks = taskStats.find((g: any) => g.status === 'pending')?._count ?? 0
    const inProgressTasks = taskStats.find((g: any) => g.status === 'in_progress')?._count ?? 0
    const completedTasks = taskStats.find((g: any) => g.status === 'completed')?._count ?? 0
    const failedTasks = taskStats.find((g: any) => g.status === 'failed')?._count ?? 0

    const totalWorkflows = workflowStats.reduce((s: number, g: any) => s + g._count, 0)
    const activeWorkflows = workflowStats.find((g: any) => g.status === 'active')?._count ?? 0

    const totalPlugins = pluginStats.reduce((s: number, g: any) => s + g._count, 0)
    const enabledPlugins = pluginStats.find((g: any) => g.isEnabled === true)?._count ?? 0

    const totalIntegrations = integrationStats.reduce((s: number, g: any) => s + g._count, 0)
    const connectedIntegrations = integrationStats.find((g: any) => g.status === 'connected')?._count ?? 0

    // Simulated system metrics
    const cpuUsage = 25 + Math.random() * 45
    const ramUsage = 40 + Math.random() * 35

    // Health score calculation
    const totalTasksAll = pendingTasks + inProgressTasks + completedTasks + failedTasks
    const healthScore = totalTasksAll > 0
      ? Math.max(0, Math.min(100, 100 - (failedTasks / totalTasksAll) * 100))
      : 100

    const result = {
      conversations: { total: totalConversations },
      messages: { total: totalMessages },
      memories: { total: totalMemories },
      agents: { total: totalAgents, active: activeAgents },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        failed: failedTasks,
      },
      workflows: { total: totalWorkflows, active: activeWorkflows },
      plugins: { total: totalPlugins, enabled: enabledPlugins },
      integrations: { total: totalIntegrations, connected: connectedIntegrations },
      system: {
        cpu: {
          usage: parseFloat(cpuUsage.toFixed(1)),
          status: cpuUsage < 50 ? 'good' : cpuUsage < 80 ? 'warning' : 'critical',
        },
        ram: {
          usage: parseFloat(ramUsage.toFixed(1)),
          status: ramUsage < 60 ? 'good' : ramUsage < 85 ? 'warning' : 'critical',
        },
        health: parseFloat(healthScore.toFixed(0)),
      },
      timestamp: new Date().toISOString(),
    }

    // Update cache
    cachedStats = result
    cacheTime = now

    return NextResponse.json(result)
  } catch (error) {
    console.error('Monitoring stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system stats' },
      { status: 500 }
    )
  }
}
