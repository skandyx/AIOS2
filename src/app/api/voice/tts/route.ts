import { NextRequest, NextResponse } from 'next/server'
import { pcmToWav, isPcmAudio } from '@/lib/audio-utils'

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

    // Use only confirmed working voices
    const safeVoice = ['tongtong', 'male', 'female'].includes(voice) ? voice : 'tongtong'

    const ttsResponse = await zai.audio.tts.create({
      input: text,
      voice: safeVoice,
      speed: speed || 1.0,
    })

    // Get the raw audio data
    const audioBuffer = await ttsResponse.arrayBuffer()
    const pcmBuffer = Buffer.from(audioBuffer)

    // Z-AI TTS returns audio/pcm format - browsers need WAV
    const contentType = ttsResponse.headers?.get('content-type') || 'audio/pcm'

    let finalBuffer: Buffer
    let format: string

    if (isPcmAudio(contentType)) {
      // Convert PCM → WAV so browsers can play it
      finalBuffer = pcmToWav(pcmBuffer, 24000, 1, 16)
      format = 'wav'
    } else {
      // Already a playable format (mp3, wav, etc.)
      finalBuffer = pcmBuffer
      format = contentType.includes('mp3') ? 'mp3' : 'wav'
    }

    const audioBase64 = finalBuffer.toString('base64')

    return NextResponse.json({
      audioBase64,
      format,
    })
  } catch (error) {
    console.error('TTS error:', error)
    const errMsg = error instanceof Error ? error.message : 'Failed to generate speech'
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    )
  }
}
