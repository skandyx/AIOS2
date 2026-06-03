import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'

// POST /api/projects/[id]/scan-folder - Scan a local folder and add files to the project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { folderPath } = body

    if (!folderPath || typeof folderPath !== 'string') {
      return NextResponse.json({ error: 'folderPath is required' }, { status: 400 })
    }

    // Validate the folder path exists
    const resolvedPath = path.resolve(folderPath)
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: `Folder not found: ${resolvedPath}` }, { status: 404 })
    }

    const stat = fs.statSync(resolvedPath)
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: `Path is not a directory: ${resolvedPath}` }, { status: 400 })
    }

    // Check project exists
    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Directories/files to skip
    const SKIP_DIRS = new Set([
      'node_modules', '.git', '.next', 'dist', 'build', '.cache', '.turbo',
      'coverage', '.nyc_output', '__pycache__', '.venv', 'venv', '.env',
      '.tox', '.mypy_cache', '.pytest_cache', '.idea', '.vscode',
      'target', 'bin', 'obj', '.gradle', '.mvn',
    ])

    const SKIP_EXTENSIONS = new Set([
      '.pyc', '.pyo', '.so', '.dll', '.exe', '.bin', '.obj', '.o',
      '.class', '.jar', '.war', '.ico', '.png', '.jpg', '.jpeg', '.gif',
      '.webp', '.svg', '.mp3', '.mp4', '.avi', '.mov', '.wav',
      '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2',
      '.woff', '.woff2', '.ttf', '.eot', '.map',
      '.db', '.sqlite', '.sqlite3',
    ])

    const MAX_FILE_SIZE = 100 * 1024 // 100KB max per file
    const MAX_FILES = 500

    // Detect language from file extension
    function detectLanguage(filePath: string): string | null {
      const ext = path.extname(filePath).toLowerCase()
      const langMap: Record<string, string> = {
        '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
        '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
        '.java': 'java', '.kt': 'kotlin', '.swift': 'swift', '.c': 'c', '.cpp': 'cpp',
        '.h': 'c', '.hpp': 'cpp', '.cs': 'csharp', '.php': 'php',
        '.html': 'html', '.css': 'css', '.scss': 'scss', '.less': 'less',
        '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.xml': 'xml',
        '.md': 'markdown', '.sql': 'sql', '.sh': 'shell', '.bash': 'shell',
        '.dockerfile': 'dockerfile', '.toml': 'toml', '.ini': 'ini',
        '.vue': 'vue', '.svelte': 'svelte',
      }
      return langMap[ext] || null
    }

    // Recursively scan directory
    const scannedFiles: Array<{
      name: string
      filePath: string
      relativePath: string
      language: string | null
      size: number
      isDirectory: boolean
      content: string | null
    }> = []

    function scanDir(dirPath: string, relativeTo: string): void {
      if (scannedFiles.length >= MAX_FILES) return

      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (scannedFiles.length >= MAX_FILES) break
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue

        const fullPath = path.join(dirPath, entry.name)
        const relPath = path.relative(relativeTo, fullPath)

        if (entry.isDirectory()) {
          scannedFiles.push({
            name: entry.name,
            filePath: fullPath,
            relativePath: relPath,
            language: null,
            size: 0,
            isDirectory: true,
            content: null,
          })
          scanDir(fullPath, relativeTo)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (SKIP_EXTENSIONS.has(ext)) continue

          const fileStat = fs.statSync(fullPath)
          if (fileStat.size > MAX_FILE_SIZE) continue

          let content: string | null = null
          try {
            content = fs.readFileSync(fullPath, 'utf-8')
          } catch {
            // Skip binary/unreadable files
            continue
          }

          scannedFiles.push({
            name: entry.name,
            filePath: fullPath,
            relativePath: relPath,
            language: detectLanguage(entry.name),
            size: fileStat.size,
            isDirectory: false,
            content,
          })
        }
      }
    }

    scanDir(resolvedPath, resolvedPath)

    // Remove existing scanned files for this project (from 'upload' source)
    await db.projectFile.deleteMany({
      where: { projectId: id, source: 'upload' },
    })

    // Insert scanned files into database
    let filesCreated = 0
    for (const file of scannedFiles) {
      try {
        await db.projectFile.create({
          data: {
            projectId: id,
            name: file.name,
            path: file.relativePath,
            content: file.content,
            language: file.language,
            size: file.size,
            source: 'upload',
            isDirectory: file.isDirectory,
            mimeType: file.isDirectory ? null : 'text/plain',
          },
        })
        filesCreated++
      } catch (err) {
        console.error(`Failed to save file ${file.relativePath}:`, err)
      }
    }

    // Update project with local path
    await db.project.update({
      where: { id },
      data: { localPath: resolvedPath },
    })

    // Auto-detect tech stack from file extensions
    const extensions = new Set<string>()
    for (const file of scannedFiles) {
      if (!file.isDirectory) {
        const ext = path.extname(file.name).toLowerCase()
        if (ext) extensions.add(ext)
      }
    }

    const techMap: Record<string, string> = {
      '.ts': 'TypeScript', '.tsx': 'React', '.js': 'JavaScript', '.jsx': 'React',
      '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.java': 'Java',
      '.rb': 'Ruby', '.php': 'PHP', '.vue': 'Vue', '.svelte': 'Svelte',
      '.css': 'CSS', '.scss': 'SCSS', '.html': 'HTML',
    }

    const detectedTech = [...extensions]
      .map(ext => techMap[ext])
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i) // unique

    if (detectedTech.length > 0) {
      const existingTech = project.techStack ? JSON.parse(project.techStack) : []
      const mergedTech = [...new Set([...existingTech, ...detectedTech])]
      await db.project.update({
        where: { id },
        data: { techStack: JSON.stringify(mergedTech) },
      })
    }

    return NextResponse.json({
      success: true,
      folderPath: resolvedPath,
      filesScanned: scannedFiles.length,
      filesCreated,
      detectedTech,
    })
  } catch (error) {
    console.error('Scan folder error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scan folder' },
      { status: 500 }
    )
  }
}
