import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/plugins/[id] - Get plugin details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const plugin = await db.plugin.findUnique({
      where: { id },
    })

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(plugin)
  } catch (error) {
    console.error('Get plugin error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plugin' },
      { status: 500 }
    )
  }
}

// PATCH /api/plugins/[id] - Update plugin (toggle enabled, update config)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const plugin = await db.plugin.findUnique({ where: { id } })

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled
    if (body.isInstalled !== undefined) updateData.isInstalled = body.isInstalled
    if (body.config !== undefined) updateData.config = JSON.stringify(body.config)
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.version !== undefined) updateData.version = body.version

    const updated = await db.plugin.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update plugin error:', error)
    return NextResponse.json(
      { error: 'Failed to update plugin' },
      { status: 500 }
    )
  }
}

// DELETE /api/plugins/[id] - Uninstall plugin
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const plugin = await db.plugin.findUnique({ where: { id } })

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      )
    }

    await db.plugin.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete plugin error:', error)
    return NextResponse.json(
      { error: 'Failed to uninstall plugin' },
      { status: 500 }
    )
  }
}
