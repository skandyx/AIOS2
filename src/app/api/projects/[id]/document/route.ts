import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatCompletion, type ChatMessage } from '@/lib/providers'

// POST /api/projects/[id]/document - Generate project documentation
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
      include: {
        projectFiles: {
          select: { name: true, path: true, language: true, size: true, source: true },
          orderBy: { path: 'asc' },
        },
        tasks: {
          select: { title: true, status: true, type: true, priority: true, description: true },
          orderBy: { createdAt: 'asc' },
        },
        graphNodes: {
          select: { name: true, type: true, description: true, path: true, language: true },
          take: 50,
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Gather project context
    let techStackDisplay = project.techStack || ''
    if (techStackDisplay) {
      try {
        const parsed = JSON.parse(techStackDisplay)
        if (Array.isArray(parsed)) techStackDisplay = parsed.join(', ')
      } catch { /* keep as-is */ }
    }

    const fileList = project.projectFiles
      .map(f => `  - ${f.path} (${f.language || 'unknown'}, ${f.size} bytes)`)
      .join('\n')

    const taskList = project.tasks
      .map(t => `  - [${t.status}] ${t.title} (${t.type || 'general'}, ${t.priority})`)
      .join('\n')

    const nodeList = project.graphNodes
      .map(n => `  - ${n.name} (${n.type})${n.path ? ` at ${n.path}` : ''}${n.description ? `: ${n.description}` : ''}`)
      .join('\n')

    // Generate comprehensive documentation using AI
    const systemPrompt = `You are a technical documentation writer. Generate comprehensive project documentation in markdown format.

Generate TWO sections, separated by a special marker:

===README===
Generate a README.md with:
- Project title and description
- Badges (build status, license, etc.)
- Features overview
- Installation instructions (step-by-step)
- Usage guide with examples
- API documentation (if applicable)
- Configuration guide
- Deployment instructions
- Contributing guidelines
- License

===DOCUMENTATION===
Generate detailed architecture documentation with:
- Architecture overview (system design, components)
- Data flow diagrams (described in text)
- Component/module descriptions
- Database schema overview
- Security considerations
- Performance considerations
- Testing strategy
- Monitoring and logging
- Troubleshooting guide

Make it detailed, practical, and professional. Use proper markdown formatting with headers, code blocks, tables, and lists.`

    const userMessage = `Generate comprehensive documentation for this project:

**Project Name:** ${project.name}
**Description:** ${project.description || 'No description provided'}
**Category:** ${project.category || 'General'}
**Tech Stack:** ${techStackDisplay || 'Not specified'}
**Requirements:** ${project.requirements || 'No specific requirements'}
**Priority:** ${project.priority}

**Project Files (${project.projectFiles.length}):**
${fileList || '  (No files yet)'}

**Tasks (${project.tasks.length}):**
${taskList || '  (No tasks yet)'}

**Knowledge Graph Nodes (${project.graphNodes.length}):**
${nodeList || '  (No knowledge graph data yet)'}

Generate complete, detailed documentation now.`

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    let aiResponse: string
    try {
      const completion = await chatCompletion({ messages, temperature: 0.5, maxTokens: 4096 })
      aiResponse = completion.content
    } catch (aiError) {
      console.error('Documentation AI generation failed:', aiError)
      return NextResponse.json(
        { error: `AI documentation generation failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

    // Split the response into README and documentation sections
    let readme = ''
    let documentation = ''

    const separatorIndex = aiResponse.indexOf('===README===')
    const docSeparatorIndex = aiResponse.indexOf('===DOCUMENTATION===')

    if (separatorIndex !== -1 && docSeparatorIndex !== -1) {
      // Extract README section (between ===README=== and ===DOCUMENTATION===)
      readme = aiResponse
        .substring(separatorIndex + '===README==='.length, docSeparatorIndex)
        .trim()
      // Extract documentation section (after ===DOCUMENTATION===)
      documentation = aiResponse
        .substring(docSeparatorIndex + '===DOCUMENTATION==='.length)
        .trim()
    } else {
      // If the separator format isn't followed, put everything in documentation
      // and generate a basic README
      documentation = aiResponse
      readme = `# ${project.name}

${project.description || ''}

## Tech Stack
${techStackDisplay || 'Not specified'}

## Getting Started
See the full documentation below for installation and usage instructions.

## Documentation
Full project documentation is available in the project details.
`
    }

    // Store in project fields
    await db.project.update({
      where: { id },
      data: {
        readme,
        documentation,
      },
    })

    return NextResponse.json({
      success: true,
      readme,
      documentation,
      readmeLength: readme.length,
      documentationLength: documentation.length,
    })
  } catch (error) {
    console.error('Generate documentation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate documentation' },
      { status: 500 }
    )
  }
}
