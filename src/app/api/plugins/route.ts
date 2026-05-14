import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/plugins - List all plugins
export async function GET() {
  try {
    const plugins = await db.plugin.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(plugins)
  } catch (error) {
    console.error('List plugins error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plugins' },
      { status: 500 }
    )
  }
}

// POST /api/plugins - Install/register plugin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, slug, description, version, permissions, config } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    // Check if plugin with this slug already exists
    const existing = await db.plugin.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: 'Plugin with this slug already exists' },
        { status: 400 }
      )
    }

    const plugin = await db.plugin.create({
      data: {
        name,
        slug,
        description: description || null,
        version: version || null,
        permissions: permissions ? JSON.stringify(permissions) : null,
        config: config ? JSON.stringify(config) : null,
        isInstalled: true,
        isEnabled: true,
        installedAt: new Date(),
        userId,
      },
    })

    return NextResponse.json(plugin, { status: 201 })
  } catch (error) {
    console.error('Create plugin error:', error)
    return NextResponse.json(
      { error: 'Failed to install plugin' },
      { status: 500 }
    )
  }
}
