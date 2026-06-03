import { NextRequest, NextResponse } from 'next/server'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RepoSkill {
  name: string
  description: string
  category: string
  permissions: string[]
  filePath: string
  fileUrl: string
  type: 'markdown' | 'manifest' | 'skill-json'
}

interface TreeNode {
  path: string
  mode: string
  type: 'blob' | 'tree'
  size?: number
  sha: string
  url: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const patterns = [
    /github\.com\/([^/]+)\/([^/?#]+)/,
    /github\.com\/([^/]+)\/([^/?#]+)\/tree\/.+/,
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

function inferCategoryFromPath(path: string, content: string): string {
  const lowerPath = path.toLowerCase()
  const lowerContent = content.toLowerCase()

  // Check path hints
  if (lowerPath.includes('automat') || lowerPath.includes('workflow')) return 'Automation'
  if (lowerPath.includes('develop') || lowerPath.includes('code')) return 'Development'
  if (lowerPath.includes('ai/') || lowerPath.includes('agent') || lowerPath.includes('llm')) return 'AI'
  if (lowerPath.includes('data/') || lowerPath.includes('analytics')) return 'Data'
  if (lowerPath.includes('productiv')) return 'Productivity'
  if (lowerPath.includes('communic')) return 'Communication'

  // Check content hints
  if (lowerContent.includes('automation') || lowerContent.includes('workflow')) return 'Automation'
  if (lowerContent.includes('development') || lowerContent.includes('code generation')) return 'Development'
  if (lowerContent.includes('ai agent') || lowerContent.includes('llm') || lowerContent.includes('language model')) return 'AI'
  if (lowerContent.includes('data analysis') || lowerContent.includes('analytics')) return 'Data'
  if (lowerContent.includes('productivity') || lowerContent.includes('task management')) return 'Productivity'
  if (lowerContent.includes('communication') || lowerContent.includes('messaging')) return 'Communication'

  return 'Utility'
}

function extractPermissions(content: string): string[] {
  const permissions: string[] = []

  // Try to find permissions in JSON code blocks
  const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g
  let match
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const json = JSON.parse(match[1])
      if (json.permissions && Array.isArray(json.permissions)) {
        permissions.push(...json.permissions.map((p: string) => String(p)))
      }
      if (json.requires && Array.isArray(json.requires)) {
        permissions.push(...json.requires.map((p: string) => String(p)))
      }
    } catch {
      // Not valid JSON, skip
    }
  }

  // Try to find permissions in YAML/code blocks
  const yamlPermRegex = /permissions?:\s*\n((\s+-\s+.+\n?)+)/g
  while ((match = yamlPermRegex.exec(content)) !== null) {
    const items = match[1].match(/-\s+(.+)/g)
    if (items) {
      permissions.push(...items.map((i) => i.replace(/-\s+/, '').trim()))
    }
  }

  // Look for common permission patterns in text
  const permPatterns = [
    /requires?\s+(?:access\s+to\s+)?([\w:]+)/gi,
    /permissions?:\s*(.+)/gi,
  ]
  for (const pattern of permPatterns) {
    while ((match = pattern.exec(content)) !== null) {
      const val = match[1]?.trim()
      if (val && val.length < 50 && !val.includes('\n')) {
        // Only add if it looks like a permission token
        if (/^[\w:.-]+$/.test(val)) {
          permissions.push(val)
        }
      }
    }
  }

  // Deduplicate
  return [...new Set(permissions)]
}

function parseMarkdownSkill(content: string, filePath: string, repoUrl: string): RepoSkill | null {
  // Extract title from first heading
  const titleMatch = content.match(/^#{1,6}\s+(.+)$/m)
  if (!titleMatch) return null

  const name = titleMatch[1].trim().replace(/[*_`#]/g, '')

  // Skip files whose title looks like a generic README or non-skill heading
  const skipPatterns = /^(readme|changelog|license|contributing|code of conduct|security|getting started|installation|setup|about)$/i
  if (skipPatterns.test(name.trim())) return null

  // Extract description: text between title and next heading or end of content
  const afterTitle = content.slice(content.indexOf(titleMatch[0]) + titleMatch[0].length).trim()
  const nextHeading = afterTitle.match(/^#{1,6}\s+/m)
  const descriptionBlock = nextHeading
    ? afterTitle.slice(0, afterTitle.indexOf(nextHeading[0]))
    : afterTitle

  // Take first meaningful paragraph as description
  const paragraphs = descriptionBlock
    .split(/\n\n+/)
    .map((p) => p.trim().replace(/[#*_`]/g, '').trim())
    .filter((p) => p.length > 10 && !p.startsWith('<!--'))

  const description = paragraphs[0] || `Skill defined in ${filePath}`

  // Check if the content looks like a skill definition
  const skillIndicators = [
    /skill/i,
    /aios/i,
    /ai[- ]agent/i,
    /mcp/i,
    /capability/i,
    /trigger/i,
    /command/i,
    /automation/i,
    /workflow/i,
    /plugin/i,
    /integration/i,
  ]

  const contentLower = content.toLowerCase()
  const isLikelySkill = skillIndicators.some((pattern) => pattern.test(contentLower))

  // If it doesn't look like a skill at all, skip it
  if (!isLikelySkill && paragraphs.length === 0) return null

  const category = inferCategoryFromPath(filePath, content)
  const permissions = extractPermissions(content)

  return {
    name,
    description: description.substring(0, 300),
    category,
    permissions,
    filePath,
    fileUrl: `${repoUrl}/blob/main/${filePath}`,
    type: 'markdown',
  }
}

function parseManifestSkill(
  json: Record<string, unknown>,
  filePath: string,
  repoUrl: string,
  rawContent: string
): RepoSkill | null {
  // Try various manifest structures
  const name =
    (json.name as string) ||
    (json.skillName as string) ||
    (json.title as string) ||
    (json.skill_name as string) ||
    null

  if (!name) return null

  const description =
    (json.description as string) ||
    (json.desc as string) ||
    (json.summary as string) ||
    `Skill from ${filePath}`

  const category = inferCategoryFromPath(filePath, rawContent)

  // Extract permissions
  let permissions: string[] = []
  if (json.permissions && Array.isArray(json.permissions)) {
    permissions = json.permissions.map(String)
  } else if (json.requires && Array.isArray(json.requires)) {
    permissions = json.requires.map(String)
  }

  // Also try nested structures
  if (permissions.length === 0 && json.security && typeof json.security === 'object') {
    const sec = json.security as Record<string, unknown>
    if (sec.permissions && Array.isArray(sec.permissions)) {
      permissions = sec.permissions.map(String)
    }
  }

  const fileType = filePath.endsWith('skill.json') ? 'skill-json' : 'manifest'

  return {
    name,
    description: description.substring(0, 300),
    category,
    permissions,
    filePath,
    fileUrl: `${repoUrl}/blob/main/${filePath}`,
    type: fileType,
  }
}

// ─── Skill File Detection ────────────────────────────────────────────────────

function isSkillDefinitionFile(path: string): boolean {
  const lowerPath = path.toLowerCase()
  const fileName = lowerPath.split('/').pop() || ''

  // Explicit skill definition files
  const exactMatches = [
    'skill.md',
    'skills.md',
    'skill.json',
    'manifest.json',
    'skill-manifest.json',
    'skill-manifest.md',
    'aios-skill.json',
    'aios-skill.md',
  ]
  if (exactMatches.includes(fileName)) return true

  // Files in skill-related directories
  const skillDirs = ['skills/', 'skill/', '.aios/', 'aios/', 'plugins/', 'plugin/']
  if (skillDirs.some((dir) => lowerPath.includes(dir))) {
    // .md or .json files in skill directories
    if (fileName.endsWith('.md') || fileName.endsWith('.json')) return true
  }

  return false
}

function isPotentialSkillFile(path: string): boolean {
  const lowerPath = path.toLowerCase()
  const fileName = lowerPath.split('/').pop() || ''

  // Skip common non-skill files
  const skipFiles = [
    'readme.md',
    'changelog.md',
    'contributing.md',
    'code_of_conduct.md',
    'license.md',
    'security.md',
    'package.json',
    'tsconfig.json',
    'package-lock.json',
    'yarn.lock',
    '.gitignore',
    '.eslintrc',
    '.prettierrc',
  ]
  if (skipFiles.includes(fileName)) return false

  // Files with "skill" in the name
  if (fileName.includes('skill') && (fileName.endsWith('.md') || fileName.endsWith('.json')))
    return true

  // Markdown files in specific directories that could be skills
  const potentialDirs = ['agents/', 'agent/', 'commands/', 'command/', 'tools/', 'tool/']
  if (potentialDirs.some((dir) => lowerPath.includes(dir))) {
    if (fileName.endsWith('.md') || fileName.endsWith('.json')) return true
  }

  return false
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body as { url: string }

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const parsed = parseGitHubUrl(url.trim())
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL. Please provide a URL like https://github.com/owner/repo' },
        { status: 400 }
      )
    }

    const { owner, repo } = parsed

    // First, fetch repo info to get the default branch
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'User-Agent': 'AIOS',
        Accept: 'application/vnd.github.v3+json',
      },
      next: { revalidate: 60 },
    })

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
      }
      if (repoResponse.status === 403) {
        return NextResponse.json(
          { error: 'GitHub API rate limit exceeded. Try again in a few minutes.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `GitHub API error: ${repoResponse.status}` },
        { status: repoResponse.status }
      )
    }

    const repoData = await repoResponse.json()
    const defaultBranch = repoData.default_branch || 'main'
    const repoUrl = repoData.html_url

    // Fetch the file tree recursively
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      {
        headers: {
          'User-Agent': 'AIOS',
          Accept: 'application/vnd.github.v3+json',
        },
        next: { revalidate: 120 },
      }
    )

    if (!treeResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch repository file tree' },
        { status: 500 }
      )
    }

    const treeData = await treeResponse.json()
    const tree: TreeNode[] = treeData.tree || []

    // Find skill definition files
    const skillFiles: TreeNode[] = []
    const potentialFiles: TreeNode[] = []

    for (const node of tree) {
      if (node.type !== 'blob') continue
      if (isSkillDefinitionFile(node.path)) {
        skillFiles.push(node)
      } else if (isPotentialSkillFile(node.path)) {
        potentialFiles.push(node)
      }
    }

    // Combine: priority skill files first, then potential ones
    // Limit to 20 files to avoid rate limiting
    const filesToFetch = [...skillFiles, ...potentialFiles].slice(0, 20)

    if (filesToFetch.length === 0) {
      return NextResponse.json({
        repoUrl,
        owner,
        repo,
        defaultBranch,
        totalFiles: tree.filter((n) => n.type === 'blob').length,
        skills: [],
        message: 'No skill definition files found in this repository. The repository may not contain AIOS-compatible skills.',
      })
    }

    // Fetch content for each file
    const skills: RepoSkill[] = []
    const fetchPromises = filesToFetch.map(async (file) => {
      try {
        const contentResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${defaultBranch}`,
          {
            headers: {
              'User-Agent': 'AIOS',
              Accept: 'application/vnd.github.v3+json',
            },
            next: { revalidate: 120 },
          }
        )

        if (!contentResponse.ok) return null

        const contentData = await contentResponse.json()
        if (!contentData.content) return null

        const content = Buffer.from(contentData.content, 'base64').toString('utf-8')

        // Parse based on file type
        const lowerPath = file.path.toLowerCase()

        if (lowerPath.endsWith('.json')) {
          try {
            const json = JSON.parse(content)
            const skill = parseManifestSkill(json, file.path, repoUrl, content)
            if (skill) return skill
          } catch {
            // Not valid JSON, skip
          }
        }

        if (lowerPath.endsWith('.md')) {
          const skill = parseMarkdownSkill(content, file.path, repoUrl)
          if (skill) return skill
        }

        return null
      } catch {
        return null
      }
    })

    const results = await Promise.allSettled(fetchPromises)
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        // Deduplicate by name
        if (!skills.some((s) => s.name === result.value.name)) {
          skills.push(result.value)
        }
      }
    }

    return NextResponse.json({
      repoUrl,
      owner,
      repo,
      defaultBranch,
      totalFiles: tree.filter((n) => n.type === 'blob').length,
      scannedFiles: filesToFetch.length,
      skills,
    })
  } catch (error) {
    console.error('Verify repo error:', error)
    return NextResponse.json({ error: 'Failed to verify repository' }, { status: 500 })
  }
}
