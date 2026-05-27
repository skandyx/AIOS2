import { NextRequest, NextResponse } from 'next/server'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GitHubRepoInfo {
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language: string | null
  topics: string[]
  license: { spdx_id: string; name: string } | null
  created_at: string
  updated_at: string
  pushed_at: string
  default_branch: string
  archived: boolean
  disabled: boolean
  size: number
  homepage: string | null
  owner: { login: string; avatar_url: string; type: string }
}

interface VerificationResult {
  valid: boolean
  repoInfo: GitHubRepoInfo | null
  detectedType: 'skill' | 'mcp' | 'plugin' | 'unknown'
  usefulness: {
    score: number // 0-100
    level: 'critical' | 'high' | 'medium' | 'low' | 'not-useful'
    reasons: string[]
    warnings: string[]
  }
  alreadyInstalled: {
    skill: boolean
    mcp: boolean
    plugin: boolean
    details: { type: string; name: string; id: string; isEnabled: boolean }[]
  }
  readme: string | null
  packageJson: {
    name: string | null
    version: string | null
    dependencies: string[] | null
    scripts: string[] | null
  } | null
  source?: 'github' | 'url'
  urlTitle?: string
  error?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Match various GitHub URL formats
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/\?#]+)/,
    /github\.com\/([^\/]+)\/([^\/\?#]+)\/tree\/.+/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
      }
    }
  }

  return null
}

function detectRepoType(repo: GitHubRepoInfo, readme: string | null, packageJson: VerificationResult['packageJson']): 'skill' | 'mcp' | 'plugin' | 'unknown' {
  const name = repo.name.toLowerCase()
  const desc = (repo.description || '').toLowerCase()
  const topics = repo.topics.map(t => t.toLowerCase())
  const allText = `${name} ${desc} ${topics.join(' ')}`.toLowerCase()
  const readmeLower = (readme || '').toLowerCase()
  const deps = packageJson?.dependencies?.join(' ').toLowerCase() || ''

  // MCP detection (highest priority - most specific)
  if (
    topics.some(t => t.includes('mcp') || t.includes('model-context-protocol')) ||
    name.includes('mcp-server') || name.includes('mcp-server') ||
    desc.includes('mcp server') || desc.includes('model context protocol') ||
    readmeLower.includes('mcp server') || readmeLower.includes('modelcontextprotocol') ||
    deps.includes('@modelcontextprotocol') || deps.includes('mcp-server') ||
    name.startsWith('mcp-') || name.endsWith('-mcp')
  ) {
    return 'mcp'
  }

  // Skill detection
  if (
    topics.some(t => t.includes('aios-skill') || t.includes('ai-skill') || t.includes('aios-plugin')) ||
    name.includes('aios-skill') || name.includes('ai-skill') ||
    desc.includes('aios skill') || desc.includes('ai skill') ||
    readmeLower.includes('aios skill') || readmeLower.includes('skill manifest')
  ) {
    return 'skill'
  }

  // Plugin detection
  if (
    topics.some(t => t.includes('plugin') || t.includes('extension') || t.includes('addon')) ||
    name.includes('-plugin') || name.includes('-extension') || name.includes('-addon') ||
    desc.includes('plugin') || desc.includes('extension') || desc.includes('addon') ||
    readmeLower.includes('plugin installation') || readmeLower.includes('plugin config')
  ) {
    return 'plugin'
  }

  // AI / Agent related → likely skill
  if (
    topics.some(t => t.includes('ai-agent') || t.includes('ai-automation') || t.includes('llm')) ||
    desc.includes('ai agent') || desc.includes('autonomous') || desc.includes('llm agent') ||
    deps.includes('langchain') || deps.includes('openai') || deps.includes('anthropic')
  ) {
    return 'skill'
  }

  // Automation / workflow → likely plugin
  if (
    topics.some(t => t.includes('automation') || t.includes('workflow') || t.includes('integration')) ||
    desc.includes('automation') || desc.includes('workflow') || desc.includes('integration')
  ) {
    return 'plugin'
  }

  return 'unknown'
}

function analyzeUsefulness(
  repo: GitHubRepoInfo,
  detectedType: string,
  readme: string | null,
  packageJson: VerificationResult['packageJson']
): { score: number; level: string; reasons: string[]; warnings: string[] } {
  let score = 0
  const reasons: string[] = []
  const warnings: string[] = []

  // ── Positive signals ──

  // Stars (0-25 points)
  if (repo.stargazers_count >= 10000) { score += 25; reasons.push(`${repo.stargazers_count.toLocaleString()} stars — very popular`) }
  else if (repo.stargazers_count >= 1000) { score += 20; reasons.push(`${repo.stargazers_count.toLocaleString()} stars — well-established`) }
  else if (repo.stargazers_count >= 100) { score += 15; reasons.push(`${repo.stargazers_count.toLocaleString()} stars — growing community`) }
  else if (repo.stargazers_count >= 10) { score += 8; reasons.push(`${repo.stargazers_count.toLocaleString()} stars — early adoption`) }
  else { score += 2; reasons.push(`${repo.stargazers_count} stars — very new or niche`) }

  // Recent activity (0-15 points)
  const lastPush = new Date(repo.pushed_at)
  const daysSincePush = Math.floor((Date.now() - lastPush.getTime()) / (1000 * 60 * 60 * 24))
  if (daysSincePush <= 7) { score += 15; reasons.push('Updated within the last week — actively maintained') }
  else if (daysSincePush <= 30) { score += 12; reasons.push('Updated within the last month — maintained') }
  else if (daysSincePush <= 90) { score += 8; reasons.push('Updated within the last 3 months — reasonably active') }
  else if (daysSincePush <= 365) { score += 4; reasons.push(`Last updated ${daysSincePush} days ago`) }
  else { warnings.push(`Not updated in over a year (${daysSincePush} days) — may be abandoned`) }

  // Has README (0-10 points)
  if (readme && readme.length > 100) { score += 10; reasons.push('Has comprehensive documentation') }
  else if (readme) { score += 5; reasons.push('Has a README but minimal documentation') }
  else { warnings.push('No README found — documentation may be lacking') }

  // Has license (0-10 points)
  if (repo.license) { score += 10; reasons.push(`Licensed under ${repo.license.name}`) }
  else { warnings.push('No license specified — usage rights unclear') }

  // Type match (0-15 points)
  if (detectedType === 'mcp') { score += 15; reasons.push('Detected as MCP server — directly compatible with AIOS') }
  else if (detectedType === 'skill') { score += 15; reasons.push('Detected as AI Skill — directly compatible with AIOS') }
  else if (detectedType === 'plugin') { score += 12; reasons.push('Detected as Plugin — can extend AIOS functionality') }
  else { reasons.push('Type not automatically detected — manual review recommended') }

  // Has package.json with proper config (0-10 points)
  if (packageJson?.name) { score += 5; reasons.push(`Has package: ${packageJson.name}`) }
  if (packageJson?.version) { score += 2; reasons.push(`Version: ${packageJson.version}`) }
  if (packageJson?.dependencies && packageJson.dependencies.length > 0) { score += 3; reasons.push(`${packageJson.dependencies.length} dependencies`) }

  // Forks and issues (0-5 points)
  if (repo.forks_count > 50) { score += 3; reasons.push(`${repo.forks_count} forks — active community contribution`) }
  if (repo.open_issues_count < 50) { score += 2; reasons.push(`${repo.open_issues_count} open issues — manageable`) }
  else if (repo.open_issues_count > 100) { warnings.push(`${repo.open_issues_count} open issues — may have unresolved bugs`) }

  // Topics (0-5 points)
  if (repo.topics.length >= 3) { score += 5; reasons.push(`Well-categorized with ${repo.topics.length} topics`) }
  else if (repo.topics.length > 0) { score += 2; reasons.push(`${repo.topics.length} topics tagged`) }

  // ── Negative signals ──

  if (repo.archived) { score -= 20; warnings.push('Repository is ARCHIVED — no longer maintained') }
  if (repo.disabled) { score -= 30; warnings.push('Repository is DISABLED — may have been taken down') }

  // Clamp score
  score = Math.max(0, Math.min(100, score))

  let level: string
  if (score >= 80) level = 'critical'
  else if (score >= 60) level = 'high'
  else if (score >= 40) level = 'medium'
  else if (score >= 20) level = 'low'
  else level = 'not-useful'

  return { score, level, reasons, warnings }
}

// ─── URL Content Fetching Helpers ────────────────────────────────────────────

async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AIOS',
        'Accept': 'text/html,text/plain,application/json,application/yaml,text/markdown,*/*',
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
      next: { revalidate: 60 },
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || ''
    // Only read text-based content
    if (
      contentType.includes('text/') ||
      contentType.includes('json') ||
      contentType.includes('yaml') ||
      contentType.includes('markdown') ||
      contentType.includes('xml')
    ) {
      const text = await response.text()
      return text.substring(0, 50000) // Limit to 50KB
    }

    // Try reading as text for unknown content types
    const text = await response.text()
    if (text && text.length > 0) {
      return text.substring(0, 50000)
    }

    return null
  } catch {
    return null
  }
}

function detectTypeFromContent(content: string, url: string): 'skill' | 'mcp' | 'plugin' | 'unknown' {
  const contentLower = content.toLowerCase()
  const urlLower = url.toLowerCase()

  // Check URL path for hints
  if (urlLower.includes('/skills/') || urlLower.includes('/skill/')) return 'skill'
  if (urlLower.includes('/mcp/') || urlLower.includes('/mcp-server')) return 'mcp'
  if (urlLower.includes('/plugins/') || urlLower.includes('/plugin/')) return 'plugin'

  // Try parsing as JSON to check for manifest fields
  try {
    const json = JSON.parse(content)
    // MCP manifest patterns
    if (
      json.mcpServers || json.mcp_servers ||
      json.protocol === 'model-context-protocol' ||
      json.type === 'mcp-server' || json.type === 'mcp'
    ) return 'mcp'
    // Skill manifest patterns
    if (
      json.skill_manifest || json.skillManifest ||
      json.type === 'skill' || json.type === 'aios-skill' ||
      json.aiosVersion || json.aios_version
    ) return 'skill'
    // Plugin manifest patterns
    if (
      json.plugin_manifest || json.pluginManifest ||
      json.type === 'plugin' || json.type === 'extension'
    ) return 'plugin'
  } catch {
    // Not JSON, continue with text analysis
  }

  // MCP detection (highest priority - most specific)
  if (
    contentLower.includes('model context protocol') ||
    contentLower.includes('mcp server') ||
    contentLower.includes('mcp-server') ||
    contentLower.includes('modelcontextprotocol')
  ) return 'mcp'

  // Skill detection
  if (
    contentLower.includes('aios skill') ||
    contentLower.includes('ai-skill') ||
    contentLower.includes('skill manifest') ||
    contentLower.includes('skill definition')
  ) return 'skill'

  // Plugin detection
  if (
    contentLower.includes('plugin manifest') ||
    contentLower.includes('plugin installation') ||
    contentLower.includes('plugin config')
  ) return 'plugin'

  // Broader AI / agent detection → likely skill
  if (
    contentLower.includes('ai agent') ||
    contentLower.includes('llm agent') ||
    contentLower.includes('autonomous agent') ||
    contentLower.includes('langchain') ||
    contentLower.includes('openai')
  ) return 'skill'

  // Automation / workflow → likely plugin
  if (
    contentLower.includes('automation') ||
    contentLower.includes('workflow') ||
    contentLower.includes('integration')
  ) return 'plugin'

  return 'unknown'
}

function analyzeUrlUsefulness(content: string, url: string): {
  score: number
  level: 'critical' | 'high' | 'medium' | 'low' | 'not-useful'
  reasons: string[]
  warnings: string[]
} {
  let score = 0
  const reasons: string[] = []
  const warnings: string[] = []

  // Content length (0-15 points) — more content = more useful
  if (content.length > 5000) { score += 15; reasons.push('Substantial content found') }
  else if (content.length > 1000) { score += 10; reasons.push('Moderate content available') }
  else if (content.length > 200) { score += 5; reasons.push('Limited content available') }
  else { warnings.push('Very little content retrieved from URL') }

  // Structured content (0-20 points)
  const isJson = (() => { try { JSON.parse(content); return true } catch { return false } })()
  const hasYaml = content.includes('---') && (content.includes('name:') || content.includes('version:'))
  const hasMarkdownHeaders = /^#{1,6}\s/.test(content)

  if (isJson) { score += 20; reasons.push('Structured JSON content detected — likely a manifest or config') }
  else if (hasYaml) { score += 15; reasons.push('YAML front matter detected — structured definition') }
  else if (hasMarkdownHeaders) { score += 10; reasons.push('Markdown documentation detected') }
  else { score += 2; reasons.push('Plain text content') }

  // Type detection bonus (0-20 points)
  const detectedType = detectTypeFromContent(content, url)
  if (detectedType === 'mcp') { score += 20; reasons.push('Detected as MCP server — directly compatible with AIOS') }
  else if (detectedType === 'skill') { score += 20; reasons.push('Detected as AI Skill — directly compatible with AIOS') }
  else if (detectedType === 'plugin') { score += 15; reasons.push('Detected as Plugin — can extend AIOS functionality') }
  else { reasons.push('Type not automatically detected — manual review recommended') }

  // Documentation quality (0-10 points)
  const hasInstallInstructions = /install|setup|getting started|quickstart/i.test(content)
  const hasUsageExamples = /usage|example|how to use/i.test(content)
  if (hasInstallInstructions) { score += 5; reasons.push('Contains installation instructions') }
  if (hasUsageExamples) { score += 5; reasons.push('Contains usage examples') }

  // URL quality (0-10 points)
  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol === 'https:') { score += 5; reasons.push('Secure HTTPS URL') }
    else { warnings.push('Non-HTTPS URL — content may not be secure') }
    // Known/credible domains
    const credibleDomains = ['github.com', 'npmjs.com', 'pypi.org', 'readthedocs.io', 'developer.', 'docs.']
    if (credibleDomains.some(d => parsedUrl.hostname.includes(d))) {
      score += 5; reasons.push('Content from a credible source')
    }
  } catch {
    warnings.push('Invalid URL format')
  }

  // Manifest fields check for JSON content (0-10 points)
  if (isJson) {
    try {
      const json = JSON.parse(content)
      const manifestFields = ['name', 'version', 'description', 'permissions', 'commands', 'tools', 'capabilities']
      const foundFields = manifestFields.filter(f => json[f] !== undefined)
      if (foundFields.length >= 3) { score += 10; reasons.push(`Rich manifest with ${foundFields.length} key fields: ${foundFields.slice(0, 4).join(', ')}`) }
      else if (foundFields.length > 0) { score += 5; reasons.push(`Partial manifest with fields: ${foundFields.join(', ')}`) }
    } catch {
      // Already confirmed it's JSON above
    }
  }

  // Negative signals
  if (content.length < 50) { score -= 10; warnings.push('Content too short to be meaningful') }
  if (content.includes('404') && content.length < 500) { score -= 15; warnings.push('Page may not exist (404 detected)') }

  // Clamp score
  score = Math.max(0, Math.min(100, score))

  let level: 'critical' | 'high' | 'medium' | 'low' | 'not-useful'
  if (score >= 80) level = 'critical'
  else if (score >= 60) level = 'high'
  else if (score >= 40) level = 'medium'
  else if (score >= 20) level = 'low'
  else level = 'not-useful'

  return { score, level, reasons, warnings }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body as { url: string }

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    const trimmedUrl = url.trim()
    const parsed = parseGitHubUrl(trimmedUrl)

    // If not a GitHub URL, try fetching the URL directly
    if (!parsed) {
      const webContent = await fetchUrlContent(trimmedUrl)
      if (webContent) {
        const detectedType = detectTypeFromContent(webContent, trimmedUrl)
        const usefulness = analyzeUrlUsefulness(webContent, trimmedUrl)

        // Extract a title hint from content
        let urlTitle = trimmedUrl
        try {
          const urlObj = new URL(trimmedUrl)
          urlTitle = urlObj.hostname + urlObj.pathname
        } catch {
          // Use the raw URL as fallback
        }
        // Try to get a better title from HTML or first heading
        const titleMatch = webContent.match(/<title[^>]*>([^<]+)<\/title>/i)
          || webContent.match(/^#{1,6}\s+(.+)$/m)
        if (titleMatch) {
          urlTitle = titleMatch[1].trim()
        }

        // Check if already installed by URL
        const alreadyInstalled: VerificationResult['alreadyInstalled'] = {
          skill: false,
          mcp: false,
          plugin: false,
          details: [],
        }

        try {
          const { db } = await import('@/lib/db')
          const existingSkill = await db.skill.findFirst({
            where: { repoUrl: trimmedUrl },
          })
          if (existingSkill) {
            alreadyInstalled.skill = true
            alreadyInstalled.details.push({
              type: 'skill',
              name: existingSkill.name,
              id: existingSkill.id,
              isEnabled: existingSkill.isEnabled,
            })
          }
        } catch {
          // DB check failed, continue without it
        }

        return NextResponse.json({
          valid: true,
          repoInfo: null,
          detectedType,
          usefulness,
          alreadyInstalled,
          readme: webContent.substring(0, 5000),
          packageJson: null,
          source: 'url' as const,
          urlTitle,
        })
      }

      // Could not fetch content either
      return NextResponse.json(
        { valid: false, error: 'Could not fetch content from this URL. Please check the URL and try again.' },
        { status: 400 }
      )
    }

    const { owner, repo } = parsed

    // ── Fetch repo info from GitHub API ──
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'User-Agent': 'AIOS',
        'Accept': 'application/vnd.github.v3+json',
      },
      next: { revalidate: 60 },
    })

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return NextResponse.json({
          valid: false,
          repoInfo: null,
          detectedType: 'unknown',
          usefulness: { score: 0, level: 'not-useful', reasons: [], warnings: ['Repository not found'] },
          alreadyInstalled: { skill: false, mcp: false, plugin: false, details: [] },
          readme: null,
          packageJson: null,
          error: 'Repository not found on GitHub',
        })
      }
      if (repoResponse.status === 403) {
        return NextResponse.json({
          valid: false,
          repoInfo: null,
          detectedType: 'unknown',
          usefulness: { score: 0, level: 'not-useful', reasons: [], warnings: ['GitHub API rate limit exceeded'] },
          alreadyInstalled: { skill: false, mcp: false, plugin: false, details: [] },
          readme: null,
          packageJson: null,
          error: 'GitHub API rate limit exceeded. Try again in a few minutes.',
        })
      }
      return NextResponse.json({
        valid: false,
        repoInfo: null,
        detectedType: 'unknown',
        usefulness: { score: 0, level: 'not-useful', reasons: [], warnings: [`GitHub API error: ${repoResponse.status}`] },
        alreadyInstalled: { skill: false, mcp: false, plugin: false, details: [] },
        readme: null,
        packageJson: null,
        error: `GitHub API returned status ${repoResponse.status}`,
      })
    }

    const repoInfo: GitHubRepoInfo = await repoResponse.json()

    // ── Fetch README ──
    let readme: string | null = null
    try {
      const readmeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
        headers: {
          'User-Agent': 'AIOS',
          'Accept': 'application/vnd.github.v3+json',
        },
        next: { revalidate: 300 },
      })
      if (readmeResponse.ok) {
        const readmeData = await readmeResponse.json()
        if (readmeData.content) {
          readme = Buffer.from(readmeData.content, 'base64').toString('utf-8')
        }
      }
    } catch {
      // README fetch failed, continue without it
    }

    // ── Fetch package.json ──
    let packageJson: VerificationResult['packageJson'] = null
    try {
      const pkgResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, {
        headers: {
          'User-Agent': 'AIOS',
          'Accept': 'application/vnd.github.v3+json',
        },
        next: { revalidate: 300 },
      })
      if (pkgResponse.ok) {
        const pkgData = await pkgResponse.json()
        if (pkgData.content) {
          const pkgContent = JSON.parse(Buffer.from(pkgData.content, 'base64').toString('utf-8'))
          packageJson = {
            name: pkgContent.name || null,
            version: pkgContent.version || null,
            dependencies: pkgContent.dependencies ? Object.keys(pkgContent.dependencies) : null,
            scripts: pkgContent.scripts ? Object.keys(pkgContent.scripts) : null,
          }
        }
      }
    } catch {
      // package.json fetch/parsing failed, continue without it
    }

    // ── Detect type ──
    const detectedType = detectRepoType(repoInfo, readme, packageJson)

    // ── Analyze usefulness ──
    const usefulness = analyzeUsefulness(repoInfo, detectedType, readme, packageJson)

    // ── Check if already installed ──
    const alreadyInstalled: VerificationResult['alreadyInstalled'] = {
      skill: false,
      mcp: false,
      plugin: false,
      details: [],
    }

    try {
      // Dynamic import to avoid heavy Prisma client at module level
      const { db } = await import('@/lib/db')

      // Check skills
      const existingSkill = await db.skill.findFirst({
        where: {
          OR: [
            { repoUrl: repoInfo.html_url },
            { repoOwner: owner, repoName: repo },
            { slug: repo.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
          ],
        },
      })
      if (existingSkill) {
        alreadyInstalled.skill = true
        alreadyInstalled.details.push({
          type: 'skill',
          name: existingSkill.name,
          id: existingSkill.id,
          isEnabled: existingSkill.isEnabled,
        })
      }

      // Check MCP servers
      const existingMCP = await db.mCPServer.findFirst({
        where: {
          OR: [
            { repoUrl: repoInfo.html_url },
            { slug: repo.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
          ],
        },
      })
      if (existingMCP) {
        alreadyInstalled.mcp = true
        alreadyInstalled.details.push({
          type: 'mcp',
          name: existingMCP.name,
          id: existingMCP.id,
          isEnabled: existingMCP.isEnabled,
        })
      }

      // Check plugins
      const existingPlugin = await db.plugin.findFirst({
        where: {
          OR: [
            { slug: repo.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
          ],
        },
      })
      if (existingPlugin) {
        alreadyInstalled.plugin = true
        alreadyInstalled.details.push({
          type: 'plugin',
          name: existingPlugin.name,
          id: existingPlugin.id,
          isEnabled: existingPlugin.isEnabled,
        })
      }
    } catch (dbError) {
      console.warn('Database check failed:', dbError)
      // Continue without installed check
    }

    return NextResponse.json({
      valid: true,
      repoInfo,
      detectedType,
      usefulness,
      alreadyInstalled,
      readme: readme ? readme.substring(0, 5000) : null, // Truncate long READMEs
      packageJson,
      source: 'github' as const,
    })
  } catch (error) {
    console.error('URL verify error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to verify URL' },
      { status: 500 }
    )
  }
}
