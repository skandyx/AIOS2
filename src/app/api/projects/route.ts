import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// ─── Category Mapping ─────────────────────────────────────────────────────────
// Frontend sends display names like "Web App" but the schema convention uses
// snake_case like "web_app". We normalize both at write time and read time.

const CATEGORY_DISPLAY_TO_SCHEMA: Record<string, string> = {
  'Web App': 'web_app',
  'API': 'api',
  'Automation': 'automation',
  'Mobile': 'mobile',
  'Desktop': 'desktop',
  'Data': 'data',
  'AI': 'ai',
  'Other': 'other',
  // Also accept already-normalized values
  'web_app': 'web_app',
  'api': 'api',
  'automation': 'automation',
  'mobile': 'mobile',
  'desktop': 'desktop',
  'data': 'data',
  'ai': 'ai',
  'other': 'other',
}

const CATEGORY_SCHEMA_TO_DISPLAY: Record<string, string> = {
  'web_app': 'Web App',
  'api': 'API',
  'automation': 'Automation',
  'mobile': 'Mobile',
  'desktop': 'Desktop',
  'data': 'Data',
  'ai': 'AI',
  'other': 'Other',
}

function normalizeCategory(raw: string | null | undefined): string | null {
  if (!raw) return null
  return CATEGORY_DISPLAY_TO_SCHEMA[raw] ?? raw.toLowerCase().replace(/\s+/g, '_')
}

function categoryToDisplay(schemaValue: string | null | undefined): string | null {
  if (!schemaValue) return null
  return CATEGORY_SCHEMA_TO_DISPLAY[schemaValue] ?? schemaValue
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely normalize techStack into a JSON string for storage.
 * The frontend may send either a JSON string (already stringified array)
 * or a raw array. Handle both cases to avoid double-encoding.
 */
function normalizeTechStack(raw: unknown): string | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    // Already a string — could be a JSON string like '["React","Node.js"]'
    // or a comma-separated list like "React, Node.js"
    const trimmed = raw.trim()
    if (!trimmed) return null
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return trimmed // Already a valid JSON array string
      }
    } catch {
      // Not JSON — treat as comma-separated string
      return JSON.stringify(trimmed.split(',').map(s => s.trim()).filter(Boolean))
    }
    return trimmed
  }
  if (Array.isArray(raw)) {
    return JSON.stringify(raw)
  }
  return null
}

/**
 * Safely normalize tags into a JSON string for storage.
 */
function normalizeTags(raw: unknown): string | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return trimmed
    } catch {
      return JSON.stringify(trimmed.split(',').map(s => s.trim()).filter(Boolean))
    }
    return trimmed
  }
  if (Array.isArray(raw)) {
    return JSON.stringify(raw)
  }
  return null
}

/**
 * Dynamically import and run orchestration so that a broken orchestrator
 * module never crashes this route at import time. If the import or the
 * execution fails we simply log — the project has already been created.
 */
async function triggerOrchestration(projectId: string): Promise<void> {
  try {
    const { runOrchestration } = await import('@/lib/orchestrator')
    runOrchestration(projectId).catch((error: unknown) => {
      console.error(`Auto-orchestration failed for project ${projectId}:`, error)
    })
  } catch (importError) {
    console.error(`Failed to load orchestrator module — orchestration skipped for project ${projectId}:`, importError)
  }
}

// GET /api/projects - List all projects for the current user
// Supports optional filters: ?status=in_progress, ?category=web_app
export async function GET(request: NextRequest) {
  try {
    const userId = await getDefaultUserId()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    const where: Record<string, unknown> = { userId }

    if (status) {
      where.status = status
    }
    if (category) {
      // Normalize the category filter so both "Web App" and "web_app" work
      where.category = normalizeCategory(category) ?? category
    }

    const projects = await db.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            tasks: true,
            projectSkills: true,
            projectMCPServers: true,
          },
        },
      },
    })

    // Map category back to display format for the frontend
    const mapped = projects.map((p) => ({
      ...p,
      category: categoryToDisplay(p.category),
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('List projects error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project and auto-trigger orchestration
export async function POST(request: NextRequest) {
  try {
    const userId = await getDefaultUserId()
    const body = await request.json()
    const {
      name,
      description,
      status,
      priority,
      category,
      icon,
      techStack,
      requirements,
      notes,
      tags,
      dueDate,
      localPath,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const project = await db.project.create({
      data: {
        name,
        description: description || null,
        status: status || 'planning',
        priority: priority || 'medium',
        category: normalizeCategory(category),
        icon: icon || null,
        techStack: normalizeTechStack(techStack),
        requirements: requirements || null,
        notes: notes || null,
        tags: normalizeTags(tags),
        dueDate: dueDate ? new Date(dueDate) : null,
        localPath: localPath || null,
        startedAt: status === 'in_progress' ? new Date() : null,
        userId,
      },
      include: {
        _count: {
          select: {
            tasks: true,
            projectSkills: true,
            projectMCPServers: true,
          },
        },
      },
    })

    // Auto-trigger orchestration after project creation
    // Run in background — don't block the response.
    // Uses dynamic import so a broken orchestrator never crashes this route.
    triggerOrchestration(project.id)

    // Map category back to display format for the frontend
    const responseProject = {
      ...project,
      category: categoryToDisplay(project.category),
    }

    return NextResponse.json(responseProject, { status: 201 })
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
