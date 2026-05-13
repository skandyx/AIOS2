import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/agents - List all agents with their status
export async function GET() {
  try {
    const agents = await db.agent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            tasksAssigned: true,
            messages: true,
          },
        },
      },
    })

    return NextResponse.json(agents)
  } catch (error) {
    console.error('List agents error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}

// POST /api/agents - Create/register new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, description, capabilities, config } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    const agent = await db.agent.create({
      data: {
        name,
        type,
        description: description || null,
        capabilities: capabilities ? JSON.stringify(capabilities) : null,
        config: config ? JSON.stringify(config) : null,
      },
    })

    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    console.error('Create agent error:', error)
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    )
  }
}
