/**
 * Audio Utility Functions
 * 
 * Handles conversion between raw PCM audio and browser-playable WAV format.
 * The Z-AI TTS SDK returns raw PCM audio, but browsers need WAV headers.
 */

/**
 * Convert raw PCM audio buffer to a WAV file buffer.
 * 
 * Z-AI TTS returns: 16-bit PCM, 24000Hz sample rate, mono
 * WAV format adds a 44-byte header before the PCM data.
 */
export function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataLength = pcmBuffer.length
  const headerLength = 44

  const wavBuffer = Buffer.alloc(headerLength + dataLength)

  // RIFF header
  wavBuffer.write('RIFF', 0)
  wavBuffer.writeUInt32LE(36 + dataLength, 4) // File size - 8
  wavBuffer.write('WAVE', 8)

  // fmt sub-chunk
  wavBuffer.write('fmt ', 12)
  wavBuffer.writeUInt32LE(16, 16) // Sub-chunk size (16 for PCM)
  wavBuffer.writeUInt16LE(1, 20) // Audio format (1 = PCM)
  wavBuffer.writeUInt16LE(numChannels, 22)
  wavBuffer.writeUInt32LE(sampleRate, 24)
  wavBuffer.writeUInt32LE(byteRate, 28)
  wavBuffer.writeUInt16LE(blockAlign, 32)
  wavBuffer.writeUInt16LE(bitsPerSample, 34)

  // data sub-chunk
  wavBuffer.write('data', 36)
  wavBuffer.writeUInt32LE(dataLength, 40)

  // Copy PCM data
  pcmBuffer.copy(wavBuffer, 44)

  return wavBuffer
}

/**
 * Detect if audio content type is PCM (raw audio)
 */
export function isPcmAudio(contentType: string): boolean {
  return contentType.toLowerCase().includes('pcm')
}

/**
 * Available TTS voices for Z-AI SDK
 * Full list of confirmed voices from the Z-AI TTS API
 */
export const AVAILABLE_TTS_VOICES = [
  { id: 'jam', name: 'Jarvis (British Gent)', description: 'Voix masculine britannique - style Jarvis', language: 'en', emoji: '🎩' },
  { id: 'kazi', name: 'Kazi (Standard)', description: 'Voix claire et standard', language: 'en', emoji: '🎙️' },
  { id: 'xiaochen', name: 'Xiaochen (Pro)', description: 'Voix professionnelle et calme', language: 'zh/en', emoji: '👔' },
  { id: 'tongtong', name: 'Tongtong (Neutre)', description: 'Voix neutre / enfant', language: 'zh/en', emoji: '🎭' },
  { id: 'chuichui', name: 'Chuichui (Lively)', description: 'Voix vive et mignonne', language: 'zh/en', emoji: '✨' },
  { id: 'douji', name: 'Douji (Natural)', description: 'Voix naturelle et fluide', language: 'zh/en', emoji: '🌊' },
  { id: 'luodo', name: 'Luodo (Expressive)', description: 'Voix expressive et engageante', language: 'zh/en', emoji: '🔥' },
] as const

export type TTSVoiceId = typeof AVAILABLE_TTS_VOICES[number]['id']

/**
 * All valid TTS voice IDs for validation
 */
export const VALID_TTS_VOICE_IDS = AVAILABLE_TTS_VOICES.map(v => v.id)
