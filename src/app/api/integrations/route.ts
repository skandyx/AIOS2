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
    const { name, type, config, credentials, apiKey } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    // Build credentials object if apiKey is provided
    const credsData = credentials
      ? JSON.stringify(credentials)
      : apiKey
        ? JSON.stringify({ apiKey })
        : null

    const integration = await db.integration.create({
      data: {
        name,
        type,
        config: config ? JSON.stringify(config) : null,
        credentials: credsData,
        status: apiKey ? 'connected' : 'disconnected',
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

// PUT /api/integrations - Update integration credentials
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, config, credentials, apiKey, webhookUrl } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    // Verify the integration belongs to the user
    const existing = await db.integration.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name
    if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl
    if (config !== undefined) updateData.config = JSON.stringify(config)

    // Handle credentials - store apiKey if provided
    if (credentials !== undefined) {
      updateData.credentials = JSON.stringify(credentials)
    } else if (apiKey !== undefined) {
      // Merge with existing credentials if any
      let existingCreds: Record<string, string> = {}
      if (existing.credentials) {
        try {
          existingCreds = JSON.parse(existing.credentials)
        } catch {
          // ignore parse errors
        }
      }
      updateData.credentials = JSON.stringify({ ...existingCreds, apiKey })
    }

    // If we have credentials, mark as connected
    if (apiKey || credentials) {
      updateData.status = 'connected'
      updateData.lastSyncedAt = new Date()
      updateData.error = null
    }

    const integration = await db.integration.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(integration)
  } catch (error) {
    console.error('Update integration error:', error)
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    )
  }
}
