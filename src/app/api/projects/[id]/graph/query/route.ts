import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatCompletion, type ChatMessage } from '@/lib/providers'

// ─── POST: Query the knowledge graph with natural language ──────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { query } = body

    // 1. Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'A query string is required' },
        { status: 400 }
      )
    }

    // 2. Verify project exists
    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 3. Get the knowledge graph data
    const nodes = await db.knowledgeNode.findMany({
      where: { projectId: id },
      orderBy: { importance: 'desc' },
    })

    const edges = await db.knowledgeEdge.findMany({
      where: { projectId: id },
      include: {
        source: { select: { id: true, name: true, type: true } },
        target: { select: { id: true, name: true, type: true } },
      },
    })

    if (nodes.length === 0) {
      return NextResponse.json(
        { error: 'Knowledge graph is empty. Build the graph first by posting to /api/projects/[id]/graph' },
        { status: 400 }
      )
    }

    // 4. Build a condensed graph context for the AI
    // Summarize nodes by type
    const nodesByType: Record<string, Array<{ name: string; path?: string | null; description?: string | null; language?: string | null }>> = {}
    for (const node of nodes) {
      if (!nodesByType[node.type]) nodesByType[node.type] = []
      nodesByType[node.type].push({
        name: node.name,
        path: node.path,
        description: node.description,
        language: node.language,
      })
    }

    // Build a readable summary of the graph
    let graphContext = `## Project: ${project.name}\n`
    if (project.description) graphContext += `Description: ${project.description}\n`
    if (project.techStack) {
      try {
        const techStack = JSON.parse(project.techStack)
        if (Array.isArray(techStack)) {
          graphContext += `Tech Stack: ${techStack.join(', ')}\n`
        }
      } catch {
        graphContext += `Tech Stack: ${project.techStack}\n`
      }
    }

    graphContext += `\n### Knowledge Graph Summary (${nodes.length} nodes, ${edges.length} edges)\n\n`

    // Node summaries by type
    for (const [type, typeNodes] of Object.entries(nodesByType)) {
      graphContext += `#### ${type.charAt(0).toUpperCase() + type.slice(1)}s (${typeNodes.length})\n`
      for (const node of typeNodes.slice(0, 30)) {
        graphContext += `- ${node.name}`
        if (node.path) graphContext += ` (${node.path})`
        if (node.language) graphContext += ` [${node.language}]`
        if (node.description) graphContext += `: ${node.description}`
        graphContext += '\n'
      }
      if (typeNodes.length > 30) {
        graphContext += `- ... and ${typeNodes.length - 30} more\n`
      }
      graphContext += '\n'
    }

    // Key relationships (limit to most important)
    const importantEdges = edges.slice(0, 50)
    graphContext += `### Key Relationships\n`
    for (const edge of importantEdges) {
      graphContext += `- ${edge.source.name} → [${edge.type}] → ${edge.target.name}\n`
    }
    if (edges.length > 50) {
      graphContext += `- ... and ${edges.length - 50} more relationships\n`
    }

    // 5. Build the AI prompt
    const systemPrompt = `You are an AI code analyst with deep knowledge of software architecture and code structure. You have access to a knowledge graph representation of a codebase. The graph contains nodes (files, functions, classes, modules, dependencies, etc.) and edges (relationships like imports, calls, extends, contains, etc.).

Answer the user's question based on the knowledge graph context provided. If the graph doesn't contain enough information to answer fully, say so and suggest what additional information would help.

Be specific: reference actual file names, function names, and class names from the graph when relevant.
Provide architectural insights, potential issues, and recommendations when appropriate.
If the question is about finding something (e.g., "where is X defined?"), search through the nodes and edges to provide the answer.
If the question is about understanding relationships, trace through the edges to explain how entities connect.`

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the knowledge graph for the codebase:\n\n${graphContext}\n\nMy question: ${query}` },
    ]

    // 6. Call AI
    let aiResponse: string
    try {
      const completion = await chatCompletion({ messages, temperature: 0.3 })
      aiResponse = completion.content
    } catch (aiError) {
      console.error('Knowledge graph query AI failed:', aiError)
      const errorMessage = aiError instanceof Error ? aiError.message : 'AI query failed'

      // Fallback: try to provide a basic answer from the graph data alone
      const fallbackAnswer = generateFallbackAnswer(query, nodes, edges)
      return NextResponse.json({
        answer: fallbackAnswer,
        source: 'fallback',
        error: errorMessage,
        projectId: id,
        graphStats: {
          nodesCount: nodes.length,
          edgesCount: edges.length,
        },
      })
    }

    // 7. Return the AI's answer
    return NextResponse.json({
      answer: aiResponse,
      source: 'ai',
      projectId: id,
      graphStats: {
        nodesCount: nodes.length,
        edgesCount: edges.length,
      },
    })
  } catch (error) {
    console.error('Knowledge graph query error:', error)
    return NextResponse.json(
      { error: 'Failed to query knowledge graph' },
      { status: 500 }
    )
  }
}

// ─── Fallback Answer Generator (when AI is unavailable) ─────────────────────

function generateFallbackAnswer(
  query: string,
  nodes: Array<{ type: string; name: string; path?: string | null; description?: string | null; language?: string | null }>,
  edges: Array<{ type: string; source: { name: string; type: string }; target: { name: string; type: string } }>
): string {
  const queryLower = query.toLowerCase()
  const parts: string[] = []

  // Try to find relevant nodes
  const searchTerms = queryLower.split(/\s+/).filter(w => w.length > 3)
  const relevantNodes = nodes.filter(n => {
    const text = `${n.name} ${n.path || ''} ${n.description || ''} ${n.type}`.toLowerCase()
    return searchTerms.some(term => text.includes(term))
  })

  if (relevantNodes.length > 0) {
    parts.push(`Found ${relevantNodes.length} relevant entities in the knowledge graph:`)
    for (const node of relevantNodes.slice(0, 10)) {
      parts.push(`- [${node.type}] ${node.name}${node.path ? ` (${node.path})` : ''}${node.description ? `: ${node.description}` : ''}`)
    }
  }

  // Try to find relevant relationships
  const relevantEdges = edges.filter(e => {
    const text = `${e.source.name} ${e.target.name} ${e.type}`.toLowerCase()
    return searchTerms.some(term => text.includes(term))
  })

  if (relevantEdges.length > 0) {
    parts.push(`\nRelevant relationships:`)
    for (const edge of relevantEdges.slice(0, 10)) {
      parts.push(`- ${edge.source.name} → [${edge.type}] → ${edge.target.name}`)
    }
  }

  if (parts.length === 0) {
    parts.push(`Could not find specific information matching your query in the knowledge graph.`)
    parts.push(`The graph contains ${nodes.length} nodes and ${edges.length} edges.`)
    parts.push(`Node types: ${[...new Set(nodes.map(n => n.type))].join(', ')}`)
  }

  parts.push(`\n(Note: AI analysis was unavailable. This is a basic search result.)`)

  return parts.join('\n')
}
