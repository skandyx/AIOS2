/**
 * AIOS Multi-Agent Orchestrator - Full orchestration system
 *
 * This module provides:
 * 1. 8 Specialized Agent Types with proper system prompts
 * 2. AgentCommunicationBus for inter-agent messaging
 * 3. Memory System (local, shared, long-term)
 * 4. Orchestration Workflow (6 phases: analyze→plan→assign→execute→review→deliver)
 * 5. Autonomy features (auto-create tasks, auto-reassign, auto-merge, auto-correct, auto-replan)
 */

import { db } from '@/lib/db'
import { chatCompletion, type ChatMessage } from '@/lib/providers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrchestratorLogEntry {
  timestamp: string
  event: string
  phase?: string
  details?: unknown
}

export interface OrchestrationResult {
  success: boolean
  orchestratorStatus: string
  projectStatus: string
  currentPhase: string
  tasksCreated: number
  messagesCreated: number
  agentsCreated: number
  documentationGenerated: boolean
  error?: string
}

interface ParsedTask {
  title: string
  description: string
  type: string
  priority: string
  agentType: string
  dependencies: number[]
  estimatedHours?: number
}

export interface CommunicationMessage {
  id: string
  from: string
  to: string
  task?: string
  priority: 'low' | 'normal' | 'high' | 'critical'
  status: 'sent' | 'delivered' | 'read'
  timestamp: string
  content: string
  phase: string
}

// ─── 8 Specialized Agent Types ───────────────────────────────────────────────

export const AGENT_TYPES = {
  orchestrator: {
    name: 'Orchestrator Agent',
    type: 'coordinator',
    avatar: '🎯',
    role: 'orchestrator',
    systemPrompt: 'You are the Orchestrator Agent. You coordinate all other agents, decompose projects into tasks, manage priorities, resolve conflicts. You do NOT do the work yourself. You delegate, supervise, and ensure all agents work together efficiently.',
    capabilities: ['coordination', 'task-decomposition', 'priority-management', 'conflict-resolution', 'delegation'],
  },
  project_manager: {
    name: 'Project Manager Agent',
    type: 'planning',
    avatar: '📋',
    role: 'supervisor',
    systemPrompt: 'You are the Project Manager Agent. You handle planning, roadmap, sprint management, KPIs, and reporting. You track progress, identify risks, and ensure the project stays on schedule.',
    capabilities: ['planning', 'roadmap', 'sprint-management', 'kpi-tracking', 'risk-assessment', 'reporting'],
  },
  architect: {
    name: 'System Architect Agent',
    type: 'reasoning',
    avatar: '🏗️',
    role: 'specialist',
    systemPrompt: 'You are the System Architect Agent. You design architecture, infrastructure, technical decisions, scalability. You create technical specifications, design documents, and ensure the system is well-structured.',
    capabilities: ['architecture', 'system-design', 'infrastructure', 'scalability', 'technical-specs', 'design-patterns'],
  },
  developer: {
    name: 'Developer Agent',
    type: 'developer',
    avatar: '💻',
    role: 'specialist',
    systemPrompt: 'You are the Developer Agent. You write code, refactor, fix bugs, optimize performance. You implement features according to specifications, write clean and maintainable code, and follow best practices.',
    capabilities: ['coding', 'refactoring', 'debugging', 'performance-optimization', 'implementation', 'code-review'],
  },
  qa: {
    name: 'QA Agent',
    type: 'debugger',
    avatar: '🔍',
    role: 'specialist',
    systemPrompt: 'You are the QA Agent. You test, validate, detect errors, ensure quality. You create test plans, write test cases, perform integration testing, and verify that all requirements are met.',
    capabilities: ['testing', 'validation', 'error-detection', 'quality-assurance', 'test-planning', 'regression-testing'],
  },
  security: {
    name: 'Security Agent',
    type: 'security',
    avatar: '🛡️',
    role: 'specialist',
    systemPrompt: 'You are the Security Agent. You audit security, analyze vulnerabilities, validate access controls. You perform security reviews, identify threats, and recommend security improvements.',
    capabilities: ['security-audit', 'vulnerability-analysis', 'access-control', 'threat-modeling', 'compliance', 'penetration-testing'],
  },
  research: {
    name: 'Research Agent',
    type: 'research',
    avatar: '🔬',
    role: 'specialist',
    systemPrompt: 'You are the Research Agent. You research documentation, analyze web resources, benchmark solutions. You gather information, compare technologies, and provide recommendations based on evidence.',
    capabilities: ['research', 'documentation-analysis', 'benchmarking', 'technology-comparison', 'information-gathering', 'feasibility-analysis'],
  },
  documentation: {
    name: 'Documentation Agent',
    type: 'document',
    avatar: '📝',
    role: 'specialist',
    systemPrompt: 'You are the Documentation Agent. You write technical docs, user guides, changelogs. You create comprehensive documentation, API references, and ensure all project knowledge is well-documented.',
    capabilities: ['technical-writing', 'api-documentation', 'user-guides', 'changelog', 'architecture-docs', 'tutorials'],
  },
} as const

export type AgentTypeKey = keyof typeof AGENT_TYPES

// ─── Agent type to task type mapping ──────────────────────────────────────────

export const AGENT_TYPE_TO_DB_TYPE: Record<string, string> = {
  orchestrator: 'coordinator',
  project_manager: 'planning',
  architect: 'reasoning',
  developer: 'developer',
  qa: 'debugger',
  security: 'security',
  research: 'research',
  documentation: 'document',
}

const TASK_TYPE_TO_AGENT_TYPE: Record<string, AgentTypeKey> = {
  development: 'developer',
  testing: 'qa',
  security: 'security',
  documentation: 'documentation',
  research: 'research',
  analysis: 'architect',
  planning: 'project_manager',
  automation: 'developer',
  workflow: 'orchestrator',
  system: 'architect',
}

// ─── Helper: extract JSON from AI response ────────────────────────────────────

function extractJsonFromResponse(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()

  const firstBracket = text.indexOf('[')
  const lastBracket = text.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    return text.substring(firstBracket, lastBracket + 1)
  }

  return text.trim()
}

// ─── Agent Communication Bus ─────────────────────────────────────────────────

export class AgentCommunicationBus {
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  async sendMessage(
    from: string,
    to: string,
    type: string,
    content: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    taskIds?: string[],
    phase?: string
  ): Promise<CommunicationMessage> {
    const fromAgent = from !== 'orchestrator' && from !== 'system' && from !== 'user'
      ? await db.agent.findFirst({ where: { id: from } })
      : null
    const toAgent = to !== 'all' && to !== 'orchestrator'
      ? await db.agent.findFirst({ where: { id: to } })
      : null

    const message = await db.agentMessage.create({
      data: {
        projectId: this.projectId,
        fromAgentId: fromAgent?.id || null,
        toAgentId: toAgent?.id || null,
        fromRole: from === 'orchestrator' ? 'orchestrator' : from === 'system' ? 'system' : from === 'user' ? 'user' : 'agent',
        toRole: to === 'all' ? 'all' : to === 'orchestrator' ? 'orchestrator' : 'agent',
        type,
        content,
        priority,
        phase: phase || 'execution',
        taskIds: taskIds ? JSON.stringify(taskIds) : null,
      },
    })

    return {
      id: message.id,
      from: fromAgent?.name || from,
      to: toAgent?.name || to,
      task: taskIds?.[0],
      priority,
      status: 'sent',
      timestamp: message.createdAt.toISOString(),
      content,
      phase: phase || 'execution',
    }
  }

  async broadcast(
    from: string,
    type: string,
    content: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    taskIds?: string[],
    phase?: string
  ): Promise<CommunicationMessage> {
    return this.sendMessage(from, 'all', type, content, priority, taskIds, phase)
  }

  async getConversation(
    projectId: string,
    options?: { taskIds?: string[]; phase?: string; limit?: number }
  ): Promise<CommunicationMessage[]> {
    const where: Record<string, unknown> = { projectId }
    if (options?.phase) where.phase = options.phase

    const messages = await db.agentMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      include: {
        fromAgent: { select: { id: true, name: true, type: true, avatar: true } },
        toAgent: { select: { id: true, name: true, type: true, avatar: true } },
      },
    })

    return messages.map(m => ({
      id: m.id,
      from: m.fromAgent?.name || m.fromRole,
      to: m.toAgent?.name || m.toRole || 'all',
      task: m.taskIds ? JSON.parse(m.taskIds)[0] : undefined,
      priority: (m.priority as 'low' | 'normal' | 'high' | 'critical') || 'normal',
      status: 'delivered' as const,
      timestamp: m.createdAt.toISOString(),
      content: m.content,
      phase: m.phase || 'execution',
    }))
  }

  async getAgentActivity(projectId: string): Promise<{
    working: Array<{ id: string; name: string; task?: string }>
    waiting: Array<{ id: string; name: string }>
    blocked: Array<{ id: string; name: string; reason?: string }>
    idle: Array<{ id: string; name: string }>
  }> {
    const agents = await db.agent.findMany({
      where: { isActive: true },
      include: { tasksAssigned: { where: { status: 'in_progress' }, take: 1 } },
    })

    const working: Array<{ id: string; name: string; task?: string }> = []
    const waiting: Array<{ id: string; name: string }> = []
    const blocked: Array<{ id: string; name: string; reason?: string }> = []
    const idle: Array<{ id: string; name: string }> = []

    for (const agent of agents) {
      switch (agent.currentStatus) {
        case 'working':
          working.push({ id: agent.id, name: agent.name, task: agent.currentTaskId || agent.tasksAssigned[0]?.title })
          break
        case 'waiting':
          waiting.push({ id: agent.id, name: agent.name })
          break
        case 'blocked':
          blocked.push({ id: agent.id, name: agent.name })
          break
        default:
          idle.push({ id: agent.id, name: agent.name })
      }
    }

    return { working, waiting, blocked, idle }
  }
}

// ─── Memory System ────────────────────────────────────────────────────────────

export async function getLocalMemory(agentId: string): Promise<Record<string, unknown>> {
  const memories = await db.memory.findMany({
    where: { taskId: agentId, isArchived: false },
    orderBy: { importance: 'desc' },
    take: 20,
  })
  const result: Record<string, unknown> = {}
  for (const m of memories) {
    result[m.key] = JSON.parse(m.value)
  }
  return result
}

export async function getSharedMemory(projectId: string): Promise<Record<string, unknown>> {
  const memories = await db.memory.findMany({
    where: { type: 'project', isArchived: false },
    orderBy: { importance: 'desc' },
    take: 50,
  })
  const result: Record<string, unknown> = {}
  for (const m of memories) {
    try { result[m.key] = JSON.parse(m.value) } catch { result[m.key] = m.value }
  }
  return result
}

export async function getLongTermMemory(projectId: string): Promise<Array<{ key: string; value: unknown; summary?: string }>> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: { select: { id: true, title: true, status: true, result: true, error: true } },
      agentMessages: { orderBy: { createdAt: 'desc' }, take: 100, select: { content: true, fromRole: true, type: true, createdAt: true } },
    },
  })
  if (!project) return []

  const timeline = project.timeline ? JSON.parse(project.timeline) : []
  return timeline.map((e: Record<string, unknown>) => ({
    key: String(e.event || 'event'),
    value: e,
    summary: String(e.description || ''),
  }))
}

export async function storeMemory(
  agentId: string,
  projectId: string,
  type: string,
  key: string,
  value: unknown
): Promise<void> {
  const userId = (await db.project.findUnique({ where: { id: projectId }, select: { userId: true } }))?.userId || ''
  await db.memory.create({
    data: {
      type,
      key: `${agentId}:${key}`,
      value: JSON.stringify(value),
      importance: type === 'error' ? 0.9 : 0.5,
      source: 'task',
      userId,
      taskId: agentId, // Use taskId field to store agent reference
    },
  })
}

// ─── Ensure specialized agents exist ──────────────────────────────────────────

export async function ensureSpecializedAgents(): Promise<number> {
  const existingCount = await db.agent.count()

  // Create agents that don't exist yet
  let created = 0
  for (const [key, agentDef] of Object.entries(AGENT_TYPES)) {
    const dbType = AGENT_TYPE_TO_DB_TYPE[key]
    const existing = await db.agent.findFirst({ where: { type: dbType, isActive: true } })
    if (!existing) {
      await db.agent.create({
        data: {
          name: agentDef.name,
          type: dbType,
          description: agentDef.systemPrompt,
          avatar: agentDef.avatar,
          capabilities: JSON.stringify(agentDef.capabilities),
          isActive: true,
          isDefault: true,
          systemPrompt: agentDef.systemPrompt,
          agentRole: agentDef.role,
          currentStatus: 'idle',
          workload: 0,
          successRate: 0.0,
          avgCompletionTime: 0.0,
          totalTasksCompleted: 0,
          totalTasksFailed: 0,
        },
      })
      created++
    } else {
      // Update existing agent with new fields if they're missing
      await db.agent.update({
        where: { id: existing.id },
        data: {
          agentRole: existing.agentRole || agentDef.role,
          currentStatus: existing.currentStatus || 'idle',
          systemPrompt: existing.systemPrompt || agentDef.systemPrompt,
          avatar: existing.avatar || agentDef.avatar,
        },
      })
    }
  }

  return created
}

// ─── Timeline helper ─────────────────────────────────────────────────────────

export async function addTimelineEvent(
  projectId: string,
  event: string,
  description: string,
  phase: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { timeline: true } })
  const timeline = project?.timeline ? JSON.parse(project.timeline) : []
  timeline.push({
    timestamp: new Date().toISOString(),
    event,
    description,
    phase,
    ...metadata,
  })
  await db.project.update({
    where: { id: projectId },
    data: { timeline: JSON.stringify(timeline) },
  })
}

// ─── Phase 1: ANALYZE ────────────────────────────────────────────────────────

async function phaseAnalyze(
  projectId: string,
  project: { id: string; name: string; description?: string | null; category?: string | null; techStack?: string | null; requirements?: string | null; userId: string },
  bus: AgentCommunicationBus,
  log: OrchestratorLogEntry[]
): Promise<{ parsedTasks: ParsedTask[]; analysisResult: string } | null> {
  log.push({ timestamp: new Date().toISOString(), event: 'phase_analyze_started', phase: 'analyze' })

  await db.project.update({
    where: { id: projectId },
    data: { orchestratorStatus: 'analyzing' },
  })

  await addTimelineEvent(projectId, 'phase_started', 'Analysis phase started - understanding objectives and decomposing into subtasks', 'analyze')

  // Broadcast analysis start
  await bus.broadcast('orchestrator', 'status',
    `## 🎯 Phase 1: ANALYZE\n\nAnalyzing project "${project.name}" requirements and objectives...\n\nUnderstanding scope, identifying deliverables, and preparing task decomposition.`,
    'high', undefined, 'planning'
  )

  let techStackDisplay = project.techStack || ''
  if (techStackDisplay) {
    try {
      const parsed = JSON.parse(techStackDisplay)
      if (Array.isArray(parsed)) techStackDisplay = parsed.join(', ')
    } catch { /* keep as-is */ }
  }

  const systemPrompt = `You are the AIOS Orchestrator Agent. Analyze this project comprehensively and create a detailed task breakdown.

Generate a JSON array of tasks, each with:
- title: string (clear, actionable title)
- description: string (detailed instructions for the assigned agent)
- type: "development" | "research" | "analysis" | "documentation" | "security" | "testing" | "planning" | "automation"
- priority: "low" | "medium" | "high" | "critical"
- agentType: "orchestrator" | "project_manager" | "architect" | "developer" | "qa" | "security" | "research" | "documentation"
- dependencies: array of task indices this depends on (0-based)
- estimatedHours: number (estimated time to complete)

IMPORTANT RULES:
1. Generate at least 6-12 tasks covering ALL aspects of the project
2. Always include at least 1 planning/architecture task first
3. Always include at least 1 testing/QA task
4. Always include at least 1 security review task
5. Always include at least 1 documentation task last
6. Use the correct agentType for each task
7. Order tasks by dependency - tasks that depend on others should come later
8. Return ONLY the JSON array, no markdown, no explanation`

  const userMessage = `Project: ${project.name}
Description: ${project.description || 'No description provided'}
Category: ${project.category || 'Not specified'}
Tech Stack: ${techStackDisplay || 'Not specified'}
Requirements: ${project.requirements || 'No specific requirements'}`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]

  let aiResponse: string
  try {
    const completion = await chatCompletion({ messages, temperature: 0.7 })
    aiResponse = completion.content
  } catch (aiError) {
    const errorMsg = aiError instanceof Error ? aiError.message : 'AI analysis failed'
    log.push({ timestamp: new Date().toISOString(), event: 'ai_analysis_failed', phase: 'analyze', details: { error: errorMsg } })
    await bus.broadcast('orchestrator', 'error', `❌ Analysis failed: ${errorMsg}`, 'critical', undefined, 'planning')
    return null
  }

  // Parse AI response
  let parsedTasks: ParsedTask[]
  try {
    const jsonStr = extractJsonFromResponse(aiResponse)
    parsedTasks = JSON.parse(jsonStr)
    if (!Array.isArray(parsedTasks)) throw new Error('Response is not a JSON array')
  } catch (parseError) {
    log.push({ timestamp: new Date().toISOString(), event: 'parse_failed', phase: 'analyze', details: { error: parseError instanceof Error ? parseError.message : 'Parse error' } })
    return null
  }

  log.push({ timestamp: new Date().toISOString(), event: 'phase_analyze_completed', phase: 'analyze', details: { taskCount: parsedTasks.length } })

  await bus.broadcast('orchestrator', 'status',
    `## ✅ Analysis Complete\n\nDecomposed project into **${parsedTasks.length} tasks** across specialized agents.\n\n${parsedTasks.map((t, i) => `${i + 1}. **${t.title}** → ${t.agentType} (${t.priority})`).join('\n')}`,
    'high', undefined, 'planning'
  )

  await addTimelineEvent(projectId, 'phase_completed', `Analysis complete: ${parsedTasks.length} tasks identified`, 'analyze', { taskCount: parsedTasks.length })

  return { parsedTasks, analysisResult: aiResponse }
}

// ─── Phase 2: PLAN ───────────────────────────────────────────────────────────

async function phasePlan(
  projectId: string,
  parsedTasks: ParsedTask[],
  bus: AgentCommunicationBus,
  log: OrchestratorLogEntry[]
): Promise<Record<number, string>> {
  log.push({ timestamp: new Date().toISOString(), event: 'phase_plan_started', phase: 'plan' })

  await addTimelineEvent(projectId, 'phase_started', 'Planning phase - creating task hierarchy, defining dependencies, assigning priorities', 'plan')

  await bus.broadcast('orchestrator', 'status',
    `## 📋 Phase 2: PLAN\n\nCreating task hierarchy and defining dependencies...\n\nBuilding execution plan with proper ordering and agent assignments.`,
    'high', undefined, 'planning'
  )

  // Create tasks in database with kanban columns
  const taskIdMap: Record<number, string> = {}
  const project = await db.project.findUnique({ where: { id: projectId } })
  if (!project) return taskIdMap

  for (let i = 0; i < parsedTasks.length; i++) {
    const taskDef = parsedTasks[i]
    const agentTypeKey = (taskDef.agentType || 'developer') as AgentTypeKey
    const dbType = AGENT_TYPE_TO_DB_TYPE[agentTypeKey] || 'developer'

    // Find matching agent
    const agent = await db.agent.findFirst({ where: { type: dbType, isActive: true } })

    // Determine kanban column based on dependencies
    const hasDeps = taskDef.dependencies && taskDef.dependencies.length > 0
    const kanbanColumn = hasDeps ? 'planned' : 'backlog'

    const task = await db.task.create({
      data: {
        title: taskDef.title || `Task ${i + 1}`,
        description: taskDef.description || null,
        status: 'pending',
        priority: taskDef.priority || 'medium',
        type: taskDef.type || 'development',
        projectId,
        creatorId: project.userId,
        assigneeId: agent?.id || null,
        agentType: agentTypeKey,
        kanbanColumn,
        dependencies: taskDef.dependencies ? JSON.stringify(taskDef.dependencies) : null,
        estimatedHours: taskDef.estimatedHours || null,
        metadata: JSON.stringify({
          source: 'orchestrator',
          agentType: agentTypeKey,
          taskIndex: i,
          generatedAt: new Date().toISOString(),
          phase: 'plan',
        }),
      },
    })

    taskIdMap[i] = task.id
  }

  // Update dependency references to use actual task IDs
  for (let i = 0; i < parsedTasks.length; i++) {
    const taskDef = parsedTasks[i]
    if (taskDef.dependencies && taskDef.dependencies.length > 0) {
      const depIds = taskDef.dependencies
        .map((depIdx: number) => taskIdMap[depIdx])
        .filter(Boolean)
      await db.task.update({
        where: { id: taskIdMap[i] },
        data: { dependencies: JSON.stringify(depIds) },
      })
    }
  }

  // Store kanban config
  const kanbanConfig = {
    columns: [
      { id: 'backlog', name: 'Backlog', wipLimit: 0 },
      { id: 'planned', name: 'Planned', wipLimit: 10 },
      { id: 'in_progress', name: 'In Progress', wipLimit: 5 },
      { id: 'review', name: 'Review', wipLimit: 5 },
      { id: 'blocked', name: 'Blocked', wipLimit: 3 },
      { id: 'done', name: 'Done', wipLimit: 0 },
    ],
  }
  await db.project.update({
    where: { id: projectId },
    data: { kanbanConfig: JSON.stringify(kanbanConfig) },
  })

  log.push({ timestamp: new Date().toISOString(), event: 'phase_plan_completed', phase: 'plan', details: { tasksCreated: parsedTasks.length } })

  await bus.broadcast('orchestrator', 'status',
    `## ✅ Planning Complete\n\nCreated **${parsedTasks.length} tasks** with dependencies and agent assignments.\n\nTasks are organized in the kanban board. Ready for agent assignment.`,
    'high', undefined, 'planning'
  )

  await addTimelineEvent(projectId, 'phase_completed', `Planning complete: ${parsedTasks.length} tasks created with dependencies`, 'plan', { tasksCreated: parsedTasks.length })

  return taskIdMap
}

// ─── Phase 3: ASSIGN ─────────────────────────────────────────────────────────

async function phaseAssign(
  projectId: string,
  parsedTasks: ParsedTask[],
  taskIdMap: Record<number, string>,
  bus: AgentCommunicationBus,
  log: OrchestratorLogEntry[]
): Promise<number> {
  log.push({ timestamp: new Date().toISOString(), event: 'phase_assign_started', phase: 'assign' })

  await db.project.update({
    where: { id: projectId },
    data: { orchestratorStatus: 'assigning' },
  })

  await addTimelineEvent(projectId, 'phase_started', 'Assignment phase - matching tasks to specialized agents', 'assign')

  await bus.broadcast('orchestrator', 'status',
    `## 🤝 Phase 3: ASSIGN\n\nMatching tasks to specialized agents based on type and capabilities...\n\nAssigning workloads and sending task instructions to each agent.`,
    'high', undefined, 'assignment'
  )

  let messagesCreated = 0

  // Group tasks by agent type for batch messages
  const tasksByAgent: Record<string, Array<{ taskIndex: number; taskDef: ParsedTask; taskId: string }>> = {}
  for (let i = 0; i < parsedTasks.length; i++) {
    const agentType = parsedTasks[i].agentType || 'developer'
    if (!tasksByAgent[agentType]) tasksByAgent[agentType] = []
    tasksByAgent[agentType].push({ taskIndex: i, taskDef: parsedTasks[i], taskId: taskIdMap[i] })
  }

  // Send assignment messages to each agent type
  for (const [agentType, tasks] of Object.entries(tasksByAgent)) {
    const dbType = AGENT_TYPE_TO_DB_TYPE[agentType] || 'developer'
    const agent = await db.agent.findFirst({ where: { type: dbType, isActive: true } })
    const agentDef = AGENT_TYPES[agentType as AgentTypeKey]

    // Update agent workload
    if (agent) {
      await db.agent.update({
        where: { id: agent.id },
        data: {
          workload: tasks.length,
          currentStatus: 'waiting',
          lastActiveAt: new Date(),
        },
      })
    }

    // Move tasks to 'planned' kanban column
    for (const { taskId } of tasks) {
      await db.task.update({
        where: { id: taskId },
        data: { kanbanColumn: 'planned' },
      })
    }

    const taskList = tasks.map(t => `  - **${t.taskDef.title}** (${t.taskDef.priority} priority, ~${t.taskDef.estimatedHours || '?'}h)`).join('\n')

    const instructionContent = `## Task Assignment for ${agentDef?.name || agentType}

${agentDef?.systemPrompt || ''}

### Assigned Tasks (${tasks.length}):
${taskList}

### Instructions:
Review each task carefully. Tasks with dependencies should only begin after their dependencies are completed. Report progress regularly and flag any blockers immediately.

When you have questions or need clarification, send a message on the communication bus.`

    await bus.sendMessage(
      'orchestrator',
      agent?.id || agentType,
      'instruction',
      instructionContent,
      'high',
      tasks.map(t => t.taskId),
      'assignment'
    )
    messagesCreated++
  }

  log.push({ timestamp: new Date().toISOString(), event: 'phase_assign_completed', phase: 'assign', details: { agentTypesCount: Object.keys(tasksByAgent).length, messagesCreated } })

  await bus.broadcast('orchestrator', 'status',
    `## ✅ Assignment Complete\n\nAll tasks assigned to **${Object.keys(tasksByAgent).length} agent types**.\n\nAgents are ready to begin execution.`,
    'high', undefined, 'assignment'
  )

  await addTimelineEvent(projectId, 'phase_completed', `Assignment complete: tasks distributed across ${Object.keys(tasksByAgent).length} agent types`, 'assign')

  return messagesCreated
}

// ─── Phase 4: EXECUTE ────────────────────────────────────────────────────────

async function phaseExecute(
  projectId: string,
  bus: AgentCommunicationBus,
  log: OrchestratorLogEntry[]
): Promise<void> {
  log.push({ timestamp: new Date().toISOString(), event: 'phase_execute_started', phase: 'execute' })

  await db.project.update({
    where: { id: projectId },
    data: {
      orchestratorStatus: 'running',
      status: 'in_progress',
      startedAt: new Date(),
    },
  })

  await addTimelineEvent(projectId, 'phase_started', 'Execution phase - agents are working on their assigned tasks', 'execute')

  await bus.broadcast('orchestrator', 'status',
    `## ⚡ Phase 4: EXECUTE\n\nAgents are now executing their assigned tasks.\n\nTasks will be processed in dependency order. The system will monitor progress and handle blockers automatically.\n\nUse the Execute button or poll the API to advance task execution step by step.`,
    'high', undefined, 'execution'
  )
}

// ─── Autonomy Features ───────────────────────────────────────────────────────

export async function autoCreateTask(
  projectId: string,
  title: string,
  description: string,
  agentType: AgentTypeKey,
  priority: 'low' | 'medium' | 'high' | 'critical',
  dependencies?: string[],
  bus?: AgentCommunicationBus
): Promise<string | null> {
  try {
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) return null

    const dbType = AGENT_TYPE_TO_DB_TYPE[agentType] || 'developer'
    const agent = await db.agent.findFirst({ where: { type: dbType, isActive: true } })

    const task = await db.task.create({
      data: {
        title,
        description,
        status: 'pending',
        priority,
        type: agentType === 'developer' ? 'development' : agentType === 'qa' ? 'testing' : agentType === 'security' ? 'security' : agentType === 'documentation' ? 'documentation' : 'analysis',
        projectId,
        creatorId: project.userId,
        assigneeId: agent?.id || null,
        agentType,
        kanbanColumn: 'backlog',
        dependencies: dependencies ? JSON.stringify(dependencies) : null,
        metadata: JSON.stringify({ source: 'auto-created', generatedAt: new Date().toISOString() }),
      },
    })

    if (bus) {
      await bus.broadcast('orchestrator', 'status',
        `## 🆕 Auto-Created Task\n\n**${title}** (${agentType}, ${priority})\n\nGap detected and new task created automatically.`,
        'normal', [task.id], 'execution'
      )
    }

    await addTimelineEvent(projectId, 'auto_task_created', `Auto-created task: ${title}`, 'execute', { taskId: task.id, agentType })

    return task.id
  } catch (error) {
    console.error('Auto-create task failed:', error)
    return null
  }
}

export async function autoReassignBlockedTasks(projectId: string, bus?: AgentCommunicationBus): Promise<number> {
  try {
    const blockedTasks = await db.task.findMany({
      where: { projectId, status: 'pending', kanbanColumn: 'blocked' },
    })

    let reassigned = 0
    for (const task of blockedTasks) {
      // Check if dependencies are now completed
      const depIds: string[] = task.dependencies ? JSON.parse(task.dependencies) : []
      if (depIds.length > 0) {
        const completedDeps = await db.task.count({
          where: { id: { in: depIds }, status: 'completed' },
        })
        if (completedDeps === depIds.length) {
          // All deps completed - unblock the task
          await db.task.update({
            where: { id: task.id },
            data: { kanbanColumn: 'planned', status: 'pending' },
          })
          reassigned++
        } else {
          // Try to find an alternative agent that isn't blocked
          const altAgent = await db.agent.findFirst({
            where: { isActive: true, currentStatus: 'idle', type: task.agentType ? AGENT_TYPE_TO_DB_TYPE[task.agentType] : 'developer' },
          })
          if (altAgent && altAgent.id !== task.assigneeId) {
            await db.task.update({
              where: { id: task.id },
              data: { assigneeId: altAgent.id },
            })
            reassigned++
          }
        }
      }
    }

    if (reassigned > 0 && bus) {
      await bus.broadcast('orchestrator', 'status',
        `## 🔄 Auto-Reassignment\n\n${reassigned} blocked tasks have been reassigned or unblocked.`,
        'normal', undefined, 'execution'
      )
    }

    return reassigned
  } catch {
    return 0
  }
}

export async function autoCorrectErrors(projectId: string, bus?: AgentCommunicationBus): Promise<number> {
  try {
    const failedTasks = await db.task.findMany({
      where: { projectId, status: 'failed' },
    })

    let corrected = 0
    for (const task of failedTasks) {
      // Reset failed tasks for retry
      await db.task.update({
        where: { id: task.id },
        data: {
          status: 'pending',
          kanbanColumn: 'planned',
          error: null,
          progress: 0,
        },
      })
      corrected++
    }

    if (corrected > 0 && bus) {
      await bus.broadcast('orchestrator', 'status',
        `## 🔧 Auto-Correction\n\n${corrected} failed tasks have been reset for retry. Agents will re-attempt these tasks.`,
        'high', undefined, 'execution'
      )
      await addTimelineEvent(projectId, 'auto_correction', `${corrected} failed tasks reset for retry`, 'execute', { correctedCount: corrected })
    }

    return corrected
  } catch {
    return 0
  }
}

// ─── Auto-generate documentation ──────────────────────────────────────────────

async function autoGenerateDocumentation(projectId: string): Promise<boolean> {
  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        projectFiles: { select: { name: true, path: true, language: true, size: true, source: true }, orderBy: { path: 'asc' } },
        tasks: { select: { title: true, status: true, type: true, priority: true, description: true, agentType: true }, orderBy: { createdAt: 'asc' } },
        graphNodes: { select: { name: true, type: true, description: true, path: true, language: true }, take: 50 },
      },
    })

    if (!project) return false

    let techStackDisplay = project.techStack || ''
    if (techStackDisplay) {
      try {
        const parsed = JSON.parse(techStackDisplay)
        if (Array.isArray(parsed)) techStackDisplay = parsed.join(', ')
      } catch { /* keep as-is */ }
    }

    const fileList = project.projectFiles.map(f => `  - ${f.path} (${f.language || 'unknown'}, ${f.size} bytes)`).join('\n')
    const taskList = project.tasks.map(t => `  - [${t.status}] ${t.title} (${t.agentType || t.type || 'general'}, ${t.priority})`).join('\n')

    const systemPrompt = `You are the Documentation Agent for the AIOS project. Generate comprehensive project documentation in markdown format.

Generate TWO sections, separated by a special marker:

===README===
Generate a README.md with:
- Project title and description
- Installation instructions (step-by-step, with specific commands)
- Usage guide with examples
- Configuration guide
- API documentation (if applicable)

===DOCUMENTATION===
Generate detailed architecture documentation with:
- Architecture overview
- Component/module descriptions
- Security considerations
- Testing strategy
- Troubleshooting guide

Make it concise, practical, and focused on installation procedures. Use proper markdown formatting.`

    const userMessage = `Generate documentation for this project:

**Project Name:** ${project.name}
**Description:** ${project.description || 'No description provided'}
**Category:** ${project.category || 'General'}
**Tech Stack:** ${techStackDisplay || 'Not specified'}
**Requirements:** ${project.requirements || 'No specific requirements'}

**Project Files (${project.projectFiles.length}):**
${fileList || '  (No files yet)'}

**Tasks (${project.tasks.length}):**
${taskList || '  (No tasks yet)'}

Generate documentation now.`

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    const completion = await chatCompletion({ messages, temperature: 0.5, maxTokens: 4096 })
    const aiResponse = completion.content

    let readme = ''
    let documentation = ''

    const separatorIndex = aiResponse.indexOf('===README===')
    const docSeparatorIndex = aiResponse.indexOf('===DOCUMENTATION===')

    if (separatorIndex !== -1 && docSeparatorIndex !== -1) {
      readme = aiResponse.substring(separatorIndex + '===README==='.length, docSeparatorIndex).trim()
      documentation = aiResponse.substring(docSeparatorIndex + '===DOCUMENTATION==='.length).trim()
    } else {
      documentation = aiResponse
      readme = `# ${project.name}\n\n${project.description || ''}\n\n## Tech Stack\n${techStackDisplay || 'Not specified'}\n\n## Getting Started\nSee the full documentation for installation and usage instructions.\n`
    }

    await db.project.update({
      where: { id: projectId },
      data: { readme, documentation },
    })

    // Save documentation as project files
    try {
      const existingReadme = await db.projectFile.findFirst({ where: { projectId, path: 'README.md' } })
      if (existingReadme) {
        await db.projectFile.update({ where: { id: existingReadme.id }, data: { content: readme, size: Buffer.byteLength(readme, 'utf-8'), source: 'generated', language: 'markdown' } })
      } else {
        await db.projectFile.create({ data: { projectId, name: 'README.md', path: 'README.md', content: readme, language: 'markdown', size: Buffer.byteLength(readme, 'utf-8'), source: 'generated', isDirectory: false } })
      }

      const existingDocs = await db.projectFile.findFirst({ where: { projectId, path: 'docs/ARCHITECTURE.md' } })
      if (existingDocs) {
        await db.projectFile.update({ where: { id: existingDocs.id }, data: { content: documentation, size: Buffer.byteLength(documentation, 'utf-8'), source: 'generated', language: 'markdown' } })
      } else {
        const existingDocsDir = await db.projectFile.findFirst({ where: { projectId, path: 'docs', isDirectory: true } })
        if (!existingDocsDir) {
          await db.projectFile.create({ data: { projectId, name: 'docs', path: 'docs', isDirectory: true, source: 'generated', size: 0 } })
        }
        await db.projectFile.create({ data: { projectId, name: 'ARCHITECTURE.md', path: 'docs/ARCHITECTURE.md', content: documentation, language: 'markdown', size: Buffer.byteLength(documentation, 'utf-8'), source: 'generated', isDirectory: false } })
      }
    } catch (fileError) {
      console.error('Failed to save documentation as project files:', fileError)
    }

    return true
  } catch (error) {
    console.error('Auto-documentation generation failed:', error)
    return false
  }
}

// ─── Main orchestration workflow ──────────────────────────────────────────────

export async function runOrchestration(
  projectId: string,
  options?: { skipDocumentation?: boolean; phase?: string }
): Promise<OrchestrationResult> {
  const log: OrchestratorLogEntry[] = []

  const addLog = (event: string, phase?: string, details?: unknown) => {
    log.push({ timestamp: new Date().toISOString(), event, phase, details })
  }

  try {
    // Step 0: Load project
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return { success: false, orchestratorStatus: 'failed', projectStatus: 'planning', currentPhase: 'analyze', tasksCreated: 0, messagesCreated: 0, agentsCreated: 0, documentationGenerated: false, error: 'Project not found' }
    }

    // Load existing log
    const existingLog: OrchestratorLogEntry[] = (() => {
      try { return JSON.parse(project.orchestratorLog || '[]') } catch { return [] }
    })()

    addLog('orchestration_started', 'analyze', { projectId })

    const bus = new AgentCommunicationBus(projectId)

    // Ensure specialized agents exist
    const agentsCreated = await ensureSpecializedAgents()
    if (agentsCreated > 0) {
      addLog('specialized_agents_created', 'analyze', { count: agentsCreated })
    }

    // ── Phase 1: ANALYZE ──
    const analyzeResult = await phaseAnalyze(projectId, project, bus, log)
    if (!analyzeResult) {
      const fullLog = [...existingLog, ...log]
      await db.project.update({
        where: { id: projectId },
        data: { orchestratorStatus: 'failed', orchestratorLog: JSON.stringify(fullLog) },
      })
      return { success: false, orchestratorStatus: 'failed', projectStatus: project.status, currentPhase: 'analyze', tasksCreated: 0, messagesCreated: 0, agentsCreated: 0, documentationGenerated: false, error: 'Analysis phase failed' }
    }

    const { parsedTasks } = analyzeResult

    // ── Phase 2: PLAN ──
    const taskIdMap = await phasePlan(projectId, parsedTasks, bus, log)

    // ── Phase 3: ASSIGN ──
    const assignMessages = await phaseAssign(projectId, parsedTasks, taskIdMap, bus, log)

    // ── Phase 4: EXECUTE ──
    await phaseExecute(projectId, bus, log)

    // Update log
    const fullLog = [...existingLog, ...log]
    await db.project.update({
      where: { id: projectId },
      data: { orchestratorLog: JSON.stringify(fullLog) },
    })

    // Store analysis result in project memory
    await storeMemory('orchestrator', projectId, 'project', 'analysis', { taskCount: parsedTasks.length, phases: ['analyze', 'plan', 'assign', 'execute'] })

    // Auto-generate documentation in the background (non-blocking)
    if (!options?.skipDocumentation) {
      autoGenerateDocumentation(projectId).catch((docError) => {
        console.error('Auto-documentation failed:', docError)
      })
    }

    return {
      success: true,
      orchestratorStatus: 'running',
      projectStatus: 'in_progress',
      currentPhase: 'execute',
      tasksCreated: parsedTasks.length,
      messagesCreated: assignMessages + 4, // phase messages
      agentsCreated,
      documentationGenerated: false,
    }
  } catch (error) {
    console.error('Orchestration error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    try {
      const project = await db.project.findUnique({ where: { id: projectId } })
      if (project) {
        const existingLog: OrchestratorLogEntry[] = (() => {
          try { return JSON.parse(project.orchestratorLog || '[]') } catch { return [] }
        })()
        log.push({ timestamp: new Date().toISOString(), event: 'orchestration_failed', details: { error: errorMsg } })
        await db.project.update({
          where: { id: projectId },
          data: { orchestratorStatus: 'failed', orchestratorLog: JSON.stringify([...existingLog, ...log]) },
        })
      }
    } catch {
      // Can't update status
    }

    return {
      success: false,
      orchestratorStatus: 'failed',
      projectStatus: 'planning',
      currentPhase: 'analyze',
      tasksCreated: 0,
      messagesCreated: 0,
      agentsCreated: 0,
      documentationGenerated: false,
      error: errorMsg,
    }
  }
}

// ─── Phase check helpers for orchestrate route ───────────────────────────────

export async function checkAndAdvancePhases(projectId: string): Promise<{
  currentPhase: string
  shouldReview: boolean
  shouldDeliver: boolean
  allCompleted: boolean
}> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { tasks: true },
  })

  if (!project) return { currentPhase: 'analyze', shouldReview: false, shouldDeliver: false, allCompleted: false }

  const totalTasks = project.tasks.length
  const completedTasks = project.tasks.filter(t => t.status === 'completed').length
  const inProgressTasks = project.tasks.filter(t => t.status === 'in_progress').length
  const failedTasks = project.tasks.filter(t => t.status === 'failed').length

  // Determine current phase
  let currentPhase = 'execute'
  if (project.orchestratorStatus === 'analyzing') currentPhase = 'analyze'
  else if (project.orchestratorStatus === 'assigning') currentPhase = 'assign'
  else if (project.orchestratorStatus === 'running') currentPhase = 'execute'
  else if (project.orchestratorStatus === 'completed') currentPhase = 'deliver'

  // Check if we should move to review phase
  const shouldReview = completedTasks >= Math.ceil(totalTasks * 0.8) && project.orchestratorStatus === 'running'

  // Check if all tasks are completed
  const allCompleted = totalTasks > 0 && completedTasks === totalTasks && inProgressTasks === 0

  // Check if we should deliver
  const shouldDeliver = allCompleted && project.orchestratorStatus === 'running'

  // Auto-correct errors if there are failed tasks
  if (failedTasks > 0) {
    const bus = new AgentCommunicationBus(projectId)
    await autoCorrectErrors(projectId, bus)
  }

  // Auto-reassign blocked tasks
  if (project.orchestratorStatus === 'running') {
    const bus = new AgentCommunicationBus(projectId)
    await autoReassignBlockedTasks(projectId, bus)
  }

  return { currentPhase, shouldReview, shouldDeliver, allCompleted }
}

// ─── Get orchestration status ─────────────────────────────────────────────────

export async function getOrchestrationStatus(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        select: { id: true, title: true, status: true, type: true, priority: true, assigneeId: true, kanbanColumn: true, agentType: true, progress: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!project) return null

  const bus = new AgentCommunicationBus(projectId)
  const agentActivity = await bus.getAgentActivity(projectId)
  const phaseStatus = await checkAndAdvancePhases(projectId)

  // Parse orchestrator log
  let log: unknown[] = []
  try { log = JSON.parse(project.orchestratorLog || '[]') } catch { log = [] }

  // Calculate progress
  const total = project.tasks.length
  const completed = project.tasks.filter(t => t.status === 'completed').length
  const inProgress = project.tasks.filter(t => t.status === 'in_progress').length
  const pending = project.tasks.filter(t => t.status === 'pending').length
  const failed = project.tasks.filter(t => t.status === 'failed').length

  return {
    projectId: project.id,
    projectName: project.name,
    projectStatus: project.status,
    orchestratorStatus: project.orchestratorStatus || 'idle',
    currentPhase: phaseStatus.currentPhase,
    orchestratorLog: log,
    agentActivity,
    phaseStatus,
    taskProgress: {
      total,
      completed,
      inProgress,
      pending,
      failed,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  }
}

// ─── Default Agents (backward compat) ────────────────────────────────────────

const DEFAULT_AGENTS = [
  { name: 'Code Architect', type: 'planning', description: 'Analyzes project requirements, designs system architecture, and creates technical specifications.', avatar: '🏗️', capabilities: ['architecture', 'system-design', 'technical-specs', 'code-review'] },
  { name: 'Frontend Developer', type: 'developer', description: 'Implements user interfaces, client-side logic, and frontend components.', avatar: '🎨', capabilities: ['react', 'typescript', 'css', 'ui-ux', 'responsive-design'] },
  { name: 'Backend Developer', type: 'developer', description: 'Builds server-side APIs, database schemas, and backend services.', avatar: '⚙️', capabilities: ['nodejs', 'api-design', 'databases', 'authentication', 'server-logic'] },
  { name: 'QA Engineer', type: 'debugger', description: 'Tests application functionality, identifies bugs, and ensures code quality.', avatar: '🔍', capabilities: ['testing', 'bug-detection', 'quality-assurance', 'test-cases', 'regression-testing'] },
  { name: 'Documentation Writer', type: 'document', description: 'Creates comprehensive project documentation including README files, API docs, architecture guides.', avatar: '📝', capabilities: ['technical-writing', 'readme', 'api-docs', 'architecture-docs', 'tutorials'] },
  { name: 'Security Analyst', type: 'security', description: 'Reviews code for security vulnerabilities, ensures best practices for authentication and data protection.', avatar: '🛡️', capabilities: ['security-audit', 'vulnerability-scanning', 'authentication', 'data-protection', 'compliance'] },
]

export async function ensureDefaultAgents(): Promise<number> {
  const existingCount = await db.agent.count()
  if (existingCount > 0) return 0

  let created = 0
  for (const agentDef of DEFAULT_AGENTS) {
    await db.agent.create({
      data: {
        name: agentDef.name,
        type: agentDef.type,
        description: agentDef.description,
        avatar: agentDef.avatar,
        capabilities: JSON.stringify(agentDef.capabilities),
        isActive: true,
        isDefault: true,
        systemPrompt: `You are ${agentDef.name}, an AI agent specialized in ${agentDef.type}. ${agentDef.description}`,
        agentRole: 'specialist',
        currentStatus: 'idle',
      },
    })
    created++
  }
  return created
}
