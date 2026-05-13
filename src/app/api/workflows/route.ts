import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/workflows - List all workflows
export async function GET() {
  try {
    const userId = await getDefaultUserId()

    const workflows = await db.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { tasks: true, executions: true },
        },
      },
    })

    return NextResponse.json(workflows)
  } catch (error) {
    console.error('List workflows error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    )
  }
}

// POST /api/workflows - Create new workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, nodes, edges, variables } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    const workflow = await db.workflow.create({
      data: {
        name,
        description: description || null,
        nodes: typeof nodes === 'string' ? nodes : JSON.stringify(nodes || []),
        edges: typeof edges === 'string' ? edges : JSON.stringify(edges || []),
        variables: variables
          ? typeof variables === 'string'
            ? variables
            : JSON.stringify(variables)
          : null,
        userId,
      },
    })

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    console.error('Create workflow error:', error)
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    )
  }
}
