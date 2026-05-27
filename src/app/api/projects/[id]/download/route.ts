import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import JSZip from 'jszip'

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

    // Create a ZIP archive using jszip
    const zip = new JSZip()

    // Add each project file to the archive
    for (const file of project.projectFiles) {
      if (file.isDirectory) continue
      if (file.content) {
        zip.file(file.path, file.content)
      } else {
        // For files without content, add an empty placeholder
        zip.file(file.path, `[Binary file: ${file.name}]`)
      }
    }

    // Generate the ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })

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
