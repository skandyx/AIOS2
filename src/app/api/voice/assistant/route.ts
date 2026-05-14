import { NextRequest, NextResponse } from 'next/server'
import { chatCompletion, type ChatMessage } from '@/lib/providers'

// POST /api/voice/assistant - Full voice assistant pipeline: ASR → LLM → TTS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { audioBase64, messages, model, systemPrompt, generateSpeech = true, voice } = body

    // Mode 1: Audio input → transcribe → respond → optionally speak
    if (audioBase64) {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      // Step 1: Transcribe audio
      const asrResponse = await zai.audio.asr.create({
        file_base64: audioBase64,
      })

      const transcription = asrResponse.text || ''

      if (!transcription.trim()) {
        return NextResponse.json({
          transcription: '',
          response: '',
          audioBase64: null,
        })
      }

      // Step 2: Get LLM response
      const llmMessages: ChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful voice assistant. Keep your responses concise and conversational since they will be spoken aloud. Avoid markdown formatting, code blocks, or special characters. Speak naturally as if having a conversation.',
        },
        ...(messages || []).map((m: ChatMessage) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: transcription },
      ]

      const completion = await chatCompletion({
        messages: llmMessages,
        model: model || undefined,
        temperature: 0.7,
        maxTokens: 1024,
      })

      const aiResponse = completion.content

      // Step 3: Generate speech (optional)
      let speechAudio: string | null = null
      let speechFormat: string | null = null
      if (generateSpeech && aiResponse) {
        try {
          const ttsResponse = await zai.audio.tts.create({
            input: aiResponse,
            voice: voice || 'tongtong',
            speed: 1.0,
          })
          // The SDK returns a raw Response object - get audio data
          const audioBuffer = await ttsResponse.arrayBuffer()
          speechAudio = Buffer.from(audioBuffer).toString('base64')
          const contentType = ttsResponse.headers?.get('content-type') || 'audio/wav'
          speechFormat = contentType.includes('mp3') ? 'mp3' : 'wav'
        } catch (ttsError) {
          console.error('TTS generation failed (non-fatal):', ttsError)
          // Continue without speech - the text response is still valid
        }
      }

      return NextResponse.json({
        transcription,
        response: aiResponse,
        audioBase64: speechAudio,
        audioFormat: speechFormat,
        model: completion.model,
      })
    }

    // Mode 2: Text input → respond → optionally speak
    const { text } = body
    if (text && typeof text === 'string') {
      const llmMessages: ChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful voice assistant. Keep your responses concise and conversational since they will be spoken aloud. Avoid markdown formatting, code blocks, or special characters. Speak naturally as if having a conversation.',
        },
        ...(messages || []).map((m: ChatMessage) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: text },
      ]

      const completion = await chatCompletion({
        messages: llmMessages,
        model: model || undefined,
        temperature: 0.7,
        maxTokens: 1024,
      })

      const aiResponse = completion.content

      let speechAudio: string | null = null
      let speechFormat: string | null = null
      if (generateSpeech && aiResponse) {
        try {
          const ZAI = (await import('z-ai-web-dev-sdk')).default
          const zai = await ZAI.create()
          const ttsResponse = await zai.audio.tts.create({
            input: aiResponse,
            voice: voice || 'tongtong',
            speed: 1.0,
          })
          // The SDK returns a raw Response object - get audio data
          const audioBuffer = await ttsResponse.arrayBuffer()
          speechAudio = Buffer.from(audioBuffer).toString('base64')
          const contentType = ttsResponse.headers?.get('content-type') || 'audio/wav'
          speechFormat = contentType.includes('mp3') ? 'mp3' : 'wav'
        } catch (ttsError) {
          console.error('TTS generation failed (non-fatal):', ttsError)
        }
      }

      return NextResponse.json({
        transcription: text,
        response: aiResponse,
        audioBase64: speechAudio,
        audioFormat: speechFormat,
        model: completion.model,
      })
    }

    return NextResponse.json(
      { error: 'audioBase64 or text is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Voice assistant error:', error)
    return NextResponse.json(
      { error: 'Failed to process voice assistant request' },
      { status: 500 }
    )
  }
}
