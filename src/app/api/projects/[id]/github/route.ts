import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/projects/[id]/github - Connect a GitHub repository to the project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()

    if (!body.repoUrl) {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 })
    }

    // Parse owner/repo from URL
    // Supports: https://github.com/owner/repo, github.com/owner/repo, owner/repo
    let owner = ''
    let repo = ''

    const urlPatterns = [
      // https://github.com/owner/repo or http://github.com/owner/repo
      /(?:https?:\/\/)?github\.com\/([^/]+)\/([^/\s#?]+)/,
      // owner/repo
      /^([^/]+)\/([^/\s]+)$/,
    ]

    let parsed = false
    for (const pattern of urlPatterns) {
      const match = body.repoUrl.match(pattern)
      if (match) {
        owner = match[1]
        repo = match[2].replace(/\.git$/, '') // Remove .git suffix
        parsed = true
        break
      }
    }

    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL. Use format: https://github.com/owner/repo or owner/repo' },
        { status: 400 }
      )
    }

    const githubToken = body.githubToken || project.githubToken || undefined

    // Fetch repo info from GitHub API
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    }
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`
    }

    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
    })

    if (!repoResponse.ok) {
      const errorText = await repoResponse.text()
      return NextResponse.json(
        { error: `GitHub API error: ${repoResponse.status} - ${errorText}`, connected: false },
        { status: repoResponse.status === 404 ? 404 : 502 }
      )
    }

    const repoData = await repoResponse.json()

    // Update project with GitHub info
    const updateData: Record<string, unknown> = {
      repoUrl: body.repoUrl,
      repoOwner: owner,
      repoName: repo,
      repoBranch: repoData.default_branch || 'main',
    }

    // Only store the token if provided (don't overwrite with null)
    if (githubToken) {
      updateData.githubToken = githubToken
    }

    await db.project.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      connected: true,
      repo: {
        owner,
        name: repo,
        fullName: repoData.full_name,
        description: repoData.description,
        branch: repoData.default_branch,
        private: repoData.private,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        language: repoData.language,
        url: repoData.html_url,
      },
    })
  } catch (error) {
    console.error('GitHub connect error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect GitHub repository' },
      { status: 500 }
    )
  }
}

// GET /api/projects/[id]/github - Get GitHub repo info for the project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
      select: {
        id: true,
        repoUrl: true,
        repoOwner: true,
        repoName: true,
        repoBranch: true,
        githubToken: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.repoOwner || !project.repoName) {
      return NextResponse.json({ connected: false, repo: null })
    }

    // Fetch latest repo info from GitHub API
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    }
    if (project.githubToken) {
      headers['Authorization'] = `token ${project.githubToken}`
    }

    const repoResponse = await fetch(
      `https://api.github.com/repos/${project.repoOwner}/${project.repoName}`,
      { headers }
    )

    if (!repoResponse.ok) {
      // Return stored info if API call fails
      return NextResponse.json({
        connected: true,
        repo: {
          owner: project.repoOwner,
          name: project.repoName,
          branch: project.repoBranch,
          url: project.repoUrl,
        },
        apiError: `GitHub API returned ${repoResponse.status}`,
      })
    }

    const repoData = await repoResponse.json()

    return NextResponse.json({
      connected: true,
      repo: {
        owner: project.repoOwner,
        name: project.repoName,
        fullName: repoData.full_name,
        description: repoData.description,
        branch: project.repoBranch || repoData.default_branch,
        private: repoData.private,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        language: repoData.language,
        url: repoData.html_url,
      },
    })
  } catch (error) {
    console.error('Get GitHub info error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GitHub info' },
      { status: 500 }
    )
  }
}
