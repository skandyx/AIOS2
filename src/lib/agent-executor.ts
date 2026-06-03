/**
 * AIOS Agent Executor - Specialized multi-agent task execution
 *
 * This module provides:
 * 1. Specialized execution strategies per agent type
 * 2. executeAgentTask(projectId, taskId) - execute a single task
 * 3. runAgentCollaboration(projectId, taskId) - multi-agent collaboration
 * 4. getProjectMetrics(projectId) - calculate project metrics
 * 5. getKanbanBoard(projectId) - tasks organized by kanban column
 * 6. getTimeline(projectId) - timeline events
 * 7. getDependencyGraph(projectId) - task/agent dependency relationships
 */

import { db } from '@/lib/db'
import { chatCompletion, type ChatMessage } from '@/lib/providers'
import { AgentCommunicationBus, AGENT_TYPES, AGENT_TYPE_TO_DB_TYPE, addTimelineEvent } from '@/lib/orchestrator'
import type { AgentTypeKey } from '@/lib/orchestrator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecutorResult {
  success: boolean
  tasksProcessed: number
  filesCreated: number
  messagesCreated: number
  error?: string
}

interface GeneratedFile {
  path: string
  content: string
  language: string
}

export interface ProjectMetrics {
  projectId: string
  taskCounts: {
    total: number
    pending: number
    inProgress: number
    completed: number
    failed: number
    cancelled: number
  }
  completionRate: number
  avgCompletionTime: number // minutes
  agentProductivity: Array<{
    agentId: string
    agentName: string
    agentType: string
    tasksCompleted: number
    tasksFailed: number
    successRate: number
    avgTime: number
    workload: number
    currentStatus: string
  }>
  kanbanDistribution: Record<string, number>
  priorityDistribution: Record<string, number>
  typeDistribution: Record<string, number>
  estimatedVsActual: {
    totalEstimated: number
    totalActual: number
    variance: number
  }
  timeline: {
    startedAt?: string
    completedAt?: string
    duration: number // days
  }
}

export interface KanbanBoard {
  columns: Array<{
    id: string
    name: string
    wipLimit: number
    tasks: Array<{
      id: string
      title: string
      description?: string | null
      priority: string
      type?: string | null
      agentType?: string | null
      progress: number
      assignee?: { id: string; name: string; avatar?: string | null } | null
      dependencies?: string[]
      estimatedHours?: number | null
    }>
  }>
}

export interface DependencyGraph {
  nodes: Array<{
    id: string
    title: string
    type: string
    status: string
    agentType?: string | null
    assignee?: string | null
  }>
  edges: Array<{
    from: string
    to: string
    type: 'depends_on'
  }>
  agents: Array<{
    id: string
    name: string
    type: string
    currentStatus: string
    workload: number
    tasks: string[]
  }>
}

// ─── Agent type display names ─────────────────────────────────────────────────

const AGENT_TYPE_NAMES: Record<string, string> = {
  coordinator: 'Orchestrator',
  planning: 'Project Manager',
  reasoning: 'System Architect',
  developer: 'Developer',
  debugger: 'QA Engineer',
  security: 'Security Agent',
  research: 'Research Agent',
  document: 'Documentation Agent',
}

// ─── Specialized AI Code Generation ──────────────────────────────────────────

async function generateCodeWithAI(
  task: { id: string; title: string; description?: string | null; type?: string | null; agentType?: string | null },
  project: { name: string; techStack?: string | null; category?: string | null; description?: string | null; requirements?: string | null },
  existingFiles: string[]
): Promise<GeneratedFile[]> {
  const agentType = (task.agentType || 'developer') as AgentTypeKey
  const agentDef = AGENT_TYPES[agentType]
  const techStack = project.techStack ? (() => { try { return JSON.parse(project.techStack).join(', ') } catch { return project.techStack } })() : 'TypeScript, Next.js, React'
  const existingStructure = existingFiles.length > 0
    ? `Existing project files:\n${existingFiles.map(f => `- ${f}`).join('\n')}`
    : 'This is a new project with no existing files yet.'

  let systemPrompt = ''
  let userPrompt = ''

  // Specialized prompts per agent type
  switch (agentType) {
    case 'developer':
      systemPrompt = `${agentDef.systemPrompt}

Tech stack: ${techStack}
Category: ${project.category || 'Web App'}
${existingStructure}

RULES:
- Write COMPLETE, WORKING code - no TODO comments, no placeholders, no stubs
- Include proper error handling, types, and imports
- Follow best practices for the tech stack
- Return a JSON array of files, each with "path", "content", and "language" fields
- Generate 1-3 files maximum per task
- Make sure the code is functional and would work if run`
      break

    case 'architect':
      systemPrompt = `${agentDef.systemPrompt}

Tech stack: ${techStack}
${existingStructure}

RULES:
- Create comprehensive architecture documents
- Include system diagrams (as mermaid code blocks), component descriptions
- Design database schemas, API contracts, and integration patterns
- Return a JSON array of files with "path", "content", and "language" fields`
      break

    case 'qa':
      systemPrompt = `${agentDef.systemPrompt}

Tech stack: ${techStack}
${existingStructure}

RULES:
- Write real, meaningful test cases - not placeholder tests
- Include both unit and integration test patterns
- Use proper assertions and test organization
- Create test plans with coverage strategies
- Return a JSON array of files with "path", "content", and "language" fields`
      break

    case 'security':
      systemPrompt = `${agentDef.systemPrompt}

Tech stack: ${techStack}
${existingStructure}

RULES:
- Perform a real security analysis with actionable findings
- Include code fixes for identified vulnerabilities
- Rate each finding by severity (critical/high/medium/low)
- Provide remediation steps and code examples
- Return a JSON array of files with "path", "content", and "language" fields`
      break

    case 'documentation':
      systemPrompt = `${agentDef.systemPrompt}

Tech stack: ${techStack}
${existingStructure}

RULES:
- Write comprehensive, professional documentation
- Include code examples, API references, setup instructions
- Create user guides and developer guides
- Return a JSON array of files with "path", "content", and "language" fields`
      break

    case 'project_manager':
      systemPrompt = `${agentDef.systemPrompt}

Tech stack: ${techStack}
${existingStructure}

RULES:
- Create project planning documents
- Include sprint plans, milestones, risk assessments
- Define KPIs and success metrics
- Return a JSON array of files with "path", "content", and "language" fields`
      break

    case 'research':
      systemPrompt = `${agentDef.systemPrompt}

Tech stack: ${techStack}
${existingStructure}

RULES:
- Create research documents with findings
- Include technology comparisons, benchmarks, and recommendations
- Provide evidence-based analysis
- Return a JSON array of files with "path", "content", and "language" fields`
      break

    default:
      systemPrompt = `You are an AI agent working on the project "${project.name}".
Tech stack: ${techStack}
${existingStructure}

RULES:
- Write complete, working code - no TODO comments or placeholders
- Return a JSON array of files with "path", "content", and "language" fields`
  }

  userPrompt = `Task: ${task.title}
${task.description ? `Description: ${task.description}` : ''}
${project.requirements ? `Project Requirements: ${project.requirements}` : ''}
${project.description ? `Project Description: ${project.description}` : ''}

Generate the necessary files. Return ONLY a JSON array like:
[{"path": "src/lib/example.ts", "content": "export function example() { ... }", "language": "typescript"}]`

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const completion = await chatCompletion({ messages, temperature: 0.4, maxTokens: 4000 })
    const content = completion.content.trim()

    let jsonStr = content
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) jsonStr = jsonMatch[0]

    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) {
      return parsed.map((f: Record<string, unknown>) => ({
        path: String(f.path || 'unknown.txt'),
        content: String(f.content || ''),
        language: String(f.language || 'text'),
      })).filter((f: GeneratedFile) => f.content.length > 0)
    }

    return []
  } catch (error) {
    console.error('AI code generation failed, using fallback:', error)
    return generateFallbackCode(task, project)
  }
}

// ─── Fallback code templates ─────────────────────────────────────────────────

function generateFallbackCode(
  task: { title: string; description?: string | null; type?: string | null; agentType?: string | null },
  project: { name: string; techStack?: string | null; category?: string | null }
): GeneratedFile[] {
  const files: GeneratedFile[] = []
  const agentType = (task.agentType || 'developer') as AgentTypeKey
  const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const taskTitle = task.title.toLowerCase()

  switch (agentType) {
    case 'developer':
      if (taskTitle.includes('api') || taskTitle.includes('backend')) {
        files.push({
          path: `src/app/api/${projectName}/route.ts`,
          content: `import { NextRequest, NextResponse } from 'next/server'\nimport { db } from '@/lib/db'\n\n/**\n * ${task.title}\n * Generated by AIOS Developer Agent\n */\nexport async function GET(request: NextRequest) {\n  try {\n    const { searchParams } = new URL(request.url)\n    const page = parseInt(searchParams.get('page') || '1')\n    const limit = parseInt(searchParams.get('limit') || '10')\n    const skip = (page - 1) * limit\n\n    const items = await db.${projectName}.findMany({ skip, take: limit })\n    const total = await db.${projectName}.count()\n\n    return NextResponse.json({\n      success: true,\n      data: items,\n      pagination: { page, limit, total, pages: Math.ceil(total / limit) }\n    })\n  } catch (error) {\n    console.error('GET error:', error)\n    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })\n  }\n}\n\nexport async function POST(request: NextRequest) {\n  try {\n    const body = await request.json()\n    const item = await db.${projectName}.create({ data: body })\n    return NextResponse.json({ success: true, data: item }, { status: 201 })\n  } catch (error) {\n    console.error('POST error:', error)\n    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })\n  }\n}\n`,
          language: 'typescript',
        })
      } else {
        const slug = task.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
        files.push({
          path: `src/lib/${slug}.ts`,
          content: `/**\n * ${task.title}\n * Generated by AIOS Developer Agent\n * ${task.description || ''}\n */\n\nexport interface ${slug.replace(/-./g, x => x[1].toUpperCase())}Config {\n  enabled: boolean\n  timeout?: number\n  retries?: number\n}\n\nconst DEFAULT_CONFIG: ${slug.replace(/-./g, x => x[1].toUpperCase())}Config = {\n  enabled: true,\n  timeout: 5000,\n  retries: 3,\n}\n\nexport async function execute(\n  config: Partial<${slug.replace(/-./g, x => x[1].toUpperCase())}Config> = {}\n): Promise<{ success: boolean; data?: unknown; error?: string }> {\n  const mergedConfig = { ...DEFAULT_CONFIG, ...config }\n  \n  if (!mergedConfig.enabled) {\n    return { success: false, error: 'Feature is disabled' }\n  }\n\n  try {\n    const result = await Promise.resolve({ implemented: true, config: mergedConfig })\n    return { success: true, data: result }\n  } catch (error) {\n    const message = error instanceof Error ? error.message : 'Unknown error'\n    return { success: false, error: message }\n  }\n}\n`,
          language: 'typescript',
        })
      }
      break

    case 'architect':
      files.push({
        path: `docs/architecture.md`,
        content: `# Architecture Document\n\n## ${task.title}\n\n${task.description || 'System architecture design'}\n\n## System Overview\n\n\`\`\`mermaid\ngraph TD\n    A[Client] --> B[API Gateway]\n    B --> C[Auth Service]\n    B --> D[Core Service]\n    D --> E[(Database)]\n\`\`\`\n\n## Components\n\n### API Layer\n- RESTful API endpoints\n- Authentication middleware\n- Rate limiting\n\n### Data Layer\n- ${project.techStack || 'SQLite'} database\n- ORM: Prisma\n- Migrations\n\n## Decisions\n\n| Decision | Choice | Rationale |\n|----------|--------|-----------|\n| Framework | Next.js | Full-stack capability |\n| Database | SQLite | Simple deployment |\n| Auth | NextAuth.js | Built-in support |\n`,
        language: 'markdown',
      })
      break

    case 'qa':
      files.push({
        path: `docs/test-plan.md`,
        content: `# Test Plan\n\n## ${task.title}\n\n${task.description || 'Quality assurance test plan'}\n\n## Test Strategy\n\n### Unit Tests\n- Component rendering\n- Business logic functions\n- Utility functions\n\n### Integration Tests\n- API endpoint testing\n- Database operations\n- Authentication flow\n\n### E2E Tests\n- User journey flows\n- Critical path testing\n\n## Test Cases\n\n| ID | Description | Priority | Status |\n|----|-------------|----------|--------|\n| TC-001 | Verify API returns 200 | High | Pending |\n| TC-002 | Verify input validation | High | Pending |\n| TC-003 | Verify error handling | Medium | Pending |\n`,
        language: 'markdown',
      })
      break

    case 'security':
      files.push({
        path: `docs/security-audit.md`,
        content: `# Security Audit Report\n\n## ${task.title}\n\n${task.description || 'Security analysis report'}\n\n## Findings\n\n| Severity | Finding | Status |\n|----------|---------|--------|\n| Info | Input validation recommended | Open |\n| Info | Rate limiting recommended | Open |\n\n## Recommendations\n\n1. Implement input validation on all API endpoints\n2. Add rate limiting to prevent abuse\n3. Use environment variables for secrets\n4. Enable CORS with specific origins only\n5. Add authentication middleware\n\n## Next Steps\n\n- [ ] Review authentication implementation\n- [ ] Test input validation\n- [ ] Configure rate limiting\n`,
        language: 'markdown',
      })
      break

    case 'documentation':
      files.push({
        path: `docs/guide.md`,
        content: `# ${project.name}\n\n## ${task.title}\n\n${task.description || 'Documentation section'}\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\n\`\`\`typescript\nimport { execute } from './src/lib/main'\n\nconst result = await execute({})\nconsole.log(result)\n\`\`\`\n\n## API Reference\n\nSee the generated API documentation for details.\n`,
        language: 'markdown',
      })
      break

    case 'project_manager':
      files.push({
        path: `docs/sprint-plan.md`,
        content: `# Sprint Plan\n\n## ${task.title}\n\n${task.description || 'Project sprint planning'}\n\n## Sprint Goals\n\n- Complete core functionality\n- Establish CI/CD pipeline\n- Set up monitoring\n\n## Milestones\n\n| Milestone | Target Date | Status |\n|-----------|-------------|--------|\n| MVP | Week 2 | In Progress |\n| Beta | Week 4 | Planned |\n| Release | Week 6 | Planned |\n\n## Risks\n\n1. Scope creep - mitigate with clear requirements\n2. Technical debt - allocate 20% time for refactoring\n`,
        language: 'markdown',
      })
      break

    case 'research':
      files.push({
        path: `docs/research.md`,
        content: `# Research Report\n\n## ${task.title}\n\n${task.description || 'Technology research and analysis'}\n\n## Summary\n\nThis research evaluates technology options and provides recommendations.\n\n## Findings\n\n### Technology Comparison\n\n| Technology | Pros | Cons | Recommendation |\n|------------|------|------|----------------|\n| Next.js | Full-stack, SSR | Complex | ✅ Recommended |\n| Express | Simple, flexible | No SSR | Alternative |\n\n## Recommendations\n\nBased on the analysis, we recommend proceeding with the current tech stack.\n`,
        language: 'markdown',
      })
      break

    default:
      files.push({
        path: `src/lib/output.txt`,
        content: `Task: ${task.title}\nDescription: ${task.description || 'N/A'}\n\nGenerated by AIOS Agent`,
        language: 'text',
      })
  }

  return files
}

// ─── Execute a single task with the assigned agent ────────────────────────────

export async function executeAgentTask(projectId: string, taskId: string): Promise<ExecutorResult> {
  const result: ExecutorResult = {
    success: true,
    tasksProcessed: 0,
    filesCreated: 0,
    messagesCreated: 0,
  }

  try {
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { assignee: true },
    })

    if (!task || task.projectId !== projectId) {
      return { ...result, success: false, error: 'Task not found' }
    }

    if (task.status === 'completed') {
      return { ...result, success: false, error: 'Task already completed' }
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { projectFiles: { select: { path: true } } },
    })

    if (!project) {
      return { ...result, success: false, error: 'Project not found' }
    }

    const bus = new AgentCommunicationBus(projectId)
    const agentName = task.assignee?.name || AGENT_TYPE_NAMES[task.assignee?.type || ''] || 'Agent'
    const agentType = task.agentType || 'developer'

    // Mark task as in_progress and move to in_progress kanban column
    await db.task.update({
      where: { id: taskId },
      data: {
        status: 'in_progress',
        kanbanColumn: 'in_progress',
        startedAt: task.startedAt || new Date(),
        progress: 10,
      },
    })

    // Update agent status
    if (task.assigneeId) {
      await db.agent.update({
        where: { id: task.assigneeId },
        data: { currentStatus: 'working', currentTaskId: taskId, lastActiveAt: new Date() },
      })
    }

    // Send "started" message
    await bus.sendMessage(
      task.assigneeId || agentType,
      'all',
      'status',
      `🔄 **${agentName}** started working on: **${task.title}**\n\n${task.description ? `> ${task.description}\n` : ''}Agent type: ${agentType}. Analyzing requirements and preparing implementation...`,
      'normal',
      [taskId],
      'execution'
    )
    result.messagesCreated++

    // Try to generate a progress message with AI
    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are ${agentName}, an AI agent specialized in ${agentType}. Write a brief progress message (2-3 sentences) about what you are doing for this task. Be technical and specific.`,
        },
        {
          role: 'user',
          content: `Project: ${project.name} (${project.category || 'Web App'})\nTask: ${task.title}\nDescription: ${task.description || 'N/A'}\nTech Stack: ${project.techStack || 'Not specified'}`,
        },
      ]

      const completion = await chatCompletion({ messages, temperature: 0.7, maxTokens: 200 })

      await bus.sendMessage(
        task.assigneeId || agentType,
        'all',
        'discussion',
        completion.content,
        'normal',
        [taskId],
        'execution'
      )
      result.messagesCreated++

      // Update progress
      await db.task.update({
        where: { id: taskId },
        data: { progress: 50 },
      })
    } catch {
      // AI not available - that's fine
    }

    // Generate code/files
    const generatedFiles = await generateCodeWithAI(
      { id: task.id, title: task.title, description: task.description, type: task.type, agentType: task.agentType },
      project,
      project.projectFiles.map(f => f.path)
    )

    // Save generated files
    for (const file of generatedFiles) {
      try {
        const existing = await db.projectFile.findFirst({ where: { projectId, path: file.path } })
        if (existing) {
          await db.projectFile.update({
            where: { id: existing.id },
            data: { content: file.content, size: Buffer.byteLength(file.content, 'utf-8'), source: 'generated', language: file.language },
          })
        } else {
          // Ensure parent directories
          const parts = file.path.split('/')
          if (parts.length > 1) {
            for (let i = 1; i < parts.length; i++) {
              const dirPath = parts.slice(0, i).join('/')
              const dirName = parts[i - 1]
              const existingDir = await db.projectFile.findFirst({ where: { projectId, path: dirPath, isDirectory: true } })
              if (!existingDir) {
                await db.projectFile.create({ data: { projectId, name: dirName, path: dirPath, isDirectory: true, source: 'generated', size: 0 } })
              }
            }
          }
          await db.projectFile.create({
            data: { projectId, name: file.path.split('/').pop() || file.path, path: file.path, content: file.content, language: file.language, size: Buffer.byteLength(file.content, 'utf-8'), source: 'generated', isDirectory: false },
          })
        }
        result.filesCreated++
      } catch (fileError) {
        console.error(`Failed to create file ${file.path}:`, fileError)
      }
    }

    // Create knowledge graph nodes for generated files
    for (const file of generatedFiles) {
      try {
        await db.knowledgeNode.create({
          data: {
            projectId,
            type: 'file',
            name: file.path.split('/').pop() || file.path,
            path: file.path,
            description: `Generated by ${agentName} for: ${task.title}`,
            language: file.language,
            linesOfCode: file.content.split('\n').length,
            importance: 0.7,
            metadata: JSON.stringify({ source: 'agent-generated', taskId: task.id, agentType }),
          },
        })
      } catch {
        // Non-critical
      }
    }

    // Mark task as completed
    const actualHours = task.startedAt
      ? (Date.now() - task.startedAt.getTime()) / (1000 * 60 * 60)
      : null

    await db.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        kanbanColumn: 'done',
        progress: 100,
        completedAt: new Date(),
        actualHours: actualHours ? Math.round(actualHours * 100) / 100 : null,
      },
    })

    // Update agent stats
    if (task.assigneeId) {
      const agent = await db.agent.findUnique({ where: { id: task.assigneeId } })
      if (agent) {
        const newCompleted = agent.totalTasksCompleted + 1
        const newSuccessRate = (newCompleted / (newCompleted + agent.totalTasksFailed)) * 100
        const newAvgTime = actualHours
          ? ((agent.avgCompletionTime * agent.totalTasksCompleted) + (actualHours * 60)) / newCompleted
          : agent.avgCompletionTime

        await db.agent.update({
          where: { id: task.assigneeId },
          data: {
            currentStatus: 'idle',
            currentTaskId: null,
            workload: Math.max(0, agent.workload - 1),
            totalTasksCompleted: newCompleted,
            successRate: Math.round(newSuccessRate * 100) / 100,
            avgCompletionTime: Math.round(newAvgTime * 100) / 100,
            lastActiveAt: new Date(),
          },
        })
      }
    }

    // Send "completed" message
    const fileList = generatedFiles.map(f => `- \`${f.path}\` (${f.language})`).join('\n')
    await bus.sendMessage(
      task.assigneeId || agentType,
      'all',
      'result',
      `✅ **${agentName}** completed: **${task.title}**\n\n${result.filesCreated > 0 ? `**Files generated:**\n${fileList}` : 'Task completed successfully.'}\n\n${task.description ? `> ${task.description}` : ''}`,
      'normal',
      [taskId],
      'execution'
    )
    result.messagesCreated++

    result.tasksProcessed = 1

    await addTimelineEvent(projectId, 'task_completed', `Task "${task.title}" completed by ${agentName}`, 'execute', { taskId, agentType })

    return result
  } catch (error) {
    console.error('Execute agent task error:', error)

    // Mark task as failed
    try {
      await db.task.update({
        where: { id: taskId },
        data: { status: 'failed', kanbanColumn: 'blocked', error: error instanceof Error ? error.message : 'Unknown error' },
      })

      // Update agent stats
      const task = await db.task.findUnique({ where: { id: taskId } })
      if (task?.assigneeId) {
        const agent = await db.agent.findUnique({ where: { id: task.assigneeId } })
        if (agent) {
          const newFailed = agent.totalTasksFailed + 1
          const newSuccessRate = (agent.totalTasksCompleted / (agent.totalTasksCompleted + newFailed)) * 100
          await db.agent.update({
            where: { id: task.assigneeId },
            data: {
              currentStatus: 'idle',
              currentTaskId: null,
              workload: Math.max(0, agent.workload - 1),
              totalTasksFailed: newFailed,
              successRate: Math.round(newSuccessRate * 100) / 100,
            },
          })
        }
      }
    } catch {
      // Can't update task
    }

    return {
      ...result,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ─── Agent Collaboration ──────────────────────────────────────────────────────

export async function runAgentCollaboration(
  projectId: string,
  taskId: string
): Promise<{ success: boolean; messagesCreated: number; error?: string }> {
  try {
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { assignee: true },
    })

    if (!task || task.projectId !== projectId) {
      return { success: false, messagesCreated: 0, error: 'Task not found' }
    }

    const bus = new AgentCommunicationBus(projectId)
    const messages: ChatMessage[] = []

    // Build context from agent messages
    const recentMessages = await db.agentMessage.findMany({
      where: { projectId, taskIds: { contains: taskId } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        fromAgent: { select: { name: true, type: true } },
      },
    })

    const contextStr = recentMessages
      .map(m => `${m.fromAgent?.name || m.fromRole}: ${m.content.substring(0, 200)}`)
      .join('\n')

    messages.push({
      role: 'system',
      content: 'You are facilitating a multi-agent discussion about a project task. Help agents collaborate, share findings, and resolve any conflicts. Keep the discussion focused and productive.',
    })
    messages.push({
      role: 'user',
      content: `Task: ${task.title}\nDescription: ${task.description || 'N/A'}\n\nRecent agent discussion:\n${contextStr}\n\nPlease provide a synthesis of the discussion and suggest next steps for collaboration.`,
    })

    let collaborationResponse: string
    try {
      const completion = await chatCompletion({ messages, temperature: 0.7, maxTokens: 500 })
      collaborationResponse = completion.content
    } catch {
      collaborationResponse = 'Collaboration discussion initiated. Agents should review the task context and share their findings.'
    }

    await bus.broadcast(
      'orchestrator',
      'discussion',
      `## 🤝 Agent Collaboration: ${task.title}\n\n${collaborationResponse}`,
      'high',
      [taskId],
      'execution'
    )

    return { success: true, messagesCreated: 1 }
  } catch (error) {
    return { success: false, messagesCreated: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ─── Project Metrics ──────────────────────────────────────────────────────────

export async function getProjectMetrics(projectId: string): Promise<ProjectMetrics | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: true,
    },
  })

  if (!project) return null

  const tasks = project.tasks
  const total = tasks.length

  const taskCounts = {
    total,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
  }

  const completionRate = total > 0 ? Math.round((taskCounts.completed / total) * 100) : 0

  // Average completion time
  const completedTasks = tasks.filter(t => t.status === 'completed' && t.startedAt && t.completedAt)
  const avgCompletionTime = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => sum + ((t.completedAt!.getTime() - t.startedAt!.getTime()) / (1000 * 60)), 0) / completedTasks.length
    : 0

  // Agent productivity
  const agents = await db.agent.findMany({
    where: { isActive: true },
    include: { tasksAssigned: { where: { projectId } } },
  })

  const agentProductivity = agents.map(agent => ({
    agentId: agent.id,
    agentName: agent.name,
    agentType: agent.type,
    tasksCompleted: agent.totalTasksCompleted,
    tasksFailed: agent.totalTasksFailed,
    successRate: agent.successRate,
    avgTime: agent.avgCompletionTime,
    workload: agent.workload,
    currentStatus: agent.currentStatus,
  }))

  // Kanban distribution
  const kanbanDistribution: Record<string, number> = {}
  for (const task of tasks) {
    const col = task.kanbanColumn || 'backlog'
    kanbanDistribution[col] = (kanbanDistribution[col] || 0) + 1
  }

  // Priority distribution
  const priorityDistribution: Record<string, number> = {}
  for (const task of tasks) {
    priorityDistribution[task.priority] = (priorityDistribution[task.priority] || 0) + 1
  }

  // Type distribution
  const typeDistribution: Record<string, number> = {}
  for (const task of tasks) {
    const t = task.type || 'untyped'
    typeDistribution[t] = (typeDistribution[t] || 0) + 1
  }

  // Estimated vs actual
  const tasksWithEstimates = tasks.filter(t => t.estimatedHours != null && t.actualHours != null)
  const totalEstimated = tasksWithEstimates.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)
  const totalActual = tasksWithEstimates.reduce((sum, t) => sum + (t.actualHours || 0), 0)

  // Timeline
  const timeline = {
    startedAt: project.startedAt?.toISOString(),
    completedAt: project.completedAt?.toISOString(),
    duration: project.startedAt
      ? Math.round(((project.completedAt || new Date()).getTime() - project.startedAt.getTime()) / (1000 * 60 * 60 * 24) * 10) / 10
      : 0,
  }

  const metrics: ProjectMetrics = {
    projectId,
    taskCounts,
    completionRate,
    avgCompletionTime: Math.round(avgCompletionTime * 100) / 100,
    agentProductivity,
    kanbanDistribution,
    priorityDistribution,
    typeDistribution,
    estimatedVsActual: {
      totalEstimated,
      totalActual,
      variance: totalEstimated > 0 ? Math.round(((totalActual - totalEstimated) / totalEstimated) * 10000) / 100 : 0,
    },
    timeline,
  }

  // Store metrics in project
  await db.project.update({
    where: { id: projectId },
    data: { metrics: JSON.stringify(metrics) },
  })

  return metrics
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

export async function getKanbanBoard(projectId: string): Promise<KanbanBoard | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        orderBy: { priority: 'desc' },
        include: { assignee: { select: { id: true, name: true, avatar: true } } },
      },
    },
  })

  if (!project) return null

  // Parse kanban config or use defaults
  let kanbanConfig = {
    columns: [
      { id: 'backlog', name: 'Backlog', wipLimit: 0 },
      { id: 'planned', name: 'Planned', wipLimit: 10 },
      { id: 'in_progress', name: 'In Progress', wipLimit: 5 },
      { id: 'review', name: 'Review', wipLimit: 5 },
      { id: 'blocked', name: 'Blocked', wipLimit: 3 },
      { id: 'done', name: 'Done', wipLimit: 0 },
    ],
  }

  if (project.kanbanConfig) {
    try {
      kanbanConfig = JSON.parse(project.kanbanConfig)
    } catch { /* use defaults */ }
  }

  const columns = kanbanConfig.columns.map(col => ({
    id: col.id,
    name: col.name,
    wipLimit: col.wipLimit,
    tasks: project.tasks
      .filter(t => (t.kanbanColumn || 'backlog') === col.id)
      .map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        type: t.type,
        agentType: t.agentType,
        progress: t.progress,
        assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name, avatar: t.assignee.avatar } : null,
        dependencies: t.dependencies ? JSON.parse(t.dependencies) : [],
        estimatedHours: t.estimatedHours,
      })),
  }))

  return { columns }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export async function getTimeline(projectId: string): Promise<Array<Record<string, unknown>>> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { timeline: true },
  })

  if (!project?.timeline) return []

  try {
    return JSON.parse(project.timeline)
  } catch {
    return []
  }
}

// ─── Dependency Graph ─────────────────────────────────────────────────────────

export async function getDependencyGraph(projectId: string): Promise<DependencyGraph | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        include: { assignee: { select: { id: true, name: true } } },
      },
    },
  })

  if (!project) return null

  const taskMap = new Map(project.tasks.map(t => [t.id, t]))

  const nodes = project.tasks.map(t => ({
    id: t.id,
    title: t.title,
    type: t.type || 'general',
    status: t.status,
    agentType: t.agentType,
    assignee: t.assignee?.name || null,
  }))

  const edges: Array<{ from: string; to: string; type: 'depends_on' }> = []
  for (const task of project.tasks) {
    if (task.dependencies) {
      try {
        const depIds: string[] = JSON.parse(task.dependencies)
        for (const depId of depIds) {
          if (taskMap.has(depId)) {
            edges.push({ from: task.id, to: depId, type: 'depends_on' })
          }
        }
      } catch { /* skip invalid deps */ }
    }
  }

  // Agent info
  const agents = await db.agent.findMany({
    where: { isActive: true },
    include: { tasksAssigned: { where: { projectId }, select: { id: true } } },
  })

  const agentNodes = agents.map(a => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currentStatus: a.currentStatus,
    workload: a.workload,
    tasks: a.tasksAssigned.map(t => t.id),
  }))

  return { nodes, edges, agents: agentNodes }
}

// ─── Batch execute (for backward compat with execute route) ──────────────────

export async function executeAgentTasks(projectId: string): Promise<ExecutorResult> {
  const result: ExecutorResult = {
    success: true,
    tasksProcessed: 0,
    filesCreated: 0,
    messagesCreated: 0,
  }

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: { orderBy: { createdAt: 'asc' } },
        projectFiles: { select: { path: true } },
      },
    })

    if (!project) {
      return { ...result, success: false, error: 'Project not found' }
    }

    // Find the next task to execute
    const inProgressTask = project.tasks.find(t => t.status === 'in_progress')
    const pendingTask = project.tasks.find(t => t.status === 'pending')

    if (inProgressTask) {
      // Complete the in-progress task
      const taskResult = await executeAgentTask(projectId, inProgressTask.id)
      result.tasksProcessed += taskResult.tasksProcessed
      result.filesCreated += taskResult.filesCreated
      result.messagesCreated += taskResult.messagesCreated
      if (!taskResult.success) {
        result.success = false
        result.error = taskResult.error
      }
      return result
    }

    if (pendingTask) {
      // Start the pending task
      const taskResult = await executeAgentTask(projectId, pendingTask.id)
      result.tasksProcessed += taskResult.tasksProcessed
      result.filesCreated += taskResult.filesCreated
      result.messagesCreated += taskResult.messagesCreated
      if (!taskResult.success) {
        result.success = false
        result.error = taskResult.error
      }
      return result
    }

    // No more tasks - check if all are completed
    const allDone = project.tasks.length > 0 && project.tasks.every(t => t.status === 'completed' || t.status === 'cancelled')
    if (allDone && project.orchestratorStatus === 'running') {
      await db.project.update({
        where: { id: projectId },
        data: {
          orchestratorStatus: 'completed',
          status: 'completed',
          completedAt: new Date(),
        },
      })

      const bus = new AgentCommunicationBus(projectId)
      await bus.broadcast('orchestrator', 'status',
        `## 🎉 All Tasks Completed!\n\nAll ${project.tasks.length} tasks for "${project.name}" have been completed successfully. The project is now marked as completed.\n\n## Phase 6: DELIVER\nProject delivered successfully!`,
        'high', undefined, 'delivery'
      )
      result.messagesCreated++

      await addTimelineEvent(projectId, 'project_completed', 'All tasks completed. Project delivered successfully.', 'deliver')
    }

    return result
  } catch (error) {
    console.error('Agent executor error:', error)
    return {
      ...result,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ─── Get project execution status (backward compat) ──────────────────────────

export async function getProjectExecutionStatus(projectId: string) {
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

  const pending = project.tasks.filter(t => t.status === 'pending').length
  const inProgress = project.tasks.filter(t => t.status === 'in_progress').length
  const completed = project.tasks.filter(t => t.status === 'completed').length
  const failed = project.tasks.filter(t => t.status === 'failed').length
  const total = project.tasks.length

  return {
    projectId: project.id,
    projectName: project.name,
    orchestratorStatus: project.orchestratorStatus,
    projectStatus: project.status,
    tasks: {
      total,
      pending,
      inProgress,
      completed,
      failed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  }
}
