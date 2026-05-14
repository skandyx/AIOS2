import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to parse JSON string fields from the database
function parseSkillFields(skill: Record<string, unknown>) {
  return {
    ...skill,
    tags: skill.tags ? JSON.parse(skill.tags as string) : [],
    permissions: skill.permissions ? JSON.parse(skill.permissions as string) : [],
    config: skill.config ? JSON.parse(skill.config as string) : null,
    metadata: skill.metadata ? JSON.parse(skill.metadata as string) : null,
  }
}

// GET /api/skills/[id] - Get a specific skill by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const skill = await db.skill.findUnique({
      where: { id },
    })

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(parseSkillFields(skill))
  } catch (error) {
    console.error('Get skill error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skill' },
      { status: 500 }
    )
  }
}

// PATCH /api/skills/[id] - Update skill (toggle isEnabled, update config)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const skill = await db.skill.findUnique({ where: { id } })

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    // Toggle enabled status
    if (body.isEnabled !== undefined) {
      updateData.isEnabled = Boolean(body.isEnabled)
    }

    // Update config (stored as JSON string)
    if (body.config !== undefined) {
      updateData.config = JSON.stringify(body.config)
    }

    // Update permissions (stored as JSON string)
    if (body.permissions !== undefined) {
      updateData.permissions = JSON.stringify(body.permissions)
    }

    // Update basic fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.version !== undefined) updateData.version = body.version
    if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags)
    if (body.entryPoint !== undefined) updateData.entryPoint = body.entryPoint
    if (body.branch !== undefined) updateData.branch = body.branch
    if (body.isVerified !== undefined) updateData.isVerified = Boolean(body.isVerified)

    // Update metadata (merge with existing)
    if (body.metadata !== undefined) {
      const existingMeta = skill.metadata
        ? JSON.parse(skill.metadata)
        : {}
      updateData.metadata = JSON.stringify({
        ...existingMeta,
        ...body.metadata,
      })
    }

    const updated = await db.skill.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(parseSkillFields(updated))
  } catch (error) {
    console.error('Update skill error:', error)
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    )
  }
}

// DELETE /api/skills/[id] - Uninstall/remove a skill
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const skill = await db.skill.findUnique({ where: { id } })

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      )
    }

    await db.skill.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: `Skill "${skill.name}" has been uninstalled`,
    })
  } catch (error) {
    console.error('Delete skill error:', error)
    return NextResponse.json(
      { error: 'Failed to uninstall skill' },
      { status: 500 }
    )
  }
}
