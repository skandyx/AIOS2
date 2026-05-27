import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
// @ts-expect-error - ZipArchive is a runtime export of archiver not reflected in types
import { ZipArchive } from 'archiver'

// GET /api/projects/[id]/download - Download project as ZIP
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
      include: { projectFiles: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.projectFiles.length === 0) {
      return NextResponse.json({ error: 'No files to download' }, { status: 400 })
    }

    // Create a ZIP archive using archiver
    const archive = new ZipArchive({ zlib: { level: 9 } })

    // Collect archive data in a buffer
    const chunks: Buffer[] = []
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))

    const archiveFinished = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
      archive.on('error', reject)
    })

    // Add each project file to the archive
    for (const file of project.projectFiles) {
      if (file.isDirectory) continue
      if (file.content) {
        archive.append(file.content, { name: file.path })
      } else {
        // For files without content, add an empty placeholder
        archive.append(`[Binary file: ${file.name}]`, { name: file.path })
      }
    }

    await archive.finalize()

    const zipBuffer = await archiveFinished

    // Return the ZIP as a downloadable response
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download project error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download project' },
      { status: 500 }
    )
  }
}
