import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationId, systemPrompt } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    let conversation = conversationId
      ? await db.conversation.findUnique({
          where: { id: conversationId },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      : null

    if (conversationId && !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Create a new conversation if none provided
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          title: message.slice(0, 60) + (message.length > 60 ? '...' : ''),
          systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
          userId,
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
    }

    // Save user message
    const userMessage = await db.message.create({
      data: {
        role: 'user',
        content: message,
        conversationId: conversation.id,
      },
    })

    // Build messages array for LLM
    const systemContent =
      conversation.systemPrompt || 'You are a helpful AI assistant.'
    const llmMessages = [
      { role: 'assistant' as const, content: systemContent },
      ...conversation.messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Call LLM via z-ai-web-dev-sdk
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: llmMessages,
      thinking: { type: 'disabled' },
    })

    const aiResponse = completion.choices[0]?.message?.content || ''

    // Save AI response
    const assistantMessage = await db.message.create({
      data: {
        role: 'assistant',
        content: aiResponse,
        conversationId: conversation.id,
      },
    })

    return NextResponse.json({
      conversationId: conversation.id,
      message: userMessage,
      response: assistantMessage,
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
