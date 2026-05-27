import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatCompletion, type ChatMessage } from '@/lib/providers'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ParsedEntity {
  type: string
  name: string
  path?: string
  language?: string
  linesOfCode?: number
  dependencies?: string[]
  metadata?: Record<string, unknown>
}

interface ParsedRelationship {
  sourceType: string
  sourceName: string
  targetType: string
  targetName: string
  edgeType: string
  label?: string
}

// ─── Language Detection ─────────────────────────────────────────────────────

function detectLanguage(filePath: string): string | null {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    java: 'java', kt: 'kotlin', cs: 'csharp', cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
    php: 'php', swift: 'swift', scala: 'scala', sql: 'sql',
    sh: 'shell', bash: 'shell', yml: 'yaml', yaml: 'yaml',
    json: 'json', xml: 'xml', html: 'html', css: 'css', scss: 'scss', less: 'less',
    md: 'markdown', toml: 'toml', env: 'env', dockerfile: 'dockerfile',
  }
  return ext ? langMap[ext] || null : null
}

const CODE_LANGUAGES = new Set([
  'typescript', 'javascript', 'python', 'ruby', 'go', 'rust',
  'java', 'kotlin', 'csharp', 'cpp', 'c', 'php', 'swift', 'scala',
])

// ─── Regex-Based Code Parsers ───────────────────────────────────────────────

function parseJsTsFile(filePath: string, content: string): { entities: ParsedEntity[]; relationships: ParsedRelationship[] } {
  const entities: ParsedEntity[] = []
  const relationships: ParsedRelationship[] = []
  const fileName = filePath.split('/').pop() || filePath
  const language = detectLanguage(filePath) || 'javascript'

  // Extract imports
  const importRegex = /(?:import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g
  let match: RegExpExecArray | null
  const importedModules: string[] = []
  while ((match = importRegex.exec(content)) !== null) {
    const mod = match[1] || match[2]
    if (mod) importedModules.push(mod)
  }

  // Extract export names
  const exportNames: string[] = []
  const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g
  while ((match = namedExportRegex.exec(content)) !== null) {
    exportNames.push(match[1])
  }
  const defaultExportRegex = /export\s+default\s+(?:function\s+)?(\w+)/g
  while ((match = defaultExportRegex.exec(content)) !== null) {
    if (match[1]) exportNames.push(match[1])
  }

  // Extract function declarations
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g
  while ((match = funcRegex.exec(content)) !== null) {
    const funcName = match[1]
    entities.push({
      type: 'function', name: funcName, path: filePath, language,
      metadata: { async: content.substring(Math.max(0, match.index - 6), match.index).includes('async') },
    })
    relationships.push({
      sourceType: 'file', sourceName: filePath,
      targetType: 'function', targetName: funcName,
      edgeType: 'contains', label: 'contains',
    })
  }

  // Extract arrow functions
  const arrowFuncRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g
  while ((match = arrowFuncRegex.exec(content)) !== null) {
    const funcName = match[1]
    if (!entities.find(e => e.name === funcName && e.path === filePath)) {
      entities.push({
        type: 'function', name: funcName, path: filePath, language,
        metadata: { arrowFunction: true },
      })
      relationships.push({
        sourceType: 'file', sourceName: filePath,
        targetType: 'function', targetName: funcName,
        edgeType: 'contains', label: 'contains',
      })
    }
  }

  // Extract class declarations
  const classRegex = /(?:export\s+)?(?:default\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g
  while ((match = classRegex.exec(content)) !== null) {
    const className = match[1]
    const extendsClass = match[2]
    entities.push({
      type: 'class', name: className, path: filePath, language,
      metadata: { extends: extendsClass || null },
    })
    relationships.push({
      sourceType: 'file', sourceName: filePath,
      targetType: 'class', targetName: className,
      edgeType: 'contains', label: 'contains',
    })
    if (extendsClass) {
      relationships.push({
        sourceType: 'class', sourceName: className,
        targetType: 'class', targetName: extendsClass,
        edgeType: 'extends', label: 'extends',
      })
    }
  }

  const linesOfCode = content.split('\n').length

  // File entity (first)
  entities.unshift({
    type: 'file', name: fileName, path: filePath, language, linesOfCode,
    dependencies: importedModules,
    metadata: { exports: exportNames, imports: importedModules, isCodeFile: true },
  })

  // Import relationships
  for (const mod of importedModules) {
    relationships.push({
      sourceType: 'file', sourceName: filePath,
      targetType: mod.startsWith('.') ? 'file' : 'dependency',
      targetName: mod,
      edgeType: 'imports', label: `imports ${mod}`,
    })
  }

  return { entities, relationships }
}

function parsePythonFile(filePath: string, content: string): { entities: ParsedEntity[]; relationships: ParsedRelationship[] } {
  const entities: ParsedEntity[] = []
  const relationships: ParsedRelationship[] = []
  const fileName = filePath.split('/').pop() || filePath

  const importRegex = /(?:from\s+(\S+)\s+)?import\s+([\w.*,\s]+)/g
  let match: RegExpExecArray | null
  const importedModules: string[] = []
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1]) importedModules.push(match[1])
    const names = match[2].split(',').map(s => s.trim()).filter(Boolean)
    for (const name of names) {
      if (!name.includes('*')) importedModules.push(name)
    }
  }

  const funcRegex = /def\s+(\w+)\s*\(/g
  while ((match = funcRegex.exec(content)) !== null) {
    const funcName = match[1]
    if (funcName.startsWith('_') && !funcName.startsWith('__')) continue
    entities.push({ type: 'function', name: funcName, path: filePath, language: 'python' })
    relationships.push({
      sourceType: 'file', sourceName: filePath,
      targetType: 'function', targetName: funcName,
      edgeType: 'contains', label: 'contains',
    })
  }

  const classRegex = /class\s+(\w+)(?:\(([^)]+)\))?:/g
  while ((match = classRegex.exec(content)) !== null) {
    const className = match[1]
    const baseClass = match[2]?.split(',')[0]?.trim()
    entities.push({ type: 'class', name: className, path: filePath, language: 'python', metadata: { extends: baseClass || null } })
    relationships.push({
      sourceType: 'file', sourceName: filePath,
      targetType: 'class', targetName: className,
      edgeType: 'contains', label: 'contains',
    })
    if (baseClass) {
      relationships.push({
        sourceType: 'class', sourceName: className,
        targetType: 'class', targetName: baseClass,
        edgeType: 'extends', label: 'extends',
      })
    }
  }

  const linesOfCode = content.split('\n').length
  entities.unshift({
    type: 'file', name: fileName, path: filePath, language: 'python',
    linesOfCode, dependencies: importedModules,
    metadata: { imports: importedModules, isCodeFile: true },
  })

  for (const mod of importedModules) {
    relationships.push({
      sourceType: 'file', sourceName: filePath,
      targetType: 'dependency', targetName: mod,
      edgeType: 'imports', label: `imports ${mod}`,
    })
  }

  return { entities, relationships }
}

function parsePackageJson(filePath: string, content: string): { entities: ParsedEntity[]; relationships: ParsedRelationship[] } {
  const entities: ParsedEntity[] = []
  try {
    const pkg = JSON.parse(content)
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    for (const [name, version] of Object.entries(allDeps)) {
      entities.push({
        type: 'dependency', name, path: filePath, language: 'json',
        metadata: { version: version as string, isExternal: true },
      })
    }
    entities.unshift({
      type: 'config', name: 'package.json', path: filePath, language: 'json',
      metadata: { name: pkg.name, version: pkg.version, main: pkg.main, scripts: pkg.scripts ? Object.keys(pkg.scripts) : [] },
    })
  } catch {
    entities.unshift({ type: 'config', name: 'package.json', path: filePath, language: 'json' })
  }
  return { entities, relationships: [] }
}

function parseConfigFile(filePath: string, content: string): { entities: ParsedEntity[]; relationships: ParsedRelationship[] } {
  const fileName = filePath.split('/').pop() || filePath
  const language = detectLanguage(filePath) || 'text'
  return { entities: [{ type: 'config', name: fileName, path: filePath, language, metadata: { isConfig: true } }], relationships: [] }
}

// ─── Main Parser ────────────────────────────────────────────────────────────

function parseFile(filePath: string, content: string): { entities: ParsedEntity[]; relationships: ParsedRelationship[] } {
  const language = detectLanguage(filePath)
  const fileName = filePath.split('/').pop() || filePath

  if (fileName === 'package.json') return parsePackageJson(filePath, content)

  const configFiles = ['tsconfig.json', 'jsconfig.json', '.eslintrc', '.eslintrc.json', '.prettierrc', '.prettierrc.json', 'next.config.js', 'next.config.ts', 'next.config.mjs', 'vite.config.ts', 'vite.config.js', 'docker-compose.yml', 'docker-compose.yaml', 'Dockerfile', '.env', '.env.local', 'prisma/schema.prisma']
  if (configFiles.some(cf => filePath.endsWith(cf) || fileName === cf)) {
    return parseConfigFile(filePath, content)
  }

  if (language === 'javascript' || language === 'typescript') return parseJsTsFile(filePath, content)
  if (language === 'python') return parsePythonFile(filePath, content)

  const linesOfCode = content.split('\n').length
  return {
    entities: [{ type: 'file', name: fileName, path: filePath, language, linesOfCode, metadata: { isCodeFile: CODE_LANGUAGES.has(language || '') } }],
    relationships: [],
  }
}

// ─── AI Description Enhancer ────────────────────────────────────────────────

async function enhanceNodesWithAI(
  nodes: Array<{ id: string; type: string; name: string; path?: string | null; language?: string | null; metadata?: string | null }>,
  projectId: string
): Promise<void> {
  const topNodes = nodes.slice(0, 20)
  if (topNodes.length === 0) return

  const nodeList = topNodes.map((n, i) => {
    let meta: Record<string, unknown> = {}
    try { meta = n.metadata ? JSON.parse(n.metadata) : {} } catch { /* ignore */ }
    return `${i + 1}. [${n.type}] ${n.name}${n.path ? ` (${n.path})` : ''}${n.language ? ` [${n.language}]` : ''}${meta.exports ? ` exports: ${(meta.exports as string[]).join(', ')}` : ''}${meta.imports ? ` imports: ${(meta.imports as string[]).slice(0, 5).join(', ')}` : ''}`
  }).join('\n')

  const systemPrompt = `You are a code documentation AI. Given a list of code entities, generate brief descriptions. Return a JSON array where each element has "index" (1-based) and "description" (single sentence). Return ONLY the JSON array.`

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Project ID: ${projectId}\n\nEntities:\n${nodeList}` },
    ]

    const completion = await chatCompletion({ messages, temperature: 0.3, maxTokens: 2048 })

    // Extract JSON from response
    let jsonStr = completion.content.trim()
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim()
    const firstBracket = jsonStr.indexOf('[')
    const lastBracket = jsonStr.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      jsonStr = jsonStr.substring(firstBracket, lastBracket + 1)
    }

    const descriptions = JSON.parse(jsonStr) as Array<{ index: number; description: string }>
    for (const desc of descriptions) {
      const nodeIdx = desc.index - 1
      if (nodeIdx >= 0 && nodeIdx < topNodes.length) {
        await db.knowledgeNode.update({
          where: { id: topNodes[nodeIdx].id },
          data: { description: desc.description },
        })
      }
    }
  } catch (error) {
    console.error('AI description enhancement failed (non-critical):', error)
  }
}

// ─── GET: Retrieve the full knowledge graph ─────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

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
      orderBy: { weight: 'desc' },
    })

    const nodeTypeCounts: Record<string, number> = {}
    for (const node of nodes) {
      nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] || 0) + 1
    }
    const edgeTypeCounts: Record<string, number> = {}
    for (const edge of edges) {
      edgeTypeCounts[edge.type] = (edgeTypeCounts[edge.type] || 0) + 1
    }

    return NextResponse.json({
      projectId: id,
      nodes,
      edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        nodeTypes: nodeTypeCounts,
        edgeTypes: edgeTypeCounts,
      },
    })
  } catch (error) {
    console.error('Get knowledge graph error:', error)
    return NextResponse.json({ error: 'Failed to fetch knowledge graph' }, { status: 500 })
  }
}

// ─── POST: Build/rebuild the knowledge graph from project files ─────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if AI enhancement is requested (default: true)
    const url = new URL(request.url)
    const enhanceWithAI = url.searchParams.get('enhance') !== 'false'

    // 1. Verify project exists
    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 2. Get all project files
    const files = await db.projectFile.findMany({
      where: { projectId: id, isDirectory: false },
    })

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files found in project. Upload files first.' }, { status: 400 })
    }

    // 3. Delete existing graph data for this project
    await db.knowledgeEdge.deleteMany({ where: { projectId: id } })
    await db.knowledgeNode.deleteMany({ where: { projectId: id } })

    // 4. Parse all files and collect entities + relationships
    const allEntities: ParsedEntity[] = []
    const allRelationships: ParsedRelationship[] = []

    for (const file of files) {
      if (!file.content) continue
      const { entities, relationships } = parseFile(file.path, file.content)
      allEntities.push(...entities)
      allRelationships.push(...relationships)
    }

    // 5. Create KnowledgeNode entries (batch)
    const nodeMap = new Map<string, string>() // key -> nodeId

    // Deduplicate entities by key
    const seenEntityKeys = new Set<string>()
    const uniqueEntities: ParsedEntity[] = []
    for (const entity of allEntities) {
      const key = entity.path ? `${entity.type}:${entity.name}:${entity.path}` : `${entity.type}:${entity.name}`
      if (!seenEntityKeys.has(key)) {
        seenEntityKeys.add(key)
        uniqueEntities.push(entity)
      }
    }

    // Calculate importance scores from relationships
    const entityImportance: Record<string, number> = {}
    for (const rel of allRelationships) {
      const sourceKey = `${rel.sourceType}:${rel.sourceName}`
      const targetKey = `${rel.targetType}:${rel.targetName}`
      entityImportance[sourceKey] = (entityImportance[sourceKey] || 0.5) + 0.1
      entityImportance[targetKey] = (entityImportance[targetKey] || 0.5) + 0.1
    }

    // Create nodes in batch using createMany for efficiency
    const nodeDataList = uniqueEntities.map(entity => ({
      type: entity.type,
      name: entity.name,
      path: entity.path || null,
      language: entity.language || null,
      linesOfCode: entity.linesOfCode || null,
      dependencies: entity.dependencies ? JSON.stringify(entity.dependencies) : null,
      metadata: entity.metadata ? JSON.stringify(entity.metadata) : null,
      importance: Math.min(entityImportance[`${entity.type}:${entity.name}`] || 0.5, 1.0),
      isExternal: entity.type === 'dependency' || (entity.metadata?.isExternal as boolean) || false,
      projectId: id,
    }))

    // SQLite doesn't return IDs from createMany, so create one by one
    for (let i = 0; i < uniqueEntities.length; i++) {
      const entity = uniqueEntities[i]
      const key = entity.path ? `${entity.type}:${entity.name}:${entity.path}` : `${entity.type}:${entity.name}`

      const node = await db.knowledgeNode.create({ data: nodeDataList[i] })

      nodeMap.set(key, node.id)
      if (!nodeMap.has(`${entity.type}:${entity.name}`)) {
        nodeMap.set(`${entity.type}:${entity.name}`, node.id)
      }
      if (entity.path && entity.type === 'file') {
        nodeMap.set(`${entity.type}:${entity.path}`, node.id)
      }
    }

    // 6. Create KnowledgeEdge entries
    const edgeKeySet = new Set<string>() // Track edges to avoid duplicates
    const edgesToCreate: Array<{ type: string; label: string | null; sourceId: string; targetId: string; projectId: string }> = []

    for (const rel of allRelationships) {
      const sourceKey = `${rel.sourceType}:${rel.sourceName}`
      const targetKey = `${rel.targetType}:${rel.targetName}`

      let sourceId = nodeMap.get(sourceKey)
      let targetId = nodeMap.get(targetKey)

      // For dependency targets that aren't nodes yet (e.g. from import statements)
      if (!targetId && rel.targetType === 'dependency') {
        // Check if we already have a dependency node for this
        const existingDep = await db.knowledgeNode.findFirst({
          where: { projectId: id, type: 'dependency', name: rel.targetName },
        })
        if (existingDep) {
          targetId = existingDep.id
          nodeMap.set(targetKey, targetId)
        } else {
          const depNode = await db.knowledgeNode.create({
            data: { type: 'dependency', name: rel.targetName, isExternal: true, importance: 0.3, projectId: id },
          })
          nodeMap.set(targetKey, depNode.id)
          targetId = depNode.id
        }
      }

      // For file targets (relative imports)
      if (!targetId && rel.targetType === 'file') {
        const possibleFileNode = await db.knowledgeNode.findFirst({
          where: {
            projectId: id, type: 'file',
            OR: [{ name: rel.targetName.split('/').pop() || rel.targetName }, { path: { endsWith: rel.targetName } }],
          },
        })
        if (possibleFileNode) {
          targetId = possibleFileNode.id
          nodeMap.set(targetKey, targetId)
        }
      }

      if (sourceId && targetId) {
        const edgeKey = `${sourceId}-${rel.edgeType}-${targetId}`
        if (!edgeKeySet.has(edgeKey)) {
          edgeKeySet.add(edgeKey)
          edgesToCreate.push({
            type: rel.edgeType,
            label: rel.label || null,
            sourceId,
            targetId,
            projectId: id,
          })
        }
      }
    }

    // Batch create edges
    let edgesCreated = 0
    for (const edgeData of edgesToCreate) {
      try {
        await db.knowledgeEdge.create({ data: edgeData })
        edgesCreated++
      } catch {
        // Skip duplicate edges silently
      }
    }

    // 7. AI-enhanced descriptions (optional, can be slow)
    let nodesEnhanced = 0
    if (enhanceWithAI) {
      try {
        const topNodes = await db.knowledgeNode.findMany({
          where: { projectId: id },
          orderBy: { importance: 'desc' },
          take: 20,
          select: { id: true, type: true, name: true, path: true, language: true, metadata: true },
        })
        await enhanceNodesWithAI(topNodes, id)
        nodesEnhanced = topNodes.length
      } catch (error) {
        console.error('AI enhancement step failed (non-critical):', error)
      }
    }

    // 8. Return the built graph
    const finalNodes = await db.knowledgeNode.findMany({
      where: { projectId: id },
      orderBy: { importance: 'desc' },
    })
    const finalEdges = await db.knowledgeEdge.findMany({
      where: { projectId: id },
      include: {
        source: { select: { id: true, name: true, type: true } },
        target: { select: { id: true, name: true, type: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Knowledge graph built from ${files.length} files`,
      projectId: id,
      nodes: finalNodes,
      edges: finalEdges,
      stats: {
        filesProcessed: files.length,
        nodesCreated: finalNodes.length,
        edgesCreated,
        nodesEnhanced,
      },
    })
  } catch (error) {
    console.error('Build knowledge graph error:', error)
    return NextResponse.json({ error: 'Failed to build knowledge graph' }, { status: 500 })
  }
}
