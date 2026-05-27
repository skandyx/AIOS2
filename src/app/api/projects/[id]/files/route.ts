import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

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

// MIME type detection from extension
function detectMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = {
    ts: 'text/typescript', tsx: 'text/typescript', js: 'text/javascript', jsx: 'text/javascript',
    py: 'text/x-python', rb: 'text/x-ruby', go: 'text/x-go', rs: 'text/x-rust',
    java: 'text/x-java', html: 'text/html', css: 'text/css', scss: 'text/x-scss',
    json: 'application/json', yaml: 'text/yaml', yml: 'text/yaml', xml: 'text/xml',
    md: 'text/markdown', sql: 'text/x-sql', sh: 'text/x-shellscript',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon',
    pdf: 'application/pdf', zip: 'application/zip',
  }
  return mimeMap[ext] || 'application/octet-stream'
}

// GET /api/projects/[id]/files - List all project files (with optional path filter)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const pathFilter = searchParams.get('path') || undefined
    const source = searchParams.get('source') || undefined

    const where: Record<string, unknown> = { projectId: id }
    if (pathFilter) {
      where.path = { startsWith: pathFilter }
    }
    if (source) {
      where.source = source
    }

    const files = await db.projectFile.findMany({
      where,
      orderBy: { path: 'asc' },
      select: {
        id: true,
        name: true,
        path: true,
        language: true,
        size: true,
        mimeType: true,
        isDirectory: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(files)
  } catch (error) {
    console.error('List project files error:', error)
    return NextResponse.json(
      { error: 'Failed to list project files' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/files - Upload files to the project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const basePath = (formData.get('basePath') as string) || ''

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const uploadedFiles = []

    for (const file of files) {
      const content = await file.text()
      const filePath = basePath ? `${basePath}/${file.name}` : file.name
      const checksum = crypto.createHash('sha256').update(content).digest('hex')

      // Check if file already exists at this path
      const existing = await db.projectFile.findFirst({
        where: { projectId: id, path: filePath },
      })

      if (existing) {
        // Update existing file
        const updated = await db.projectFile.update({
          where: { id: existing.id },
          data: {
            name: file.name,
            content,
            language: detectLanguage(file.name),
            size: Buffer.byteLength(content),
            mimeType: file.type || detectMimeType(file.name),
            checksum,
            source: 'upload',
            updatedAt: new Date(),
          },
        })
        uploadedFiles.push(updated)
      } else {
        // Create new file
        const created = await db.projectFile.create({
          data: {
            projectId: id,
            name: file.name,
            path: filePath,
            content,
            language: detectLanguage(file.name),
            size: Buffer.byteLength(content),
            mimeType: file.type || detectMimeType(file.name),
            checksum,
            source: 'upload',
            isDirectory: false,
          },
        })
        uploadedFiles.push(created)
      }
    }

    return NextResponse.json({
      success: true,
      uploadedCount: uploadedFiles.length,
      files: uploadedFiles,
    }, { status: 201 })
  } catch (error) {
    console.error('Upload project files error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload files' },
      { status: 500 }
    )
  }
}
