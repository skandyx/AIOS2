import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/projects/[id]/files/[fileId] - Download a specific file
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params

    const file = await db.projectFile.findFirst({
      where: { id: fileId, projectId: id },
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Decode content based on encoding
    let body: Buffer | string
    if (file.encoding === 'base64') {
      body = Buffer.from(file.content, 'base64')
    } else {
      body = file.content
    }

    // Build response headers
    const headers: Record<string, string> = {
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': String(file.encoding === 'base64' ? (body as Buffer).length : Buffer.byteLength(body as string)),
    }

    return new NextResponse(body, { status: 200, headers })
  } catch (error) {
    console.error('Download project file error:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/files/[fileId] - Delete a file from the project
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params

    const file = await db.projectFile.findFirst({
      where: { id: fileId, projectId: id },
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    await db.projectFile.delete({
      where: { id: fileId },
    })

    return NextResponse.json({
      success: true,
      deletedFile: {
        id: file.id,
        filename: file.filename,
        path: file.path,
      },
    })
  } catch (error) {
    console.error('Delete project file error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
