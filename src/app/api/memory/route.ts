import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/memory - List memories with optional type filter
export async function GET(request: NextRequest) {
  try {
    const userId = await getDefaultUserId()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where: Record<string, unknown> = { userId, isArchived: false }
    if (type) {
      where.type = type
    }

    const memories = await db.memory.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(memories)
  } catch (error) {
    console.error('List memories error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    )
  }
}

// POST /api/memory - Create new memory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, content, type, importance, metadata } = body

    if (!key || !content || !type) {
      return NextResponse.json(
        { error: 'Key, content, and type are required' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    const memory = await db.memory.create({
      data: {
        key,
        value: content,
        type,
        importance: importance ?? 0.5,
        source: 'manual',
        context: metadata ? JSON.stringify(metadata) : null,
        userId,
      },
    })

    return NextResponse.json(memory, { status: 201 })
  } catch (error) {
    console.error('Create memory error:', error)
    return NextResponse.json(
      { error: 'Failed to create memory' },
      { status: 500 }
    )
  }
}

// DELETE /api/memory - Delete memory by id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      )
    }

    const memory = await db.memory.findUnique({ where: { id } })

    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    await db.memory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete memory error:', error)
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    )
  }
}
