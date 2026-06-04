import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatCompletion, type ChatMessage } from '@/lib/providers'

// ─── Safe JSON Parser with Repair Logic ─────────────────────────────────────

function safeJsonParse(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch {}

  // Try extracting from code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()) } catch {}
  }

  // Try finding array with bracket repair
  const firstBracket = text.indexOf('[')
  const lastBracket = text.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const substr = text.substring(firstBracket, lastBracket + 1)
    try { return JSON.parse(substr) } catch {}
    // Try repairing: close unclosed strings and brackets
    try {
      let repaired = substr
      // Count open/close brackets
      const openBrackets = (repaired.match(/\[/g) || []).length
      const closeBrackets = (repaired.match(/\]/g) || []).length
      const openBraces = (repaired.match(/\{/g) || []).length
      const closeBraces = (repaired.match(/\}/g) || []).length
      // Add missing closers
      for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}'
      for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']'
      return JSON.parse(repaired)
    } catch {}
  }

  // Try extracting individual objects from text (for arrays of findings)
  const objectMatches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g)
  if (objectMatches && objectMatches.length > 0) {
    const objects: unknown[] = []
    for (const objStr of objectMatches) {
      try {
        objects.push(JSON.parse(objStr))
      } catch {
        // Try with repair
        try {
          let repaired = objStr
          const openB = (repaired.match(/\{/g) || []).length
          const closeB = (repaired.match(/\}/g) || []).length
          for (let i = 0; i < openB - closeB; i++) repaired += '}'
          objects.push(JSON.parse(repaired))
        } catch {}
      }
    }
    if (objects.length > 0) return objects
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)) } catch {}
  }

  return null
}

// ─── Regex-Based Static Security Patterns ───────────────────────────────────

interface StaticFinding {
  type: 'security' | 'bug' | 'quality'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string
  filePath: string
  lineStart?: number
  lineEnd?: number
  codeSnippet?: string
  ruleId: string
  category: string
}

const SECURITY_PATTERNS: Array<{
  regex: RegExp
  title: string
  description: string
  severity: StaticFinding['severity']
  ruleId: string
  category: string
}> = [
  {
    regex: /eval\s*\(/g,
    title: 'Use of eval()',
    description: 'eval() can execute arbitrary code and is a major security risk. Avoid using eval() at all costs.',
    severity: 'critical',
    ruleId: 'no-eval',
    category: 'code-injection',
  },
  {
    regex: /innerHTML\s*=/g,
    title: 'Direct innerHTML assignment',
    description: 'Direct innerHTML assignment can lead to XSS attacks. Use textContent or a sanitizer instead.',
    severity: 'high',
    ruleId: 'no-inner-html',
    category: 'xss',
  },
  {
    regex: /dangerouslySetInnerHTML/g,
    title: 'React dangerouslySetInnerHTML',
    description: 'dangerouslySetInnerHTML can introduce XSS vulnerabilities if the content is not sanitized.',
    severity: 'high',
    ruleId: 'no-dangerously-set-inner-html',
    category: 'xss',
  },
  {
    regex: /(?:password|passwd|pwd|secret|api_key|apikey|token|auth_token)\s*[:=]\s*['"][^'"]+['"]/gi,
    title: 'Hardcoded secret or credential',
    description: 'A potential secret, password, or API key appears to be hardcoded in the source code. Use environment variables instead.',
    severity: 'critical',
    ruleId: 'no-hardcoded-secrets',
    category: 'secrets',
  },
  {
    regex: /SELECT\s+.*\s+FROM\s+.*\s*\+\s*(?:req|request|params|query|body)/gi,
    title: 'Potential SQL injection',
    description: 'String concatenation in SQL queries with user input can lead to SQL injection. Use parameterized queries.',
    severity: 'critical',
    ruleId: 'sql-injection',
    category: 'injection',
  },
  {
    regex: /document\.write\s*\(/g,
    title: 'Use of document.write()',
    description: 'document.write() can be exploited for XSS and can overwrite the entire document. Avoid using it.',
    severity: 'medium',
    ruleId: 'no-document-write',
    category: 'xss',
  },
  {
    regex: /\.exec\s*\(/g,
    title: 'Potential command injection',
    description: 'Use of exec() can lead to command injection if user input is passed. Use execFile() or spawn() with argument arrays.',
    severity: 'critical',
    ruleId: 'no-exec',
    category: 'command-injection',
  },
  {
    regex: /cors\s*\(\s*\{[^}]*origin\s*:\s*['"]\*['"]/gi,
    title: 'Wildcard CORS origin',
    description: 'Allowing all origins (*) in CORS configuration is a security risk. Restrict to specific domains.',
    severity: 'high',
    ruleId: 'no-cors-wildcard',
    category: 'cors',
  },
]

const BUG_PATTERNS: Array<{
  regex: RegExp
  title: string
  description: string
  severity: StaticFinding['severity']
  ruleId: string
  category: string
}> = [
  {
    regex: /(?:var|let|const)\s+(\w+)\s*=\s*\w+\s*;\s*(?:var|let|const)\s+\1\s*=/g,
    title: 'Variable redeclared',
    description: 'The same variable name is declared twice in the same scope, which can cause unexpected behavior.',
    severity: 'medium',
    ruleId: 'no-redeclare',
    category: 'dead-code',
  },
  {
    regex: /catch\s*\(\s*\w+\s*\)\s*\{\s*\}/g,
    title: 'Empty catch block',
    description: 'Empty catch blocks silently swallow errors, making debugging difficult. At minimum, log the error.',
    severity: 'medium',
    ruleId: 'no-empty-catch',
    category: 'error-handling',
  },
  {
    regex: /console\.(log|warn|error|debug|info)\s*\(/g,
    title: 'Console statement in production code',
    description: 'Console statements should be removed or replaced with proper logging in production code.',
    severity: 'low',
    ruleId: 'no-console',
    category: 'quality',
  },
  {
    regex: /(?:==|!=)\s*(?:null|undefined|true|false|0|''|"")/g,
    title: 'Loose equality comparison',
    description: 'Use strict equality (=== and !==) to avoid unexpected type coercion bugs.',
    severity: 'medium',
    ruleId: 'no-eq-null',
    category: 'bug',
  },
  {
    regex: /\.then\s*\([^)]*\)(?!\s*\.catch)/g,
    title: 'Promise without catch handler',
    description: 'Unhandled promise rejections can crash the application. Always add a .catch() handler.',
    severity: 'medium',
    ruleId: 'no-promise-without-catch',
    category: 'error-handling',
  },
  {
    regex: /async\s+function\s+\w+\s*\([^)]*\)\s*\{[^}]*await[^}]*\}(?!\s*catch|\s*\.catch)/g,
    title: 'Async function without try/catch',
    description: 'Async functions using await should wrap operations in try/catch for proper error handling.',
    severity: 'low',
    ruleId: 'no-async-without-trycatch',
    category: 'error-handling',
  },
]

const QUALITY_PATTERNS: Array<{
  regex: RegExp
  title: string
  description: string
  severity: StaticFinding['severity']
  ruleId: string
  category: string
}> = [
  {
    regex: /function\s+\w+\s*\([^)]{80,}\)/g,
    title: 'Function with too many parameters',
    description: 'Functions with many parameters are hard to maintain. Consider using an options object.',
    severity: 'low',
    ruleId: 'max-params',
    category: 'complexity',
  },
  {
    regex: /any\s*[;:\)=,\]\}]/g,
    title: 'TypeScript "any" type usage',
    description: 'Using "any" defeats the purpose of TypeScript. Use a more specific type or "unknown".',
    severity: 'low',
    ruleId: 'no-explicit-any',
    category: 'typing',
  },
  {
    regex: /\/\/\s*TODO|\/\/\s*FIXME|\/\/\s*HACK|\/\/\s*XXX/gi,
    title: 'TODO/FIXME comment found',
    description: 'There are unresolved TODO or FIXME comments in the code that should be addressed.',
    severity: 'info',
    ruleId: 'todo-comment',
    category: 'maintenance',
  },
]

// ─── Static Analysis Runner ─────────────────────────────────────────────────

function runStaticAnalysis(filePath: string, content: string): StaticFinding[] {
  const findings: StaticFinding[] = []
  const lines = content.split('\n')

  const allPatterns = [
    ...SECURITY_PATTERNS.map(p => ({ ...p, type: 'security' as const })),
    ...BUG_PATTERNS.map(p => ({ ...p, type: 'bug' as const })),
    ...QUALITY_PATTERNS.map(p => ({ ...p, type: 'quality' as const })),
  ]

  for (const pattern of allPatterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
    let match
    while ((match = regex.exec(content)) !== null) {
      // Find line number
      const lineStart = content.substring(0, match.index).split('\n').length
      const lineEnd = Math.min(lineStart + match[0].split('\n').length - 1, lines.length)

      // Get code snippet (2 lines before and after)
      const snippetStart = Math.max(0, lineStart - 3)
      const snippetEnd = Math.min(lines.length, lineEnd + 2)
      const codeSnippet = lines.slice(snippetStart, snippetEnd).join('\n')

      findings.push({
        type: pattern.type,
        severity: pattern.severity,
        title: pattern.title,
        description: pattern.description,
        filePath,
        lineStart,
        lineEnd,
        codeSnippet: codeSnippet.length > 500 ? codeSnippet.substring(0, 500) + '...' : codeSnippet,
        ruleId: pattern.ruleId,
        category: pattern.category,
      })
    }
  }

  return findings
}

// ─── POST: Run AI-powered code analysis ─────────────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
      return NextResponse.json(
        { error: 'No files found in project. Upload files first.' },
        { status: 400 }
      )
    }

    // 3. Delete existing code analysis for this project
    await db.codeAnalysis.deleteMany({ where: { projectId: id } })

    // 4. Run static analysis on all files
    const allFindings: StaticFinding[] = []
    for (const file of files) {
      if (!file.content) continue
      const language = file.language || ''
      // Only analyze text-based code files
      if (['json', 'yaml', 'toml', 'env', 'markdown'].includes(language)) continue
      const findings = runStaticAnalysis(file.path, file.content)
      allFindings.push(...findings)
    }

    // 5. Create CodeAnalysis entries for static findings
    const analysisEntries: Array<{ id: string; title: string; filePath: string | null; severity: string; suggestion: string | null; description: string; lineStart: number | null; codeSnippet: string | null }> = []
    for (const finding of allFindings) {
      // Find related knowledge node
      const relatedNode = await db.knowledgeNode.findFirst({
        where: {
          projectId: id,
          path: finding.filePath,
        },
      })

      const entry = await db.codeAnalysis.create({
        data: {
          type: finding.type,
          severity: finding.severity,
          title: finding.title,
          description: finding.description,
          filePath: finding.filePath,
          lineStart: finding.lineStart || null,
          lineEnd: finding.lineEnd || null,
          codeSnippet: finding.codeSnippet || null,
          ruleId: finding.ruleId,
          category: finding.category,
          suggestion: null, // Will be filled by AI
          nodeId: relatedNode?.id || null,
          projectId: id,
        },
      })
      analysisEntries.push({
        id: entry.id,
        title: entry.title,
        filePath: entry.filePath,
        severity: entry.severity,
        suggestion: entry.suggestion,
        description: entry.description,
        lineStart: entry.lineStart,
        codeSnippet: entry.codeSnippet,
      })
    }

    // 6. AI-powered analysis for deeper insights
    // Collect key code files for AI analysis (limit to avoid token overflow)
    const codeFiles = files
      .filter(f => f.content && f.language && !['json', 'yaml', 'toml', 'env', 'markdown'].includes(f.language || ''))
      .slice(0, 10)

    let aiFindings: Array<{
      type: string
      severity: string
      title: string
      description: string
      filePath: string | null
      suggestion: string
      category: string
    }> = []

    if (codeFiles.length > 0) {
      const filesSummary = codeFiles.map(f => {
        const lines = f.content!.split('\n').length
        const preview = f.content!.split('\n').slice(0, 50).join('\n')
        return `--- File: ${f.path} (${lines} lines, ${f.language}) ---\n${preview}${lines > 50 ? '\n... (truncated)' : ''}`
      }).join('\n\n')

      const aiSystemPrompt = `You are an expert code security analyst and quality auditor. Analyze the provided code files and identify issues in these categories:

1. **Security**: SQL injection, XSS, CSRF, eval usage, hardcoded secrets, insecure dependencies, path traversal, command injection, insecure deserialization, missing authentication
2. **Bugs**: Unused variables, dead code, null reference risks, race conditions, off-by-one errors, incorrect logic, missing error handling
3. **Quality**: High complexity functions, code duplication, poor naming, missing types, tight coupling, god objects

For each finding, return a JSON array with these fields:
- type: "security" | "bug" | "quality"
- severity: "critical" | "high" | "medium" | "low" | "info"
- title: short title of the issue
- description: detailed explanation of the problem
- filePath: the file path where found (or null if general)
- suggestion: specific fix recommendation with code example if possible
- category: sub-category (e.g., "xss", "injection", "dead-code", "complexity")

Focus on the MOST IMPORTANT issues. Return at most 15 findings. Return ONLY the JSON array, no markdown.`

      try {
        const messages: ChatMessage[] = [
          { role: 'system', content: aiSystemPrompt },
          { role: 'user', content: `Analyze this codebase for security vulnerabilities, bugs, and quality issues:\n\n${filesSummary}` },
        ]

        const completion = await chatCompletion({ messages, temperature: 0.2 })
        const raw = completion.content.trim()

        const parsed = safeJsonParse(raw)
        if (Array.isArray(parsed)) {
          aiFindings = parsed
        } else {
          console.error('AI code analysis JSON parse failed, skipping AI findings')
        }
      } catch (error) {
        console.error('AI code analysis failed (non-critical):', error)
        // Non-critical: static analysis still works
      }
    }

    // 7. Create CodeAnalysis entries for AI findings
    for (const finding of aiFindings) {
      // Avoid duplicates with static analysis
      const isDuplicate = analysisEntries.some(
        e => e.title === finding.title && e.filePath === finding.filePath
      )
      if (isDuplicate) continue

      const relatedNode = finding.filePath
        ? await db.knowledgeNode.findFirst({
            where: { projectId: id, path: finding.filePath },
          })
        : null

      await db.codeAnalysis.create({
        data: {
          type: finding.type,
          severity: finding.severity,
          title: finding.title,
          description: finding.description,
          filePath: finding.filePath || null,
          suggestion: finding.suggestion || null,
          ruleId: `ai-${finding.category}`,
          category: finding.category,
          nodeId: relatedNode?.id || null,
          projectId: id,
        },
      })
    }

    // 8. Update static findings with AI suggestions (top 10 by severity)
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
    const topStaticFindings = analysisEntries
      .filter(e => !e.suggestion)
      .sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99))
      .slice(0, 10)

    if (topStaticFindings.length > 0) {
      const findingsSummary = topStaticFindings.map((f, i) =>
        `${i + 1}. [${f.severity}] ${f.title} in ${f.filePath}${f.lineStart ? `:${f.lineStart}` : ''}\n   ${f.description}${f.codeSnippet ? `\n   Code: ${f.codeSnippet.substring(0, 200)}` : ''}`
      ).join('\n\n')

      try {
        const suggestionMessages: ChatMessage[] = [
          {
            role: 'system',
            content: 'You are a code fix expert. For each finding, provide a brief, actionable fix suggestion. Return a JSON array where each element has "index" (1-based) and "suggestion" (the fix). Return ONLY the JSON array.',
          },
          {
            role: 'user',
            content: `Provide fix suggestions for these code issues:\n\n${findingsSummary}`,
          },
        ]

        const completion = await chatCompletion({ messages: suggestionMessages, temperature: 0.2 })
        const raw = completion.content.trim()

        const parsed = safeJsonParse(raw)
        const suggestions = (Array.isArray(parsed) ? parsed : []) as Array<{ index: number; suggestion: string }>

        for (const s of suggestions) {
          const idx = s.index - 1
          if (idx >= 0 && idx < topStaticFindings.length) {
            const existing = await db.codeAnalysis.findUnique({ where: { id: topStaticFindings[idx].id } })
            if (existing) {
              await db.codeAnalysis.update({
                where: { id: topStaticFindings[idx].id },
                data: { suggestion: s.suggestion },
              })
            }
          }
        }
      } catch (error) {
        console.error('AI suggestion generation failed (non-critical):', error)
      }
    }

    // 9. Return final analysis results
    const allAnalyses = await db.codeAnalysis.findMany({
      where: { projectId: id },
      orderBy: [
        { severity: 'asc' },
        { type: 'asc' },
      ],
    })

    // Compute stats
    const severityCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}
    for (const a of allAnalyses) {
      severityCounts[a.severity] = (severityCounts[a.severity] || 0) + 1
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      projectId: id,
      analyses: allAnalyses,
      stats: {
        totalFindings: allAnalyses.length,
        staticFindings: analysisEntries.length,
        aiFindings: aiFindings.length,
        severityBreakdown: severityCounts,
        typeBreakdown: typeCounts,
      },
    })
  } catch (error) {
    console.error('Code analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze code' },
      { status: 500 }
    )
  }
}
