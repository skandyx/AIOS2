import { NextRequest, NextResponse } from 'next/server'

// Curated list of well-known MCP servers as fallback / always-included results
const CURATED_MCP_SERVERS = [
  {
    name: 'Filesystem MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'Reference MCP servers by the official team - filesystem, github, postgres, sqlite, and more',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'file',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-filesystem',
    command: 'npx',
    args: '["@modelcontextprotocol/server-filesystem","/path"]',
  },
  {
    name: 'GitHub MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'GitHub integration MCP server',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'development',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-github',
    command: 'npx',
    args: '["@modelcontextprotocol/server-github"]',
  },
  {
    name: 'PostgreSQL MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'PostgreSQL database MCP server',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'database',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-postgres',
    command: 'npx',
    args: '["@modelcontextprotocol/server-postgres","postgresql://..."]',
  },
  {
    name: 'SQLite MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'SQLite database MCP server',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'database',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-sqlite',
    command: 'npx',
    args: '["@modelcontextprotocol/server-sqlite","--db-path","/path/to/db"]',
  },
  {
    name: 'Brave Search MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'Brave web search MCP server',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'web',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-brave-search',
    command: 'npx',
    args: '["@modelcontextprotocol/server-brave-search"]',
  },
  {
    name: 'Puppeteer MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'Browser automation via Puppeteer MCP server',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'automation',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-puppeteer',
    command: 'npx',
    args: '["@modelcontextprotocol/server-puppeteer"]',
  },
  {
    name: 'Slack MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'Slack integration MCP server',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'communication',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-slack',
    command: 'npx',
    args: '["@modelcontextprotocol/server-slack"]',
  },
  {
    name: 'Google Drive MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'Google Drive integration MCP server',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'file',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-gdrive',
    command: 'npx',
    args: '["@modelcontextprotocol/server-gdrive"]',
  },
  {
    name: 'Memory MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'Knowledge graph memory MCP server',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'ai',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-memory',
    command: 'npx',
    args: '["@modelcontextprotocol/server-memory"]',
  },
  {
    name: 'Sequential Thinking MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'Dynamic problem-solving via sequential thinking MCP',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'ai',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-sequential-thinking',
    command: 'npx',
    args: '["@modelcontextprotocol/server-sequential-thinking"]',
  },
  {
    name: 'Everything MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'Test/reference MCP server with all features',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'utility',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-everything',
    command: 'npx',
    args: '["@modelcontextprotocol/server-everything"]',
  },
  {
    name: 'Fetch MCP',
    fullName: 'modelcontextprotocol/servers',
    description: 'Web fetching MCP server for HTTP requests',
    url: 'https://github.com/modelcontextprotocol/servers',
    stars: 30000,
    language: 'TypeScript',
    category: 'web',
    transportType: 'stdio',
    packageName: '@modelcontextprotocol/server-fetch',
    command: 'npx',
    args: '["@modelcontextprotocol/server-fetch"]',
  },
]

interface GitHubRepo {
  full_name: string
  name: string
  description: string | null
  html_url: string
  stargazers_count: number
  language: string | null
  updated_at: string
  topics?: string[]
}

// GET /api/mcp/search?q=search+query - Search for MCP servers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() || ''

    if (!query) {
      // If no query, return curated list only
      return NextResponse.json({
        results: CURATED_MCP_SERVERS,
        total: CURATED_MCP_SERVERS.length,
        source: 'curated',
      })
    }

    const queryLower = query.toLowerCase()

    // Filter curated servers by query match
    const matchedCurated = CURATED_MCP_SERVERS.filter(
      (server) =>
        server.name.toLowerCase().includes(queryLower) ||
        server.description.toLowerCase().includes(queryLower) ||
        server.category.toLowerCase().includes(queryLower) ||
        server.packageName.toLowerCase().includes(queryLower)
    )

    // Search GitHub API for MCP servers
    let githubResults: Array<{
      name: string
      fullName: string
      description: string
      url: string
      stars: number
      language: string
      updatedAt: string
      transportType: string
      packageName: string | null
    }> = []

    try {
      const githubUrl = `https://api.github.com/search/repositories?q=topic:mcp-server+${encodeURIComponent(query)}&sort=stars&per_page=20`
      const response = await fetch(githubUrl, {
        headers: {
          'User-Agent': 'AIOS',
          Accept: 'application/vnd.github.v3+json',
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      })

      if (response.ok) {
        const data = await response.json()
        const items: GitHubRepo[] = data.items || []

        githubResults = items.map((repo) => ({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description || 'MCP Server repository',
          url: repo.html_url,
          stars: repo.stargazers_count,
          language: repo.language || 'Unknown',
          updatedAt: repo.updated_at,
          transportType: 'stdio', // Default, most GitHub MCP servers use stdio
          packageName: null,
        }))
      }
    } catch (githubError) {
      console.error('GitHub API search error:', githubError)
      // Continue with curated results even if GitHub fails
    }

    // Merge results: curated first, then GitHub (deduplicated by URL)
    const curatedUrls = new Set(matchedCurated.map((s) => s.url))
    const uniqueGithubResults = githubResults.filter(
      (r) => !curatedUrls.has(r.url)
    )

    const results = [...matchedCurated, ...uniqueGithubResults]

    return NextResponse.json({
      results,
      total: results.length,
      source: 'mixed',
    })
  } catch (error) {
    console.error('Search MCP servers error:', error)
    return NextResponse.json(
      { error: 'Failed to search MCP servers' },
      { status: 500 }
    )
  }
}
