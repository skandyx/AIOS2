import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// Default security settings matching SecurityModule.tsx constants
const DEFAULT_SECURITY_SETTINGS = {
  autonomyLevel: 'assisted' as const,
  permissions: [
    { name: 'Read files', manual: true, assisted: true, semiAuto: true, supervisedAuto: true, fullyAuto: true },
    { name: 'Write files', manual: false, assisted: true, semiAuto: true, supervisedAuto: true, fullyAuto: true },
    { name: 'Execute commands', manual: false, assisted: false, semiAuto: true, supervisedAuto: true, fullyAuto: true },
    { name: 'Network requests', manual: false, assisted: false, semiAuto: true, supervisedAuto: true, fullyAuto: true },
    { name: 'Install packages', manual: false, assisted: false, semiAuto: false, supervisedAuto: true, fullyAuto: true },
    { name: 'Delete files', manual: false, assisted: false, semiAuto: false, supervisedAuto: true, fullyAuto: true },
    { name: 'System configuration', manual: false, assisted: false, semiAuto: false, supervisedAuto: false, fullyAuto: true },
    { name: 'Credential access', manual: false, assisted: false, semiAuto: false, supervisedAuto: false, fullyAuto: true },
  ],
  dangerActions: [
    'Delete files or directories',
    'Execute shell commands',
    'Access stored credentials',
    'Modify system configuration',
    'Send network requests to unknown hosts',
    'Install unverified packages',
    'Modify security policies',
    "Access other users' data",
  ],
  sandboxEnabled: true,
  vaultEnabled: true,
}

/**
 * GET /api/security/settings
 * Reads security settings from User.preferences JSON field (stored under key "securitySettings")
 */
export async function GET() {
  try {
    const userId = await getDefaultUserId()

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    })

    if (!user?.preferences) {
      return NextResponse.json({ settings: DEFAULT_SECURITY_SETTINGS })
    }

    let preferences: Record<string, unknown>
    try {
      preferences = JSON.parse(user.preferences)
    } catch {
      // If preferences JSON is corrupted, return defaults
      return NextResponse.json({ settings: DEFAULT_SECURITY_SETTINGS })
    }

    const securitySettings = preferences.securitySettings

    if (!securitySettings || typeof securitySettings !== 'object') {
      return NextResponse.json({ settings: DEFAULT_SECURITY_SETTINGS })
    }

    // Merge with defaults to ensure all fields exist (handles partial saves)
    const mergedSettings = {
      ...DEFAULT_SECURITY_SETTINGS,
      ...(securitySettings as Record<string, unknown>),
    }

    return NextResponse.json({ settings: mergedSettings })
  } catch (error) {
    console.error('Security settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load security settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/security/settings
 * Saves security settings to User.preferences JSON field under key "securitySettings"
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getDefaultUserId()
    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      )
    }

    // Validate autonomyLevel if provided
    const validLevels = ['manual', 'assisted', 'semi_autonomous', 'supervised_autonomous', 'fully_autonomous']
    if (settings.autonomyLevel && !validLevels.includes(settings.autonomyLevel)) {
      return NextResponse.json(
        { error: `Invalid autonomyLevel. Must be one of: ${validLevels.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate sandboxEnabled / vaultEnabled are booleans if provided
    if (settings.sandboxEnabled !== undefined && typeof settings.sandboxEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'sandboxEnabled must be a boolean' },
        { status: 400 }
      )
    }
    if (settings.vaultEnabled !== undefined && typeof settings.vaultEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'vaultEnabled must be a boolean' },
        { status: 400 }
      )
    }

    // Read existing preferences
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    })

    let preferences: Record<string, unknown> = {}
    if (user?.preferences) {
      try {
        preferences = JSON.parse(user.preferences)
      } catch {
        // If corrupted, start fresh
        preferences = {}
      }
    }

    // Merge security settings: start from defaults, overlay with existing, then overlay with new
    const existingSettings = (preferences.securitySettings && typeof preferences.securitySettings === 'object')
      ? preferences.securitySettings as Record<string, unknown>
      : {}

    const mergedSecuritySettings = {
      ...DEFAULT_SECURITY_SETTINGS,
      ...existingSettings,
      ...settings,
    }

    // Save back to preferences
    preferences.securitySettings = mergedSecuritySettings

    await db.user.update({
      where: { id: userId },
      data: { preferences: JSON.stringify(preferences) },
    })

    return NextResponse.json({ settings: mergedSecuritySettings })
  } catch (error) {
    console.error('Security settings PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to save security settings' },
      { status: 500 }
    )
  }
}
