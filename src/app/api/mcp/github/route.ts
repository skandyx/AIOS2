import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/mcp/github - Check if GitHub MCP is installed and configured
export async function GET() {
  try {
    const userId = await getDefaultUserId()

    // Check if GitHub MCP server is installed
    const mcpServer = await db.mCPServer.findUnique({
      where: { slug: 'github-mcp' },
    })

    // Check if GitHub integration exists and is connected
    const integration = await db.integration.findFirst({
      where: {
        userId,
        type: 'github',
      },
    })

    let username: string | null = null
    let connected = false

    if (integration && integration.credentials) {
      try {
        const creds = JSON.parse(integration.credentials)
        username = creds.username || null
        connected = integration.status === 'connected'
      } catch {
        // ignore parse errors
      }
    }

    return NextResponse.json({
      installed: !!mcpServer?.isInstalled,
      configured: !!integration && connected,
      connected,
      username,
      mcpServerId: mcpServer?.id || null,
      mcpEnabled: mcpServer?.isEnabled ?? false,
      mcpRunning: mcpServer?.isRunning ?? false,
    })
  } catch (error) {
    console.error('Get GitHub MCP status error:', error)
    return NextResponse.json(
      { error: 'Failed to check GitHub MCP status' },
      { status: 500 }
    )
  }
}

// POST /api/mcp/github - Install and configure GitHub MCP in one step
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

    // Step 1: Create or update Integration record
    const credentials = JSON.stringify({ token, username: verifiedUsername })
    const existingIntegration = await db.integration.findFirst({
      where: { userId, type: 'github' },
    })

    if (existingIntegration) {
      await db.integration.update({
        where: { id: existingIntegration.id },
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
      await db.integration.create({
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

    // Step 2: Create MCPServer record for GitHub if not exists
    const existingMcp = await db.mCPServer.findUnique({
      where: { slug: 'github-mcp' },
    })

    let mcpServer
    if (existingMcp) {
      // Update the existing record with token as env var
      mcpServer = await db.mCPServer.update({
        where: { id: existingMcp.id },
        data: {
          isInstalled: true,
          isEnabled: true,
          envVars: JSON.stringify({
            GITHUB_PERSONAL_ACCESS_TOKEN: token,
          }),
          userId,
        },
      })
    } else {
      // Create new MCPServer record
      mcpServer = await db.mCPServer.create({
        data: {
          name: 'GitHub MCP',
          slug: 'github-mcp',
          description: 'GitHub integration MCP server - manage repos, issues, PRs, and more',
          version: '1.0.0',
          author: 'modelcontextprotocol',
          category: 'development',
          icon: '🐙',
          tags: JSON.stringify(['github', 'development', 'git', 'code-review']),
          permissions: JSON.stringify(['network:access', 'github:read', 'github:write']),
          config: JSON.stringify({ specialAction: 'github-connect' }),
          sourceType: 'curated',
          repoUrl: 'https://github.com/modelcontextprotocol/servers',
          packageName: '@modelcontextprotocol/server-github',
          transportType: 'stdio',
          command: 'npx',
          args: JSON.stringify(['-y', '@modelcontextprotocol/server-github']),
          envVars: JSON.stringify({
            GITHUB_PERSONAL_ACCESS_TOKEN: token,
          }),
          isInstalled: true,
          isEnabled: true,
          isRunning: false,
          isVerified: true,
          stars: 30000,
          userId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      installed: true,
      configured: true,
      connected: true,
      username: verifiedUsername,
      avatarUrl: githubUser.avatar_url,
      mcpServerId: mcpServer.id,
    })
  } catch (error) {
    console.error('Install GitHub MCP error:', error)
    return NextResponse.json(
      { error: 'Failed to install and configure GitHub MCP' },
      { status: 500 }
    )
  }
}
