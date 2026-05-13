import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

// ─── Type Definitions ───────────────────────────────────────────────

interface AgentStatus {
  agentId: string
  status: 'online' | 'offline' | 'busy' | 'idle' | 'error'
  metadata?: Record<string, unknown>
  timestamp: string
}

interface AgentMessage {
  id: string
  from: string
  to: string | 'broadcast'
  content: string
  type: 'command' | 'response' | 'query' | 'event'
  timestamp: string
}

interface TaskUpdate {
  taskId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  result?: unknown
  error?: string
  timestamp: string
}

interface WorkflowProgress {
  workflowId: string
  step: string
  stepIndex: number
  totalSteps: number
  status: 'running' | 'paused' | 'completed' | 'failed'
  timestamp: string
}

interface MemoryUpdate {
  key: string
  operation: 'set' | 'delete' | 'append'
  value?: unknown
  namespace?: string
  timestamp: string
}

interface SystemMetrics {
  cpu: number
  memory: { used: number; total: number; percentage: number }
  uptime: number
  activeConnections: number
  activeAgents: number
  timestamp: string
}

interface ChatStreamPayload {
  sessionId: string
  token: string
  index: number
  finished: boolean
  model?: string
  timestamp: string
}

interface Notification {
  id: string
  level: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  source?: string
  timestamp: string
}

interface TypingIndicator {
  sessionId: string
  userId: string
  isTyping: boolean
}

// ─── State ──────────────────────────────────────────────────────────

const connectedClients = new Map<string, { connectedAt: Date; userAgent?: string }>()
const agentStatuses = new Map<string, AgentStatus>()
const typingUsers = new Map<string, { sessionId: string; userId: string; timeout: ReturnType<typeof setTimeout> }>()

let serverStartTime = Date.now()

// ─── Helpers ────────────────────────────────────────────────────────

const ts = () => new Date().toISOString()
const generateId = () => Math.random().toString(36).substring(2, 11)

function getSystemMetrics(): SystemMetrics {
  const memUsage = process.memoryUsage()
  return {
    cpu: process.cpuUsage().user / 1000000,
    memory: {
      used: Math.round(memUsage.rss / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.rss / memUsage.heapTotal) * 100)
    },
    uptime: Math.round((Date.now() - serverStartTime) / 1000),
    activeConnections: connectedClients.size,
    activeAgents: agentStatuses.size,
    timestamp: ts()
  }
}

function getHealthPayload() {
  return {
    status: 'ok',
    uptime: Math.round((Date.now() - serverStartTime) / 1000),
    connections: connectedClients.size,
    agents: agentStatuses.size,
    timestamp: ts()
  }
}

// ─── Health Check HTTP Server (separate port to avoid Socket.io path conflict) ──

const HEALTH_PORT = 3004
const healthServer = createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(getHealthPayload()))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})

healthServer.listen(HEALTH_PORT, () => {
  console.log(`Health check available at http://localhost:${HEALTH_PORT}/health`)
})

// ─── Socket.io Server ───────────────────────────────────────────────

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Broadcast metrics every 30 seconds
const metricsInterval = setInterval(() => {
  if (connectedClients.size > 0) {
    io.emit('system:metrics', getSystemMetrics())
  }
}, 30000)

// ─── Socket.io Event Handlers ───────────────────────────────────────

io.on('connection', (socket: Socket) => {
  // Track connected client
  connectedClients.set(socket.id, {
    connectedAt: new Date(),
    userAgent: socket.handshake.headers['user-agent']
  })

  console.log(`[connection] Client connected: ${socket.id} (total: ${connectedClients.size})`)

  // Send welcome with current state
  socket.emit('connection:ack', {
    socketId: socket.id,
    serverTime: ts(),
    activeAgents: Array.from(agentStatuses.values())
  })

  // ── Health Check (socket-based) ─────────────────────────────────

  socket.on('health:check', () => {
    socket.emit('health:response', getHealthPayload())
  })

  // ── Agent Status ────────────────────────────────────────────────

  socket.on('agent:status', (data: Omit<AgentStatus, 'timestamp'>) => {
    const status: AgentStatus = { ...data, timestamp: ts() }
    agentStatuses.set(data.agentId, status)
    // Broadcast to all connected clients
    io.emit('agent:status', status)
    console.log(`[agent:status] ${data.agentId} → ${data.status}`)
  })

  // ── Agent Message (inter-agent communication) ───────────────────

  socket.on('agent:message', (data: Omit<AgentMessage, 'id' | 'timestamp'>) => {
    const message: AgentMessage = { ...data, id: generateId(), timestamp: ts() }

    if (data.to === 'broadcast') {
      io.emit('agent:message', message)
    } else {
      // Targeted delivery – verify target agent exists
      const targetStatus = agentStatuses.get(data.to)
      if (targetStatus) {
        io.emit('agent:message', message) // broadcast; consumers filter by `to`
      } else {
        socket.emit('agent:message:error', { messageId: message.id, error: 'Target agent not found' })
      }
    }
    console.log(`[agent:message] ${data.from} → ${data.to} (${data.type})`)
  })

  // ── Task Update ─────────────────────────────────────────────────

  socket.on('task:update', (data: Omit<TaskUpdate, 'timestamp'>) => {
    const update: TaskUpdate = { ...data, timestamp: ts() }
    io.emit('task:update', update)
    console.log(`[task:update] ${data.taskId} → ${data.status}${data.progress ? ` (${data.progress}%)` : ''}`)
  })

  // ── Workflow Progress ───────────────────────────────────────────

  socket.on('workflow:progress', (data: Omit<WorkflowProgress, 'timestamp'>) => {
    const progress: WorkflowProgress = { ...data, timestamp: ts() }
    io.emit('workflow:progress', progress)
    console.log(`[workflow:progress] ${data.workflowId} step ${data.stepIndex + 1}/${data.totalSteps}: ${data.step} (${data.status})`)
  })

  // ── Memory Update ───────────────────────────────────────────────

  socket.on('memory:update', (data: Omit<MemoryUpdate, 'timestamp'>) => {
    const update: MemoryUpdate = { ...data, timestamp: ts() }
    io.emit('memory:update', update)
    console.log(`[memory:update] ${data.operation} key="${data.key}"${data.namespace ? ` ns=${data.namespace}` : ''}`)
  })

  // ── System Metrics (on-demand) ─────────────────────────────────

  socket.on('system:metrics', () => {
    socket.emit('system:metrics', getSystemMetrics())
  })

  // ── Chat Stream ─────────────────────────────────────────────────

  socket.on('chat:stream', (data: Omit<ChatStreamPayload, 'timestamp'>) => {
    const payload: ChatStreamPayload = { ...data, timestamp: ts() }
    io.emit('chat:stream', payload)
  })

  // ── Typing Indicators ──────────────────────────────────────────

  socket.on('chat:typing', (data: Omit<TypingIndicator, never>) => {
    const { sessionId, userId, isTyping } = data

    if (isTyping) {
      // Clear existing timeout if user is already typing
      const existing = typingUsers.get(socket.id)
      if (existing) clearTimeout(existing.timeout)

      // Auto-expire typing after 5 seconds of inactivity
      const timeout = setTimeout(() => {
        typingUsers.delete(socket.id)
        socket.to(sessionId).emit('chat:typing', { sessionId, userId, isTyping: false })
      }, 5000)

      typingUsers.set(socket.id, { sessionId, userId, timeout })
    } else {
      const existing = typingUsers.get(socket.id)
      if (existing) clearTimeout(existing.timeout)
      typingUsers.delete(socket.id)
    }

    // Broadcast typing state to others in the session
    socket.to(sessionId).emit('chat:typing', data)
  })

  // ── Notification ────────────────────────────────────────────────

  socket.on('notification', (data: Omit<Notification, 'id' | 'timestamp'>) => {
    const notification: Notification = { ...data, id: generateId(), timestamp: ts() }
    io.emit('notification', notification)
    console.log(`[notification] [${data.level}] ${data.title}: ${data.message}`)
  })

  // ── Disconnect ──────────────────────────────────────────────────

  socket.on('disconnect', (reason) => {
    // Clean up typing indicator
    const typing = typingUsers.get(socket.id)
    if (typing) {
      clearTimeout(typing.timeout)
      typingUsers.delete(socket.id)
      socket.to(typing.sessionId).emit('chat:typing', {
        sessionId: typing.sessionId,
        userId: typing.userId,
        isTyping: false
      })
    }

    connectedClients.delete(socket.id)
    console.log(`[disconnect] Client disconnected: ${socket.id} reason=${reason} (total: ${connectedClients.size})`)
  })

  // ── Error ───────────────────────────────────────────────────────

  socket.on('error', (error) => {
    console.error(`[error] Socket error (${socket.id}):`, error)
  })
})

// ─── Start Server ───────────────────────────────────────────────────

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`AI OS WebSocket server running on port ${PORT}`)
})

// ─── Graceful Shutdown ──────────────────────────────────────────────

function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down server...`)
  clearInterval(metricsInterval)

  // Notify all clients before shutting down
  io.emit('notification', {
    id: generateId(),
    level: 'warning',
    title: 'Server Shutting Down',
    message: `Server received ${signal}, disconnecting...`,
    source: 'system',
    timestamp: ts()
  })

  // Give clients a moment to receive the notification
  setTimeout(() => {
    io.disconnectSockets(true)
    healthServer.close()
    httpServer.close(() => {
      console.log('AI OS WebSocket server closed')
      process.exit(0)
    })
  }, 1000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
