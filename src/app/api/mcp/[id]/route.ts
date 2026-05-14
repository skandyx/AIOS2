import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/mcp/[id] - Get a specific MCP server by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const server = await db.mCPServer.findUnique({
      where: { id },
    })

    if (!server) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(server)
  } catch (error) {
    console.error('Get MCP server error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MCP server' },
      { status: 500 }
    )
  }
}

// PATCH /api/mcp/[id] - Update MCP server (toggle isEnabled, update config, toggle isRunning)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const server = await db.mCPServer.findUnique({ where: { id } })

    if (!server) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    // Toggle enabled status
    if (body.isEnabled !== undefined) {
      updateData.isEnabled = Boolean(body.isEnabled)
    }

    // Update configuration
    if (body.config !== undefined) {
      updateData.config =
        typeof body.config === 'string'
          ? body.config
          : JSON.stringify(body.config)
    }

    // Toggle running status
    if (body.isRunning !== undefined) {
      updateData.isRunning = Boolean(body.isRunning)
    }

    // Update basic fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined)
      updateData.description = body.description
    if (body.version !== undefined) updateData.version = body.version
    if (body.author !== undefined) updateData.author = body.author
    if (body.category !== undefined) updateData.category = body.category
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.transportType !== undefined)
      updateData.transportType = body.transportType
    if (body.command !== undefined) updateData.command = body.command

    // JSON-serialized fields
    if (body.args !== undefined) {
      updateData.args =
        typeof body.args === 'string' ? body.args : JSON.stringify(body.args)
    }
    if (body.envVars !== undefined) {
      updateData.envVars =
        typeof body.envVars === 'string'
          ? body.envVars
          : JSON.stringify(body.envVars)
    }
    if (body.permissions !== undefined) {
      updateData.permissions =
        typeof body.permissions === 'string'
          ? body.permissions
          : JSON.stringify(body.permissions)
    }
    if (body.tags !== undefined) {
      updateData.tags =
        typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags)
    }

    // Other updatable fields
    if (body.repoUrl !== undefined) updateData.repoUrl = body.repoUrl
    if (body.packageName !== undefined)
      updateData.packageName = body.packageName
    if (body.sourceType !== undefined) updateData.sourceType = body.sourceType
    if (body.isInstalled !== undefined)
      updateData.isInstalled = Boolean(body.isInstalled)
    if (body.isVerified !== undefined)
      updateData.isVerified = Boolean(body.isVerified)
    if (body.metadata !== undefined) {
      updateData.metadata =
        typeof body.metadata === 'string'
          ? body.metadata
          : JSON.stringify(body.metadata)
    }

    const updated = await db.mCPServer.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update MCP server error:', error)
    return NextResponse.json(
      { error: 'Failed to update MCP server' },
      { status: 500 }
    )
  }
}

// DELETE /api/mcp/[id] - Uninstall/remove an MCP server
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const server = await db.mCPServer.findUnique({ where: { id } })

    if (!server) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 }
      )
    }

    await db.mCPServer.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete MCP server error:', error)
    return NextResponse.json(
      { error: 'Failed to uninstall MCP server' },
      { status: 500 }
    )
  }
}
