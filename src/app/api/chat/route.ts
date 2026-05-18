import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'
import { chatCompletion, resolveProvider, type ChatMessage } from '@/lib/providers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationId, systemPrompt, model } = body

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
          model: model || null,
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
    const llmMessages: ChatMessage[] = [
      { role: 'system', content: systemContent },
      ...conversation.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    // Determine which model/provider to use
    const selectedModel = model || conversation.model || undefined
    const providerId = selectedModel ? resolveProvider(selectedModel) : 'zai'

    // Call LLM via the provider abstraction
    const completion = await chatCompletion({
      messages: llmMessages,
      model: selectedModel,
      temperature: 0.7,
      maxTokens: 4096,
    })

    const aiResponse = completion.content

    // Save AI response
    const assistantMessage = await db.message.create({
      data: {
        role: 'assistant',
        content: aiResponse,
        conversationId: conversation.id,
        model: completion.model,
      },
    })

    return NextResponse.json({
      conversationId: conversation.id,
      message: userMessage,
      response: assistantMessage,
      provider: providerId,
      model: completion.model,
      usage: completion.usage,
    })
  } catch (error) {
    console.error('Chat error:', error)
    const errMsg = error instanceof Error ? error.message : 'Failed to process chat message'
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    )
  }
}
