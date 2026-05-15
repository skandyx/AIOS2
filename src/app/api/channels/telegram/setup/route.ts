import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'

// ─── Helper: Resolve the Telegram bot token ──────────────────────────────

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

// ─── POST /api/channels/telegram/setup ───────────────────────────────────
// Sets the Telegram webhook URL by calling the Telegram setWebhook API.
// After the user configures their bot token, this endpoint registers the
// webhook URL so Telegram forwards messages to our server.

export async function POST(request: NextRequest) {
  try {
    const token = await getTelegramBotToken()
    if (!token) {
      return NextResponse.json(
        {
          error: 'Telegram bot token is not configured',
          message:
            'Please configure the bot token first via PUT /api/channels/telegram or set the TELEGRAM_BOT_TOKEN environment variable.',
        },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { webhookUrl: customWebhookUrl } = body

    // Construct the webhook URL
    let webhookUrl: string

    if (customWebhookUrl) {
      // Use the user-provided webhook URL
      webhookUrl = customWebhookUrl
    } else {
      // Try to construct the webhook URL from request headers or env
      const host = request.headers.get('host')
      const protocol = request.headers.get('x-forwarded-proto') || 'https'

      if (!host) {
        return NextResponse.json(
          {
            error: 'Cannot determine webhook URL',
            message:
              'Unable to auto-detect the server URL. Please provide a webhookUrl in the request body. Example: { "webhookUrl": "https://your-domain.com/api/channels/telegram" }',
          },
          { status: 400 }
        )
      }

      webhookUrl = `${protocol}://${host}/api/channels/telegram`
    }

    // Validate the webhook URL format
    try {
      const parsedUrl = new URL(webhookUrl)
      if (!parsedUrl.protocol.startsWith('http')) {
        throw new Error('Invalid protocol')
      }
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid webhook URL',
          message: `The webhook URL "${webhookUrl}" is not a valid URL. It must be a valid HTTP or HTTPS URL.`,
        },
        { status: 400 }
      )
    }

    // Call the Telegram setWebhook API
    const setWebhookUrl = `https://api.telegram.org/bot${token}/setWebhook`
    const response = await fetch(setWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: false,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return NextResponse.json(
        {
          error: 'Telegram setWebhook API failed',
          message: `Telegram API returned ${response.status}: ${errorBody}`,
        },
        { status: 502 }
      )
    }

    const result = await response.json()

    if (!result.ok) {
      return NextResponse.json(
        {
          error: 'Telegram setWebhook failed',
          message: result.description || 'Unknown error from Telegram API',
        },
        { status: 502 }
      )
    }

    // Update the Integration record with the webhook URL
    try {
      const userId = await getDefaultUserId()
      const integration = await db.integration.findFirst({
        where: { userId, type: 'telegram' },
      })

      if (integration) {
        await db.integration.update({
          where: { id: integration.id },
          data: {
            webhookUrl,
            updatedAt: new Date(),
          },
        })
      }
    } catch {
      // Non-critical: webhook is set even if DB update fails
    }

    // Verify by calling getWebhookInfo
    let webhookInfo = null
    try {
      const infoResponse = await fetch(
        `https://api.telegram.org/bot${token}/getWebhookInfo`
      )
      if (infoResponse.ok) {
        const infoData = await infoResponse.json()
        if (infoData.ok) {
          webhookInfo = {
            url: infoData.result.url,
            hasCustomCertificate: infoData.result.has_custom_certificate,
            pendingUpdateCount: infoData.result.pending_update_count,
            lastErrorDate: infoData.result.last_error_date || null,
            lastErrorMessage: infoData.result.last_error_message || null,
          }
        }
      }
    } catch {
      // Non-critical: webhook was set successfully, info fetch is optional
    }

    return NextResponse.json({
      success: true,
      webhookUrl,
      webhookInfo,
      message: `Webhook successfully set to ${webhookUrl}. Your Telegram bot will now forward messages to this URL.`,
    })
  } catch (error) {
    console.error('Telegram setup webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to set up Telegram webhook' },
      { status: 500 }
    )
  }
}
