import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/projects/[id]/skills - Get all skills assigned to a project
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

    const projectSkills = await db.projectSkill.findMany({
      where: { projectId: id },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            category: true,
            isInstalled: true,
            isEnabled: true,
            version: true,
            author: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(projectSkills)
  } catch (error) {
    console.error('Get project skills error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project skills' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/skills - Add a skill to a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { skillId, role } = body

    if (!skillId) {
      return NextResponse.json(
        { error: 'Skill ID is required' },
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

    const skill = await db.skill.findUnique({ where: { id: skillId } })
    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      )
    }

    // Check if already assigned
    const existing = await db.projectSkill.findUnique({
      where: {
        projectId_skillId: { projectId: id, skillId },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Skill is already assigned to this project' },
        { status: 409 }
      )
    }

    const projectSkill = await db.projectSkill.create({
      data: {
        projectId: id,
        skillId,
        role: role || null,
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            category: true,
            isInstalled: true,
            isEnabled: true,
          },
        },
      },
    })

    return NextResponse.json(projectSkill, { status: 201 })
  } catch (error) {
    console.error('Add project skill error:', error)
    return NextResponse.json(
      { error: 'Failed to add skill to project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/skills - Remove a skill from a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { skillId } = body

    if (!skillId) {
      return NextResponse.json(
        { error: 'Skill ID is required' },
        { status: 400 }
      )
    }

    const projectSkill = await db.projectSkill.findUnique({
      where: {
        projectId_skillId: { projectId: id, skillId },
      },
    })

    if (!projectSkill) {
      return NextResponse.json(
        { error: 'Skill is not assigned to this project' },
        { status: 404 }
      )
    }

    await db.projectSkill.delete({
      where: {
        projectId_skillId: { projectId: id, skillId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove project skill error:', error)
    return NextResponse.json(
      { error: 'Failed to remove skill from project' },
      { status: 500 }
    )
  }
}
