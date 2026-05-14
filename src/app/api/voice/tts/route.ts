import { NextRequest, NextResponse } from 'next/server'

// POST /api/voice/tts - Text-to-Speech using z-ai-web-dev-sdk
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, voice, speed } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      )
    }

    // Call TTS via z-ai-web-dev-sdk
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    // The SDK returns a raw Response object - we need to get the audio data from it
    const ttsResponse = await zai.audio.tts.create({
      input: text,
      voice: voice || 'tongtong',
      speed: speed || 1.0,
    })

    // ttsResponse is a fetch Response object - get the audio as ArrayBuffer
    const audioBuffer = await ttsResponse.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    // Determine content type from response headers
    const contentType = ttsResponse.headers?.get('content-type') || 'audio/wav'
    const format = contentType.includes('mp3') ? 'mp3' : 'wav'

    return NextResponse.json({
      audioBase64,
      format,
    })
  } catch (error) {
    console.error('TTS error:', error)
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
}
