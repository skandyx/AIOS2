import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Text-based MIME types that should be stored as utf-8
const TEXT_MIME_TYPES = [
  'text/',
  'application/json',
  'application/javascript',
  'application/xml',
  'application/typescript',
  'application/x-yaml',
  'application/yaml',
]

const CODE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt',
  '.css', '.scss', '.less', '.sass',
  '.html', '.htm', '.svg', '.xml',
  '.md', '.txt', '.csv', '.yaml', '.yml', '.toml',
  '.json', '.json5', '.jsonc',
  '.sh', '.bash', '.zsh', '.fish',
  '.sql', '.graphql', '.gql',
  '.env', '.gitignore', '.dockerignore', '.editorconfig',
  '.lock', '.log',
  '.ini', '.cfg', '.conf',
]

function isTextFile(mimeType: string | null, filename: string): boolean {
  if (mimeType && TEXT_MIME_TYPES.some(t => mimeType.startsWith(t))) {
    return true
  }
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return CODE_EXTENSIONS.includes(ext)
}

// Helper: generate default project files based on project category
function generateProjectFileTree(project: {
  name: string
  description: string | null
  category: string | null
  techStack: string | null
  requirements: string | null
  notes: string | null
}): Array<{ path: string; type: 'file' | 'directory' }> {
  const techList: string[] = project.techStack ? JSON.parse(project.techStack) : []
  const techLower = techList.map(t => t.toLowerCase())

  const entries: Array<{ path: string; type: 'file' | 'directory' }> = []

  // Common files
  entries.push({ path: 'README.md', type: 'file' })
  entries.push({ path: '.gitignore', type: 'file' })
  entries.push({ path: 'LICENSE', type: 'file' })
  entries.push({ path: 'src/', type: 'directory' })

  const isWebProject = ['web_app', 'api', 'automation', 'mobile', 'desktop'].includes(project.category || '')
  const isAIProject = project.category === 'ai' || techLower.some(t => t.includes('ai') || t.includes('ml') || t.includes('tensor'))

  if (isWebProject || isAIProject || techLower.some(t => ['javascript', 'typescript', 'react', 'next.js', 'node', 'node.js', 'vue', 'angular'].includes(t))) {
    const isNextJs = techLower.some(t => t.includes('next'))
    const isReact = techLower.some(t => t.includes('react'))
    const isVue = techLower.some(t => t.includes('vue'))

    entries.push({ path: 'package.json', type: 'file' })

    if (isNextJs || techLower.some(t => t.includes('typescript'))) {
      entries.push({ path: 'tsconfig.json', type: 'file' })
    }

    if (isNextJs) {
      entries.push({ path: 'src/app/', type: 'directory' })
      entries.push({ path: 'src/app/page.tsx', type: 'file' })
      entries.push({ path: 'src/app/layout.tsx', type: 'file' })
      entries.push({ path: 'src/app/globals.css', type: 'file' })
    } else if (isReact) {
      entries.push({ path: 'src/App.tsx', type: 'file' })
      entries.push({ path: 'src/index.tsx', type: 'file' })
    } else if (isVue) {
      entries.push({ path: 'src/App.vue', type: 'file' })
      entries.push({ path: 'src/main.ts', type: 'file' })
    } else {
      entries.push({ path: 'src/index.ts', type: 'file' })
    }

    entries.push({ path: 'src/lib/', type: 'directory' })
    entries.push({ path: 'src/lib/utils.ts', type: 'file' })
  } else if (project.category === 'data') {
    entries.push({ path: 'requirements.txt', type: 'file' })
    entries.push({ path: 'src/main.py', type: 'file' })
  } else {
    entries.push({ path: 'src/main.py', type: 'file' })
  }

  return entries
}

// GET /api/projects/[id]/files - List all files for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') // 'upload' | 'generated' | null (all)

    const project = await db.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get uploaded files from DB
    const where: { projectId: string; source?: string } = { projectId: id }
    if (source === 'upload' || source === 'generated' || source === 'orchestrator') {
      where.source = source
    }

    const dbFiles = await db.projectFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        path: true,
        mimeType: true,
        size: true,
        encoding: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // If source is 'upload' or specific source, only return DB files
    if (source) {
      return NextResponse.json({
        projectId: id,
        files: dbFiles,
        total: dbFiles.length,
        source,
      })
    }

    // For 'all' or 'generated': also return the generated file tree
    const generatedTree = generateProjectFileTree(project)

    // Merge: mark generated entries, but if a DB file matches the same path, prefer DB
    const dbPaths = new Set(dbFiles.map(f => f.path))
    const generatedFiles = generatedTree
      .filter(entry => !dbPaths.has(entry.path))
      .map(entry => ({
        id: `generated-${entry.path}`,
        filename: entry.path.split('/').pop() || entry.path,
        path: entry.path,
        mimeType: entry.type === 'directory' ? 'directory' : null,
        size: 0,
        encoding: 'utf-8' as const,
        source: 'generated' as const,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        type: entry.type,
      }))

    const allFiles = [...dbFiles, ...generatedFiles]

    return NextResponse.json({
      projectId: id,
      files: allFiles,
      total: allFiles.length,
      dbFileCount: dbFiles.length,
      generatedFileCount: generatedFiles.length,
    })
  } catch (error) {
    console.error('List project files error:', error)
    return NextResponse.json(
      { error: 'Failed to list project files' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/files - Upload a file to a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const virtualPath = formData.get('path') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Use "file" field in form data.' },
        { status: 400 }
      )
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = file.type || 'application/octet-stream'
    const filename = file.name

    // Determine encoding
    const isText = isTextFile(mimeType, filename)
    const encoding = isText ? 'utf-8' : 'base64'
    const content = isText ? buffer.toString('utf-8') : buffer.toString('base64')

    // Determine virtual path
    const filePath = virtualPath || filename

    // Create the ProjectFile record
    const projectFile = await db.projectFile.create({
      data: {
        projectId: id,
        filename,
        path: filePath,
        content,
        mimeType,
        size: buffer.length,
        encoding,
        source: 'upload',
      },
    })

    return NextResponse.json({
      success: true,
      file: {
        id: projectFile.id,
        filename: projectFile.filename,
        path: projectFile.path,
        mimeType: projectFile.mimeType,
        size: projectFile.size,
        encoding: projectFile.encoding,
        source: projectFile.source,
        createdAt: projectFile.createdAt,
        updatedAt: projectFile.updatedAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Upload project file error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
