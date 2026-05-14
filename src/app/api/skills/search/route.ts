import { NextRequest, NextResponse } from 'next/server'

const SEARCH_TOPICS = [
  'ai-skill',
  'aios-skill',
  'ai-plugin',
  'mcp-server',
  'ai-agent',
  'ai-workflow',
]

interface CuratedSkill {
  name: string
  fullName: string
  description: string
  url: string
  stars: number
  language: string
  category: string
  topics: string[]
}

const CURATED_SKILLS: CuratedSkill[] = [
  {
    name: 'browser-use',
    fullName: 'browser-use/browser-use',
    description: 'AI agent that can control a browser',
    url: 'https://github.com/browser-use/browser-use',
    stars: 50000,
    language: 'Python',
    category: 'automation',
    topics: ['ai-agent', 'browser-automation'],
  },
  {
    name: 'pyautogui',
    fullName: 'asweigart/pyautogui',
    description: 'GUI automation with Python',
    url: 'https://github.com/asweigart/pyautogui',
    stars: 10000,
    language: 'Python',
    category: 'automation',
    topics: ['automation', 'gui'],
  },
  {
    name: 'langchain',
    fullName: 'langchain-ai/langchain',
    description: 'Build context-aware reasoning applications',
    url: 'https://github.com/langchain-ai/langchain',
    stars: 95000,
    language: 'Python',
    category: 'ai',
    topics: ['ai', 'llm', 'agents'],
  },
  {
    name: 'crewAI',
    fullName: 'crewAIInc/crewAI',
    description: 'Framework for orchestrating role-playing AI agents',
    url: 'https://github.com/crewAIInc/crewAI',
    stars: 25000,
    language: 'Python',
    category: 'ai',
    topics: ['ai-agents', 'orchestration'],
  },
  {
    name: 'auto-gpt',
    fullName: 'Significant-Gravitas/AutoGPT',
    description: 'An autonomous AI agent',
    url: 'https://github.com/Significant-Gravitas/AutoGPT',
    stars: 170000,
    language: 'Python',
    category: 'ai',
    topics: ['ai-agent', 'autonomous'],
  },
  {
    name: 'open-interpreter',
    fullName: 'OpenInterpreter/open-interpreter',
    description: 'A natural language interface for computers',
    url: 'https://github.com/OpenInterpreter/open-interpreter',
    stars: 57000,
    language: 'Python',
    category: 'ai',
    topics: ['ai', 'code-interpreter'],
  },
  {
    name: 'agent-zero',
    fullName: 'frdel/agent-zero',
    description: 'AI agent framework',
    url: 'https://github.com/frdel/agent-zero',
    stars: 7000,
    language: 'Python',
    category: 'ai',
    topics: ['ai-agent'],
  },
  {
    name: 'activepieces',
    fullName: 'activepieces/activepieces',
    description: 'Open-source alternative to n8n/Zapier - workflow automation',
    url: 'https://github.com/activepieces/activepieces',
    stars: 10000,
    language: 'TypeScript',
    category: 'automation',
    topics: ['automation', 'workflow', 'n8n-alternative'],
  },
  {
    name: 'node-red',
    fullName: 'node-red/node-red',
    description:
      'Flow-based programming for wiring together hardware devices, APIs and online services',
    url: 'https://github.com/node-red/node-red',
    stars: 20000,
    language: 'JavaScript',
    category: 'automation',
    topics: ['automation', 'workflow', 'iot'],
  },
  {
    name: 'huginn',
    fullName: 'huginn/huginn',
    description: 'Create agents that monitor and act on your behalf',
    url: 'https://github.com/huginn/huginn',
    stars: 44000,
    language: 'Ruby',
    category: 'automation',
    topics: ['automation', 'agents'],
  },
  {
    name: 'n8n',
    fullName: 'n8n-io/n8n',
    description: 'Free and open fair-code licensed workflow automation tool',
    url: 'https://github.com/n8n-io/n8n',
    stars: 50000,
    language: 'TypeScript',
    category: 'automation',
    topics: ['automation', 'workflow'],
  },
  {
    name: 'semantic-kernel',
    fullName: 'microsoft/semantic-kernel',
    description: 'Integrate cutting-edge LLM technology into your apps',
    url: 'https://github.com/microsoft/semantic-kernel',
    stars: 22000,
    language: 'C#',
    category: 'ai',
    topics: ['ai', 'llm', 'microsoft'],
  },
]

interface GitHubRepo {
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  language: string | null
  updated_at: string
  topics: string[]
}

interface SearchResult {
  name: string
  fullName: string
  description: string
  url: string
  stars: number
  language: string | null
  updatedAt: string
  topics: string[]
  category: string
  source: 'github' | 'curated'
}

/**
 * Determine a category based on repo topics and name
 */
function inferCategory(topics: string[], name: string): string {
  const lowerName = name.toLowerCase()
  const allTopics = topics.map((t) => t.toLowerCase())

  if (
    allTopics.some((t) => t.includes('automat')) ||
    lowerName.includes('automat')
  )
    return 'automation'
  if (
    allTopics.some((t) => t.includes('workflow')) ||
    lowerName.includes('workflow')
  )
    return 'automation'
  if (
    allTopics.some((t) => t.includes('agent')) ||
    lowerName.includes('agent')
  )
    return 'ai'
  if (
    allTopics.some((t) => t.includes('llm') || t.includes('ai')) ||
    lowerName.includes('ai')
  )
    return 'ai'
  if (
    allTopics.some((t) => t.includes('develop') || t.includes('code')) ||
    lowerName.includes('dev')
  )
    return 'development'
  if (
    allTopics.some((t) => t.includes('data') || t.includes('analytic')) ||
    lowerName.includes('data')
  )
    return 'data'

  return 'utility'
}

/**
 * Search GitHub API for repositories matching the given query across AI skill topics
 */
async function searchGitHub(
  query: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const seenFullNames = new Set<string>()

  // Search across multiple topics to get diverse results
  const topicQueries = SEARCH_TOPICS.map(
    (topic) => `topic:${topic}+${query}`
  )

  // Also do a general query without topic filter
  topicQueries.push(query)

  // Use Promise.allSettled to handle failures gracefully
  const fetchResults = await Promise.allSettled(
    topicQueries.map(async (q) => {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=10`
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AIOS',
          Accept: 'application/vnd.github.v3+json',
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      })

      if (!response.ok) {
        console.warn(
          `GitHub API returned ${response.status} for query: ${q}`
        )
        return []
      }

      const data = await response.json()
      return (data.items || []) as GitHubRepo[]
    })
  )

  for (const result of fetchResults) {
    if (result.status !== 'fulfilled') continue

    for (const repo of result.value) {
      if (seenFullNames.has(repo.full_name)) continue
      seenFullNames.add(repo.full_name)

      results.push({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || '',
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        updatedAt: repo.updated_at,
        topics: repo.topics || [],
        category: inferCategory(repo.topics || [], repo.name),
        source: 'github',
      })
    }
  }

  // Sort by stars descending
  results.sort((a, b) => b.stars - a.stars)

  return results.slice(0, 30)
}

// GET /api/skills/search?q=search+query - Search GitHub for AI skills
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() || ''

    // Start with curated skills, filtering by query if provided
    const lowerQuery = query.toLowerCase()
    let filteredCurated: SearchResult[] = CURATED_SKILLS.map((skill) => ({
      name: skill.name,
      fullName: skill.fullName,
      description: skill.description,
      url: skill.url,
      stars: skill.stars,
      language: skill.language,
      updatedAt: new Date().toISOString(),
      topics: skill.topics,
      category: skill.category,
      source: 'curated' as const,
    }))

    if (lowerQuery) {
      filteredCurated = filteredCurated.filter(
        (skill) =>
          skill.name.toLowerCase().includes(lowerQuery) ||
          skill.fullName.toLowerCase().includes(lowerQuery) ||
          skill.description.toLowerCase().includes(lowerQuery) ||
          skill.topics.some((t) => t.toLowerCase().includes(lowerQuery)) ||
          skill.category.toLowerCase().includes(lowerQuery)
      )
    }

    // Try to search GitHub API for additional results
    let githubResults: SearchResult[] = []

    if (query) {
      try {
        githubResults = await searchGitHub(query)
      } catch (error) {
        console.warn('GitHub search failed, using curated results only:', error)
      }
    }

    // Merge results: curated skills first, then GitHub results (deduplicating)
    const seenFullNames = new Set(filteredCurated.map((s) => s.fullName))
    const uniqueGithubResults = githubResults.filter(
      (s) => !seenFullNames.has(s.fullName)
    )

    const mergedResults = [...filteredCurated, ...uniqueGithubResults]

    // Sort by stars descending
    mergedResults.sort((a, b) => b.stars - a.stars)

    return NextResponse.json({
      results: mergedResults,
      total: mergedResults.length,
      query,
    })
  } catch (error) {
    console.error('Search skills error:', error)
    return NextResponse.json(
      { error: 'Failed to search skills' },
      { status: 500 }
    )
  }
}
