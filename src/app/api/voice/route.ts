import { NextRequest, NextResponse } from 'next/server'

// POST /api/voice - Transcribe audio using ASR
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { audioBase64, language } = body

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return NextResponse.json(
        { error: 'audioBase64 is required' },
        { status: 400 }
      )
    }

    // Call ASR via z-ai-web-dev-sdk
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const response = await zai.audio.asr.create({
      file_base64: audioBase64,
    })

    return NextResponse.json({ text: response.text })
  } catch (error) {
    console.error('Voice transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}
