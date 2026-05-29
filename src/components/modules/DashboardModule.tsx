'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bot, Brain, Activity, Cpu, HardDrive, Wifi, WifiOff,
  Zap, FolderKanban, MessageSquare, Shield, Sparkles,
  TrendingUp, Clock, ArrowUpRight, ChevronRight,
  Circle, CheckCircle2, AlertCircle, Loader2,
  Server, Globe, GitBranch, Terminal, Eye,
} from 'lucide-react'
import { useAIOSStore, type AIModule } from '@/lib/store'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemHealth {
  cpu: number
  memory: number
  uptime: number
  activeAgents: number
  totalProjects: number
  activeProjects: number
  totalConversations: number
  totalMemories: number
  pendingTasks: number
  completedTasks: number
  installedPlugins: number
  connectedIntegrations: number
}

interface AgentStatus {
  id: string
  name: string
  type: string
  status: 'active' | 'idle' | 'error' | 'offline'
  currentTask?: string
}

interface RecentActivity {
  id: string
  type: 'project' | 'agent' | 'task' | 'system' | 'chat'
  message: string
  timestamp: string
  icon: React.ReactNode
  color: string
}

// ─── Neural Network Canvas ────────────────────────────────────────────────────

function NeuralNetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const nodesRef = useRef<{ x: number; y: number; vx: number; vy: number; connections: number[] }[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const w = () => canvas.offsetWidth
    const h = () => canvas.offsetHeight

    // Init nodes
    const nodeCount = 40
    nodesRef.current = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * w(),
      y: Math.random() * h(),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      connections: [],
    }))

    // Pre-calc connections
    const maxDist = 120
    nodesRef.current.forEach((n, i) => {
      nodesRef.current.forEach((m, j) => {
        if (i < j) {
          const dx = n.x - m.x
          const dy = n.y - m.y
          if (Math.sqrt(dx * dx + dy * dy) < maxDist) {
            n.connections.push(j)
          }
        }
      })
    })

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    canvas.addEventListener('mousemove', handleMouseMove)

    const animate = () => {
      const cw = w()
      const ch = h()
      ctx.clearRect(0, 0, cw, ch)
      const nodes = nodesRef.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // Update positions
      nodes.forEach(n => {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > cw) n.vx *= -1
        if (n.y < 0 || n.y > ch) n.vy *= -1
        n.x = Math.max(0, Math.min(cw, n.x))
        n.y = Math.max(0, Math.min(ch, n.y))
      })

      // Draw connections
      nodes.forEach((n, i) => {
        n.connections.forEach(j => {
          const m = nodes[j]
          const dx = n.x - m.x
          const dy = n.y - m.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.3
            ctx.beginPath()
            ctx.moveTo(n.x, n.y)
            ctx.lineTo(m.x, m.y)
            ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      // Draw nodes
      nodes.forEach((n, i) => {
        const dx = n.x - mx
        const dy = n.y - my
        const distToMouse = Math.sqrt(dx * dx + dy * dy)
        const highlight = distToMouse < 100
        const radius = highlight ? 3 : 1.5

        ctx.beginPath()
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = highlight
          ? `rgba(34, 211, 238, ${0.8 - distToMouse / 200})`
          : 'rgba(34, 211, 238, 0.4)'
        ctx.fill()

        // Glow effect for highlighted nodes
        if (highlight) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, 8, 0, Math.PI * 2)
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 8)
          grad.addColorStop(0, 'rgba(34, 211, 238, 0.2)')
          grad.addColorStop(1, 'rgba(34, 211, 238, 0)')
          ctx.fillStyle = grad
          ctx.fill()
        }
      })

      // Mouse connections
      nodes.forEach(n => {
        const dx = n.x - mx
        const dy = n.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          const alpha = (1 - dist / 150) * 0.4
          ctx.beginPath()
          ctx.moveTo(n.x, n.y)
          ctx.lineTo(mx, my)
          ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      })

      animRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  )
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const start = display
    const diff = value - start
    if (diff === 0) return
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + diff * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{display}</span>
}

// ─── Circular Progress ────────────────────────────────────────────────────────

function CircularProgress({ value, size = 80, strokeWidth = 6, color = 'cyan' }: {
  value: number; size?: number; strokeWidth?: number; color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  const colorMap: Record<string, string> = {
    cyan: '#22d3ee',
    emerald: '#34d399',
    amber: '#fbbf24',
    rose: '#fb7185',
    violet: '#a78bfa',
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={colorMap[color] || colorMap.cyan}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{value}%</span>
      </div>
    </div>
  )
}

// ─── Pulse Ring Animation ─────────────────────────────────────────────────────

function PulseRing({ size = 60, color = 'cyan' }: { size?: number; color?: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
  }
  const bg = colorMap[color] || colorMap.cyan

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.div
        className={`absolute rounded-full ${bg} opacity-20`}
        animate={{ scale: [1, 2, 1], opacity: [0.2, 0, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: size, height: size }}
      />
      <motion.div
        className={`absolute rounded-full ${bg} opacity-30`}
        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{ width: size * 0.7, height: size * 0.7 }}
      />
      <div className={`rounded-full ${bg}`} style={{ width: size * 0.3, height: size * 0.3 }} />
    </div>
  )
}

// ─── Main Dashboard Module ────────────────────────────────────────────────────

export default function DashboardModule() {
  const setActiveModule = useAIOSStore((s) => s.setActiveModule)
  const [health, setHealth] = useState<SystemHealth>({
    cpu: 0, memory: 0, uptime: 0, activeAgents: 0,
    totalProjects: 0, activeProjects: 0, totalConversations: 0,
    totalMemories: 0, pendingTasks: 0, completedTasks: 0,
    installedPlugins: 0, connectedIntegrations: 0,
  })
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [isOnline, setIsOnline] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [greeting, setGreeting] = useState('')

  // Fetch health data
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring')
      if (res.ok) {
        const data = await res.json()
        setIsOnline(true)
        setHealth({
          cpu: data.system?.cpu?.usage ?? 0,
          memory: data.system?.ram?.usage ?? 0,
          uptime: data.uptime ?? 86400,
          activeAgents: data.agents?.active ?? 0,
          totalProjects: 0,
          activeProjects: 0,
          totalConversations: data.conversations?.total ?? 0,
          totalMemories: data.memories?.total ?? 0,
          pendingTasks: data.tasks?.pending ?? 0,
          completedTasks: data.tasks?.completed ?? 0,
          installedPlugins: data.plugins?.enabled ?? 0,
          connectedIntegrations: data.integrations?.connected ?? 0,
        })
      } else {
        setIsOnline(false)
      }
    } catch {
      setIsOnline(false)
    }
  }, [])

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setAgents(data.slice(0, 8).map((a: any) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            status: a.status || 'idle',
            currentTask: a.currentTask,
          })))
        }
      }
    } catch { /* */ }
  }, [])

  // Fetch recent activity
  const fetchActivity = useCallback(async () => {
    try {
      const [projectsRes, agentsRes] = await Promise.all([
        fetch('/api/projects?limit=5'),
        fetch('/api/agents?limit=5'),
      ])
      const activitiesList: RecentActivity[] = []

      if (projectsRes.ok) {
        const projects = await projectsRes.json()
        if (Array.isArray(projects)) {
          projects.slice(0, 3).forEach((p: any) => {
            activitiesList.push({
              id: `proj-${p.id}`,
              type: 'project',
              message: `Project "${p.name}" — ${p.status}`,
              timestamp: p.updatedAt || p.createdAt,
              icon: <FolderKanban className="size-3.5" />,
              color: 'text-rose-400',
            })
          })
        }
      }

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        if (Array.isArray(agentsData)) {
          agentsData.filter((a: any) => a.status === 'active').slice(0, 2).forEach((a: any) => {
            activitiesList.push({
              id: `agent-${a.id}`,
              type: 'agent',
              message: `${a.name} is active`,
              timestamp: a.updatedAt || new Date().toISOString(),
              icon: <Bot className="size-3.5" />,
              color: 'text-emerald-400',
            })
          })
        }
      }

      // System activity
      activitiesList.push({
        id: 'sys-health',
        type: 'system',
        message: 'System health check — All services operational',
        timestamp: new Date().toISOString(),
        icon: <Activity className="size-3.5" />,
        color: 'text-cyan-400',
      })

      activitiesList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setActivities(activitiesList)
    } catch { /* */ }
  }, [])

  useEffect(() => {
    const loadInitial = async () => {
      await Promise.all([fetchHealth(), fetchAgents(), fetchActivity()])
    }
    loadInitial()
    const interval = setInterval(() => { fetchHealth() }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }))
      const hour = now.getHours()
      if (hour < 6) setGreeting('Good Night')
      else if (hour < 12) setGreeting('Good Morning')
      else if (hour < 18) setGreeting('Good Afternoon')
      else setGreeting('Good Evening')
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (d > 0) return `${d}d ${h}h`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  const taskProgress = health.pendingTasks + health.completedTasks > 0
    ? Math.round((health.completedTasks / (health.pendingTasks + health.completedTasks)) * 100)
    : 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ─── Hero Section: Neural Network + Greeting ─────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-[#0a0e1a] to-emerald-950/20">
          {/* Neural Network Background */}
          <div className="absolute inset-0 opacity-60">
            <NeuralNetworkCanvas />
          </div>

          {/* Content overlay */}
          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <PulseRing size={48} color="cyan" />
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                      AIOS Dashboard
                    </h1>
                    <p className="text-sm text-slate-400">
                      {greeting}, Commander. All systems {isOnline ? 'operational' : 'offline'}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Status Indicator */}
                <div className="text-center">
                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <Wifi className="size-4 text-emerald-400" />
                    ) : (
                      <WifiOff className="size-4 text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Network Status</p>
                </div>

                {/* Clock */}
                <div className="text-center">
                  <p className="text-xl font-mono font-bold text-cyan-400">{currentTime || '--:--:--'}</p>
                  <p className="text-[10px] text-slate-500">System Time</p>
                </div>

                {/* Uptime */}
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-200">{formatUptime(health.uptime)}</p>
                  <p className="text-[10px] text-slate-500">Uptime</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Quick Stats Row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Projects', value: health.totalProjects, icon: FolderKanban, color: 'text-rose-400', bg: 'bg-rose-500/10' },
            { label: 'Active Agents', value: health.activeAgents, icon: Bot, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Conversations', value: health.totalConversations, icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'Memories', value: health.totalMemories, icon: Brain, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Tasks Done', value: health.completedTasks, icon: CheckCircle2, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Plugins', value: health.installedPlugins, icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="bg-[#0d1117] border-neutral-800 hover:border-neutral-700 transition-colors py-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`size-4 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">
                        <AnimatedCounter value={stat.value} />
                      </p>
                      <p className="text-[10px] text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ─── Main Content Grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ─── Left Column: System Health + Agents ────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">

            {/* System Health Card */}
            <Card className="bg-[#0d1117] border-neutral-800 py-0">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Activity className="size-4 text-cyan-400" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {/* CPU */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Cpu className="size-3" /> CPU Usage
                    </span>
                    <span className="text-cyan-400 font-mono">{Math.round(health.cpu)}%</span>
                  </div>
                  <Progress value={health.cpu} className="h-1.5 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-cyan-400" />
                </div>
                {/* Memory */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <HardDrive className="size-3" /> Memory
                    </span>
                    <span className="text-emerald-400 font-mono">{Math.round(health.memory)}%</span>
                  </div>
                  <Progress value={health.memory} className="h-1.5 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400" />
                </div>
                {/* Task Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <CheckCircle2 className="size-3" /> Tasks Progress
                    </span>
                    <span className="text-amber-400 font-mono">{taskProgress}%</span>
                  </div>
                  <Progress value={taskProgress} className="h-1.5 bg-neutral-800 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-amber-400" />
                </div>

                {/* Circular Gauges */}
                <div className="flex items-center justify-around pt-2">
                  <div className="text-center">
                    <CircularProgress value={Math.round(health.cpu)} size={64} strokeWidth={5} color="cyan" />
                    <p className="text-[10px] text-slate-500 mt-1">CPU</p>
                  </div>
                  <div className="text-center">
                    <CircularProgress value={Math.round(health.memory)} size={64} strokeWidth={5} color="emerald" />
                    <p className="text-[10px] text-slate-500 mt-1">Memory</p>
                  </div>
                  <div className="text-center">
                    <CircularProgress value={taskProgress} size={64} strokeWidth={5} color="amber" />
                    <p className="text-[10px] text-slate-500 mt-1">Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Agents Card */}
            <Card className="bg-[#0d1117] border-neutral-800 py-0">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Bot className="size-4 text-emerald-400" />
                  Active Agents
                  <Badge variant="outline" className="text-[10px] h-4 ml-auto border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    {agents.filter(a => a.status === 'active').length} online
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {agents.length === 0 ? (
                      <div className="text-center py-4">
                        <Bot className="size-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">No agents detected</p>
                        <p className="text-[10px] text-slate-600">Create a project to spawn agents</p>
                      </div>
                    ) : (
                      agents.map((agent) => (
                        <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                          <div className={`w-2 h-2 rounded-full ${
                            agent.status === 'active' ? 'bg-emerald-400 animate-pulse' :
                            agent.status === 'idle' ? 'bg-amber-400' :
                            agent.status === 'error' ? 'bg-red-400' :
                            'bg-slate-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-200 truncate">{agent.name}</p>
                            <p className="text-[10px] text-slate-500">{agent.type}</p>
                          </div>
                          <Badge variant="outline" className={`text-[9px] h-4 border-neutral-700 ${
                            agent.status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                            agent.status === 'idle' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                            agent.status === 'error' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                            'text-slate-400 bg-slate-500/10 border-slate-500/30'
                          }`}>
                            {agent.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* ─── Center Column: Activity Feed + Quick Actions ───────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Activity Feed */}
            <Card className="bg-[#0d1117] border-neutral-800 py-0">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Zap className="size-4 text-amber-400" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Live feed of system events, agent actions, and project updates
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {activities.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="size-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">No recent activity</p>
                        <p className="text-[10px] text-slate-600">Activity will appear here as you use the system</p>
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                          <div className={`mt-0.5 ${activity.color}`}>
                            {activity.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-200">{activity.message}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <ChevronRight className="size-3.5 text-slate-600 mt-0.5 flex-shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Actions Grid */}
            <Card className="bg-[#0d1117] border-neutral-800 py-0">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Sparkles className="size-4 text-cyan-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'New Project', icon: FolderKanban, color: 'text-rose-400', bg: 'bg-rose-500/10 hover:bg-rose-500/20', desc: 'Start a new AI project', module: 'projects' as AIModule },
                    { label: 'AI Chat', icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-500/10 hover:bg-cyan-500/20', desc: 'Talk to the AI', module: 'chat' as AIModule },
                    { label: 'View Agents', icon: Bot, color: 'text-emerald-400', bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', desc: 'Monitor your agents', module: 'agents' as AIModule },
                    { label: 'Terminal', icon: Terminal, color: 'text-lime-400', bg: 'bg-lime-500/10 hover:bg-lime-500/20', desc: 'Open terminal', module: 'terminal' as AIModule },
                    { label: 'Skills', icon: Sparkles, color: 'text-violet-400', bg: 'bg-violet-500/10 hover:bg-violet-500/20', desc: 'Manage skills', module: 'skills' as AIModule },
                    { label: 'MCP Registry', icon: Server, color: 'text-amber-400', bg: 'bg-amber-500/10 hover:bg-amber-500/20', desc: 'Browse MCP servers', module: 'mcp' as AIModule },
                    { label: 'Knowledge Graph', icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-500/10 hover:bg-cyan-500/20', desc: 'Visualize code', module: 'knowledge-graph' as AIModule },
                    { label: 'Security', icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10 hover:bg-red-500/20', desc: 'Security scan', module: 'security' as AIModule },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => setActiveModule(action.module)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-neutral-800 ${action.bg} transition-all duration-200 group`}
                    >
                      <action.icon className={`size-5 ${action.color} group-hover:scale-110 transition-transform`} />
                      <span className="text-[11px] font-medium text-slate-300">{action.label}</span>
                      <span className="text-[9px] text-slate-500 hidden sm:block">{action.desc}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Module Status Grid */}
            <Card className="bg-[#0d1117] border-neutral-800 py-0">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Server className="size-4 text-slate-400" />
                  Module Status
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { name: 'Orchestrator', status: 'active', icon: Zap },
                    { name: 'Agent Pool', status: health.activeAgents > 0 ? 'active' : 'idle', icon: Bot },
                    { name: 'Memory Store', status: 'active', icon: Brain },
                    { name: 'Chat Engine', status: 'active', icon: MessageSquare },
                    { name: 'Workflow Runner', status: 'idle', icon: Activity },
                    { name: 'Plugin System', status: health.installedPlugins > 0 ? 'active' : 'idle', icon: Sparkles },
                    { name: 'MCP Gateway', status: 'active', icon: Server },
                    { name: 'Security Layer', status: 'active', icon: Shield },
                    { name: 'Knowledge Graph', status: 'active', icon: Globe },
                  ].map((mod) => (
                    <div key={mod.name} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                      <mod.icon className={`size-3.5 ${mod.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span className="text-[11px] text-slate-300 flex-1">{mod.name}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        mod.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── Bottom Row: System Resources ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Conversations', value: health.totalConversations, icon: MessageSquare, color: 'from-cyan-500 to-blue-500' },
            { label: 'Active Projects', value: health.activeProjects, icon: FolderKanban, color: 'from-rose-500 to-pink-500' },
            { label: 'Integrations', value: health.connectedIntegrations, icon: GitBranch, color: 'from-emerald-500 to-teal-500' },
            { label: 'Pending Tasks', value: health.pendingTasks, icon: Clock, color: 'from-amber-500 to-orange-500' },
          ].map((item) => (
            <Card key={item.label} className="bg-[#0d1117] border-neutral-800 py-0 overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${item.color}`} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      <AnimatedCounter value={item.value} />
                    </p>
                    <p className="text-xs text-slate-500">{item.label}</p>
                  </div>
                  <item.icon className="size-8 text-slate-600" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
