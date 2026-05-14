import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// Helper to generate a URL-friendly slug from a name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// GET /api/mcp - List all installed MCP servers
// Supports optional query params: ?search=q and ?category=database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const category = searchParams.get('category')?.trim() || ''

    const where: Record<string, unknown> = {
      isInstalled: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { author: { contains: search } },
        { packageName: { contains: search } },
      ]
    }

    if (category) {
      where.category = category
    }

    const servers = await db.mCPServer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(servers)
  } catch (error) {
    console.error('List MCP servers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MCP servers' },
      { status: 500 }
    )
  }
}

// POST /api/mcp - Install an MCP server
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      slug: providedSlug,
      description,
      version,
      author,
      category,
      sourceType,
      repoUrl,
      packageName,
      transportType,
      command,
      args,
      envVars,
      permissions,
      config,
      icon,
      tags,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const slug = providedSlug || generateSlug(name)

    if (!slug) {
      return NextResponse.json(
        { error: 'Could not generate a valid slug from the name' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    // Check if MCP server with this slug already exists
    const existing = await db.mCPServer.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: 'MCP server with this slug already exists' },
        { status: 400 }
      )
    }

    const server = await db.mCPServer.create({
      data: {
        name,
        slug,
        description: description || null,
        version: version || null,
        author: author || null,
        category: category || null,
        sourceType: sourceType || 'registry',
        repoUrl: repoUrl || null,
        packageName: packageName || null,
        transportType: transportType || 'stdio',
        command: command || null,
        args: args ? (typeof args === 'string' ? args : JSON.stringify(args)) : null,
        envVars: envVars ? (typeof envVars === 'string' ? envVars : JSON.stringify(envVars)) : null,
        permissions: permissions ? (typeof permissions === 'string' ? permissions : JSON.stringify(permissions)) : null,
        config: config ? (typeof config === 'string' ? config : JSON.stringify(config)) : null,
        icon: icon || null,
        tags: tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
        isInstalled: true,
        isEnabled: true,
        installedAt: new Date(),
        userId,
      },
    })

    return NextResponse.json(server, { status: 201 })
  } catch (error) {
    console.error('Install MCP server error:', error)
    return NextResponse.json(
      { error: 'Failed to install MCP server' },
      { status: 500 }
    )
  }
}
