import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'
import { chatCompletion, type ChatMessage } from '@/lib/providers'

// Helper: map DB status to frontend status
function mapStatusToFrontend(status: string): string {
  switch (status) {
    case 'pending':
      return 'todo'
    case 'completed':
      return 'done'
    case 'in_progress':
      return 'in_progress'
    default:
      return status
  }
}

// Helper: extract JSON from AI response (handles markdown code blocks, prefixes, etc.)
function extractJsonFromResponse(text: string): string {
  // Try to find JSON within markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Try to find a JSON array directly in the text
  // Look for the first [ and last ] to extract the array
  const firstBracket = text.indexOf('[')
  const lastBracket = text.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    return text.substring(firstBracket, lastBracket + 1)
  }

  // Return raw text as last resort
  return text.trim()
}

// GET /api/projects/[id]/analyze - Get project tasks and analysis availability
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
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
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Map tasks with frontend-friendly status
    const tasks = project.tasks.map((task) => ({
      ...task,
      status: mapStatusToFrontend(task.status),
    }))

    // Determine if AI analysis is available (project has description or requirements)
    const analysisAvailable = !!(project.description || project.requirements)

    return NextResponse.json({
      tasks,
      analysisAvailable,
    })
  } catch (error) {
    console.error('Get project analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project analysis' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/analyze - Analyze project and generate tasks with AI
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. Get the project by ID
    const project = await db.project.findUnique({
      where: { id },
    })

    // 2. If project not found, return 404
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // 3. Get userId
    const userId = await getDefaultUserId()

    // 4. Build system prompt
    const systemPrompt = `You are an AI project analyst. Given a project description, generate a detailed task breakdown.

Analyze the project and return a JSON array of tasks. Each task should have:
- title: string (concise task title)
- description: string (detailed description of what needs to be done)
- priority: "low" | "medium" | "high" | "critical"
- type: "development" | "research" | "analysis" | "automation" | "design" | "testing" | "deployment"

Return ONLY the JSON array, no markdown, no explanation. Example:
[{"title":"Set up project structure","description":"Initialize the project with the appropriate folder structure and configuration files","priority":"high","type":"development"}]`

    // 5. Build user message with all project details
    let techStackDisplay = project.techStack || ''
    if (techStackDisplay) {
      try {
        const parsed = JSON.parse(techStackDisplay)
        if (Array.isArray(parsed)) {
          techStackDisplay = parsed.join(', ')
        }
      } catch {
        // Keep as-is if not valid JSON
      }
    }

    const userMessage = `Please analyze the following project and generate a comprehensive task breakdown:

**Project Name:** ${project.name}
${project.description ? `**Description:** ${project.description}` : ''}
${project.category ? `**Category:** ${project.category}` : ''}
${techStackDisplay ? `**Tech Stack:** ${techStackDisplay}` : ''}
${project.requirements ? `**Requirements:** ${project.requirements}` : ''}
${project.notes ? `**Notes:** ${project.notes}` : ''}
${project.priority ? `**Priority:** ${project.priority}` : ''}

Generate a detailed, actionable task breakdown that covers all phases of this project from planning to deployment.`

    // 6. Call chatCompletion with the messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    let aiResponse: string
    try {
      const completion = await chatCompletion({ messages })
      aiResponse = completion.content
    } catch (aiError) {
      console.error('AI analysis failed:', aiError)
      const errorMessage = aiError instanceof Error ? aiError.message : 'AI analysis failed'
      return NextResponse.json({
        success: false,
        error: errorMessage,
        tasksCreated: 0,
        tasks: [],
      })
    }

    // 7. Parse the AI response to extract task definitions
    let parsedTasks: Array<{
      title: string
      description: string
      priority: string
      type: string
    }>

    try {
      const jsonStr = extractJsonFromResponse(aiResponse)
      parsedTasks = JSON.parse(jsonStr)

      if (!Array.isArray(parsedTasks)) {
        throw new Error('AI response is not a JSON array')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError)
      console.error('Raw AI response:', aiResponse)

      // Create a single fallback task with the raw AI response as description
      const fallbackTask = await db.task.create({
        data: {
          title: `AI Analysis for ${project.name}`,
          description: aiResponse,
          status: 'pending',
          priority: project.priority || 'medium',
          type: 'analysis',
          projectId: id,
          creatorId: userId,
          metadata: JSON.stringify({
            source: 'ai_analysis',
            generatedAt: new Date().toISOString(),
            fallback: true,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        tasksCreated: 1,
        tasks: [
          {
            ...fallbackTask,
            status: mapStatusToFrontend(fallbackTask.status),
          },
        ],
      })
    }

    // 8. Create each task in the database
    const createdTasks = []
    for (const taskDef of parsedTasks) {
      const task = await db.task.create({
        data: {
          title: taskDef.title || 'Untitled Task',
          description: taskDef.description || null,
          status: 'pending',
          priority: taskDef.priority || 'medium',
          type: taskDef.type || 'development',
          projectId: id,
          creatorId: userId,
          metadata: JSON.stringify({
            source: 'ai_analysis',
            generatedAt: new Date().toISOString(),
          }),
        },
      })

      createdTasks.push({
        ...task,
        status: mapStatusToFrontend(task.status),
      })
    }

    // 9. Return the created tasks
    return NextResponse.json({
      success: true,
      tasksCreated: createdTasks.length,
      tasks: createdTasks,
    })
  } catch (error) {
    console.error('Project analysis error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      tasksCreated: 0,
      tasks: [],
    })
  }
}
