'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Cpu,
  MemoryStick,
  Bot,
  ListTodo,
  Brain,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Shield,
  Bell,
  RefreshCw,
  Server,
  HardDrive,
  Wifi,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MetricCard {
  title: string
  value: string | number
  unit?: string
  trend: 'up' | 'down' | 'stable'
  trendValue: string
  icon: React.ReactNode
  color: string
  percentage?: number
  status: 'good' | 'warning' | 'critical'
}

interface ActivityItem {
  id: string
  agent: string
  action: string
  timestamp: Date
  type: 'success' | 'warning' | 'error' | 'info'
}

interface TimeSeriesPoint {
  time: string
  cpu: number
  ram: number
  agents: number
  tasks: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusColor(status: 'good' | 'warning' | 'critical') {
  switch (status) {
    case 'good': return 'text-emerald-400'
    case 'warning': return 'text-amber-400'
    case 'critical': return 'text-red-400'
  }
}

function getStatusBg(status: 'good' | 'warning' | 'critical') {
  switch (status) {
    case 'good': return 'bg-emerald-500/10'
    case 'warning': return 'bg-amber-500/10'
    case 'critical': return 'bg-red-500/10'
  }
}

function getStatusBorder(status: 'good' | 'warning' | 'critical') {
  switch (status) {
    case 'good': return 'border-emerald-500/20'
    case 'warning': return 'border-amber-500/20'
    case 'critical': return 'border-red-500/20'
  }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── Sparkline Chart ─────────────────────────────────────────────────────────

function MiniSparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const width = 80
  const padding = 2

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`

  return (
    <svg width={width} height={height} className="opacity-60">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

// Helper to generate initial data
function generateInitialTimeSeries(): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = []
  const now = Date.now()
  for (let i = 29; i >= 0; i--) {
    const time = new Date(now - i * 60000)
    data.push({
      time: formatTime(time),
      cpu: 30 + Math.random() * 40,
      ram: 45 + Math.random() * 30,
      agents: Math.floor(3 + Math.random() * 5),
      tasks: Math.floor(2 + Math.random() * 8),
    })
  }
  return data
}

function generateInitialActivity(): ActivityItem[] {
  const now = Date.now()
  const agents = ['Coordinator', 'Dev Agent', 'Security Bot', 'Memory Manager', 'Research Agent', 'Debug Agent']
  const actions = [
    'Completed code analysis for project X',
    'Detected potential security vulnerability',
    'Stored 3 new memories from conversation',
    'Generated research summary',
    'Fixed bug in authentication module',
    'Scheduled daily report generation',
    'Processed incoming webhook event',
    'Updated knowledge base with new docs',
    'Resolved merge conflict automatically',
    'Indexed 15 new documents',
  ]
  return Array.from({ length: 12 }, (_, i) => ({
    id: `act-${i}`,
    agent: agents[Math.floor(Math.random() * agents.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    timestamp: new Date(now - i * 120000 - Math.random() * 60000),
    type: (['success', 'success', 'success', 'info', 'warning'] as const)[Math.floor(Math.random() * 5)],
  }))
}

export default function MonitoringModule() {
  const [metrics, setMetrics] = useState<MetricCard[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPoint[]>(generateInitialTimeSeries)
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>(generateInitialActivity)
  const [taskQueue, setTaskQueue] = useState({ pending: 5, running: 3, completed: 47, failed: 2 })
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'info' | 'warning' | 'error'; time: Date }[]>([
    { id: 'n1', message: 'System health check passed', type: 'info', time: new Date(Date.now() - 300000) },
    { id: 'n2', message: 'Agent "Security Bot" reported a warning', type: 'warning', time: new Date(Date.now() - 180000) },
    { id: 'n3', message: 'Workflow "Email Processor" completed successfully', type: 'info', time: new Date(Date.now() - 60000) },
  ])
  const [apiData, setApiData] = useState<Record<string, unknown> | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [sparklineData, setSparklineData] = useState<Record<string, number[]>>({
    cpu: Array.from({ length: 20 }, () => 30 + Math.random() * 40),
    ram: Array.from({ length: 20 }, () => 45 + Math.random() * 30),
    agents: Array.from({ length: 20 }, () => 3 + Math.random() * 5),
    tasks: Array.from({ length: 20 }, () => 2 + Math.random() * 8),
    memories: Array.from({ length: 20 }, () => 120 + Math.random() * 30),
    conversations: Array.from({ length: 20 }, () => 8 + Math.random() * 5),
  })

  // Fetch monitoring data from API
  const fetchMonitoringData = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring')
      if (res.ok) {
        const data = await res.json()
        setApiData(data)
      }
    } catch {
      // Use simulated data on error
    }
  }, [])

  // Fetch API data on mount
  useEffect(() => {
    fetchMonitoringData()
  }, [fetchMonitoringData])

  // Simulated real-time updates
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setLastRefresh(new Date())

      // Update metrics with slight random variations
      const cpuVal = 25 + Math.random() * 50
      const ramVal = 40 + Math.random() * 35
      const agentVal = apiData
        ? (apiData.agents as { active: number }).active
        : Math.floor(3 + Math.random() * 5)
      const taskVal = apiData
        ? (apiData.tasks as { inProgress: number }).inProgress
        : Math.floor(1 + Math.random() * 6)
      const memVal = apiData
        ? (apiData.memories as { total: number }).total
        : Math.floor(120 + Math.random() * 30)
      const convVal = apiData
        ? (apiData.conversations as { total: number }).total
        : Math.floor(8 + Math.random() * 5)

      // Update sparkline data
      setSparklineData((prev) => {
        const updated = { ...prev }
        const keys = ['cpu', 'ram', 'agents', 'tasks', 'memories', 'conversations'] as const
        const vals = [cpuVal, ramVal, agentVal, taskVal, memVal, convVal]
        keys.forEach((key, idx) => {
          updated[key] = [...(prev[key] || []).slice(-19), vals[idx]]
        })
        return updated
      })

      const cpuStatus: 'good' | 'warning' | 'critical' = cpuVal < 50 ? 'good' : cpuVal < 80 ? 'warning' : 'critical'
      const ramStatus: 'good' | 'warning' | 'critical' = ramVal < 60 ? 'good' : ramVal < 85 ? 'warning' : 'critical'

      setMetrics([
        {
          title: 'CPU Usage',
          value: cpuVal.toFixed(1),
          unit: '%',
          trend: cpuVal > 50 ? 'up' : cpuVal > 30 ? 'stable' : 'down',
          trendValue: `${(Math.random() * 5 - 2.5).toFixed(1)}%`,
          icon: <Cpu className="h-4 w-4" />,
          color: cpuStatus === 'good' ? '#34d399' : cpuStatus === 'warning' ? '#fbbf24' : '#f87171',
          percentage: cpuVal,
          status: cpuStatus,
        },
        {
          title: 'RAM Usage',
          value: ramVal.toFixed(1),
          unit: '%',
          trend: ramVal > 60 ? 'up' : 'stable',
          trendValue: `${(Math.random() * 3 - 1.5).toFixed(1)}%`,
          icon: <MemoryStick className="h-4 w-4" />,
          color: ramStatus === 'good' ? '#34d399' : ramStatus === 'warning' ? '#fbbf24' : '#f87171',
          percentage: ramVal,
          status: ramStatus,
        },
        {
          title: 'Active Agents',
          value: agentVal,
          trend: 'stable',
          trendValue: `${Math.floor(Math.random() * 2)} changed`,
          icon: <Bot className="h-4 w-4" />,
          color: '#a78bfa',
          status: 'good',
        },
        {
          title: 'Running Tasks',
          value: taskVal,
          trend: taskVal > 5 ? 'up' : 'stable',
          trendValue: `${Math.floor(Math.random() * 3)} new`,
          icon: <ListTodo className="h-4 w-4" />,
          color: '#38bdf8',
          status: taskVal > 8 ? 'warning' : 'good',
        },
        {
          title: 'Memory Count',
          value: memVal,
          trend: 'up',
          trendValue: `+${Math.floor(Math.random() * 5)}`,
          icon: <Brain className="h-4 w-4" />,
          color: '#fb923c',
          status: 'good',
        },
        {
          title: 'Conversations',
          value: convVal,
          trend: 'stable',
          trendValue: `${Math.floor(Math.random() * 3)} active`,
          icon: <MessageSquare className="h-4 w-4" />,
          color: '#f472b6',
          status: 'good',
        },
      ])

      // Update time series
      setTimeSeriesData((prev) => {
        const newPoint: TimeSeriesPoint = {
          time: formatTime(new Date()),
          cpu: cpuVal,
          ram: ramVal,
          agents: agentVal,
          tasks: taskVal,
        }
        return [...prev.slice(-29), newPoint]
      })

      // Update task queue with small variations
      setTaskQueue((prev) => ({
        pending: Math.max(0, prev.pending + Math.floor(Math.random() * 3 - 1)),
        running: Math.max(1, prev.running + Math.floor(Math.random() * 3 - 1)),
        completed: prev.completed + Math.floor(Math.random() * 2),
        failed: Math.max(0, prev.failed + (Math.random() > 0.9 ? 1 : 0)),
      }))

      // Occasionally add activity items
      if (Math.random() > 0.5) {
        const agents = ['Coordinator', 'Dev Agent', 'Security Bot', 'Memory Manager', 'Research Agent', 'Debug Agent']
        const actions = [
          'Processed new message',
          'Updated memory index',
          'Ran security scan',
          'Generated report',
          'Handled webhook event',
          'Optimized query performance',
        ]
        const newItem: ActivityItem = {
          id: `act-${Date.now()}`,
          agent: agents[Math.floor(Math.random() * agents.length)],
          action: actions[Math.floor(Math.random() * actions.length)],
          timestamp: new Date(),
          type: (['success', 'success', 'info', 'warning'] as const)[Math.floor(Math.random() * 4)],
        }
        setActivityFeed((prev) => [newItem, ...prev.slice(0, 19)])
      }
    }, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [apiData])

  const handleRefresh = () => {
    fetchMonitoringData()
    setLastRefresh(new Date())
  }

  const totalTasks = taskQueue.pending + taskQueue.running + taskQueue.completed + taskQueue.failed
  const healthScore = Math.max(0, Math.min(100, 100 - (taskQueue.failed / Math.max(totalTasks, 1)) * 100))

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Activity className="h-5 w-5 text-primary" />
            System Monitoring
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time system metrics and agent activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Last update: {formatTime(lastRefresh)}
          </span>
          <Button size="sm" variant="ghost" onClick={handleRefresh} className="gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 p-6">
          {/* System Health */}
          <div className="flex items-center gap-4">
            <Card className={`flex-1 border ${getStatusBorder(healthScore > 80 ? 'good' : healthScore > 50 ? 'warning' : 'critical')} ${getStatusBg(healthScore > 80 ? 'good' : healthScore > 50 ? 'warning' : 'critical')}`}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getStatusBg(healthScore > 80 ? 'good' : healthScore > 50 ? 'warning' : 'critical')}`}>
                  {healthScore > 80 ? (
                    <CheckCircle2 className={`h-5 w-5 ${getStatusColor('good')}`} />
                  ) : healthScore > 50 ? (
                    <AlertTriangle className={`h-5 w-5 ${getStatusColor('warning')}`} />
                  ) : (
                    <XCircle className={`h-5 w-5 ${getStatusColor('critical')}`} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">System Health</p>
                  <p className={`text-2xl font-bold ${getStatusColor(healthScore > 80 ? 'good' : healthScore > 50 ? 'warning' : 'critical')}`}>
                    {healthScore.toFixed(0)}%
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400">All Systems Operational</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`border ${getStatusBorder(metric.status)} bg-card/80 backdrop-blur-sm`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${getStatusBg(metric.status)}`}>
                          <span style={{ color: metric.color }}>{metric.icon}</span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{metric.title}</p>
                          <p className="text-xl font-bold">
                            {metric.value}
                            {metric.unit && <span className="ml-0.5 text-sm font-normal text-muted-foreground">{metric.unit}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {metric.trend === 'up' && <ArrowUpRight className="h-3 w-3 text-amber-400" />}
                        {metric.trend === 'down' && <ArrowDownRight className="h-3 w-3 text-emerald-400" />}
                        {metric.trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-[10px] text-muted-foreground">{metric.trendValue}</span>
                      </div>
                    </div>

                    {metric.percentage !== undefined && (
                      <div className="mt-3">
                        <Progress value={metric.percentage} className="h-1.5" />
                      </div>
                    )}

                    <div className="mt-2 flex justify-end">
                      <MiniSparkline
                        data={(() => {
                          const key = metric.title === 'CPU Usage' ? 'cpu' :
                            metric.title === 'RAM Usage' ? 'ram' :
                            metric.title === 'Active Agents' ? 'agents' :
                            metric.title === 'Running Tasks' ? 'tasks' :
                            metric.title === 'Memory Count' ? 'memories' : 'conversations'
                          return sparklineData[key] || []
                        })()}
                        color={metric.color}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Charts & Activity Row */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Performance Chart */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Performance Over Time
                </CardTitle>
                <CardDescription>CPU and RAM usage trend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData}>
                      <defs>
                        <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                        tickLine={false}
                        axisLine={false}
                        interval={4}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(20,20,20,0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cpu"
                        stroke="#34d399"
                        strokeWidth={2}
                        fill="url(#cpuGrad)"
                        name="CPU %"
                      />
                      <Area
                        type="monotone"
                        dataKey="ram"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        fill="url(#ramGrad)"
                        name="RAM %"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Task Queue */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ListTodo className="h-4 w-4 text-sky-400" />
                  Task Queue
                </CardTitle>
                <CardDescription>Current task distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Pending', count: taskQueue.pending, fill: '#94a3b8' },
                      { name: 'Running', count: taskQueue.running, fill: '#38bdf8' },
                      { name: 'Done', count: taskQueue.completed, fill: '#34d399' },
                      { name: 'Failed', count: taskQueue.failed, fill: '#f87171' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(20,20,20,0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'Pending', count: taskQueue.pending, color: 'bg-slate-400' },
                    { label: 'Running', count: taskQueue.running, color: 'bg-sky-400' },
                    { label: 'Completed', count: taskQueue.completed, color: 'bg-emerald-400' },
                    { label: 'Failed', count: taskQueue.failed, color: 'bg-red-400' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${item.color}`} />
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity & Notifications Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Agent Activity Feed */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Bot className="h-4 w-4 text-violet-400" />
                  Agent Activity
                </CardTitle>
                <CardDescription>Recent agent actions</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    <AnimatePresence>
                      {activityFeed.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex items-start gap-3 rounded-lg border border-border/30 bg-muted/20 p-3"
                        >
                          <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                            item.type === 'success' ? 'bg-emerald-400' :
                            item.type === 'warning' ? 'bg-amber-400' :
                            item.type === 'error' ? 'bg-red-400' : 'bg-sky-400'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">{item.agent}</span>
                              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                                {item.type}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                              {item.action}
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground/60">
                              {formatTime(item.timestamp)}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Notifications & System Status */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4 text-amber-400" />
                  Notifications
                </CardTitle>
                <CardDescription>System alerts and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 ${
                          notif.type === 'error'
                            ? 'border-red-500/20 bg-red-500/5'
                            : notif.type === 'warning'
                            ? 'border-amber-500/20 bg-amber-500/5'
                            : 'border-border/30 bg-muted/20'
                        }`}
                      >
                        {notif.type === 'error' && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
                        {notif.type === 'warning' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
                        {notif.type === 'info' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />}
                        <div>
                          <p className="text-xs text-foreground">{notif.message}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {formatTime(notif.time)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* System status items */}
                    <div className="mt-4 space-y-2 border-t border-border/30 pt-4">
                      <p className="text-xs font-semibold text-muted-foreground">Infrastructure</p>
                      {[
                        { name: 'API Server', status: 'online', icon: <Server className="h-3 w-3" /> },
                        { name: 'Database', status: 'online', icon: <HardDrive className="h-3 w-3" /> },
                        { name: 'Network', status: 'online', icon: <Wifi className="h-3 w-3" /> },
                      ].map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {item.icon}
                            {item.name}
                          </div>
                          <Badge
                            variant="outline"
                            className="gap-1 text-[9px] text-emerald-400"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
