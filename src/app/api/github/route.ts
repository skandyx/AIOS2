import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/github - Get GitHub integration status
export async function GET() {
  try {
    const userId = await getDefaultUserId()

    const integration = await db.integration.findFirst({
      where: {
        userId,
        type: 'github',
      },
    })

    if (!integration) {
      return NextResponse.json({
        connected: false,
        configured: false,
        username: null,
        status: 'disconnected',
      })
    }

    // Parse credentials to get username (never expose the token)
    let username: string | null = null
    if (integration.credentials) {
      try {
        const creds = JSON.parse(integration.credentials)
        username = creds.username || null
      } catch {
        // ignore parse errors
      }
    }

    return NextResponse.json({
      connected: integration.status === 'connected',
      configured: true,
      username,
      status: integration.status,
      lastSyncedAt: integration.lastSyncedAt,
      error: integration.error,
      integrationId: integration.id,
    })
  } catch (error) {
    console.error('Get GitHub status error:', error)
    return NextResponse.json(
      { error: 'Failed to check GitHub integration' },
      { status: 500 }
    )
  }
}

// POST /api/github - Configure GitHub integration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, username } = body

    if (!token || !username) {
      return NextResponse.json(
        { error: 'GitHub personal access token and username are required' },
        { status: 400 }
      )
    }

    // Verify the token works by calling the GitHub API
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!userResponse.ok) {
      const errorData = await userResponse.json().catch(() => ({}))
      return NextResponse.json(
        {
          error: 'Invalid GitHub token',
          details: errorData.message || `GitHub API returned ${userResponse.status}`,
        },
        { status: 401 }
      )
    }

    const githubUser = await userResponse.json()
    const verifiedUsername = githubUser.login

    const userId = await getDefaultUserId()

    // Store credentials as JSON (token + username)
    const credentials = JSON.stringify({ token, username: verifiedUsername })

    // Check if GitHub integration already exists
    const existing = await db.integration.findFirst({
      where: {
        userId,
        type: 'github',
      },
    })

    let integration

    if (existing) {
      // Update existing integration
      integration = await db.integration.update({
        where: { id: existing.id },
        data: {
          name: `GitHub (${verifiedUsername})`,
          status: 'connected',
          credentials,
          error: null,
          lastSyncedAt: new Date(),
          config: JSON.stringify({
            username: verifiedUsername,
            avatarUrl: githubUser.avatar_url,
            userId: githubUser.id,
          }),
        },
      })
    } else {
      // Create new integration
      integration = await db.integration.create({
        data: {
          name: `GitHub (${verifiedUsername})`,
          type: 'github',
          provider: 'github',
          description: 'GitHub personal access token integration',
          icon: '🐙',
          status: 'connected',
          credentials,
          config: JSON.stringify({
            username: verifiedUsername,
            avatarUrl: githubUser.avatar_url,
            userId: githubUser.id,
          }),
          lastSyncedAt: new Date(),
          userId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      connected: true,
      username: verifiedUsername,
      avatarUrl: githubUser.avatar_url,
      integrationId: integration.id,
    })
  } catch (error) {
    console.error('Configure GitHub error:', error)
    return NextResponse.json(
      { error: 'Failed to configure GitHub integration' },
      { status: 500 }
    )
  }
}

// DELETE /api/github - Disconnect GitHub integration
export async function DELETE() {
  try {
    const userId = await getDefaultUserId()

    const integration = await db.integration.findFirst({
      where: {
        userId,
        type: 'github',
      },
    })

    if (!integration) {
      return NextResponse.json(
        { error: 'No GitHub integration found' },
        { status: 404 }
      )
    }

    await db.integration.update({
      where: { id: integration.id },
      data: {
        status: 'disconnected',
        credentials: null,
        error: null,
      },
    })

    return NextResponse.json({
      success: true,
      connected: false,
    })
  } catch (error) {
    console.error('Disconnect GitHub error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect GitHub integration' },
      { status: 500 }
    )
  }
}
