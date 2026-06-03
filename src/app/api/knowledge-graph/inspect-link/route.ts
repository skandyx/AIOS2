import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

interface PageData {
  title: string
  html: string
  publishedTime?: string | null
}

/**
 * Parse a GitHub URL to extract owner and repo.
 * Matches patterns like https://github.com/owner/repo (with optional trailing path)
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'github.com') return null
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    return { owner: parts[0], repo: parts[1] }
  } catch {
    return null
  }
}

/**
 * Fetch page content using the GitHub API (README endpoint).
 * Returns a PageData object with title, html, and optional publishedTime.
 */
async function fetchViaGitHubApi(url: string): Promise<PageData> {
  const gh = parseGitHubUrl(url)
  if (!gh) {
    throw new Error('Invalid GitHub URL for API fallback')
  }

  const { owner, repo } = gh
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`

  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'KnowledgeGraphInspector/1.0',
    },
  })

  if (!response.ok) {
    // If README not found, try to at least get the repo description
    const repoUrl = `https://api.github.com/repos/${owner}/${repo}`
    const repoResponse = await fetch(repoUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'KnowledgeGraphInspector/1.0',
      },
    })
    if (repoResponse.ok) {
      const repoData = await repoResponse.json()
      const description = repoData.description || `${owner}/${repo}`
      return {
        title: `${owner}/${repo}`,
        html: `<h1>${owner}/${repo}</h1><p>${description}</p>`,
        publishedTime: repoData.created_at || null,
      }
    }
    throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`)
  }

  const readmeData = await response.json()
  const readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8')

  // Convert markdown to simple HTML for heading extraction
  const htmlLines = readmeContent.split('\n').map(line => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      return `<h${level}>${headingMatch[2]}</h${level}>`
    }
    return `<p>${line}</p>`
  })
  const html = htmlLines.join('\n')

  return {
    title: `${owner}/${repo}`,
    html,
    publishedTime: readmeData.created_at || null,
  }
}

/**
 * Fetch page content using a plain HTTP fetch as fallback.
 * Returns a PageData object with title, html, and optional publishedTime.
 */
async function fetchViaHttp(url: string): Promise<PageData> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeGraphInspector/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP fetch returned ${response.status}: ${response.statusText}`)
  }

  const html = await response.text()

  // Extract title from HTML
  let title = url
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]*>/g, '').trim() || url
  }

  // Try to extract published time from meta tags
  let publishedTime: string | null = null
  const timeMatch = html.match(/<meta[^>]*(?:property|name)=["'](?:article:published_time|date|dc\.date)["'][^>]*content=["']([^"']+)["'][^>]*>/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:article:published_time|date|dc\.date)["'][^>]*>/i)
  if (timeMatch) {
    publishedTime = timeMatch[1]
  }

  return { title, html, publishedTime }
}

/**
 * Attempt to read the page content using ZAI SDK first,
 * falling back to GitHub API or plain HTTP fetch if ZAI is unavailable.
 */
async function fetchPageContent(url: string): Promise<PageData> {
  // Strategy 1: Try ZAI SDK
  try {
    const zai = await ZAI.create()
    const result = await zai.functions.invoke('page_reader', { url })
    if (result?.data?.html) {
      return {
        title: result.data.title || url,
        html: result.data.html,
        publishedTime: result.data.publishedTime || null,
      }
    }
  } catch (err) {
    console.warn('ZAI SDK unavailable, using HTTP fallback:', err instanceof Error ? err.message : err)
  }

  // Strategy 2: GitHub API for GitHub URLs
  const gh = parseGitHubUrl(url)
  if (gh) {
    try {
      return await fetchViaGitHubApi(url)
    } catch (err) {
      console.warn('GitHub API fallback failed, trying plain HTTP:', err instanceof Error ? err.message : err)
    }
  }

  // Strategy 3: Plain HTTP fetch
  return await fetchViaHttp(url)
}

/**
 * Clean HTML content to plain text.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000) // Limit content size
}

/**
 * Extract headings (h1-h3) from HTML.
 */
function extractHeadings(html: string): { level: number; text: string }[] {
  const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi
  const headings: { level: number; text: string }[] = []
  let match
  while ((match = headingRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, '').trim()
    if (text && text.length < 200) {
      headings.push({ level: parseInt(match[0][2]), text })
    }
  }
  return headings
}

/**
 * Extract external links from HTML.
 */
function extractLinks(html: string): string[] {
  const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi
  const links: string[] = []
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    const link = match[1]
    // Skip common non-content links
    if (
      !link.includes('javascript:') &&
      !link.includes('mailto:') &&
      !link.includes('#') &&
      !links.includes(link)
    ) {
      links.push(link)
    }
  }
  return links
}

export async function POST(request: NextRequest) {
  try {
    const { url, projectId } = await request.json()
    if (!url || !projectId) {
      return NextResponse.json({ error: 'URL and projectId are required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Verify project exists
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if this URL was already inspected for this project (avoid duplicates)
    const existingNode = await db.knowledgeNode.findFirst({
      where: {
        projectId,
        path: url,
        isExternal: true,
      },
    })

    // Fetch page content with ZAI → GitHub API → HTTP fallback
    const pageData = await fetchPageContent(url)

    if (!pageData?.html) {
      return NextResponse.json({ error: 'Failed to read the page content' }, { status: 500 })
    }

    const title = pageData.title || url

    // Clean HTML content to plain text
    const content = htmlToPlainText(pageData.html)

    // If node already exists, update it; otherwise create new
    let pageNode
    if (existingNode) {
      pageNode = await db.knowledgeNode.update({
        where: { id: existingNode.id },
        data: {
          name: title,
          description: content.slice(0, 500),
          summary: `Web page: ${title}`,
          importance: 0.7,
          metadata: JSON.stringify({
            url,
            publishedTime: pageData.publishedTime || null,
            inspectedAt: new Date().toISOString(),
            contentLength: content.length,
          }),
        },
      })
      // Delete old child nodes and edges for re-inspection
      const oldChildEdges = await db.knowledgeEdge.findMany({
        where: { sourceId: pageNode.id, projectId },
      })
      const oldChildIds = oldChildEdges.map(e => e.targetId)
      if (oldChildIds.length > 0) {
        await db.knowledgeEdge.deleteMany({ where: { id: { in: oldChildEdges.map(e => e.id) } } })
        await db.knowledgeNode.deleteMany({ where: { id: { in: oldChildIds } } })
      }
    } else {
      pageNode = await db.knowledgeNode.create({
        data: {
          projectId,
          type: 'concept',
          name: title,
          path: url,
          description: content.slice(0, 500),
          summary: `Web page: ${title}`,
          importance: 0.7,
          isExternal: true,
          metadata: JSON.stringify({
            url,
            publishedTime: pageData.publishedTime || null,
            inspectedAt: new Date().toISOString(),
            contentLength: content.length,
          }),
        },
      })
    }

    // Extract headings from the HTML to create sub-nodes
    const headings = extractHeadings(pageData.html)

    // Create nodes for top headings
    const createdNodes = [pageNode]
    const createdEdges = []

    for (const heading of headings.slice(0, 10)) {
      const headingNode = await db.knowledgeNode.create({
        data: {
          projectId,
          type: 'concept',
          name: heading.text,
          description: `Section from: ${title}`,
          summary: `H${heading.level}: ${heading.text}`,
          importance: 0.5,
          isExternal: true,
          path: url,
          metadata: JSON.stringify({ url, headingLevel: heading.level }),
        },
      })
      createdNodes.push(headingNode)

      const edge = await db.knowledgeEdge.create({
        data: {
          projectId,
          type: 'contains',
          sourceId: pageNode.id,
          targetId: headingNode.id,
          label: `h${heading.level}`,
          weight: 0.6,
        },
      })
      createdEdges.push(edge)
    }

    // Extract links from the page
    const links = extractLinks(pageData.html)

    return NextResponse.json({
      node: pageNode,
      nodes: createdNodes,
      edges: createdEdges,
      links: links.slice(0, 20),
      content: content.slice(0, 2000),
    }, { status: 201 })
  } catch (error) {
    console.error('Link inspection error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to inspect link' },
      { status: 500 }
    )
  }
}
