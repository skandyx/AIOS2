import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'
import { chatCompletion, type ChatMessage } from '@/lib/providers'

// ─── Helper: Resolve the Telegram bot token ──────────────────────────────
// Priority: Integration DB record > TELEGRAM_BOT_TOKEN env var

async function getTelegramBotToken(): Promise<string | null> {
  // 1. Check environment variable first
  const envToken = process.env.TELEGRAM_BOT_TOKEN
  if (envToken) return envToken

  // 2. Check Integration record in database
  try {
    const userId = await getDefaultUserId()
    const integration = await db.integration.findFirst({
      where: { userId, type: 'telegram' },
    })
    if (integration?.credentials) {
      try {
        const creds = JSON.parse(integration.credentials)
        if (creds.botToken) return creds.botToken
      } catch {
        // Invalid JSON in credentials
      }
    }
  } catch {
    // DB not available
  }

  return null
}

// ─── Helper: Send a message via Telegram Bot API ─────────────────────────

async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Telegram sendMessage failed (${response.status}): ${errorBody}`)
      return false
    }
    return true
  } catch (error) {
    console.error('Telegram sendMessage error:', error)
    return false
  }
}

// ─── Telegram Update type definitions ────────────────────────────────────

interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
}

interface TelegramChat {
  id: number
  type: string
  first_name?: string
  last_name?: string
  username?: string
}

interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

// ─── POST /api/channels/telegram ────────────────────────────────────────
// Handles incoming Telegram webhook updates

export async function POST(request: NextRequest) {
  try {
    const token = await getTelegramBotToken()
    if (!token) {
      console.error('Telegram webhook received but bot token is not configured')
      return NextResponse.json(
        {
          error: 'Telegram bot token is not configured',
          message:
            'Please configure the bot token via PUT /api/channels/telegram or set the TELEGRAM_BOT_TOKEN environment variable.',
        },
        { status: 503 }
      )
    }

    // Parse the incoming Telegram update
    const update: TelegramUpdate = await request.json()

    // We only handle text messages for now
    const message = update.message
    if (!message?.text) {
      // Acknowledge non-text updates (stickers, photos, etc.) without error
      return NextResponse.json({ ok: true, handled: false })
    }

    const telegramUser = message.from
    const telegramChatId = message.chat.id
    const telegramUserId = telegramUser?.id
    const userText = message.text

    if (!telegramUserId) {
      return NextResponse.json({ ok: true, handled: false })
    }

    // Get the default AIOS user
    const userId = await getDefaultUserId()

    // Find or create a conversation for this Telegram user
    // Try to find existing conversation by metadata (search for telegram user ID in metadata)
    let conversation = await db.conversation.findFirst({
      where: {
        userId,
        metadata: { contains: `"telegramUserId":"${telegramUserId}"` },
        isArchived: false,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    // Create a new conversation if none exists
    if (!conversation) {
      const displayName =
        telegramUser?.first_name && telegramUser?.last_name
          ? `${telegramUser.first_name} ${telegramUser.last_name}`
          : telegramUser?.first_name || telegramUser?.username || `Telegram User ${telegramUserId}`

      conversation = await db.conversation.create({
        data: {
          title: `Telegram: ${displayName}`,
          systemPrompt: 'You are a helpful AI assistant. You are responding to a user via Telegram. Keep your responses concise and well-formatted for mobile viewing.',
          userId,
          metadata: JSON.stringify({
            source: 'telegram',
            telegramUserId: String(telegramUserId),
            telegramChatId: String(telegramChatId),
            telegramUsername: telegramUser?.username || null,
            telegramFirstName: telegramUser?.first_name || null,
          }),
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    }

    // Save the user message from Telegram
    await db.message.create({
      data: {
        role: 'user',
        content: userText,
        conversationId: conversation.id,
        metadata: JSON.stringify({
          source: 'telegram',
          telegramMessageId: message.message_id,
          telegramUserId: String(telegramUserId),
          telegramChatId: String(telegramChatId),
        }),
      },
    })

    // Build messages array for LLM context
    const systemContent =
      conversation.systemPrompt || 'You are a helpful AI assistant.'

    // Re-fetch conversation messages to include the just-saved user message
    const allMessages = await db.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    })

    const llmMessages: ChatMessage[] = [
      { role: 'system', content: systemContent },
      ...allMessages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    ]

    // Call the AIOS chat completion
    const completion = await chatCompletion({
      messages: llmMessages,
      model: conversation.model || undefined,
      temperature: 0.7,
      maxTokens: 4096,
    })

    const aiResponse = completion.content

    // Save the AI response
    await db.message.create({
      data: {
        role: 'assistant',
        content: aiResponse,
        conversationId: conversation.id,
        model: completion.model,
        metadata: JSON.stringify({
          source: 'telegram',
          provider: completion.provider,
          usage: completion.usage,
        }),
      },
    })

    // Send the response back to the user via Telegram
    const sent = await sendTelegramMessage(token, telegramChatId, aiResponse)

    if (!sent) {
      console.error(
        `Failed to send Telegram response to chat ${telegramChatId}`
      )
      // Still return 200 so Telegram doesn't retry the webhook
    }

    return NextResponse.json({ ok: true, handled: true })
  } catch (error) {
    console.error('Telegram webhook processing error:', error)
    // Return 200 to prevent Telegram from retrying; log the error for debugging
    return NextResponse.json({
      ok: true,
      handled: false,
      error: 'Internal processing error',
    })
  }
}

// ─── GET /api/channels/telegram ─────────────────────────────────────────
// Returns the current Telegram bot configuration status

export async function GET() {
  try {
    const envToken = process.env.TELEGRAM_BOT_TOKEN
    const hasEnvToken = !!envToken

    // Check if there's an Integration record
    let dbIntegration = null
    try {
      const userId = await getDefaultUserId()
      dbIntegration = await db.integration.findFirst({
        where: { userId, type: 'telegram' },
        select: {
          id: true,
          name: true,
          status: true,
          config: true,
          credentials: true,
          createdAt: true,
          updatedAt: true,
          webhookUrl: true,
        },
      })
    } catch {
      // DB may not be available
    }

    const hasDbToken =
      dbIntegration?.credentials !== null && dbIntegration?.credentials !== undefined

    // Determine if token is available (from either source)
    const token = await getTelegramBotToken()
    const isConfigured = !!token

    // Count conversations from Telegram
    let telegramConversationCount = 0
    try {
      const userId = await getDefaultUserId()
      telegramConversationCount = await db.conversation.count({
        where: {
          userId,
          metadata: { contains: '"source":"telegram"' },
        },
      })
    } catch {
      // DB may not be available
    }

    return NextResponse.json({
      isConfigured,
      tokenSource: hasEnvToken
        ? 'environment'
        : hasDbToken
          ? 'database'
          : null,
      integration: dbIntegration
        ? {
            id: dbIntegration.id,
            name: dbIntegration.name,
            status: dbIntegration.status,
            webhookUrl: dbIntegration.webhookUrl,
            createdAt: dbIntegration.createdAt,
            updatedAt: dbIntegration.updatedAt,
          }
        : null,
      telegramConversationCount,
      message: isConfigured
        ? 'Telegram bot is configured and ready to receive webhooks.'
        : 'Telegram bot token is not configured. Use PUT /api/channels/telegram to set the bot token, or set the TELEGRAM_BOT_TOKEN environment variable.',
    })
  } catch (error) {
    console.error('Get Telegram config error:', error)
    return NextResponse.json(
      { error: 'Failed to get Telegram configuration' },
      { status: 500 }
    )
  }
}

// ─── PUT /api/channels/telegram ─────────────────────────────────────────
// Configure the Telegram bot token (stored in the Integration model)

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { botToken, name } = body

    if (!botToken || typeof botToken !== 'string') {
      return NextResponse.json(
        { error: 'botToken is required and must be a string' },
        { status: 400 }
      )
    }

    // Basic token format validation (Telegram tokens are like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)
    const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/
    if (!tokenPattern.test(botToken)) {
      return NextResponse.json(
        {
          error: 'Invalid bot token format',
          message:
            'Telegram bot tokens should match the format: <number>:<alphanumeric_string>',
        },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    // Verify the token by calling getMe
    const meResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`
    )
    if (!meResponse.ok) {
      const errorBody = await meResponse.text()
      return NextResponse.json(
        {
          error: 'Invalid bot token',
          message: `Telegram API rejected the token: ${errorBody}`,
        },
        { status: 400 }
      )
    }

    const meData = await meResponse.json()
    const botInfo = meData.result

    // Upsert the integration record
    const existingIntegration = await db.integration.findFirst({
      where: { userId, type: 'telegram' },
    })

    let integration
    if (existingIntegration) {
      integration = await db.integration.update({
        where: { id: existingIntegration.id },
        data: {
          name: name || `Telegram: @${botInfo.username}`,
          credentials: JSON.stringify({ botToken }),
          config: JSON.stringify({
            botId: botInfo.id,
            botUsername: botInfo.username,
            botFirstName: botInfo.first_name,
          }),
          status: 'connected',
          updatedAt: new Date(),
        },
      })
    } else {
      integration = await db.integration.create({
        data: {
          name: name || `Telegram: @${botInfo.username}`,
          type: 'telegram',
          credentials: JSON.stringify({ botToken }),
          config: JSON.stringify({
            botId: botInfo.id,
            botUsername: botInfo.username,
            botFirstName: botInfo.first_name,
          }),
          status: 'connected',
          userId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      botInfo: {
        id: botInfo.id,
        username: botInfo.username,
        firstName: botInfo.first_name,
      },
      integration: {
        id: integration.id,
        name: integration.name,
        status: integration.status,
      },
      message:
        'Bot token configured successfully. Use POST /api/channels/telegram/setup to register the webhook URL.',
    })
  } catch (error) {
    console.error('Configure Telegram bot error:', error)
    return NextResponse.json(
      { error: 'Failed to configure Telegram bot' },
      { status: 500 }
    )
  }
}
