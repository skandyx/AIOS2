import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/github/status - Check GitHub API connectivity
export async function GET() {
  try {
    const userId = await getDefaultUserId()

    // Find GitHub integration
    const integration = await db.integration.findFirst({
      where: {
        userId,
        type: 'github',
      },
    })

    if (!integration || !integration.credentials) {
      return NextResponse.json({
        connected: false,
        authenticated: false,
        message: 'GitHub integration not configured',
      })
    }

    // Parse credentials
    let credentials: { token: string; username: string }
    try {
      credentials = JSON.parse(integration.credentials)
    } catch {
      return NextResponse.json({
        connected: false,
        authenticated: false,
        message: 'Invalid credentials stored',
        integrationStatus: 'error',
      })
    }

    const { token } = credentials

    // Verify token by calling GitHub API
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!userResponse.ok) {
      // Token is invalid or expired
      await db.integration.update({
        where: { id: integration.id },
        data: {
          status: 'error',
          error: `GitHub API returned ${userResponse.status}: ${userResponse.statusText}`,
        },
      })

      return NextResponse.json({
        connected: false,
        authenticated: false,
        message: `GitHub token is invalid or expired (HTTP ${userResponse.status})`,
        integrationStatus: 'error',
      })
    }

    const githubUser = await userResponse.json()

    // Get rate limit info
    const rateLimitResponse = await fetch('https://api.github.com/rate_limit', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    let rateLimit = null
    if (rateLimitResponse.ok) {
      const rateLimitData = await rateLimitResponse.json()
      const core = rateLimitData.resources?.core
      if (core) {
        rateLimit = {
          limit: core.limit,
          remaining: core.remaining,
          reset: new Date(core.reset * 1000).toISOString(),
          used: core.used,
        }
      }
    }

    // Update integration status if it was in error state
    if (integration.status !== 'connected') {
      await db.integration.update({
        where: { id: integration.id },
        data: {
          status: 'connected',
          error: null,
          lastSyncedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      connected: true,
      authenticated: true,
      user: {
        login: githubUser.login,
        name: githubUser.name,
        avatarUrl: githubUser.avatar_url,
        publicRepos: githubUser.public_repos,
        privateRepos: githubUser.total_private_repos,
        plan: githubUser.plan?.name,
      },
      rateLimit,
      integrationStatus: 'connected',
      lastSyncedAt: integration.lastSyncedAt,
    })
  } catch (error) {
    console.error('Check GitHub status error:', error)
    return NextResponse.json(
      {
        connected: false,
        authenticated: false,
        message: error instanceof Error ? error.message : 'Failed to check GitHub status',
      },
      { status: 500 }
    )
  }
}
