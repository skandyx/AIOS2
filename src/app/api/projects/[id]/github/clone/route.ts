import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Language detection from file extension
function detectLanguage(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    kt: 'kotlin', swift: 'swift', c: 'c', cpp: 'cpp', h: 'c',
    hpp: 'cpp', cs: 'csharp', php: 'php', html: 'html', css: 'css',
    scss: 'scss', less: 'less', json: 'json', yaml: 'yaml', yml: 'yaml',
    xml: 'xml', md: 'markdown', sql: 'sql', sh: 'shell', bash: 'shell',
    dockerfile: 'dockerfile', toml: 'toml', ini: 'ini', env: 'env',
    graphql: 'graphql', vue: 'vue', svelte: 'svelte',
  }
  return ext ? langMap[ext] || null : null
}

// Check if a file is likely text (not binary) based on extension
function isLikelyTextFile(path: string): boolean {
  const binaryExtensions = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg',
    'mp3', 'mp4', 'wav', 'avi', 'mov', 'flv', 'mkv',
    'zip', 'tar', 'gz', 'rar', '7z', 'bz2',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'exe', 'dll', 'so', 'dylib', 'bin', 'dat',
    'woff', 'woff2', 'ttf', 'eot', 'otf',
    'sqlite', 'db', 'pyc', 'class', 'o', 'obj',
  ])
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return !binaryExtensions.has(ext)
}

// POST /api/projects/[id]/github/clone - Clone/import files from the connected GitHub repo
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.repoOwner || !project.repoName) {
      return NextResponse.json(
        { error: 'No GitHub repository connected. Connect one first via POST /github' },
        { status: 400 }
      )
    }

    const branch = project.repoBranch || 'main'
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    }
    if (project.githubToken) {
      headers['Authorization'] = `token ${project.githubToken}`
    }

    // Step 1: Get the repo tree (recursive)
    const treeResponse = await fetch(
      `https://api.github.com/repos/${project.repoOwner}/${project.repoName}/git/trees/${branch}?recursive=1`,
      { headers }
    )

    if (!treeResponse.ok) {
      const errorText = await treeResponse.text()
      return NextResponse.json(
        { error: `Failed to fetch repo tree: ${treeResponse.status} - ${errorText}` },
        { status: 502 }
      )
    }

    const treeData = await treeResponse.json()
    const treeItems: Array<{ path: string; type: string; size?: number; sha?: string }> = treeData.tree || []

    // Filter to only blob (file) entries, skip very large files and node_modules etc.
    const fileItems = treeItems.filter(item => {
      if (item.type !== 'blob') return false
      if (item.size && item.size > 1000000) return false // Skip files > 1MB
      const path = item.path.toLowerCase()
      if (path.includes('node_modules')) return false
      if (path.includes('.git/')) return false
      if (path.includes('dist/')) return false
      if (path.includes('build/')) return false
      if (path.includes('.next/')) return false
      return true
    })

    // Limit to first 200 files to avoid rate limiting
    const filesToImport = fileItems.slice(0, 200)

    // Step 2: Fetch content for each file and create ProjectFile records
    let importedCount = 0
    let skippedCount = 0

    for (const fileItem of filesToImport) {
      try {
        // Check if file already exists at this path
        const existing = await db.projectFile.findFirst({
          where: {
            projectId: id,
            path: fileItem.path,
          },
        })

        if (existing) {
          skippedCount++
          continue
        }

        const isText = isLikelyTextFile(fileItem.path)
        let content: string | null = null

        if (isText) {
          // Fetch file content via GitHub API
          const contentResponse = await fetch(
            `https://api.github.com/repos/${project.repoOwner}/${project.repoName}/contents/${fileItem.path}?ref=${branch}`,
            { headers }
          )

          if (contentResponse.ok) {
            const contentData = await contentResponse.json()
            if (contentData.encoding === 'base64' && contentData.content) {
              content = Buffer.from(contentData.content, 'base64').toString('utf-8')
            }
          }
        }

        const filename = fileItem.path.split('/').pop() || fileItem.path

        await db.projectFile.create({
          data: {
            projectId: id,
            name: filename,
            path: fileItem.path,
            content: content,
            language: detectLanguage(filename),
            size: fileItem.size || (content ? Buffer.byteLength(content) : 0),
            source: 'github',
            isDirectory: false,
            metadata: JSON.stringify({
              sha: fileItem.sha,
              importedAt: new Date().toISOString(),
              branch,
            }),
          },
        })

        importedCount++
      } catch (fileError) {
        console.error(`Failed to import file ${fileItem.path}:`, fileError)
        skippedCount++
      }
    }

    // Update project localPath
    await db.project.update({
      where: { id },
      data: {
        localPath: `${project.repoOwner}/${project.repoName}`,
      },
    })

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      totalFilesInRepo: fileItems.length,
      importLimit: 200,
      message: `Imported ${importedCount} files from GitHub${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`,
    })
  } catch (error) {
    console.error('GitHub clone error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clone GitHub repository' },
      { status: 500 }
    )
  }
}
