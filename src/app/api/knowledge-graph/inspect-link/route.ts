import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

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

    // Read the web page using z-ai-web-dev-sdk
    const zai = await ZAI.create()
    const result = await zai.functions.invoke('page_reader', { url })

    if (!result?.data?.html) {
      return NextResponse.json({ error: 'Failed to read the page content' }, { status: 500 })
    }

    const pageData = result.data
    const title = pageData.title || url

    // Clean HTML content to plain text
    const content = pageData.html
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
    const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi
    const headings: { level: number; text: string }[] = []
    let match
    while ((match = headingRegex.exec(pageData.html)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, '').trim()
      if (text && text.length < 200) {
        headings.push({ level: parseInt(match[0][2]), text })
      }
    }

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
    const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi
    const links: string[] = []
    while ((match = linkRegex.exec(pageData.html)) !== null) {
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
