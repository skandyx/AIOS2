import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// GET /api/conversations - List all conversations
export async function GET() {
  try {
    const userId = await getDefaultUserId()

    const conversations = await db.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('List conversations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, systemPrompt, model } = body

    const userId = await getDefaultUserId()

    const conversation = await db.conversation.create({
      data: {
        title: title || 'New Conversation',
        systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
        model: model || null,
        userId,
      },
    })

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
