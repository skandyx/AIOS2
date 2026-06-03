import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

const DEFAULT_PREFERENCES = {
  activeModelId: 'gpt4-turbo',
  taskModelOverrides: {
    chat: 'gpt4o',
    code: 'deepseek-v3',
    reasoning: 'gpt4-turbo',
    vision: 'gpt4o',
  },
  fallbackChain: ['gpt4-turbo', 'claude-3.5-sonnet', 'gpt4o'],
}

/**
 * GET /api/models/preferences
 * Returns the user's model preferences (active model, task overrides, fallback chain)
 */
export async function GET() {
  try {
    const userId = await getDefaultUserId()
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    })

    if (!user?.preferences) {
      return NextResponse.json(DEFAULT_PREFERENCES)
    }

    try {
      const prefs = JSON.parse(user.preferences)
      const modelPrefs = prefs.modelPreferences
      if (modelPrefs) {
        return NextResponse.json({
          activeModelId: modelPrefs.activeModelId || DEFAULT_PREFERENCES.activeModelId,
          taskModelOverrides: modelPrefs.taskModelOverrides || DEFAULT_PREFERENCES.taskModelOverrides,
          fallbackChain: modelPrefs.fallbackChain || DEFAULT_PREFERENCES.fallbackChain,
        })
      }
    } catch {
      // Invalid JSON, return defaults
    }

    return NextResponse.json(DEFAULT_PREFERENCES)
  } catch (error) {
    console.error('Models preferences GET error:', error)
    return NextResponse.json(DEFAULT_PREFERENCES)
  }
}

/**
 * PUT /api/models/preferences
 * Saves the user's model preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { activeModelId, taskModelOverrides, fallbackChain } = body

    if (!activeModelId) {
      return NextResponse.json(
        { error: 'activeModelId is required' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    })

    let existingPrefs: Record<string, unknown> = {}
    if (user?.preferences) {
      try {
        existingPrefs = JSON.parse(user.preferences)
      } catch {
        existingPrefs = {}
      }
    }

    const updatedPrefs = {
      ...existingPrefs,
      modelPreferences: {
        activeModelId,
        taskModelOverrides: taskModelOverrides || DEFAULT_PREFERENCES.taskModelOverrides,
        fallbackChain: fallbackChain || DEFAULT_PREFERENCES.fallbackChain,
      },
    }

    await db.user.update({
      where: { id: userId },
      data: { preferences: JSON.stringify(updatedPrefs) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Models preferences PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to save model preferences' },
      { status: 500 }
    )
  }
}
