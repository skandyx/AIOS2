import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDefaultUserId } from '@/lib/auth'
import { chatCompletion, type ChatMessage } from '@/lib/providers'

// ─── Constants ────────────────────────────────────────────────────────────────

const TWILIO_INTEGRATION_TYPE = 'whatsapp'
const TWILIO_PROVIDER = 'twilio'

interface TwilioConfig {
  accountSid: string
  authToken: string
  phoneNumber: string
}

// ─── Helper: Get Twilio Integration ──────────────────────────────────────────

async function getTwilioIntegration(userId: string) {
  return db.integration.findFirst({
    where: {
      userId,
      type: TWILIO_INTEGRATION_TYPE,
      provider: TWILIO_PROVIDER,
    },
  })
}

// ─── Helper: Parse Twilio credentials from integration ───────────────────────

function parseTwilioConfig(integration: { config?: string | null; credentials?: string | null }): TwilioConfig | null {
  if (!integration.credentials) return null
  try {
    const creds = JSON.parse(integration.credentials)
    if (!creds.accountSid || !creds.authToken || !creds.phoneNumber) return null
    return {
      accountSid: creds.accountSid,
      authToken: creds.authToken,
      phoneNumber: creds.phoneNumber,
    }
  } catch {
    return null
  }
}

// ─── Helper: Normalize WhatsApp number ────────────────────────────────────────

function normalizeWhatsAppNumber(from: string): string {
  // Twilio sends "whatsapp:+1234567890" format; strip the prefix
  return from.replace('whatsapp:', '').trim()
}

// ─── POST /api/channels/whatsapp ─────────────────────────────────────────────
// Receives Twilio WhatsApp webhook (form-urlencoded data)

export async function POST(request: NextRequest) {
  try {
    // Check if Twilio is configured
    const userId = await getDefaultUserId()
    const integration = await getTwilioIntegration(userId)
    const twilioConfig = integration ? parseTwilioConfig(integration) : null

    if (!twilioConfig) {
      // Twilio not configured — return empty TwiML so Twilio doesn't retry
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Parse form-urlencoded body from Twilio
    const body = await request.text()
    const params = new URLSearchParams(body)

    const from = params.get('From') || ''
    const messageBody = params.get('Body') || ''

    if (!from || !messageBody) {
      // Missing required fields — return empty TwiML
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const whatsappNumber = normalizeWhatsAppNumber(from)

    // Find or create a conversation for this WhatsApp user
    let conversation = await db.conversation.findFirst({
      where: {
        userId,
        metadata: { contains: whatsappNumber },
        isArchived: false,
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          title: `WhatsApp: ${whatsappNumber}`,
          systemPrompt: 'You are a helpful AI assistant responding via WhatsApp. Keep your responses concise and friendly.',
          userId,
          metadata: JSON.stringify({
            source: 'whatsapp',
            whatsappNumber,
          }),
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
    }

    // Save user message
    await db.message.create({
      data: {
        role: 'user',
        content: messageBody,
        conversationId: conversation.id,
        metadata: JSON.stringify({ source: 'whatsapp', from: whatsappNumber }),
      },
    })

    // Build messages array for LLM
    const systemContent =
      conversation.systemPrompt || 'You are a helpful AI assistant responding via WhatsApp. Keep your responses concise and friendly.'

    const llmMessages: ChatMessage[] = [
      { role: 'system', content: systemContent },
      ...conversation.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: messageBody },
    ]

    // Call LLM via the provider abstraction
    const completion = await chatCompletion({
      messages: llmMessages,
      temperature: 0.7,
      maxTokens: 4096,
    })

    const aiResponse = completion.content

    // Save AI response
    await db.message.create({
      data: {
        role: 'assistant',
        content: aiResponse,
        conversationId: conversation.id,
        model: completion.model,
        metadata: JSON.stringify({ source: 'whatsapp', to: whatsappNumber }),
      },
    })

    // Update the integration's lastSyncedAt timestamp
    await db.integration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date() },
    })

    // Return TwiML XML response with the AI message
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(aiResponse)}</Message></Response>`
    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    // Return empty TwiML on error so Twilio doesn't retry excessively
    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}

// ─── GET /api/channels/whatsapp ──────────────────────────────────────────────
// Returns the current WhatsApp/Twilio configuration status

export async function GET() {
  try {
    const userId = await getDefaultUserId()
    const integration = await getTwilioIntegration(userId)

    if (!integration) {
      return NextResponse.json({
        configured: false,
        status: 'not_configured',
        message: 'Twilio WhatsApp integration is not configured. Use PUT to set up credentials.',
      })
    }

    const twilioConfig = parseTwilioConfig(integration)

    if (!twilioConfig) {
      return NextResponse.json({
        configured: false,
        status: 'incomplete',
        integrationId: integration.id,
        message: 'Twilio credentials are incomplete. Use PUT to update credentials.',
      })
    }

    return NextResponse.json({
      configured: true,
      status: integration.status,
      integrationId: integration.id,
      phoneNumber: maskPhoneNumber(twilioConfig.phoneNumber),
      accountSid: maskSid(twilioConfig.accountSid),
      lastSyncedAt: integration.lastSyncedAt,
      webhookUrl: integration.webhookUrl,
      message: 'Twilio WhatsApp integration is configured and ready.',
    })
  } catch (error) {
    console.error('Get WhatsApp config error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch WhatsApp configuration' },
      { status: 500 }
    )
  }
}

// ─── PUT /api/channels/whatsapp ──────────────────────────────────────────────
// Configure Twilio credentials (Account SID, Auth Token, Phone Number)

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountSid, authToken, phoneNumber } = body as Partial<TwilioConfig>

    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json(
        { error: 'Account SID, Auth Token, and Phone Number are all required' },
        { status: 400 }
      )
    }

    // Validate Account SID format (starts with "AC")
    if (!accountSid.startsWith('AC')) {
      return NextResponse.json(
        { error: 'Invalid Account SID format. It should start with "AC".' },
        { status: 400 }
      )
    }

    // Validate phone number format (E.164)
    if (!phoneNumber.startsWith('+')) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890).' },
        { status: 400 }
      )
    }

    const userId = await getDefaultUserId()

    // Build the webhook URL for this endpoint
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const webhookUrl = `${protocol}://${host}/api/channels/whatsapp`

    // Store credentials as JSON in the credentials field
    const credentials = JSON.stringify({ accountSid, authToken, phoneNumber })

    // Non-sensitive config
    const config = JSON.stringify({
      accountSidPrefix: accountSid.slice(0, 6),
      phoneNumberPrefix: phoneNumber.slice(0, 4),
    })

    // Upsert the integration
    const existingIntegration = await getTwilioIntegration(userId)

    let integration
    if (existingIntegration) {
      integration = await db.integration.update({
        where: { id: existingIntegration.id },
        data: {
          name: 'WhatsApp (Twilio)',
          credentials,
          config,
          webhookUrl,
          status: 'connected',
          error: null,
          lastSyncedAt: new Date(),
        },
      })
    } else {
      integration = await db.integration.create({
        data: {
          name: 'WhatsApp (Twilio)',
          type: TWILIO_INTEGRATION_TYPE,
          provider: TWILIO_PROVIDER,
          description: 'WhatsApp integration via Twilio',
          icon: '📱',
          credentials,
          config,
          webhookUrl,
          status: 'connected',
          userId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      integrationId: integration.id,
      status: integration.status,
      webhookUrl: integration.webhookUrl,
      message: 'Twilio WhatsApp credentials saved successfully.',
    })
  } catch (error) {
    console.error('Configure WhatsApp error:', error)
    return NextResponse.json(
      { error: 'Failed to configure WhatsApp integration' },
      { status: 500 }
    )
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Escape special characters for XML content */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Mask a phone number for display: +1234****890 */
function maskPhoneNumber(phone: string): string {
  if (phone.length < 8) return '••••••••'
  return phone.slice(0, 5) + '****' + phone.slice(-3)
}

/** Mask an Account SID for display: ACxxxx****xxxx */
function maskSid(sid: string): string {
  if (sid.length < 10) return '••••••••'
  return sid.slice(0, 6) + '****' + sid.slice(-4)
}
