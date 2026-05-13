import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/integrations - List all integrations
export async function GET() {
  try {
    const userId = await getDefaultUserId()

    const integrations = await db.integration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(integrations)
  } catch (error) {
    console.error('List integrations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}

// POST /api/integrations - Add integration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, config } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    const integration = await db.integration.create({
      data: {
        name,
        type,
        config: config ? JSON.stringify(config) : null,
        status: 'disconnected',
        userId,
      },
    })

    return NextResponse.json(integration, { status: 201 })
  } catch (error) {
    console.error('Create integration error:', error)
    return NextResponse.json(
      { error: 'Failed to add integration' },
      { status: 500 }
    )
  }
}
