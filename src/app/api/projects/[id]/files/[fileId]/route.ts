import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// GET /api/projects/[id]/files/[fileId] - Get a single file's content
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
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return NextResponse.json(file)
  } catch (error) {
    console.error('Get project file error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id]/files/[fileId] - Update file content
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params

    const file = await db.projectFile.findFirst({
      where: { id: fileId, projectId: id },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const body = await request.json()

    const updateData: Record<string, unknown> = {}

    if (body.content !== undefined) {
      updateData.content = body.content
      updateData.size = Buffer.byteLength(body.content)
      updateData.checksum = crypto.createHash('sha256').update(body.content).digest('hex')
    }
    if (body.name !== undefined) updateData.name = body.name
    if (body.path !== undefined) updateData.path = body.path
    if (body.language !== undefined) updateData.language = body.language

    const updated = await db.projectFile.update({
      where: { id: fileId },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update project file error:', error)
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/files/[fileId] - Delete a file
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
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    await db.projectFile.delete({ where: { id: fileId } })

    return NextResponse.json({ success: true, deletedFileId: fileId })
  } catch (error) {
    console.error('Delete project file error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
