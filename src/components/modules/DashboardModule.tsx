'use client'

import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import JarvisHUD from '@/components/JarvisHUD'
import NeuralNetworkViz from '@/components/NeuralNetworkViz'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bot,
  Brain,
  Activity,
  Wifi,
  WifiOff,
  Cpu,
  HardDrive,
  Clock,
  MessageSquare,
  FolderKanban,
  Workflow,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Sparkles,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentActivity {
  id: string
  agentName: string
  agentType: string
  action: string
  timestamp: string
  status: 'active' | 'idle' | 'busy' | 'error'
}

interface SystemMetric {
  label: string
  value: number
  max: number
  unit: string
  icon: React.ReactNode
  color: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

// ─── Simulated Agent Activities ───────────────────────────────────────────────

const SIMULATED_ACTIVITIES: Omit<AgentActivity, 'id' | 'timestamp'>[] = [
  { agentName: 'Coordinator', agentType: 'coordinator', action: 'Orchestrating task pipeline', status: 'active' },
  { agentName: 'Developer', agentType: 'developer', action: 'Analyzing code structure', status: 'busy' },
  { agentName: 'Security', agentType: 'security', action: 'Scanning for vulnerabilities', status: 'active' },
  { agentName: 'Memory', agentType: 'memory', action: 'Indexing new knowledge entries', status: 'idle' },
  { agentName: 'Research', agentType: 'research', action: 'Searching web for documentation', status: 'busy' },
  { agentName: 'System', agentType: 'system', action: 'Monitoring resource usage', status: 'active' },
  { agentName: 'Planning', agentType: 'planning', action: 'Generating project roadmap', status: 'busy' },
  { agentName: 'Developer', agentType: 'developer', action: 'Refactoring module architecture', status: 'active' },
  { agentName: 'Vision', agentType: 'vision', action: 'Processing image analysis', status: 'idle' },
  { agentName: 'MCP', agentType: 'mcp', action: 'Syncing server configurations', status: 'active' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardModule() {
  const [isConnected, setIsConnected] = useState(false)
  const [cpuUsage, setCpuUsage] = useState(42)
  const [memoryUsage, setMemoryUsage] = useState(58)
  const [agentCount, setAgentCount] = useState(7)
  const [activeAgents, setActiveAgents] = useState(5)
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online')
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline' | 'processing'>('online')
  const [recentActivities, setRecentActivities] = useState<AgentActivity[]>([])
  const [totalConversations, setTotalConversations] = useState(0)
  const [totalMemories, setTotalMemories] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [totalProjects, setTotalProjects] = useState(0)

  // Fetch system stats and update state
  const loadStats = useCallback(async () => {
    try {
      const [convRes, memRes, taskRes, projRes] = await Promise.allSettled([
        fetch('/api/conversations'),
        fetch('/api/memory'),
        fetch('/api/tasks'),
        fetch('/api/projects'),
      ])

      if (convRes.status === 'fulfilled' && convRes.value.ok) {
        const data = await convRes.value.json()
        if (Array.isArray(data)) setTotalConversations(data.length)
      }
      if (memRes.status === 'fulfilled' && memRes.value.ok) {
        const data = await memRes.value.json()
        if (Array.isArray(data)) setTotalMemories(data.length)
      }
      if (taskRes.status === 'fulfilled' && taskRes.value.ok) {
        const data = await taskRes.value.json()
        if (Array.isArray(data)) setTotalTasks(data.length)
      }
      if (projRes.status === 'fulfilled' && projRes.value.ok) {
        const data = await projRes.value.json()
        if (Array.isArray(data)) setTotalProjects(data.length)
      }
    } catch {
      // silently fail
    }
  }, [])

  // WebSocket connection for real-time data
  useEffect(() => {
    let socket: ReturnType<typeof io> | null = null

    const connectSocket = () => {
      socket = io('/?XTransformPort=3003', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 5000,
      })

      socket.on('connect', () => {
        setIsConnected(true)
        setNetworkStatus('online')
        setSystemStatus('online')
      })

      socket.on('disconnect', () => {
        setIsConnected(false)
        setNetworkStatus('offline')
      })

      socket.on('system:metrics', (data: any) => {
        if (data.cpu !== undefined) setCpuUsage(Math.min(100, Math.round(data.cpu)))
        if (data.memory?.percentage !== undefined) setMemoryUsage(Math.min(100, Math.round(data.memory.percentage)))
        if (data.activeAgents !== undefined) setActiveAgents(data.activeAgents)
      })

      socket.on('agent:status', (data: any) => {
        setAgentCount((prev) => {
          if (data.status === 'active' || data.status === 'online') return prev + 1
          if (data.status === 'offline') return Math.max(0, prev - 1)
          return prev
        })
      })
    }

    connectSocket()

    return () => {
      if (socket) socket.disconnect()
    }
  }, [])

  // Load initial stats
  useEffect(() => {
    const timer = setTimeout(loadStats, 0)
    const interval = setInterval(loadStats, 60000)
    return () => { clearTimeout(timer); clearInterval(interval) }
  }, [loadStats])

  // Simulate real-time activity feed
  useEffect(() => {
    const addActivity = () => {
      const sim = SIMULATED_ACTIVITIES[Math.floor(Math.random() * SIMULATED_ACTIVITIES.length)]
      const activity: AgentActivity = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...sim,
        timestamp: new Date().toISOString(),
      }
      setRecentActivities((prev) => [activity, ...prev].slice(0, 20))
    }

    // Add initial activities
    for (let i = 0; i < 5; i++) {
      setTimeout(() => addActivity(), i * 200)
    }

    const interval = setInterval(addActivity, 4000 + Math.random() * 3000)
    return () => clearInterval(interval)
  }, [])

  // Simulate CPU/memory fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage((prev) => {
        const delta = (Math.random() - 0.5) * 8
        return Math.min(95, Math.max(15, Math.round(prev + delta)))
      })
      setMemoryUsage((prev) => {
        const delta = (Math.random() - 0.5) * 4
        return Math.min(90, Math.max(30, Math.round(prev + delta)))
      })
      setSystemStatus(cpuUsage > 80 ? 'processing' : 'online')
    }, 3000)
    return () => clearInterval(interval)
  }, [cpuUsage])

  // ─── System Metrics ────────────────────────────────────────────────────────

  const metrics: SystemMetric[] = [
    { label: 'CPU', value: cpuUsage, max: 100, unit: '%', icon: <Cpu className="size-4" />, color: cpuUsage > 80 ? 'text-amber-400' : 'text-cyan-400' },
    { label: 'Memory', value: memoryUsage, max: 100, unit: '%', icon: <HardDrive className="size-4" />, color: memoryUsage > 80 ? 'text-amber-400' : 'text-emerald-400' },
    { label: 'Agents', value: activeAgents, max: agentCount, unit: `/${agentCount}`, icon: <Bot className="size-4" />, color: 'text-violet-400' },
    { label: 'Network', value: isConnected ? 100 : 0, max: 100, unit: '', icon: isConnected ? <Wifi className="size-4" /> : <WifiOff className="size-4" />, color: isConnected ? 'text-emerald-400' : 'text-red-400' },
  ]

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4 md:p-6">
          {/* ─── Hero Section: Jarvis HUD + Neural Network ───────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Jarvis HUD */}
            <Card className="bg-[#0a0e1a] border-cyan-500/20 overflow-hidden relative">
              <CardContent className="p-0 flex items-center justify-center min-h-[380px] relative">
                {/* Ambient glow behind HUD */}
                <div className="absolute inset-0 bg-gradient-radial from-cyan-500/5 via-transparent to-transparent" />
                <div className="relative z-10">
                  <JarvisHUD
                    size={340}
                    systemStatus={systemStatus}
                    agentCount={activeAgents}
                    cpuUsage={cpuUsage}
                    memoryUsage={memoryUsage}
                    networkStatus={networkStatus}
                  />
                </div>
              </CardContent>
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="text-[10px] text-cyan-400/50 font-mono tracking-widest">
                  AIOS JARVIS INTERFACE
                </span>
              </div>
            </Card>

            {/* Neural Network Visualization */}
            <Card className="bg-[#0a0e1a] border-emerald-500/20 overflow-hidden">
              <CardContent className="p-0 relative">
                <NeuralNetworkViz
                  width={900}
                  height={500}
                  activeNodes={activeAgents / Math.max(1, agentCount)}
                  signalSpeed={systemStatus === 'processing' ? 2 : 1}
                  className="w-full"
                />
                <div className="absolute top-3 left-4 flex items-center gap-2">
                  <Brain className="size-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-mono">NEURAL NETWORK</span>
                </div>
                <div className="absolute bottom-3 right-4 flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-slate-400">Active</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    <span className="text-slate-400">Idle</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-slate-400">Signal</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── System Metrics Row ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.map((metric) => (
              <Card key={metric.label} className="bg-[#0d1117] border-neutral-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-2 ${metric.color}`}>
                      {metric.icon}
                      <span className="text-xs font-medium text-slate-400">{metric.label}</span>
                    </div>
                    <span className="text-lg font-bold text-white">
                      {metric.value}{metric.unit}
                    </span>
                  </div>
                  <Progress
                    value={(metric.value / metric.max) * 100}
                    className="h-1.5 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-emerald-500"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ─── Stats + Activity Feed ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="size-4 text-cyan-400" />
                System Overview
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Conversations', value: totalConversations, icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                  { label: 'Memories', value: totalMemories, icon: Brain, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { label: 'Tasks', value: totalTasks, icon: Zap, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                  { label: 'Projects', value: totalProjects, icon: FolderKanban, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Agents', value: agentCount, icon: Bot, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                  { label: 'Network', value: isConnected ? 'Online' : 'Offline', icon: isConnected ? Wifi : WifiOff, color: isConnected ? 'text-emerald-400' : 'text-red-400', bg: isConnected ? 'bg-emerald-500/10' : 'bg-red-500/10' },
                ].map((stat) => (
                  <Card key={stat.label} className={`${stat.bg} border-neutral-800/50`}>
                    <CardContent className="p-3 flex items-center gap-2">
                      <stat.icon className={`size-4 ${stat.color}`} />
                      <div>
                        <p className="text-lg font-bold text-white">{stat.value}</p>
                        <p className="text-[10px] text-slate-400">{stat.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Agent Activity Feed */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Users className="size-4 text-violet-400" />
                Live Agent Activity
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-emerald-400 bg-emerald-500/10 border-emerald-500/20 ml-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                  LIVE
                </Badge>
              </h3>
              <Card className="bg-[#0d1117] border-neutral-800">
                <ScrollArea className="h-[280px]">
                  <div className="p-3 space-y-2">
                    {recentActivities.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        Waiting for agent activity...
                      </div>
                    ) : (
                      recentActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                            activity.status === 'active' ? 'bg-emerald-400' :
                            activity.status === 'busy' ? 'bg-amber-400' :
                            activity.status === 'error' ? 'bg-red-400' : 'bg-slate-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-white">{activity.agentName}</span>
                              <Badge variant="outline" className="text-[8px] h-3.5 px-1 text-slate-400 border-neutral-700 bg-neutral-800/50">
                                {activity.agentType}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{activity.action}</p>
                          </div>
                          <span className="text-[10px] text-slate-500 flex-shrink-0 mt-0.5">
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </div>

          {/* ─── Module Quick Access ──────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-cyan-400" />
              Quick Access
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { label: 'AI Chat', icon: MessageSquare, color: 'text-cyan-400', bg: 'from-cyan-500/10 to-cyan-500/5' },
                { label: 'Agents', icon: Bot, color: 'text-violet-400', bg: 'from-violet-500/10 to-violet-500/5' },
                { label: 'Projects', icon: FolderKanban, color: 'text-rose-400', bg: 'from-rose-500/10 to-rose-500/5' },
                { label: 'Workflows', icon: Workflow, color: 'text-amber-400', bg: 'from-amber-500/10 to-amber-500/5' },
                { label: 'Security', icon: Shield, color: 'text-red-400', bg: 'from-red-500/10 to-red-500/5' },
              ].map((item) => (
                <Card
                  key={item.label}
                  className={`bg-gradient-to-br ${item.bg} border-neutral-800/50 hover:border-neutral-700 cursor-pointer transition-all duration-200 hover:scale-[1.02]`}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                    <item.icon className={`size-6 ${item.color}`} />
                    <span className="text-xs font-medium text-slate-300">{item.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
