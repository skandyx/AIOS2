import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/projects/[id]/mcp - Get all MCP servers assigned to a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const projectMCPServers = await db.projectMCPServer.findMany({
      where: { projectId: id },
      include: {
        mcpServer: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            category: true,
            isInstalled: true,
            isEnabled: true,
            isRunning: true,
            transportType: true,
            version: true,
            author: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(projectMCPServers)
  } catch (error) {
    console.error('Get project MCP servers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project MCP servers' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/mcp - Add an MCP server to a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { mcpServerId, role } = body

    if (!mcpServerId) {
      return NextResponse.json(
        { error: 'MCP Server ID is required' },
        { status: 400 }
      )
    }

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const mcpServer = await db.mCPServer.findUnique({ where: { id: mcpServerId } })
    if (!mcpServer) {
      return NextResponse.json(
        { error: 'MCP Server not found' },
        { status: 404 }
      )
    }

    // Check if already assigned
    const existing = await db.projectMCPServer.findUnique({
      where: {
        projectId_mcpServerId: { projectId: id, mcpServerId },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'MCP Server is already assigned to this project' },
        { status: 409 }
      )
    }

    const projectMCPServer = await db.projectMCPServer.create({
      data: {
        projectId: id,
        mcpServerId,
        role: role || null,
      },
      include: {
        mcpServer: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            category: true,
            isInstalled: true,
            isEnabled: true,
            isRunning: true,
            transportType: true,
          },
        },
      },
    })

    return NextResponse.json(projectMCPServer, { status: 201 })
  } catch (error) {
    console.error('Add project MCP server error:', error)
    return NextResponse.json(
      { error: 'Failed to add MCP server to project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/mcp - Remove an MCP server from a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { mcpServerId } = body

    if (!mcpServerId) {
      return NextResponse.json(
        { error: 'MCP Server ID is required' },
        { status: 400 }
      )
    }

    const projectMCPServer = await db.projectMCPServer.findUnique({
      where: {
        projectId_mcpServerId: { projectId: id, mcpServerId },
      },
    })

    if (!projectMCPServer) {
      return NextResponse.json(
        { error: 'MCP Server is not assigned to this project' },
        { status: 404 }
      )
    }

    await db.projectMCPServer.delete({
      where: {
        projectId_mcpServerId: { projectId: id, mcpServerId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove project MCP server error:', error)
    return NextResponse.json(
      { error: 'Failed to remove MCP server from project' },
      { status: 500 }
    )
  }
}
