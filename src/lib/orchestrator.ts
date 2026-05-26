/**
 * AIOS Orchestrator Engine
 *
 * The core component that makes projects actually work:
 * - Generates tasks from project requirements via AI
 * - Assigns each task to the appropriate agent based on task type
 * - Simulates realistic agent discussions about the project
 * - Simulates agent work with progress updates
 * - Tracks orchestrator status through each stage
 * - Persists agent instructions and discussions to the database
 * - Generates project documentation after orchestration completes
 */

import { db } from '@/lib/db'
import { chatCompletion, type ChatMessage } from '@/lib/providers'
import { getDefaultUserId } from '@/lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskDefinition {
  title: string
  description: string
  priority: string
  type: string
}

export interface OrchestrationPlan {
  projectId: string
  projectName: string
  status: string
  tasksCreated: number
  assignments: TaskAssignment[]
  discussion?: AgentDiscussionMessage[]
}

export interface TaskAssignment {
  taskId: string
  taskTitle: string
  taskType: string
  taskPriority: string
  agentId: string | null
  agentName: string | null
  agentType: string | null
}

export interface AgentDiscussionMessage {
  agentId: string
  agentName: string
  agentType: string
  content: string
  timestamp: string
}

export interface AgentWorkProgress {
  taskId: string
  agentId: string
  agentName: string
  progress: number
  status: string
  update: string
  timestamp: string
}

// ─── Task Type → Agent Type Mapping ──────────────────────────────────────────

const TASK_TYPE_TO_AGENT_TYPE: Record<string, string> = {
  development: 'developer',
  research: 'research',
  analysis: 'reasoning',
  testing: 'developer',    // developer with QA focus
  deployment: 'system',
  automation: 'workflow',
  design: 'developer',
  security: 'security',
  // Default fallback for unknown types
}

const DEFAULT_AGENT_TYPE = 'coordinator'

// ─── Agent Role System Prompts ───────────────────────────────────────────────

const AGENT_ROLE_PROMPTS: Record<string, string> = {
  coordinator: `You are the Coordinator Agent, the central orchestrator of the AIOS platform. You oversee task distribution, ensure all agents are working in sync, and resolve any conflicts or blockers. You think strategically about project execution and keep the big picture in mind. You communicate concisely and decisively.`,
  developer: `You are the Developer Agent, responsible for writing code, implementing features, fixing bugs, and performing code reviews. You think in terms of architecture, patterns, and clean code. You discuss technical trade-offs and propose concrete solutions. You are pragmatic and detail-oriented.`,
  security: `You are the Security Agent, focused on identifying vulnerabilities, ensuring secure coding practices, performing threat modeling, and reviewing access controls. You think adversarially and always consider the worst-case scenario. You raise security concerns proactively and suggest mitigations.`,
  memory: `You are the Memory Agent, responsible for managing the knowledge base, indexing information, retrieving relevant context, and ensuring nothing important is forgotten. You think in terms of knowledge graphs, semantic relationships, and information persistence.`,
  research: `You are the Research Agent, skilled at finding information, analyzing documentation, comparing technologies, and synthesizing findings. You think critically about sources, consider multiple perspectives, and present balanced recommendations backed by evidence.`,
  system: `You are the System Agent, responsible for infrastructure, deployment, monitoring, and system-level operations. You think in terms of reliability, scalability, and operational excellence. You discuss servers, containers, CI/CD, and system architecture.`,
  monitoring: `You are the Monitoring Agent, keeping watch over system health, performance metrics, error rates, and anomaly detection. You think in terms of observability, alerting, and incident response. You report on system status and flag issues early.`,
  workflow: `You are the Workflow Agent, specializing in automation, process optimization, and pipeline orchestration. You think in terms of efficiency, repeatable processes, and eliminating manual toil. You design and implement automated workflows.`,
  voice: `You are the Voice Agent, handling speech recognition, text-to-speech, voice commands, and audio processing. You think in terms of audio quality, natural language understanding, and voice user interfaces.`,
  vision: `You are the Vision Agent, processing images, analyzing visual content, and handling computer vision tasks. You think in terms of visual patterns, image processing pipelines, and multimodal understanding.`,
  document: `You are the Document Agent, managing documentation, generating reports, formatting content, and maintaining knowledge bases. You think in terms of clarity, completeness, and accessibility of information.`,
  mcp: `You are the MCP (Model Context Protocol) Agent, managing external tool integrations, server connections, and protocol communications. You think in terms of interoperability, API design, and tool orchestration.`,
  reasoning: `You are the Reasoning Agent, skilled at logical analysis, problem decomposition, causal inference, and decision-making support. You think step-by-step, consider edge cases, and provide well-reasoned conclusions.`,
  planning: `You are the Planning Agent, responsible for project roadmaps, milestone definition, dependency analysis, and resource allocation. You think in terms of timelines, critical paths, and strategic priorities.`,
}

// ─── Helper: Extract JSON from AI response ───────────────────────────────────

function extractJsonFromResponse(text: string): string {
  // Try markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Try to find a JSON array
  const firstBracket = text.indexOf('[')
  const lastBracket = text.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    return text.substring(firstBracket, lastBracket + 1)
  }

  return text.trim()
}

// ─── Helper: Generate AI instruction for an agent-task pair ──────────────────

async function generateAgentInstruction(
  agentType: string,
  agentName: string,
  taskTitle: string,
  taskDescription: string,
  taskType: string,
  projectName: string
): Promise<string> {
  const rolePrompt = AGENT_ROLE_PROMPTS[agentType] || AGENT_ROLE_PROMPTS[DEFAULT_AGENT_TYPE]

  const systemPrompt = `${rolePrompt}

You are generating a specific instruction (consigne) for ${agentName} to work on a task. Write a clear, actionable instruction that this agent should follow to complete their assigned task. Focus on what the agent should do based on their specific role and expertise.

Return ONLY the instruction text, no preamble, no markdown formatting. Keep it to 2-4 sentences.`

  const userMessage = `Project: ${projectName}
Task: ${taskTitle}
Task Description: ${taskDescription}
Task Type: ${taskType}
Assigned Agent: ${agentName} (${agentType})

Generate a specific instruction for this agent to follow when working on this task.`

  try {
    const completion = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.6,
      maxTokens: 200,
    })
    return completion.content.trim()
  } catch (error) {
    console.error('Failed to generate agent instruction via AI:', error)
    // Fallback: generate a simple instruction based on role
    return `As ${agentName}, complete the "${taskTitle}" task. Focus on ${agentType}-specific aspects and ensure quality deliverables.`
  }
}

// ─── Ensure Default Agents Exist ─────────────────────────────────────────────

export async function ensureDefaultAgents(): Promise<void> {
  const agentTypes = [
    { type: 'coordinator', name: 'Coordinator Agent', avatar: '🎯', description: 'Central orchestrator that oversees task distribution and ensures all agents work in sync.' },
    { type: 'developer', name: 'Developer Agent', avatar: '💻', description: 'Writes code, implements features, fixes bugs, and performs code reviews.' },
    { type: 'security', name: 'Security Agent', avatar: '🔒', description: 'Identifies vulnerabilities, ensures secure coding practices, and performs threat modeling.' },
    { type: 'memory', name: 'Memory Agent', avatar: '🧠', description: 'Manages the knowledge base, indexes information, and retrieves relevant context.' },
    { type: 'research', name: 'Research Agent', avatar: '🔍', description: 'Finds information, analyzes documentation, compares technologies, and synthesizes findings.' },
    { type: 'system', name: 'System Agent', avatar: '⚙️', description: 'Manages infrastructure, deployment, monitoring, and system-level operations.' },
    { type: 'monitoring', name: 'Monitoring Agent', avatar: '📊', description: 'Monitors system health, performance metrics, and anomaly detection.' },
    { type: 'workflow', name: 'Workflow Agent', avatar: '🔄', description: 'Specializes in automation, process optimization, and pipeline orchestration.' },
    { type: 'voice', name: 'Voice Agent', avatar: '🎙️', description: 'Handles speech recognition, text-to-speech, and voice commands.' },
    { type: 'vision', name: 'Vision Agent', avatar: '👁️', description: 'Processes images, analyzes visual content, and handles computer vision tasks.' },
    { type: 'document', name: 'Document Agent', avatar: '📄', description: 'Manages documentation, generates reports, and maintains knowledge bases.' },
    { type: 'mcp', name: 'MCP Agent', avatar: '🔌', description: 'Manages external tool integrations and protocol communications.' },
    { type: 'reasoning', name: 'Reasoning Agent', avatar: '🤔', description: 'Performs logical analysis, problem decomposition, and decision-making support.' },
    { type: 'planning', name: 'Planning Agent', avatar: '📋', description: 'Creates project roadmaps, defines milestones, and analyzes dependencies.' },
  ]

  for (const agentDef of agentTypes) {
    const existing = await db.agent.findFirst({
      where: { type: agentDef.type, isDefault: true },
    })

    if (!existing) {
      await db.agent.create({
        data: {
          name: agentDef.name,
          type: agentDef.type,
          avatar: agentDef.avatar,
          description: agentDef.description,
          systemPrompt: AGENT_ROLE_PROMPTS[agentDef.type] || `You are the ${agentDef.name}.`,
          capabilities: JSON.stringify([agentDef.type]),
          isDefault: true,
          isActive: true,
        },
      })
    }
  }
}

// ─── Assign Task to Agent ────────────────────────────────────────────────────

export async function assignTaskToAgent(taskType: string): Promise<{
  agentId: string | null
  agentName: string | null
  agentType: string | null
}> {
  // Determine the agent type for this task
  const agentType = TASK_TYPE_TO_AGENT_TYPE[taskType] || DEFAULT_AGENT_TYPE

  // Look up an active agent of the right type
  const agent = await db.agent.findFirst({
    where: {
      type: agentType,
      isActive: true,
    },
    orderBy: { createdAt: 'asc' }, // Prefer older (more established) agents
  })

  if (agent) {
    return {
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type,
    }
  }

  // Fallback: try coordinator
  if (agentType !== DEFAULT_AGENT_TYPE) {
    const coordinator = await db.agent.findFirst({
      where: {
        type: DEFAULT_AGENT_TYPE,
        isActive: true,
      },
    })

    if (coordinator) {
      return {
        agentId: coordinator.id,
        agentName: coordinator.name,
        agentType: coordinator.type,
      }
    }
  }

  // No agent found at all
  return {
    agentId: null,
    agentName: null,
    agentType: null,
  }
}

// ─── Generate Tasks via AI (Enhanced) ────────────────────────────────────────

async function generateProjectTasks(
  projectId: string,
  project: {
    name: string
    description: string | null
    category: string | null
    techStack: string | null
    requirements: string | null
    notes: string | null
    priority: string
  }
): Promise<TaskDefinition[]> {
  const systemPrompt = `You are an AI project orchestrator. Given a project description, generate a detailed task breakdown.

Analyze the project and return a JSON array of tasks. Each task should have:
- title: string (concise task title, max 80 characters)
- description: string (detailed description of what needs to be done, 2-4 sentences)
- priority: "low" | "medium" | "high" | "critical"
- type: "development" | "research" | "analysis" | "automation" | "design" | "testing" | "deployment" | "security"

Important rules:
1. Cover all phases: planning, development, testing, deployment
2. Include at least one security review task
3. Include at least one testing task
4. Assign realistic priorities (not everything is critical)
5. Make tasks actionable and specific to the project
6. Return ONLY the JSON array, no markdown, no explanation

Example:
[{"title":"Set up project structure","description":"Initialize the project with the appropriate folder structure, configuration files, and dependency management.","priority":"high","type":"development"}]`

  // Build user message with all project details
  let techStackDisplay = project.techStack || ''
  if (techStackDisplay) {
    try {
      const parsed = JSON.parse(techStackDisplay)
      if (Array.isArray(parsed)) {
        techStackDisplay = parsed.join(', ')
      }
    } catch {
      // Keep as-is
    }
  }

  const userMessage = `Please analyze the following project and generate a comprehensive, actionable task breakdown:

**Project Name:** ${project.name}
${project.description ? `**Description:** ${project.description}` : ''}
${project.category ? `**Category:** ${project.category}` : ''}
${techStackDisplay ? `**Tech Stack:** ${techStackDisplay}` : ''}
${project.requirements ? `**Requirements:** ${project.requirements}` : ''}
${project.notes ? `**Notes:** ${project.notes}` : ''}
${project.priority ? `**Priority:** ${project.priority}` : ''}

Generate a detailed task breakdown covering all phases from planning to deployment, including security and testing.`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]

  try {
    const completion = await chatCompletion({ messages })
    const jsonStr = extractJsonFromResponse(completion.content)
    const parsed = JSON.parse(jsonStr)

    if (!Array.isArray(parsed)) {
      throw new Error('AI response is not a JSON array')
    }

    return parsed.map((t: Record<string, unknown>) => ({
      title: String(t.title || 'Untitled Task'),
      description: String(t.description || ''),
      priority: String(t.priority || 'medium'),
      type: String(t.type || 'development'),
    }))
  } catch (error) {
    console.error('Failed to generate tasks via AI:', error)
    // Return a basic set of tasks as fallback
    return [
      {
        title: `Plan ${project.name} architecture`,
        description: `Define the overall architecture, tech stack, and component structure for the ${project.name} project.`,
        priority: 'high',
        type: 'planning',
      },
      {
        title: `Implement core features for ${project.name}`,
        description: `Develop the main functionality described in the project requirements.`,
        priority: 'high',
        type: 'development',
      },
      {
        title: `Security review for ${project.name}`,
        description: `Review the implementation for security vulnerabilities and ensure best practices are followed.`,
        priority: 'medium',
        type: 'security',
      },
      {
        title: `Write tests for ${project.name}`,
        description: `Create unit and integration tests to validate the project functionality.`,
        priority: 'medium',
        type: 'testing',
      },
      {
        title: `Deploy ${project.name}`,
        description: `Set up deployment pipeline and deploy the project to the target environment.`,
        priority: 'medium',
        type: 'deployment',
      },
    ]
  }
}

// ─── Main: Orchestrate Project ───────────────────────────────────────────────

export async function orchestrateProject(projectId: string): Promise<OrchestrationPlan> {
  // Set status to analyzing at the start
  await db.project.update({
    where: { id: projectId },
    data: {
      orchestratorStatus: 'analyzing',
      orchestratorStartedAt: new Date(),
    },
  })

  try {
    // 1. Fetch project
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignee: {
              select: { id: true, name: true, type: true, avatar: true },
            },
          },
        },
      },
    })

    if (!project) {
      await db.project.update({
        where: { id: projectId },
        data: { orchestratorStatus: 'failed' },
      })
      throw new Error(`Project not found: ${projectId}`)
    }

    // 2. Ensure default agents exist
    await ensureDefaultAgents()

    // 3. Generate tasks using AI
    const taskDefinitions = await generateProjectTasks(projectId, project)

    // After tasks generated: status = assigning
    await db.project.update({
      where: { id: projectId },
      data: { orchestratorStatus: 'assigning' },
    })

    // 4. Get userId for task creation
    const userId = await getDefaultUserId()

    // 5. Create tasks and assign to agents
    const assignments: TaskAssignment[] = []

    for (const taskDef of taskDefinitions) {
      // Create the task
      const task = await db.task.create({
        data: {
          title: taskDef.title,
          description: taskDef.description,
          status: 'pending',
          priority: taskDef.priority || 'medium',
          type: taskDef.type || 'development',
          projectId,
          creatorId: userId,
          metadata: JSON.stringify({
            source: 'orchestration',
            generatedAt: new Date().toISOString(),
          }),
        },
      })

      // Assign to the appropriate agent
      const agentAssignment = await assignTaskToAgent(taskDef.type)

      if (agentAssignment.agentId) {
        await db.task.update({
          where: { id: task.id },
          data: { assigneeId: agentAssignment.agentId },
        })
      }

      assignments.push({
        taskId: task.id,
        taskTitle: taskDef.title,
        taskType: taskDef.type,
        taskPriority: taskDef.priority,
        agentId: agentAssignment.agentId,
        agentName: agentAssignment.agentName,
        agentType: agentAssignment.agentType,
      })
    }

    // After agents assigned: status = discussing
    await db.project.update({
      where: { id: projectId },
      data: { orchestratorStatus: 'discussing' },
    })

    // 6. Generate agent instructions as AgentActivity records
    for (const assignment of assignments) {
      if (assignment.agentId && assignment.agentName && assignment.agentType) {
        try {
          const instructionText = await generateAgentInstruction(
            assignment.agentType,
            assignment.agentName,
            assignment.taskTitle,
            taskDefinitions.find((t) => t.title === assignment.taskTitle)?.description || '',
            assignment.taskType,
            project.name
          )

          await db.agentActivity.create({
            data: {
              agentId: assignment.agentId,
              agentName: assignment.agentName,
              agentType: assignment.agentType,
              projectId,
              taskId: assignment.taskId,
              action: `Instruction: ${instructionText}`,
              type: 'instruction',
              status: 'active',
              metadata: JSON.stringify({
                taskTitle: assignment.taskTitle,
                taskType: assignment.taskType,
                instruction: instructionText,
              }),
            },
          })
        } catch (error) {
          console.error(`Failed to create instruction activity for task ${assignment.taskId}:`, error)
          // Non-fatal: continue without instruction
        }
      }
    }

    // 7. Generate agent discussion (now persists to DB internally)
    let discussion: AgentDiscussionMessage[] | undefined
    try {
      discussion = await generateAgentDiscussion(projectId, assignments)
    } catch (error) {
      console.error('Failed to generate agent discussion:', error)
      // Non-fatal: continue without discussion
    }

    // After discussion generated: status = working
    await db.project.update({
      where: { id: projectId },
      data: {
        orchestratorStatus: 'working',
        status: 'in_progress',
        startedAt: new Date(),
      },
    })

    // 8. Fire-and-forget: generate project documentation
    generateProjectDocumentation(projectId).catch((err) => {
      console.error(`Documentation generation failed for project ${projectId}:`, err)
    })

    // On completion: status = completed
    await db.project.update({
      where: { id: projectId },
      data: {
        orchestratorStatus: 'completed',
        orchestratorCompletedAt: new Date(),
      },
    })

    return {
      projectId,
      projectName: project.name,
      status: 'in_progress',
      tasksCreated: assignments.length,
      assignments,
      discussion,
    }
  } catch (error) {
    // On error: status = failed
    await db.project.update({
      where: { id: projectId },
      data: { orchestratorStatus: 'failed' },
    }).catch(() => {
      // Ignore update errors during error handling
    })
    throw error
  }
}

// ─── Generate Agent Discussion ───────────────────────────────────────────────

export async function generateAgentDiscussion(
  projectId: string,
  taskAssignments: TaskAssignment[]
): Promise<AgentDiscussionMessage[]> {
  if (taskAssignments.length === 0) {
    return []
  }

  // Collect unique agents from assignments
  const agentMap = new Map<string, { id: string; name: string; type: string }>()
  for (const assignment of taskAssignments) {
    if (assignment.agentId && !agentMap.has(assignment.agentId)) {
      agentMap.set(assignment.agentId, {
        id: assignment.agentId,
        name: assignment.agentName || 'Unknown Agent',
        type: assignment.agentType || 'coordinator',
      })
    }
  }

  const agents = Array.from(agentMap.values())
  if (agents.length === 0) {
    return []
  }

  // Get project info for context
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { name: true, description: true, requirements: true },
  })

  // Build the discussion prompt
  const taskSummary = taskAssignments
    .map((a, i) => `${i + 1}. [${a.taskType}/${a.taskPriority}] ${a.taskTitle} → ${a.agentName || 'Unassigned'}`)
    .join('\n')

  const agentList = agents
    .map((a) => `${a.name} (${a.type})`)
    .join(', ')

  const discussionMessages: AgentDiscussionMessage[] = []

  // Each agent contributes one message in a round-robin discussion
  for (let round = 0; round < 2; round++) {
    for (const agent of agents) {
      const rolePrompt = AGENT_ROLE_PROMPTS[agent.type] || AGENT_ROLE_PROMPTS[DEFAULT_AGENT_TYPE]

      const previousMessages = discussionMessages
        .map((m) => `${m.agentName}: ${m.content}`)
        .join('\n\n')

      const systemPrompt = `${rolePrompt}

You are participating in a team discussion about a project. Stay in character and provide your perspective based on your role.

Project: ${project?.name || 'Unknown'}
${project?.description ? `Description: ${project.description}` : ''}
${project?.requirements ? `Requirements: ${project.requirements}` : ''}

Task Assignments:
${taskSummary}

Other Agents in Discussion: ${agentList}

${previousMessages ? `Previous Discussion:\n${previousMessages}\n\nRespond to the discussion above from your perspective as ${agent.name}.` : `Start the discussion by introducing your perspective on this project as ${agent.name}.`}

Important: Keep your response to 2-4 sentences. Be specific and actionable. Do not repeat what others have said.`

      let messageContent: string

      try {
        const completion = await chatCompletion({
          messages: [{ role: 'system', content: systemPrompt }],
          temperature: 0.8,
          maxTokens: 300,
        })

        messageContent = completion.content.trim()
      } catch (error) {
        console.error(`Failed to generate discussion for agent ${agent.name}:`, error)
        messageContent = `I'm ready to contribute to this project with my ${agent.type} capabilities.`
      }

      const timestamp = new Date().toISOString()

      const msg: AgentDiscussionMessage = {
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
        content: messageContent,
        timestamp,
      }

      discussionMessages.push(msg)

      // Persist each message to the database as it's generated
      try {
        await db.agentDiscussion.create({
          data: {
            projectId,
            agentId: agent.id,
            agentName: agent.name,
            agentType: agent.type,
            content: messageContent,
            round: round + 1,
            type: 'discussion',
          },
        })
      } catch (dbError) {
        console.error(`Failed to persist discussion message for agent ${agent.name}:`, dbError)
        // Non-fatal: the in-memory message is still returned
      }
    }
  }

  return discussionMessages
}

// ─── Simulate Agent Work ─────────────────────────────────────────────────────

export async function simulateAgentWork(
  taskId: string,
  agentId: string
): Promise<AgentWorkProgress[]> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true, type: true } },
      project: { select: { name: true } },
    },
  })

  if (!task) {
    throw new Error(`Task not found: ${taskId}`)
  }

  const agent = task.assignee
  if (!agent) {
    throw new Error(`No agent assigned to task: ${taskId}`)
  }

  const rolePrompt = AGENT_ROLE_PROMPTS[agent.type] || AGENT_ROLE_PROMPTS[DEFAULT_AGENT_TYPE]
  const progressUpdates: AgentWorkProgress[] = []

  // Simulate progress at 25%, 50%, 75%, 100%
  const progressStages = [
    { progress: 25, label: 'Starting work' },
    { progress: 50, label: 'Making progress' },
    { progress: 75, label: 'Near completion' },
    { progress: 100, label: 'Completed' },
  ]

  for (const stage of progressStages) {
    const status = stage.progress === 100 ? 'completed' : 'in_progress'

    const systemPrompt = `${rolePrompt}

You are ${agent.name} working on the following task:

Task: ${task.title}
Description: ${task.description || 'No description'}
Project: ${task.project?.name || 'Unknown'}
Current Progress: ${stage.progress}%
Status: ${stage.label}

Generate a brief status update (1-2 sentences) about your progress on this task. Be specific about what you've accomplished so far and what's next. Stay in character as a ${agent.type} agent.`

    try {
      const completion = await chatCompletion({
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.6,
        maxTokens: 150,
      })

      progressUpdates.push({
        taskId,
        agentId: agent.id,
        agentName: agent.name,
        progress: stage.progress,
        status,
        update: completion.content.trim(),
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error(`Failed to generate work progress for task ${taskId}:`, error)
      progressUpdates.push({
        taskId,
        agentId: agent.id,
        agentName: agent.name,
        progress: stage.progress,
        status,
        update: `${stage.label} on "${task.title}"`,
        timestamp: new Date().toISOString(),
      })
    }

    // Update the task progress in the database
    await db.task.update({
      where: { id: taskId },
      data: {
        progress: stage.progress,
        status,
        ...(stage.progress === 100
          ? { completedAt: new Date(), result: `Task completed by ${agent.name}` }
          : {}),
        ...(stage.progress === 25 ? { startedAt: new Date() } : {}),
      },
    })
  }

  return progressUpdates
}

// ─── Get Orchestration Status ────────────────────────────────────────────────

export async function getOrchestrationStatus(projectId: string): Promise<{
  projectStatus: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  pendingTasks: number
  agentUtilization: Record<string, { agentName: string; taskCount: number; completedCount: number }>
}> {
  const tasks = await db.task.findMany({
    where: { projectId },
    include: {
      assignee: { select: { id: true, name: true, type: true } },
    },
  })

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length

  // Agent utilization
  const agentUtilization: Record<string, { agentName: string; taskCount: number; completedCount: number }> = {}
  for (const task of tasks) {
    if (task.assignee) {
      const key = task.assignee.id
      if (!agentUtilization[key]) {
        agentUtilization[key] = {
          agentName: task.assignee.name,
          taskCount: 0,
          completedCount: 0,
        }
      }
      agentUtilization[key].taskCount++
      if (task.status === 'completed') {
        agentUtilization[key].completedCount++
      }
    }
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { status: true },
  })

  return {
    projectStatus: project?.status || 'unknown',
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    agentUtilization,
  }
}

// ─── Generate Project Documentation ─────────────────────────────────────────

export async function generateProjectDocumentation(projectId: string): Promise<{
  files: Array<{ path: string; filename: string }>
}> {
  // 1. Fetch the project with all tasks and discussions
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        orderBy: { createdAt: 'asc' },
        include: {
          assignee: {
            select: { id: true, name: true, type: true, avatar: true },
          },
        },
      },
      discussions: {
        orderBy: { createdAt: 'asc' },
      },
      activities: {
        where: { type: 'instruction' },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!project) {
    throw new Error(`Project not found: ${projectId}`)
  }

  // 2. Build context for AI documentation generation
  const tasksSummary = project.tasks
    .map((t, i) => `${i + 1}. [${t.type}/${t.priority}] ${t.title} - ${t.status}${t.assignee ? ` (assigned to ${t.assignee.name})` : ''}`)
    .join('\n')

  const discussionsSummary = project.discussions
    .map((d) => `${d.agentName} (${d.agentType}): ${d.content}`)
    .join('\n')

  const instructionsSummary = project.activities
    .map((a) => `${a.agentName}: ${a.action}`)
    .join('\n')

  let techStackDisplay = project.techStack || ''
  if (techStackDisplay) {
    try {
      const parsed = JSON.parse(techStackDisplay)
      if (Array.isArray(parsed)) {
        techStackDisplay = parsed.join(', ')
      }
    } catch {
      // Keep as-is
    }
  }

  // 3. Generate each documentation file via AI
  const docFiles: Array<{ path: string; filename: string; content: string }> = []

  // Helper to generate a single doc
  async function generateDoc(
    filename: string,
    filePath: string,
    docType: string,
    additionalContext: string
  ): Promise<void> {
    const systemPrompt = `You are a technical documentation writer. Generate comprehensive, professional ${docType} documentation for a software project. Use markdown formatting. Be thorough but concise. Include code examples where appropriate. Do NOT wrap the output in markdown code blocks.`

    const userMessage = `Generate ${docType} documentation for the following project:

**Project Name:** ${project.name}
${project.description ? `**Description:** ${project.description}` : ''}
${project.category ? `**Category:** ${project.category}` : ''}
${techStackDisplay ? `**Tech Stack:** ${techStackDisplay}` : ''}
${project.requirements ? `**Requirements:** ${project.requirements}` : ''}

**Tasks & Assignments:**
${tasksSummary || 'No tasks defined yet.'}

**Agent Instructions:**
${instructionsSummary || 'No instructions generated yet.'}

**Team Discussion Summary:**
${discussionsSummary || 'No discussions yet.'}

${additionalContext}`

    try {
      const completion = await chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
        maxTokens: 2000,
      })

      const content = completion.content.trim()

      docFiles.push({ path: filePath, filename, content })
    } catch (error) {
      console.error(`Failed to generate ${docType} documentation:`, error)
      docFiles.push({
        path: filePath,
        filename,
        content: `# ${docType}\n\nDocumentation generation is pending. Please check back later.`,
      })
    }
  }

  // Generate all 5 documentation files
  await generateDoc(
    'README.md',
    'README.md',
    'README',
    `Include: project overview, features list, quick start guide, tech stack summary, project structure overview, and links to other documentation files.`
  )

  await generateDoc(
    'ARCHITECTURE.md',
    'docs/ARCHITECTURE.md',
    'Architecture Overview',
    `Include: system architecture diagram description, component breakdown, data flow, design decisions and trade-offs, scalability considerations.`
  )

  await generateDoc(
    'API.md',
    'docs/API.md',
    'API Documentation',
    `Include: API endpoints overview, request/response formats, authentication, error handling, example requests and responses, rate limiting considerations.`
  )

  await generateDoc(
    'INSTALLATION.md',
    'docs/INSTALLATION.md',
    'Installation Guide',
    `Include: prerequisites, environment setup, dependency installation, configuration, environment variables, database setup, running in development and production modes.`
  )

  await generateDoc(
    'DEPLOYMENT.md',
    'docs/DEPLOYMENT.md',
    'Deployment Guide',
    `Include: deployment options, CI/CD pipeline setup, environment configuration, monitoring setup, rollback procedures, scaling considerations.`
  )

  // 4. Create ProjectFile records for each doc
  for (const doc of docFiles) {
    try {
      await db.projectFile.create({
        data: {
          projectId,
          filename: doc.filename,
          path: doc.path,
          content: doc.content,
          mimeType: 'text/markdown',
          size: Buffer.byteLength(doc.content, 'utf-8'),
          encoding: 'utf-8',
          source: 'orchestrator',
        },
      })
    } catch (error) {
      console.error(`Failed to save doc file ${doc.path}:`, error)
      // Non-fatal: continue with other files
    }
  }

  // 5. Create a documentation task assigned to the Document Agent
  try {
    const userId = await getDefaultUserId()
    const docAgent = await db.agent.findFirst({
      where: { type: 'document', isActive: true },
    })

    if (docAgent) {
      await db.task.create({
        data: {
          title: 'Generate project documentation',
          description: `Create comprehensive documentation including README.md, Architecture overview, API documentation, Installation guide, and Deployment guide for ${project.name}.`,
          status: 'completed',
          priority: 'medium',
          type: 'development',
          projectId,
          creatorId: userId,
          assigneeId: docAgent.id,
          progress: 100,
          startedAt: new Date(),
          completedAt: new Date(),
          result: `Documentation generated: ${docFiles.map((d) => d.path).join(', ')}`,
          metadata: JSON.stringify({
            source: 'orchestration',
            generatedAt: new Date().toISOString(),
            isDocumentation: true,
            files: docFiles.map((d) => d.path),
          }),
        },
      })
    }
  } catch (error) {
    console.error('Failed to create documentation task:', error)
    // Non-fatal
  }

  return {
    files: docFiles.map((d) => ({ path: d.path, filename: d.filename })),
  }
}
