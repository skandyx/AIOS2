/**
 * AIOS Voice Service — edge-tts Python bridge
 * 
 * Provides high-quality TTS using Microsoft Edge neural voices.
 * The best Jarvis-like voice is "en-GB-RyanNeural" (British gentleman).
 * 
 * Endpoints:
 *   POST /api/tts   → { text, voice, rate?, pitch? } → audio/wav
 *   GET  /api/voices → list available voices
 *   POST /api/stt   → { audio_base64 } → { text }
 *   GET  /health     → { status: "ok" }
 */

const PORT = 3031

// Available voices with descriptions
const VOICES: Record<string, { name: string; description: string; locale: string; gender: string }> = {
  'ryan':      { name: 'Ryan (Jarvis)',      description: 'British Gent — Jarvis style', locale: 'en-GB', gender: 'Male' },
  'thomas':    { name: 'Thomas',             description: 'British Male — Deep',         locale: 'en-GB', gender: 'Male' },
  'brian':     { name: 'Brian',              description: 'US Male — Warm',              locale: 'en-US', gender: 'Male' },
  'guy':       { name: 'Guy',                description: 'US Male — Authoritative',     locale: 'en-US', gender: 'Male' },
  'roger':     { name: 'Roger',              description: 'US Male — Mature',            locale: 'en-US', gender: 'Male' },
  'sonia':     { name: 'Sonia',              description: 'British Female — Elegant',    locale: 'en-GB', gender: 'Female' },
  'libby':     { name: 'Libby',              description: 'British Female — Young',      locale: 'en-GB', gender: 'Female' },
  'maisie':    { name: 'Maisie',             description: 'British Female — Youthful',   locale: 'en-GB', gender: 'Female' },
  'andrew':    { name: 'Andrew',             description: 'US Male — Clear',             locale: 'en-US', gender: 'Male' },
  'christopher': { name: 'Christopher',      description: 'US Male — Friendly',          locale: 'en-US', gender: 'Male' },
  'eric':      { name: 'Eric',               description: 'US Male — Calm',              locale: 'en-US', gender: 'Male' },
  'steffan':   { name: 'Steffan',            description: 'US Male — Warm',              locale: 'en-US', gender: 'Male' },
}

// Map short voice IDs to Microsoft edge-tts voice names
const VOICE_MAP: Record<string, string> = {
  'ryan':      'en-GB-RyanNeural',
  'thomas':    'en-GB-ThomasNeural',
  'brian':     'en-US-BrianNeural',
  'guy':       'en-US-GuyNeural',
  'roger':     'en-US-RogerNeural',
  'sonia':     'en-GB-SoniaNeural',
  'libby':     'en-GB-LibbyNeural',
  'maisie':    'en-GB-MaisieNeural',
  'andrew':    'en-US-AndrewNeural',
  'christopher': 'en-US-ChristopherNeural',
  'eric':      'en-US-EricNeural',
  'steffan':   'en-US-SteffanNeural',
}

// ── HTTP Server ──────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    try {
      // Health check
      if (path === '/health') {
        return Response.json({ status: 'ok', service: 'voice', port: PORT, engine: 'edge-tts' }, { headers: corsHeaders })
      }

      // List voices
      if (path === '/api/voices') {
        return Response.json({ voices: VOICES, default: 'ryan' }, { headers: corsHeaders })
      }

      // TTS endpoint
      if (path === '/api/tts' && req.method === 'POST') {
        const body = await req.json()
        const { text, voice = 'ryan', rate = '+0%', pitch = '+0Hz', format = 'wav' } = body

        if (!text || typeof text !== 'string') {
          return Response.json({ error: 'text is required' }, { status: 400, headers: corsHeaders })
        }

        const edgeVoice = VOICE_MAP[voice] || VOICE_MAP['ryan']!
        
        console.log(`[TTS] voice=${edgeVoice} rate=${rate} pitch=${pitch} text="${text.substring(0, 60)}..."`)

        // Use edge-tts Python CLI to generate audio
        // edge-tts can output mp3 directly, then we convert if needed
        const tmpId = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const tmpMp3 = `/tmp/${tmpId}.mp3`
        const tmpWav = `/tmp/${tmpId}.wav`

        try {
          // Generate MP3 with edge-tts
          const cmd = `python3 -m edge_tts --voice "${edgeVoice}" --rate="${rate}" --pitch="${pitch}" --text "${text.replace(/"/g, '\\"').replace(/\n/g, ' ')}" --write-media "${tmpMp3}"`
          
          const proc = Bun.spawn(['bash', '-c', cmd], {
            stdout: 'pipe',
            stderr: 'pipe',
          })
          
          const exitCode = await proc.exited
          
          if (exitCode !== 0) {
            const stderr = await new Response(proc.stderr).text()
            console.error('[TTS] edge-tts error:', stderr)
            return Response.json({ error: 'TTS generation failed: ' + stderr.slice(0, 200) }, { status: 500, headers: corsHeaders })
          }

          // Read the generated MP3
          const mp3File = Bun.file(tmpMp3)
          if (!(await mp3File.exists())) {
            return Response.json({ error: 'TTS output file not found' }, { status: 500, headers: corsHeaders })
          }

          const audioBuffer = await mp3File.arrayBuffer()

          // Clean up temp files
          setTimeout(async () => {
            try { await Bun.file(tmpMp3).exists() && (await import('fs')).unlinkSync(tmpMp3) } catch {}
            try { await Bun.file(tmpWav).exists() && (await import('fs')).unlinkSync(tmpWav) } catch {}
          }, 5000)

          // Return audio
          const contentType = format === 'wav' ? 'audio/wav' : 'audio/mp3'
          return new Response(audioBuffer, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'audio/mp3', // edge-tts outputs mp3
              'Content-Length': audioBuffer.byteLength.toString(),
              'X-Voice': edgeVoice,
              'X-Format': 'mp3',
            },
          })
        } catch (ttsErr) {
          console.error('[TTS] Error:', ttsErr)
          return Response.json({ error: 'TTS error: ' + String(ttsErr) }, { status: 500, headers: corsHeaders })
        }
      }

      // STT endpoint (placeholder - uses browser Web Speech API instead)
      if (path === '/api/stt' && req.method === 'POST') {
        return Response.json({ error: 'STT not implemented - use browser Web Speech API' }, { status: 501, headers: corsHeaders })
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })

    } catch (err) {
      console.error('[Voice Service] Error:', err)
      return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders })
    }
  },
})

console.log(`🎤 AIOS Voice Service running on port ${PORT}`)
console.log(`   Engine: edge-tts (Microsoft Neural Voices)`)
console.log(`   Default voice: en-GB-RyanNeural (Jarvis)`)
console.log(`   Endpoints: /health, /api/voices, /api/tts`)
