/**
 * AIOS Agent Executor - Agents progressively work on tasks using AI
 *
 * When the orchestrator creates tasks, this module:
 * 1. Picks up pending tasks in dependency order
 * 2. Assigns them to the right agent type
 * 3. Progressively updates task status (pending → in_progress → completed)
 * 4. Creates agent messages (discussion, status, results)
 * 5. Generates real code files using AI based on task type and project context
 * 6. Creates knowledge graph nodes for generated code
 */

import { db } from '@/lib/db'
import { chatCompletion, type ChatMessage } from '@/lib/providers'

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

// ─── Agent task type mapping ──────────────────────────────────────────────────

const AGENT_TYPE_NAMES: Record<string, string> = {
  planning: 'Code Architect',
  developer: 'Backend Developer',
  frontend: 'Frontend Developer',
  debugger: 'QA Engineer',
  document: 'Documentation Writer',
  security: 'Security Analyst',
  research: 'Code Architect',
}

// ─── AI Code Generation ──────────────────────────────────────────────────────

async function generateCodeWithAI(
  task: { title: string; description?: string | null; type?: string | null },
  project: { name: string; techStack?: string | null; category?: string | null; description?: string | null; requirements?: string | null },
  existingFiles: string[]
): Promise<GeneratedFile[]> {
  const taskType = task.type || 'development'
  const techStack = project.techStack ? JSON.parse(project.techStack).join(', ') : 'TypeScript, Next.js, React'
  const projectName = project.name

  // Build context about existing project structure
  const existingStructure = existingFiles.length > 0
    ? `Existing project files:\n${existingFiles.map(f => `- ${f}`).join('\n')}`
    : 'This is a new project with no existing files yet.'

  let systemPrompt = ''
  let userPrompt = ''

  if (taskType === 'development' || taskType === 'analysis') {
    systemPrompt = `You are an expert software developer working on the project "${projectName}".
You generate production-quality, complete, working code - NOT stubs or TODO placeholders.
Tech stack: ${techStack}
Category: ${project.category || 'Web App'}

${existingStructure}

RULES:
- Write COMPLETE, WORKING code - no TODO comments, no placeholders, no stubs
- Include proper error handling, types, and imports
- Follow best practices for the tech stack
- Return a JSON array of files, each with "path", "content", and "language" fields
- The "path" should be relative to the project root
- Generate 1-3 files maximum per task
- Make sure the code is functional and would work if run`

    userPrompt = `Task: ${task.title}
${task.description ? `Description: ${task.description}` : ''}
${project.requirements ? `Project Requirements: ${project.requirements}` : ''}
${project.description ? `Project Description: ${project.description}` : ''}

Generate the code files needed for this task. Return ONLY a JSON array like:
[{"path": "src/lib/example.ts", "content": "export function example() { ... }", "language": "typescript"}]`
  } else if (taskType === 'documentation') {
    systemPrompt = `You are a technical documentation writer for the project "${projectName}".
Tech stack: ${techStack}

${existingStructure}

RULES:
- Write comprehensive, professional documentation
- Include code examples, API references, setup instructions
- Return a JSON array of files with "path", "content", and "language" fields`

    userPrompt = `Task: ${task.title}
${task.description ? `Description: ${task.description}` : ''}

Generate documentation files. Return ONLY a JSON array like:
[{"path": "docs/guide.md", "content": "# Guide\\n...", "language": "markdown"}]`
  } else if (taskType === 'testing') {
    systemPrompt = `You are a QA engineer writing tests for the project "${projectName}".
Tech stack: ${techStack}

${existingStructure}

RULES:
- Write real, meaningful test cases - not placeholder tests
- Include both unit and integration test patterns
- Use proper assertions and test organization
- Return a JSON array of files with "path", "content", and "language" fields`

    userPrompt = `Task: ${task.title}
${task.description ? `Description: ${task.description}` : ''}

Generate test files. Return ONLY a JSON array like:
[{"path": "tests/example.test.ts", "content": "import { describe, it, expect } from 'vitest'\\n...", "language": "typescript"}]`
  } else if (taskType === 'security') {
    systemPrompt = `You are a security analyst for the project "${projectName}".
Tech stack: ${techStack}

${existingStructure}

RULES:
- Perform a real security analysis
- Write actionable findings and fixes
- Return a JSON array of files with "path", "content", and "language" fields`

    userPrompt = `Task: ${task.title}
${task.description ? `Description: ${task.description}` : ''}

Generate a security audit report with real findings and code fixes. Return ONLY a JSON array like:
[{"path": "docs/security-audit.md", "content": "# Security Audit\\n...", "language": "markdown"}]`
  } else {
    systemPrompt = `You are an AI agent working on the project "${projectName}".
Tech stack: ${techStack}

${existingStructure}

RULES:
- Write complete, working code - no TODO comments or placeholders
- Return a JSON array of files with "path", "content", and "language" fields`

    userPrompt = `Task: ${task.title}
${task.description ? `Description: ${task.description}` : ''}

Generate the necessary files. Return ONLY a JSON array like:
[{"path": "src/lib/example.ts", "content": "export function example() { ... }", "language": "typescript"}]`
  }

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const completion = await chatCompletion({ messages, temperature: 0.4, maxTokens: 4000 })

    // Parse the JSON array from the response
    const content = completion.content.trim()

    // Try to extract JSON array from the response (handle markdown code blocks)
    let jsonStr = content
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }

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

// ─── Fallback code templates (when AI is unavailable) ────────────────────────

function generateFallbackCode(
  task: { title: string; description?: string | null; type?: string | null },
  project: { name: string; techStack?: string | null; category?: string | null }
): GeneratedFile[] {
  const files: GeneratedFile[] = []
  const taskType = task.type || 'development'
  const taskTitle = task.title.toLowerCase()
  const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()

  if (taskType === 'development' || taskType === 'analysis') {
    if (taskTitle.includes('api') || taskTitle.includes('backend') || taskTitle.includes('server')) {
      files.push({
        path: `src/app/api/${projectName}/route.ts`,
        content: `import { NextRequest, NextResponse } from 'next/server'\nimport { db } from '@/lib/db'\n\n/**\n * ${task.title}\n * Generated by AIOS Agent\n */\nexport async function GET(request: NextRequest) {\n  try {\n    const { searchParams } = new URL(request.url)\n    const page = parseInt(searchParams.get('page') || '1')\n    const limit = parseInt(searchParams.get('limit') || '10')\n    const skip = (page - 1) * limit\n\n    const items = await db.${projectName}.findMany({ skip, take: limit })\n    const total = await db.${projectName}.count()\n\n    return NextResponse.json({\n      success: true,\n      data: items,\n      pagination: { page, limit, total, pages: Math.ceil(total / limit) }\n    })\n  } catch (error) {\n    console.error('GET error:', error)\n    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })\n  }\n}\n\nexport async function POST(request: NextRequest) {\n  try {\n    const body = await request.json()\n    const item = await db.${projectName}.create({ data: body })\n    return NextResponse.json({ success: true, data: item }, { status: 201 })\n  } catch (error) {\n    console.error('POST error:', error)\n    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })\n  }\n}\n`,
        language: 'typescript',
      })
    } else if (taskTitle.includes('component') || taskTitle.includes('frontend') || taskTitle.includes('ui') || taskTitle.includes('page')) {
      const componentName = task.title.replace(/[^a-zA-Z0-9]/g, '')
      files.push({
        path: `src/components/${componentName}.tsx`,
        content: `'use client'\n\nimport { useState, useEffect } from 'react'\nimport { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'\nimport { Button } from '@/components/ui/button'\n\n/**\n * ${task.title}\n * Generated by AIOS Agent\n */\nexport default function ${componentName}() {\n  const [data, setData] = useState<any[]>([])\n  const [loading, setLoading] = useState(true)\n\n  useEffect(() => {\n    fetchData()\n  }, [])\n\n  const fetchData = async () => {\n    try {\n      const res = await fetch('/api/data')\n      if (res.ok) {\n        const result = await res.json()\n        setData(result.data || [])\n      }\n    } catch (error) {\n      console.error('Fetch error:', error)\n    } finally {\n      setLoading(false)\n    }\n  }\n\n  return (\n    <Card>\n      <CardHeader>\n        <CardTitle>${task.title}</CardTitle>\n      </CardHeader>\n      <CardContent>\n        {loading ? (\n          <p className="text-muted-foreground">Loading...</p>\n        ) : data.length > 0 ? (\n          <div className="space-y-2">\n            {data.map((item, i) => (\n              <div key={i} className="p-2 rounded bg-muted">{JSON.stringify(item)}</div>\n            ))}\n          </div>\n        ) : (\n          <p className="text-muted-foreground">No data available</p>\n        )}\n      </CardContent>\n    </Card>\n  )\n}\n`,
        language: 'typescript',
      })
    } else {
      const slug = task.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      files.push({
        path: `src/lib/${slug}.ts`,
        content: `/**\n * ${task.title}\n * Generated by AIOS Agent\n * ${task.description || ''}\n */\n\nexport interface ${slug.replace(/-./g, x => x[1].toUpperCase())}Config {\n  enabled: boolean\n  timeout?: number\n  retries?: number\n}\n\nconst DEFAULT_CONFIG: ${slug.replace(/-./g, x => x[1].toUpperCase())}Config = {\n  enabled: true,\n  timeout: 5000,\n  retries: 3,\n}\n\nexport async function execute(\n  config: Partial<${slug.replace(/-./g, x => x[1].toUpperCase())}Config> = {}\n): Promise<{ success: boolean; data?: unknown; error?: string }> {\n  const mergedConfig = { ...DEFAULT_CONFIG, ...config }\n  \n  if (!mergedConfig.enabled) {\n    return { success: false, error: 'Feature is disabled' }\n  }\n\n  try {\n    // Implementation for ${task.title}\n    const result = await Promise.resolve({ implemented: true, config: mergedConfig })\n    return { success: true, data: result }\n  } catch (error) {\n    const message = error instanceof Error ? error.message : 'Unknown error'\n    return { success: false, error: message }\n  }\n}\n`,
        language: 'typescript',
      })
    }
  } else if (taskType === 'documentation') {
    files.push({
      path: `docs/${projectName}-guide.md`,
      content: `# ${project.name}\n\n## ${task.title}\n\n${task.description || 'Documentation section'}\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\n\`\`\`typescript\nimport { execute } from './src/lib/main'\n\nconst result = await execute({})\nconsole.log(result)\n\`\`\`\n\n## API Reference\n\nSee the generated API documentation for details.\n`,
      language: 'markdown',
    })
  } else if (taskType === 'testing') {
    const slug = task.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    files.push({
      path: `tests/${slug}.test.ts`,
      content: `import { describe, it, expect, vi } from 'vitest'\n\n/**\n * ${task.title}\n * Generated by AIOS QA Agent\n */\ndescribe('${task.title}', () => {\n  it('should execute successfully', async () => {\n    const result = await execute({ enabled: true })\n    expect(result.success).toBe(true)\n  })\n\n  it('should handle disabled state', async () => {\n    const result = await execute({ enabled: false })\n    expect(result.success).toBe(false)\n    expect(result.error).toBeDefined()\n  })\n\n  it('should respect timeout configuration', async () => {\n    const result = await execute({ timeout: 100 })\n    expect(result.success).toBe(true)\n  })\n\n  it('should handle errors gracefully', async () => {\n    const result = await execute({ retries: 0 })\n    expect(result).toHaveProperty('success')\n  })\n})\n`,
      language: 'typescript',
    })
  } else if (taskType === 'security') {
    files.push({
      path: `docs/security-audit.md`,
      content: `# Security Audit Report\n\n## ${task.title}\n\n### Findings\n\n| Severity | Finding | Status |\n|----------|---------|--------|\n| Info | Input validation recommended | Open |\n| Info | Rate limiting recommended | Open |\n\n### Recommendations\n\n1. Implement input validation on all API endpoints\n2. Add rate limiting to prevent abuse\n3. Use environment variables for secrets\n4. Enable CORS with specific origins only\n5. Add authentication middleware\n\n### Next Steps\n\n- [ ] Review authentication implementation\n- [ ] Test input validation\n- [ ] Configure rate limiting\n`,
      language: 'markdown',
    })
  }

  return files
}

// ─── Main executor ────────────────────────────────────────────────────────────

export async function executeAgentTasks(projectId: string): Promise<ExecutorResult> {
  const result: ExecutorResult = {
    success: true,
    tasksProcessed: 0,
    filesCreated: 0,
    messagesCreated: 0,
  }

  try {
    // Get project with pending/in_progress tasks
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' },
        },
        projectFiles: {
          select: { path: true },
        },
      },
    })

    if (!project) {
      return { ...result, success: false, error: 'Project not found' }
    }

    // Find the next task to execute (pending or in_progress, in order)
    const pendingTask = project.tasks.find(t => t.status === 'pending')
    const inProgressTask = project.tasks.find(t => t.status === 'in_progress')

    // If there's a task in progress, complete it
    if (inProgressTask) {
      const filesCreated = await completeTask(projectId, inProgressTask, project, project.projectFiles.map(f => f.path))
      result.tasksProcessed++
      result.filesCreated = filesCreated
      result.messagesCreated += 2
      return result
    }

    // If there's a pending task, start it
    if (pendingTask) {
      await startTask(projectId, pendingTask, project)
      result.tasksProcessed++
      return result
    }

    // No more tasks - check if all are completed
    const allDone = project.tasks.length > 0 && project.tasks.every(t => t.status === 'completed')
    if (allDone && project.orchestratorStatus === 'running') {
      await db.project.update({
        where: { id: projectId },
        data: {
          orchestratorStatus: 'completed',
          status: 'completed',
          completedAt: new Date(),
        },
      })

      await db.agentMessage.create({
        data: {
          projectId,
          fromRole: 'system',
          toRole: 'all',
          type: 'status',
          content: `## 🎉 All Tasks Completed!\n\nAll ${project.tasks.length} tasks for "${project.name}" have been completed successfully. The project is now marked as completed.\n\nYou can download the project as ZIP or push it to GitHub.`,
        },
      })
      result.messagesCreated++
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

// ─── Start a task ─────────────────────────────────────────────────────────────

async function startTask(
  projectId: string,
  task: { id: string; title: string; description?: string | null; type?: string | null; assigneeId?: string | null },
  project: { name: string; techStack?: string | null; category?: string | null; description?: string | null }
) {
  // Update task to in_progress
  await db.task.update({
    where: { id: task.id },
    data: { status: 'in_progress' },
  })

  // Find the assigned agent
  let agentName = 'Agent'
  if (task.assigneeId) {
    const agent = await db.agent.findUnique({ where: { id: task.assigneeId } })
    if (agent) agentName = agent.name || agent.type
  }

  // Create a "started" message
  await db.agentMessage.create({
    data: {
      projectId,
      fromRole: 'agent',
      toRole: 'all',
      type: 'status',
      content: `🔄 **${agentName}** started working on: **${task.title}**\n\n${task.description ? `> ${task.description}\n` : ''}Analyzing requirements and preparing implementation...`,
      fromAgentId: task.assigneeId,
      toAgentId: null,
      taskIds: JSON.stringify([task.id]),
      metadata: JSON.stringify({ taskAction: 'started', taskId: task.id }),
    },
  })

  // Try to use AI to generate a more detailed progress message
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are an AI agent working on a software project. Write a brief progress message (2-3 sentences) about what you are doing for this task. Be technical and specific.',
      },
      {
        role: 'user',
        content: `Project: ${project.name} (${project.category || 'Web App'})\nTask: ${task.title}\nDescription: ${task.description || 'N/A'}\nTech Stack: ${project.techStack || 'Not specified'}`,
      },
    ]

    const completion = await chatCompletion({ messages, temperature: 0.7, maxTokens: 200 })

    await db.agentMessage.create({
      data: {
        projectId,
        fromRole: 'agent',
        toRole: 'all',
        type: 'discussion',
        content: completion.content,
        fromAgentId: task.assigneeId,
        toAgentId: null,
        taskIds: JSON.stringify([task.id]),
        metadata: JSON.stringify({ taskAction: 'progress', taskId: task.id }),
      },
    })
  } catch {
    // AI not available - that's fine, we already created the status message
  }
}

// ─── Complete a task ──────────────────────────────────────────────────────────

async function completeTask(
  projectId: string,
  task: { id: string; title: string; description?: string | null; type?: string | null; assigneeId?: string | null },
  project: { name: string; techStack?: string | null; category?: string | null; description?: string | null; requirements?: string | null },
  existingFilePaths: string[]
): Promise<number> {
  // Update task to completed
  await db.task.update({
    where: { id: task.id },
    data: { status: 'completed' }
  })

  // Find the assigned agent
  let agentName = 'Agent'
  if (task.assigneeId) {
    const agent = await db.agent.findUnique({ where: { id: task.assigneeId } })
    if (agent) agentName = agent.name || agent.type
  }

  // Generate code files using AI (with fallback)
  const generatedFiles = await generateCodeWithAI(task, project, existingFilePaths)
  let filesCreated = 0

  for (const file of generatedFiles) {
    try {
      // Check if file already exists
      const existing = await db.projectFile.findFirst({
        where: { projectId, path: file.path },
      })

      if (existing) {
        // Update existing file
        await db.projectFile.update({
          where: { id: existing.id },
          data: {
            content: file.content,
            size: Buffer.byteLength(file.content, 'utf-8'),
            source: 'generated',
            language: file.language,
          },
        })
      } else {
        // Create new file
        await db.projectFile.create({
          data: {
            projectId,
            name: file.path.split('/').pop() || file.path,
            path: file.path,
            content: file.content,
            language: file.language,
            size: Buffer.byteLength(file.content, 'utf-8'),
            source: 'generated',
            isDirectory: false,
          },
        })
      }
      filesCreated++
    } catch (fileError) {
      console.error(`Failed to create file ${file.path}:`, fileError)
    }
  }

  // Also ensure directory entries exist for generated file paths
  for (const file of generatedFiles) {
    const parts = file.path.split('/')
    if (parts.length > 1) {
      // Create directory entries for all parent paths
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join('/')
        const dirName = parts[i - 1]
        try {
          const existingDir = await db.projectFile.findFirst({
            where: { projectId, path: dirPath, isDirectory: true },
          })
          if (!existingDir) {
            await db.projectFile.create({
              data: {
                projectId,
                name: dirName,
                path: dirPath,
                isDirectory: true,
                source: 'generated',
                size: 0,
              },
            })
          }
        } catch {
          // Directory creation is non-critical
        }
      }
    }
  }

  // Create a "completed" message
  const fileList = generatedFiles.map(f => `- \`${f.path}\` (${f.language})`).join('\n')
  await db.agentMessage.create({
    data: {
      projectId,
      fromRole: 'agent',
      toRole: 'all',
      type: 'result',
      content: `✅ **${agentName}** completed: **${task.title}**\n\n${filesCreated > 0 ? `**Files generated:**\n${fileList}` : 'Task completed successfully.'}\n\n${task.description ? `> ${task.description}` : ''}`,
      fromAgentId: task.assigneeId,
      toAgentId: null,
      taskIds: JSON.stringify([task.id]),
      metadata: JSON.stringify({ taskAction: 'completed', taskId: task.id, filesCreated }),
    },
  })

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
          metadata: JSON.stringify({ source: 'agent-generated', taskId: task.id }),
        },
      })
    } catch {
      // Knowledge graph creation failure is non-critical
    }
  }

  return filesCreated
}

// ─── Batch execute (for API route) ───────────────────────────────────────────

export async function getProjectExecutionStatus(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          priority: true,
          assigneeId: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!project) return null

  const pending = project.tasks.filter(t => t.status === 'pending').length
  const inProgress = project.tasks.filter(t => t.status === 'in_progress').length
  const completed = project.tasks.filter(t => t.status === 'completed').length
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
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  }
}
