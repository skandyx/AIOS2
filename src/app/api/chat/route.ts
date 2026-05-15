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

    // ── Step 1: Get or create user ──
    let userId: string
    try {
      userId = await getDefaultUserId()
    } catch (dbError) {
      console.error('Database error (getDefaultUserId):', dbError)
      return NextResponse.json(
        { error: 'Database not initialized. Run: bunx prisma generate && bunx prisma db push', details: String(dbError) },
        { status: 503 }
      )
    }

    // ── Step 2: Get or create conversation ──
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

    if (!conversation) {
      try {
        conversation = await db.conversation.create({
          data: {
            title: message.slice(0, 60) + (message.length > 60 ? '...' : ''),
            systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
            userId,
            model: model || null,
          },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      } catch (dbError) {
        console.error('Database error (createConversation):', dbError)
        return NextResponse.json(
          { error: 'Database error: could not create conversation. Check DATABASE_URL in .env', details: String(dbError) },
          { status: 503 }
        )
      }
    }

    // ── Step 3: Save user message ──
    let userMessage
    try {
      userMessage = await db.message.create({
        data: {
          role: 'user',
          content: message,
          conversationId: conversation.id,
        },
      })
    } catch (dbError) {
      console.error('Database error (saveUserMessage):', dbError)
      return NextResponse.json(
        { error: 'Database error: could not save message. Check DATABASE_URL in .env', details: String(dbError) },
        { status: 503 }
      )
    }

    // ── Step 4: Build LLM messages ──
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

    // ── Step 5: Call AI provider ──
    const selectedModel = model || conversation.model || undefined
    const providerId = selectedModel ? resolveProvider(selectedModel) : 'zai'

    let completion
    try {
      completion = await chatCompletion({
        messages: llmMessages,
        model: selectedModel,
        temperature: 0.7,
        maxTokens: 4096,
      })
    } catch (aiError) {
      console.error('AI provider error:', aiError)
      const errMsg = aiError instanceof Error ? aiError.message : String(aiError)

      // Return a helpful error based on the provider
      if (errMsg.includes('MISTRAL_API_KEY')) {
        return NextResponse.json(
          { error: 'Mistral API key not configured. Add MISTRAL_API_KEY to your .env file, or switch to Z-AI provider.', provider: 'mistral' },
          { status: 502 }
        )
      }
      if (errMsg.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your .env file, or switch to Z-AI provider.', provider: 'openai' },
          { status: 502 }
        )
      }
      if (errMsg.includes('ANTHROPIC_API_KEY')) {
        return NextResponse.json(
          { error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to your .env file, or switch to Z-AI provider.', provider: 'anthropic' },
          { status: 502 }
        )
      }
      if (errMsg.includes('DEEPSEEK_API_KEY')) {
        return NextResponse.json(
          { error: 'DeepSeek API key not configured. Add DEEPSEEK_API_KEY to your .env file, or switch to Z-AI provider.', provider: 'deepseek' },
          { status: 502 }
        )
      }
      if (errMsg.includes('Ollama')) {
        return NextResponse.json(
          { error: 'Ollama is not running. Start it with: ollama serve. Or switch to Z-AI provider.', provider: 'ollama' },
          { status: 502 }
        )
      }
      // Z-AI SDK or unknown error
      return NextResponse.json(
        { error: `AI provider error: ${errMsg}. Try switching to a different model in the AI Models tab.`, details: errMsg, provider: providerId },
        { status: 502 }
      )
    }

    if (!completion?.content) {
      return NextResponse.json(
        { error: 'AI provider returned an empty response. Try a different model or provider.' },
        { status: 502 }
      )
    }

    // ── Step 6: Save AI response ──
    let assistantMessage
    try {
      assistantMessage = await db.message.create({
        data: {
          role: 'assistant',
          content: completion.content,
          conversationId: conversation.id,
          model: completion.model,
        },
      })
    } catch (dbError) {
      console.error('Database error (saveAssistantMessage):', dbError)
      // AI response was generated but couldn't be saved — still return it
      assistantMessage = {
        id: 'temp-' + Date.now(),
        role: 'assistant',
        content: completion.content,
        conversationId: conversation.id,
        model: completion.model,
        createdAt: new Date(),
      }
    }

    return NextResponse.json({
      conversationId: conversation.id,
      message: userMessage,
      response: assistantMessage,
      provider: providerId,
      model: completion.model,
      usage: completion.usage,
    })
  } catch (error) {
    console.error('Chat error (unhandled):', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Unexpected error: ${errMsg}`, details: errMsg },
      { status: 500 }
    )
  }
}
