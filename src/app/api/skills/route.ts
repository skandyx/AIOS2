import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/skills - List all installed skills, with optional search and category filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const category = searchParams.get('category')?.trim()

    const where: Record<string, unknown> = { isInstalled: true }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { repoName: { contains: search } },
        { repoOwner: { contains: search } },
      ]
    }

    const skills = await db.skill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Parse JSON string fields for cleaner API response
    const parsed = skills.map((skill) => ({
      ...skill,
      tags: skill.tags ? JSON.parse(skill.tags) : [],
      permissions: skill.permissions ? JSON.parse(skill.permissions) : [],
      config: skill.config ? JSON.parse(skill.config) : null,
      metadata: skill.metadata ? JSON.parse(skill.metadata) : null,
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('List skills error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    )
  }
}

// POST /api/skills - Install a skill (from GitHub or local)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sourceType,
      repoUrl,
      repoOwner,
      repoName,
      name,
      description,
      category,
      branch,
      entryPoint,
      permissions,
      config,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    // Generate a slug from the name and repo info
    const slug =
      body.slug ||
      (repoOwner && repoName
        ? `${repoOwner}-${repoName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        : name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))

    // Check if skill with this slug already exists
    const existing = await db.skill.findUnique({ where: { slug } })
    if (existing) {
      // If already installed, return the existing one
      if (existing.isInstalled) {
        return NextResponse.json(
          { error: 'Skill is already installed', skill: existing },
          { status: 400 }
        )
      }
      // If previously uninstalled, re-enable it
      const reinstalled = await db.skill.update({
        where: { slug },
        data: {
          isInstalled: true,
          isEnabled: true,
          installedAt: new Date(),
          userId,
          description: description || existing.description,
          category: category || existing.category,
          version: body.version || existing.version,
          config: config ? JSON.stringify(config) : existing.config,
          permissions: permissions
            ? JSON.stringify(permissions)
            : existing.permissions,
        },
      })

      return NextResponse.json({
        ...reinstalled,
        tags: reinstalled.tags ? JSON.parse(reinstalled.tags) : [],
        permissions: reinstalled.permissions
          ? JSON.parse(reinstalled.permissions)
          : [],
        config: reinstalled.config ? JSON.parse(reinstalled.config) : null,
        metadata: reinstalled.metadata ? JSON.parse(reinstalled.metadata) : null,
      })
    }

    const skill = await db.skill.create({
      data: {
        name,
        slug,
        description: description || null,
        version: body.version || null,
        author: repoOwner || body.author || null,
        category: category || null,
        icon: body.icon || null,
        tags: body.tags ? JSON.stringify(body.tags) : null,
        permissions: permissions ? JSON.stringify(permissions) : null,
        config: config ? JSON.stringify(config) : null,
        sourceType: sourceType || 'github',
        repoUrl: repoUrl || null,
        repoOwner: repoOwner || null,
        repoName: repoName || null,
        branch: branch || null,
        entryPoint: entryPoint || null,
        isInstalled: true,
        isEnabled: true,
        installedAt: new Date(),
        userId,
      },
    })

    return NextResponse.json(
      {
        ...skill,
        tags: skill.tags ? JSON.parse(skill.tags) : [],
        permissions: skill.permissions ? JSON.parse(skill.permissions) : [],
        config: skill.config ? JSON.parse(skill.config) : null,
        metadata: skill.metadata ? JSON.parse(skill.metadata) : null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Install skill error:', error)
    return NextResponse.json(
      { error: 'Failed to install skill' },
      { status: 500 }
    )
  }
}
