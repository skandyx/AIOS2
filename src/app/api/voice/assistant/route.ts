import { NextRequest, NextResponse } from 'next/server'
import { chatCompletion, type ChatMessage } from '@/lib/providers'
import { pcmToWav, isPcmAudio, VALID_TTS_VOICE_IDS } from '@/lib/audio-utils'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import path from 'path'

const execFileAsync = promisify(execFile)

// System prompt for Fred - the AI voice assistant
const FRED_SYSTEM_PROMPT = `You are Fred, an intelligent AI voice assistant inspired by Jarvis. You speak with confidence, clarity, and a touch of sophistication. You respond in the same language the user speaks (French or English). Keep your responses concise and conversational since they will be spoken aloud. Avoid markdown formatting, code blocks, or special characters. Speak naturally as if having a conversation. When addressed by name ("Fred"), acknowledge warmly and respond helpfully.`

// Edge-TTS voice IDs (different from Z-AI voices)
const EDGE_TTS_VOICE_IDS = [
  'ryan', 'thomas', 'brian', 'guy', 'roger', 'sonia',
  'andrew', 'christopher', 'eric', 'steffan', 'libby', 'maisie',
]

// Map short voice IDs to Microsoft edge-tts voice names
const EDGE_VOICE_MAP: Record<string, string> = {
  'ryan': 'en-GB-RyanNeural',
  'thomas': 'en-GB-ThomasNeural',
  'brian': 'en-US-BrianNeural',
  'guy': 'en-US-GuyNeural',
  'roger': 'en-US-RogerNeural',
  'sonia': 'en-GB-SoniaNeural',
  'andrew': 'en-US-AndrewNeural',
  'christopher': 'en-US-ChristopherNeural',
  'eric': 'en-US-EricNeural',
  'steffan': 'en-US-SteffanNeural',
  'libby': 'en-GB-LibbyNeural',
  'maisie': 'en-GB-MaisieNeural',
}

// POST /api/voice/assistant - Full voice assistant pipeline: ASR → LLM → TTS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { audioBase64, messages, model, systemPrompt, generateSpeech = true, voice, mode, text: bodyText } = body

    // Mode: 'asr-only' just transcribes, 'full' (default) does ASR + LLM + TTS
    const isAsrOnly = mode === 'asr-only'

    // ── Audio input mode ──────────────────────────────────────────────
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
          wakeWordDetected: false,
        })
      }

      // ASR-only mode: just return the transcription, no LLM or TTS
      if (isAsrOnly) {
        return NextResponse.json({
          transcription,
          response: '',
          audioBase64: null,
          wakeWordDetected: false,
        })
      }

      // Step 2: Get LLM response
      const llmMessages: ChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt || FRED_SYSTEM_PROMPT,
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

      // Step 3: Generate speech
      let speechAudio: string | null = null
      let speechFormat: string | null = null
      if (generateSpeech && aiResponse) {
        const ttsResult = await generateTTSAudio(aiResponse, voice)
        speechAudio = ttsResult.audioBase64
        speechFormat = ttsResult.format
      }

      return NextResponse.json({
        transcription,
        response: aiResponse,
        audioBase64: speechAudio,
        audioFormat: speechFormat,
        model: completion.model,
      })
    }

    // ── Text input mode ──────────────────────────────────────────────
    const text = bodyText
    if (text && typeof text === 'string') {
      const llmMessages: ChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt || FRED_SYSTEM_PROMPT,
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
        const ttsResult = await generateTTSAudio(aiResponse, voice)
        speechAudio = ttsResult.audioBase64
        speechFormat = ttsResult.format
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
    const errMsg = error instanceof Error ? error.message : 'Failed to process voice assistant request'
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    )
  }
}

// ── TTS Generation ──────────────────────────────────────────────────────
// Priority: edge-tts CLI (high quality neural voices) → Z-AI SDK (fallback)

async function generateTTSAudio(text: string, voice?: string): Promise<{ audioBase64: string | null; format: string | null }> {
  const isEdgeTTS = EDGE_TTS_VOICE_IDS.includes(voice)

  // Try edge-tts CLI first for supported voices (much better quality)
  if (isEdgeTTS || !voice) {
    try {
      const edgeVoice = EDGE_VOICE_MAP[voice || 'ryan'] || 'en-GB-RyanNeural'
      const tmpId = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const tmpPath = `/tmp/${tmpId}.mp3`
      
      // Clean the text for shell safety
      const safeText = text.replace(/"/g, '\\"').replace(/\n/g, ' ').slice(0, 500)
      
      // Use edge-tts CLI directly (Python must be available)
      await execFileAsync('python3', [
        '-m', 'edge_tts',
        '-v', edgeVoice,
        '-t', safeText,
        '--rate=+0%',
        '--pitch=-2Hz', // Slightly deeper for authoritative Jarvis sound
        '--write-media', tmpPath,
      ], { timeout: 15000 })
      
      // Read the generated file
      const audioBuffer = await readFile(tmpPath)
      
      // Clean up
      try { await unlink(tmpPath) } catch {}
      
      const base64 = audioBuffer.toString('base64')
      console.log(`[TTS] edge-tts generated ${audioBuffer.length} bytes (voice: ${edgeVoice})`)
      return { audioBase64: base64, format: 'mp3' }
    } catch (edgeErr) {
      console.warn('[TTS] edge-tts failed, falling back to Z-AI:', edgeErr instanceof Error ? edgeErr.message : edgeErr)
    }
  }

  // Fallback: Z-AI SDK TTS
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const safeVoice = VALID_TTS_VOICE_IDS.includes(voice) ? voice : 'jam'
    const ttsResponse = await zai.audio.tts.create({
      input: text,
      voice: safeVoice,
      speed: 1.0,
      response_format: 'wav',
    })
    const arrayBuffer = await ttsResponse.arrayBuffer()
    const rawBuffer = Buffer.from(new Uint8Array(arrayBuffer))
    const contentType = ttsResponse.headers?.get('content-type') || 'audio/wav'

    if (isPcmAudio(contentType)) {
      const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16)
      return { audioBase64: wavBuffer.toString('base64'), format: 'wav' }
    } else {
      return { audioBase64: rawBuffer.toString('base64'), format: contentType.includes('mp3') ? 'mp3' : 'wav' }
    }
  } catch (ttsError) {
    console.error('[TTS] Z-AI fallback also failed:', ttsError)
    return { audioBase64: null, format: null }
  }
}
