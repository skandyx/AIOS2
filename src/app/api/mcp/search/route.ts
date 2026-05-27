import { NextRequest, NextResponse } from 'next/server'
import { webSearch } from '@/lib/web-search'

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

interface MCPSearchResult {
  name: string
  fullName: string
  description: string
  url: string
  stars: number
  language: string
  updatedAt?: string
  transportType: string
  packageName: string | null
  category: string
  source: 'curated' | 'github' | 'web'
}

/**
 * Infer MCP category from topics/name
 */
function inferMCPCategory(topics: string[], name: string): string {
  const lowerName = name.toLowerCase()
  const allTopics = topics.map((t) => t.toLowerCase())

  if (allTopics.some((t) => t.includes('database') || t.includes('postgres') || t.includes('sqlite'))) return 'database'
  if (allTopics.some((t) => t.includes('file') || t.includes('filesystem'))) return 'file'
  if (allTopics.some((t) => t.includes('web') || t.includes('search') || t.includes('fetch'))) return 'web'
  if (allTopics.some((t) => t.includes('ai') || t.includes('llm') || t.includes('memory') || t.includes('thinking'))) return 'ai'
  if (allTopics.some((t) => t.includes('chat') || t.includes('slack') || t.includes('communication'))) return 'communication'
  if (allTopics.some((t) => t.includes('automat') || t.includes('browser') || t.includes('puppeteer'))) return 'automation'
  if (allTopics.some((t) => t.includes('develop') || t.includes('github') || t.includes('git'))) return 'development'
  if (lowerName.includes('database') || lowerName.includes('postgres') || lowerName.includes('sqlite')) return 'database'
  if (lowerName.includes('file') || lowerName.includes('filesystem')) return 'file'
  if (lowerName.includes('search') || lowerName.includes('fetch') || lowerName.includes('web')) return 'web'
  if (lowerName.includes('ai') || lowerName.includes('memory') || lowerName.includes('thinking')) return 'ai'
  if (lowerName.includes('slack') || lowerName.includes('chat')) return 'communication'
  if (lowerName.includes('automat') || lowerName.includes('puppeteer')) return 'automation'
  if (lowerName.includes('github') || lowerName.includes('git')) return 'development'

  return 'utility'
}

// GET /api/mcp/search?q=search+query - Search for MCP servers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() || ''

    if (!query) {
      // If no query, return curated list only
      return NextResponse.json({
        results: CURATED_MCP_SERVERS.map((s) => ({
          ...s,
          source: 'curated' as const,
        })),
        total: CURATED_MCP_SERVERS.length,
        source: 'curated',
      })
    }

    const queryLower = query.toLowerCase()

    // Filter curated servers by query match
    const matchedCurated: MCPSearchResult[] = CURATED_MCP_SERVERS.filter(
      (server) =>
        server.name.toLowerCase().includes(queryLower) ||
        server.description.toLowerCase().includes(queryLower) ||
        server.category.toLowerCase().includes(queryLower) ||
        server.packageName.toLowerCase().includes(queryLower)
    ).map((s) => ({
      name: s.name,
      fullName: s.fullName,
      description: s.description,
      url: s.url,
      stars: s.stars,
      language: s.language,
      transportType: s.transportType,
      packageName: s.packageName,
      category: s.category,
      source: 'curated' as const,
    }))

    // Search GitHub API for MCP servers
    let githubResults: MCPSearchResult[] = []

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
          category: inferMCPCategory(repo.topics || [], repo.name),
          source: 'github' as const,
        }))
      }
    } catch (githubError) {
      console.error('GitHub API search error:', githubError)
      // Continue with curated results even if GitHub fails
    }

    // Search the web for MCP servers
    let webResults: MCPSearchResult[] = []

    try {
      const rawWebResults = await webSearch.search(
        `MCP server ${query}`,
        10
      )

      webResults = rawWebResults
        .filter((r) => r.url && r.name)
        .map((r) => ({
          name: r.name,
          fullName: r.hostName,
          description: r.snippet || '',
          url: r.url,
          stars: 0,
          language: 'Unknown',
          updatedAt: r.date || undefined,
          transportType: 'stdio',
          packageName: null,
          category: inferMCPCategory([], r.name + ' ' + r.snippet),
          source: 'web' as const,
        }))
    } catch (webError) {
      console.warn('Web search for MCP failed, continuing without web results:', webError)
    }

    // Merge results: curated first, then GitHub, then web (deduplicated by URL)
    const seenUrls = new Set<string>()
    const results: MCPSearchResult[] = []

    // Curated first
    for (const item of matchedCurated) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url)
        results.push(item)
      }
    }

    // GitHub results
    for (const item of githubResults) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url)
        results.push(item)
      }
    }

    // Web results
    for (const item of webResults) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url)
        results.push(item)
      }
    }

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
