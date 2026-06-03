import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// Permission matrix matching SecurityModule.tsx
const PERMISSION_MATRIX: Record<string, Record<string, boolean>> = {
  'Read files':          { manual: true,  assisted: true,  semi_autonomous: true,  supervised_autonomous: true,  fully_autonomous: true },
  'Disk access':         { manual: false, assisted: true,  semi_autonomous: true,  supervised_autonomous: true,  fully_autonomous: true },
  'Write files':         { manual: false, assisted: true,  semi_autonomous: true,  supervised_autonomous: true,  fully_autonomous: true },
  'Execute commands':    { manual: false, assisted: false, semi_autonomous: true,  supervised_autonomous: true,  fully_autonomous: true },
  'Network requests':    { manual: false, assisted: false, semi_autonomous: true,  supervised_autonomous: true,  fully_autonomous: true },
  'Install packages':    { manual: false, assisted: false, semi_autonomous: false, supervised_autonomous: true,  fully_autonomous: true },
  'Delete files':        { manual: false, assisted: false, semi_autonomous: false, supervised_autonomous: true,  fully_autonomous: true },
  'System configuration':{ manual: false, assisted: false, semi_autonomous: false, supervised_autonomous: false, fully_autonomous: true },
  'Credential access':   { manual: false, assisted: false, semi_autonomous: false, supervised_autonomous: false, fully_autonomous: true },
  'Self-modify app':     { manual: false, assisted: false, semi_autonomous: false, supervised_autonomous: true,  fully_autonomous: true },
}

// Map action categories to permission names
const ACTION_TO_PERMISSION: Record<string, string> = {
  'file_read': 'Read files',
  'file_write': 'Write files',
  'file_delete': 'Delete files',
  'disk_access': 'Disk access',
  'command_exec': 'Execute commands',
  'network_request': 'Network requests',
  'package_install': 'Install packages',
  'system_config': 'System configuration',
  'credential_access': 'Credential access',
  'self_modify': 'Self-modify app',
  // Aliases
  'read': 'Read files',
  'write': 'Write files',
  'delete': 'Delete files',
  'disk': 'Disk access',
  'exec': 'Execute commands',
  'execute': 'Execute commands',
  'network': 'Network requests',
  'install': 'Install packages',
  'config': 'System configuration',
  'credentials': 'Credential access',
}

/**
 * POST /api/security/check-permission
 * Check if a given action is allowed at the current autonomy level
 * Body: { action: string, autonomyLevel?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { action, autonomyLevel } = await request.json()

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    // Resolve the permission name from the action
    const permissionName = ACTION_TO_PERMISSION[action] || action
    const permissionRow = PERMISSION_MATRIX[permissionName]

    if (!permissionRow) {
      // Unknown permission - default to denied
      return NextResponse.json({
        allowed: false,
        action,
        permission: permissionName,
        reason: 'Unknown permission',
      })
    }

    // Get autonomy level from request or from saved settings
    let level = autonomyLevel
    if (!level) {
      try {
        const userId = await getDefaultUserId()
        const user = await db.user.findUnique({ where: { id: userId }, select: { preferences: true } })
        if (user?.preferences) {
          try {
            const prefs = JSON.parse(user.preferences)
            level = prefs.securitySettings?.autonomyLevel || 'assisted'
          } catch {
            level = 'assisted'
          }
        } else {
          level = 'assisted'
        }
      } catch {
        level = 'assisted'
      }
    }

    const allowed = permissionRow[level] ?? false

    return NextResponse.json({
      allowed,
      action,
      permission: permissionName,
      autonomyLevel: level,
      reason: allowed ? 'Permitted at current autonomy level' : `Not permitted at "${level}" autonomy level. Upgrade to a higher level for this action.`,
    })
  } catch (error) {
    console.error('Permission check error:', error)
    return NextResponse.json({ error: 'Failed to check permission' }, { status: 500 })
  }
}

/**
 * GET /api/security/check-permission?action=disk_access
 * Quick GET-based check for a single permission
 */
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')
  if (!action) {
    return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 })
  }

  // Reuse POST logic
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ action }),
    headers: { 'Content-Type': 'application/json' },
  }))
}
