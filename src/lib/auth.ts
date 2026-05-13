import { db } from '@/lib/db'

/**
 * Returns the default user ID for the current session.
 * In production, this would be replaced with proper auth (e.g., NextAuth, Clerk).
 * For now, we ensure a default user exists and return their ID.
 */
export async function getDefaultUserId(): Promise<string> {
  let user = await db.user.findFirst()

  if (!user) {
    try {
      user = await db.user.create({
        data: {
          email: 'default@ai-os.local',
          name: 'Default User',
        },
      })
    } catch {
      // Handle race condition: another request may have created the user
      user = await db.user.findFirst()
    }
  }

  if (!user) {
    throw new Error('Failed to get or create default user')
  }

  return user.id
}
