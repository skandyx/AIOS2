import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/projects - List all projects for the current user
// Supports optional filters: ?status=in_progress, ?category=web_app
export async function GET(request: NextRequest) {
  try {
    const userId = await getDefaultUserId()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    const where: Record<string, unknown> = { userId }

    if (status) {
      where.status = status
    }
    if (category) {
      where.category = category
    }

    const projects = await db.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            tasks: true,
            projectSkills: true,
            projectMCPServers: true,
          },
        },
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('List projects error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const userId = await getDefaultUserId()
    const body = await request.json()
    const {
      name,
      description,
      status,
      priority,
      category,
      icon,
      techStack,
      requirements,
      notes,
      tags,
      dueDate,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const project = await db.project.create({
      data: {
        name,
        description: description || null,
        status: status || 'planning',
        priority: priority || 'medium',
        category: category || null,
        icon: icon || null,
        techStack: techStack ? JSON.stringify(techStack) : null,
        requirements: requirements || null,
        notes: notes || null,
        tags: tags ? JSON.stringify(tags) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        startedAt: status === 'in_progress' ? new Date() : null,
        userId,
      },
      include: {
        _count: {
          select: {
            tasks: true,
            projectSkills: true,
            projectMCPServers: true,
          },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
