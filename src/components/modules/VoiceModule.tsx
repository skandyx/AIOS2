'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Loader2,
  Radio,
  AlertCircle,
  MessageSquare,
  Bot,
  User,
  Sparkles,
  Ear,
  Pause,
  Play,
  Trash2,
  Send,
  Cpu,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAIOSStore } from '@/lib/store'

// ─── Constants ──────────────────────────────────────────────────────────────────

const WAKE_WORD = 'fred'
const WAKE_WORD_VARIANTS = ['fred', 'fread', 'fret', 'frame', 'friend'] // ASR may mishear

// Edge-TTS voices (high quality Microsoft Neural — via voice-service)
const TTS_VOICES = [
  { id: 'ryan', name: 'Ryan (Jarvis)', description: 'British Gent — Jarvis style', emoji: '🎩' },
  { id: 'thomas', name: 'Thomas', description: 'British Male — Deep', emoji: '🔊' },
  { id: 'brian', name: 'Brian', description: 'US Male — Warm & Deep', emoji: '🎙️' },
  { id: 'guy', name: 'Guy', description: 'US Male — Authoritative', emoji: '💼' },
  { id: 'roger', name: 'Roger', description: 'US Male — Mature', emoji: '🎵' },
  { id: 'andrew', name: 'Andrew', description: 'US Male — Clear', emoji: '📡' },
  { id: 'christopher', name: 'Christopher', description: 'US Male — Friendly', emoji: '🤝' },
  { id: 'eric', name: 'Eric', description: 'US Male — Calm', emoji: '🌊' },
  { id: 'steffan', name: 'Steffan', description: 'US Male — Warm', emoji: '🔥' },
  { id: 'sonia', name: 'Sonia', description: 'British Female — Elegant', emoji: '👩' },
  { id: 'libby', name: 'Libby', description: 'British Female — Young', emoji: '✨' },
  { id: 'maisie', name: 'Maisie', description: 'British Female — Youthful', emoji: '🌟' },
]

const VOICE_MODELS = [
  { id: '', name: 'Z-AI (Default)', provider: 'Built-in', emoji: '✨' },
  { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'Mistral', emoji: '🌊' },
  { id: 'mistral-small-latest', name: 'Mistral Small', provider: 'Mistral', emoji: '💧' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', emoji: '🧠' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', emoji: '⚡' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', emoji: '🔍' },
  { id: 'ollama-mistral', name: 'Mistral 7B (Ollama)', provider: 'Ollama', emoji: '🖥️' },
  { id: 'ollama-llama3.1', name: 'Llama 3.1 (Ollama)', provider: 'Ollama', emoji: '🖥️' },
  { id: 'ollama-codellama', name: 'CodeLlama (Ollama)', provider: 'Ollama', emoji: '🖥️' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type VoiceMode = 'transcription' | 'assistant'
type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking' | 'wake-word'

interface TranscriptionEntry {
  id: string
  text: string
  timestamp: Date
  duration: number
}

interface VoiceMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  audioUrl?: string
}

// ─── Wake Word Detection ──────────────────────────────────────────────────────

function containsWakeWord(text: string): boolean {
  const lower = text.toLowerCase()
  return WAKE_WORD_VARIANTS.some(variant => lower.includes(variant))
}

function stripWakeWord(text: string): string {
  const lower = text.toLowerCase()
  for (const variant of WAKE_WORD_VARIANTS) {
    const idx = lower.indexOf(variant)
    if (idx !== -1) {
      const after = text.slice(idx + variant.length).trim()
      return after.replace(/^[,.\s!]+/, '').trim()
    }
  }
  return text
}

// ─── Audio Level Ring ─────────────────────────────────────────────────────────

function AudioLevelRing({
  level,
  isActive,
  state,
}: {
  level: number
  isActive: boolean
  state: AssistantState
}) {
  const radius = 72
  const strokeWidth = 4
  const normalizedLevel = Math.min(level / 100, 1)
  const circumference = 2 * Math.PI * radius
  const filledLength = circumference * normalizedLevel

  const getColor = () => {
    if (state === 'speaking') return 'rgba(16, 185, 129, 0.6)'
    if (state === 'processing') return 'rgba(245, 158, 11, 0.6)'
    if (state === 'listening' || state === 'wake-word') return 'rgba(6, 182, 212, 0.6)'
    return 'rgba(6, 182, 212, 0.15)'
  }

  const getGlowColor = () => {
    if (state === 'speaking') return 'rgba(16, 185, 129, 0.2)'
    if (state === 'processing') return 'rgba(245, 158, 11, 0.2)'
    return 'rgba(6, 182, 212, 0.2)'
  }

  return (
    <svg
      width={(radius + strokeWidth) * 2}
      height={(radius + strokeWidth) * 2}
      className="absolute inset-0 -rotate-90"
    >
      <circle
        cx={radius + strokeWidth}
        cy={radius + strokeWidth}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={radius + strokeWidth}
        cy={radius + strokeWidth}
        r={radius}
        fill="none"
        stroke={getColor()}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - filledLength}
        strokeLinecap="round"
        className="transition-all duration-75"
      />
      {isActive && (
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke={getGlowColor()}
          strokeWidth={strokeWidth + 6}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filledLength}
          strokeLinecap="round"
          className="transition-all duration-75 blur-sm"
        />
      )}
    </svg>
  )
}

// ─── Waveform Visualizer ──────────────────────────────────────────────────────

function WaveformVisualizer({
  analyser,
  isActive,
  color = 'cyan',
}: {
  analyser: AnalyserNode | null
  isActive: boolean
  color?: 'cyan' | 'emerald' | 'amber'
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  const colorMap = {
    cyan: 'rgba(6, 182, 212, 0.6)',
    emerald: 'rgba(16, 185, 129, 0.6)',
    amber: 'rgba(245, 158, 11, 0.6)',
  }

  const glowMap = {
    cyan: 'rgba(6, 182, 212, 0.4)',
    emerald: 'rgba(16, 185, 129, 0.4)',
    amber: 'rgba(245, 158, 11, 0.4)',
  }

  useEffect(() => {
    if (!canvasRef.current || !analyser || !isActive) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)

      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.scale(dpr, dpr)

      const width = canvas.clientWidth
      const height = canvas.clientHeight

      ctx.clearRect(0, 0, width, height)
      ctx.lineWidth = 2
      ctx.strokeStyle = colorMap[color]
      ctx.shadowColor = glowMap[color]
      ctx.shadowBlur = 8
      ctx.beginPath()

      const sliceWidth = width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * height) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }

      ctx.lineTo(width, height / 2)
      ctx.stroke()
    }

    draw()
    return () => cancelAnimationFrame(animationRef.current)
  }, [analyser, isActive, color])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-16 rounded-lg opacity-80"
      style={{ display: isActive ? 'block' : 'none' }}
    />
  )
}

// ─── Voice Message Bubble ─────────────────────────────────────────────────────

function VoiceMessageBubble({ message, onPlay, isPlaying }: {
  message: VoiceMessage
  onPlay: (msg: VoiceMessage) => void
  isPlaying: boolean
}) {
  const isUser = message.role === 'user'
  const timeStr = message.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <User className="h-4 w-4 text-emerald-400" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <Bot className="h-4 w-4 text-amber-400" />
          </div>
        )}
      </div>

      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-50'
              : 'bg-white/5 border border-white/10 text-gray-100 backdrop-blur-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {!isUser && message.audioUrl && (
            <button
              onClick={() => onPlay(message)}
              className="mt-2 flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {isPlaying ? 'Playing...' : 'Play audio'}
            </button>
          )}
        </div>
        <span className="text-[10px] text-gray-500 mt-1 px-1">{timeStr}</span>
      </div>
    </motion.div>
  )
}

// ─── Main VoiceModule ─────────────────────────────────────────────────────────

export default function VoiceModule() {
  const { isVoiceActive, setVoiceActive } = useAIOSStore()

  // Mode & state
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('assistant')
  const [assistantState, setAssistantState] = useState<AssistantState>('idle')
  const [isAlwaysListening, setIsAlwaysListening] = useState(false)

  // Transcription mode state
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const [selectedLanguage, setSelectedLanguage] = useState('fr')
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Assistant mode state
  const [conversationMessages, setConversationMessages] = useState<VoiceMessage[]>([])
  const [textInput, setTextInput] = useState('')
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState('ryan') // Default: Ryan (Jarvis)
  const [selectedModel, setSelectedModel] = useState('')

  // Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const levelAnimRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const silenceStartRef = useRef<number>(0)
  const conversationEndRef = useRef<HTMLDivElement>(null)
  
  // Stable refs for callback access (avoids stale closure issues)
  const isAlwaysListeningRef = useRef(false)
  const isListeningLoopRef = useRef(false)
  const selectedVoiceRef = useRef('ryan')
  const selectedModelRef = useRef('')
  const conversationMessagesRef = useRef<VoiceMessage[]>([])

  // ── FUNCTION REFS: break circular dependency ──────────────────────
  // These refs hold the latest function references so callbacks can
  // call each other without circular useCallback dependencies.
  const startListeningLoopRef = useRef<() => Promise<void>>(async () => {})
  const restartListeningRef = useRef<() => void>(() => {})
  const handleRecordingCompleteRef = useRef<() => Promise<void>>(async () => {})
  const startSilenceDetectionRef = useRef<(analyser: AnalyserNode) => void>(() => {})
  const playAudioRef = useRef<(url: string, messageId: string) => Promise<void>>(async () => {})

  // Keep refs in sync with state
  useEffect(() => { isAlwaysListeningRef.current = isAlwaysListening }, [isAlwaysListening])
  useEffect(() => { selectedVoiceRef.current = selectedVoice }, [selectedVoice])
  useEffect(() => { selectedModelRef.current = selectedModel }, [selectedModel])
  useEffect(() => { conversationMessagesRef.current = conversationMessages }, [conversationMessages])

  // ── Check mic permission on mount ─────────────────────────────────────

  useEffect(() => {
    async function checkPermission() {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setMicPermission(result.state as 'granted' | 'denied' | 'prompt')
        result.onchange = () => {
          setMicPermission(result.state as 'granted' | 'denied' | 'prompt')
        }
      } catch {
        setMicPermission('prompt')
      }
    }
    checkPermission()
  }, [])

  // ── Auto-scroll conversation ──────────────────────────────────────────

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages])

  // ── Monitor audio levels ──────────────────────────────────────────────

  const startLevelMonitoring = useCallback((analyser: AnalyserNode) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length
      setAudioLevel(Math.min(avg * 2.5, 100))
      levelAnimRef.current = requestAnimationFrame(updateLevel)
    }

    updateLevel()
  }, [])

  const stopLevelMonitoring = useCallback(() => {
    cancelAnimationFrame(levelAnimRef.current)
    setAudioLevel(0)
  }, [])

  // ── Start microphone ──────────────────────────────────────────────────

  const startMicrophone = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream
      chunksRef.current = []

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      setMicPermission('granted')
      setConnectionStatus('connected')
      startLevelMonitoring(analyser)

      return { stream, audioContext, analyser }
    } catch (err) {
      console.error('Failed to start microphone:', err)
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setMicPermission('denied')
        setError('Microphone access denied. Please allow microphone access in your browser settings.')
      } else {
        setError('Failed to access microphone. Please check your device.')
      }
      return null
    }
  }, [startLevelMonitoring])

  // ── Stop microphone ───────────────────────────────────────────────────

  const stopMicrophone = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    stopLevelMonitoring()
    setConnectionStatus('disconnected')
  }, [stopLevelMonitoring])

  // ── Play audio ────────────────────────────────────────────────────────

  const playAudio = useCallback(async (url: string, messageId: string) => {
    return new Promise<void>((resolve) => {
      setAssistantState('speaking')
      setIsPlaying(messageId)

      const audio = new Audio(url)
      audioPlayerRef.current = audio

      audio.onended = () => {
        setIsPlaying(null)
        audioPlayerRef.current = null
        resolve()
      }

      audio.onerror = () => {
        setIsPlaying(null)
        audioPlayerRef.current = null
        resolve()
      }

      audio.play().catch(() => {
        setIsPlaying(null)
        audioPlayerRef.current = null
        resolve()
      })
    })
  }, [])

  // Keep playAudioRef in sync
  useEffect(() => { playAudioRef.current = playAudio }, [playAudio])

  // ── Helper: decode base64 audio from API ──────────────────────────────

  const decodeAudioResponse = useCallback((data: { audioBase64?: string; audioFormat?: string }): string | undefined => {
    if (!data.audioBase64) return undefined
    try {
      const binaryString = atob(data.audioBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const mimeType = data.audioFormat === 'wav' ? 'audio/wav' : data.audioFormat === 'mp3' ? 'audio/mp3' : 'audio/wav'
      const audioBlob = new Blob([bytes], { type: mimeType })
      return URL.createObjectURL(audioBlob)
    } catch {
      console.warn('Failed to decode TTS audio')
      return undefined
    }
  }, [])

  // ── Restart listening after response ──────────────────────────────────
  // Uses refs to call startListeningLoop and startSilenceDetection,
  // breaking the circular dependency.

  const restartListening = useCallback(() => {
    if (!isListeningLoopRef.current) return

    // In always-listening mode, go back to wake-word listening
    if (isAlwaysListeningRef.current) {
      setAssistantState('wake-word')
    } else {
      setAssistantState('listening')
    }

    // Reuse existing stream if still active
    if (streamRef.current && streamRef.current.active) {
      chunksRef.current = []
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)

      if (analyserRef.current) {
        startLevelMonitoring(analyserRef.current)
        // Call via ref to avoid circular dependency
        startSilenceDetectionRef.current(analyserRef.current)
      }
    } else {
      // Need to re-acquire microphone — call via ref
      startListeningLoopRef.current()
    }
  }, [startLevelMonitoring]) // No circular deps — uses refs

  // Keep restartListeningRef in sync
  useEffect(() => { restartListeningRef.current = restartListening }, [restartListening])

  // ── Handle recording complete (silence detected) ──────────────────────

  const handleRecordingComplete = useCallback(async () => {
    if (!isListeningLoopRef.current) return

    // Stop current recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopLevelMonitoring()

    // Get recorded audio
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    chunksRef.current = []

    if (blob.size < 1000) {
      // Too small, probably just noise, restart listening
      restartListeningRef.current()
      return
    }

    // In always-listening mode, first check for wake word via ASR-only
    if (isAlwaysListeningRef.current) {
      setAssistantState('processing')
      
      try {
        // Step 1: ASR only - just transcribe
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const dataUrl = reader.result as string
            resolve(dataUrl.split(',')[1])
          }
          reader.onerror = reject
        })
        reader.readAsDataURL(blob)
        const audioBase64 = await base64Promise

        const asrRes = await fetch('/api/voice/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64,
            mode: 'asr-only',
          }),
        })

        if (!asrRes.ok) {
          throw new Error('ASR failed')
        }

        const asrData = await asrRes.json()
        const transcription = (asrData.transcription || '').trim()

        if (!transcription) {
          // Empty transcription, restart
          restartListeningRef.current()
          return
        }

        // Step 2: Check for wake word
        if (!containsWakeWord(transcription)) {
          // No wake word detected, discard and restart listening silently
          console.log('[Voice] No wake word in:', transcription)
          restartListeningRef.current()
          return
        }

        // Wake word detected!
        console.log('[Voice] Wake word detected! Transcription:', transcription)

        // Strip wake word from the command
        const commandText = stripWakeWord(transcription)

        // Add user message (show the full transcription)
        const userMsg: VoiceMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: transcription,
          timestamp: new Date(),
        }
        setConversationMessages((prev) => [...prev, userMsg])

        // Step 3: Send command to LLM + TTS
        setAssistantState('processing')

        const recentMessages = conversationMessagesRef.current.slice(-10).map((m) => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        }))

        const res = await fetch('/api/voice/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: commandText || 'Bonjour', // If just "Fred" with no command, greet
            messages: recentMessages,
            model: selectedModelRef.current || undefined,
            generateSpeech: true,
            voice: selectedVoiceRef.current,
          }),
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Assistant request failed')
        }

        const data = await res.json()

        if (data.response) {
          const audioUrl = decodeAudioResponse(data)

          const assistantMsg: VoiceMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            audioUrl,
          }
          setConversationMessages((prev) => [...prev, assistantMsg])

          // Play audio if available
          if (audioUrl) {
            await playAudioRef.current(audioUrl, assistantMsg.id)
          }
        }
      } catch (err) {
        console.error('Voice assistant error:', err)
        setError(err instanceof Error ? err.message : 'Voice assistant error')
      }

      // Restart listening if always-listening is still on
      if (isListeningLoopRef.current && isAlwaysListeningRef.current) {
        restartListeningRef.current()
      } else {
        setAssistantState('idle')
        isListeningLoopRef.current = false
      }
      return
    }

    // Non-always-listening mode: full pipeline directly
    setAssistantState('processing')

    try {
      // Convert blob to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const dataUrl = reader.result as string
          resolve(dataUrl.split(',')[1])
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(blob)
      const audioBase64 = await base64Promise

      // Build conversation history for context (last 10 messages)
      const recentMessages = conversationMessagesRef.current.slice(-10).map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

      // Send to voice assistant API (full pipeline)
      const res = await fetch('/api/voice/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          messages: recentMessages,
          model: selectedModelRef.current || undefined,
          generateSpeech: true,
          voice: selectedVoiceRef.current,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Assistant request failed')
      }

      const data = await res.json()

      if (data.transcription && data.transcription.trim()) {
        // Add user message
        const userMsg: VoiceMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: data.transcription,
          timestamp: new Date(),
        }
        setConversationMessages((prev) => [...prev, userMsg])

        if (data.response) {
          const audioUrl = decodeAudioResponse(data)

          const assistantMsg: VoiceMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            audioUrl,
          }
          setConversationMessages((prev) => [...prev, assistantMsg])

          // Play audio if available
          if (audioUrl) {
            await playAudioRef.current(audioUrl, assistantMsg.id)
          }
        }
      }
    } catch (err) {
      console.error('Voice assistant error:', err)
      setError(err instanceof Error ? err.message : 'Voice assistant error')
    }

    // Restart listening if always-listening is on
    if (isListeningLoopRef.current && isAlwaysListeningRef.current) {
      restartListeningRef.current()
    } else {
      setAssistantState('idle')
      isListeningLoopRef.current = false
    }
  }, [stopLevelMonitoring, decodeAudioResponse]) // No circular deps — uses refs

  // Keep handleRecordingCompleteRef in sync
  useEffect(() => { handleRecordingCompleteRef.current = handleRecordingComplete }, [handleRecordingComplete])

  // ── Silence detection for always-listening ────────────────────────────

  const startSilenceDetection = useCallback((analyser: AnalyserNode) => {
    const SILENCE_THRESHOLD = 8
    const SILENCE_DURATION = 2000 // 2 seconds of silence = end of speech
    const MIN_SPEECH_DURATION = 1000 // Minimum recording before allowing silence stop
    const recordingStartTime = Date.now()

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let isSpeaking = false

    const checkSilence = () => {
      if (!isListeningLoopRef.current) return

      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length

      if (avg > SILENCE_THRESHOLD) {
        // Speech detected
        isSpeaking = true
        silenceStartRef.current = 0
      } else if (isSpeaking) {
        // Potential silence after speech
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now()
        } else if (
          Date.now() - silenceStartRef.current > SILENCE_DURATION &&
          Date.now() - recordingStartTime > MIN_SPEECH_DURATION
        ) {
          // Silence detected after speech, stop and process
          silenceStartRef.current = 0
          isSpeaking = false
          // Call via ref to avoid circular dependency
          handleRecordingCompleteRef.current()
          return
        }
      }

      requestAnimationFrame(checkSilence)
    }

    checkSilence()
  }, []) // No dependencies — uses refs

  // Keep startSilenceDetectionRef in sync
  useEffect(() => { startSilenceDetectionRef.current = startSilenceDetection }, [startSilenceDetection])

  // ── Start always-listening loop ───────────────────────────────────────

  const startListeningLoop = useCallback(async () => {
    if (isListeningLoopRef.current) return
    isListeningLoopRef.current = true
    
    if (isAlwaysListeningRef.current) {
      setAssistantState('wake-word')
    } else {
      setAssistantState('listening')
    }

    const result = await startMicrophone()
    if (!result) {
      isListeningLoopRef.current = false
      setAssistantState('idle')
      return
    }

    // Start recording
    const mediaRecorder = new MediaRecorder(result.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mediaRecorderRef.current = mediaRecorder
    chunksRef.current = []
    mediaRecorder.start(100)

    // Start silence detection via ref
    startSilenceDetectionRef.current(result.analyser)
  }, [startMicrophone]) // No circular deps — uses refs

  // Keep startListeningLoopRef in sync
  useEffect(() => { startListeningLoopRef.current = startListeningLoop }, [startListeningLoop])

  // ── Handle play message audio ─────────────────────────────────────────

  const handlePlayMessage = useCallback((msg: VoiceMessage) => {
    if (isPlaying === msg.id && audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      setIsPlaying(null)
      audioPlayerRef.current = null
      return
    }

    if (msg.audioUrl) {
      playAudioRef.current(msg.audioUrl, msg.id)
    }
  }, [isPlaying])

  // ── Start recording for transcription mode ────────────────────────────

  const startRecording = async () => {
    const result = await startMicrophone()
    if (!result) return

    const mediaRecorder = new MediaRecorder(result.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      await transcribeAudio(blob)
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start(100)
    setIsRecording(true)
    setRecordingDuration(0)
    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1)
    }, 1000)
  }

  // ── Stop recording for transcription mode ─────────────────────────────

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopMicrophone()
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // ── Transcribe audio (transcription mode) ─────────────────────────────

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true)
    setError(null)

    try {
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const dataUrl = reader.result as string
          resolve(dataUrl.split(',')[1])
        }
        reader.onerror = reject
      })

      reader.readAsDataURL(blob)
      const audioBase64 = await base64Promise

      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64 }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Transcription failed')
      }

      const data = await res.json()

      const entry: TranscriptionEntry = {
        id: `transcription-${Date.now()}`,
        text: data.text || '',
        timestamp: new Date(),
        duration: recordingDuration,
      }

      setTranscriptions((prev) => [entry, ...prev])
    } catch (err) {
      console.error('Transcription error:', err)
      setError(err instanceof Error ? err.message : 'Failed to transcribe audio')
    } finally {
      setIsTranscribing(false)
      setRecordingDuration(0)
    }
  }

  // ── Send text to assistant ────────────────────────────────────────────

  const sendTextToAssistant = async () => {
    const text = textInput.trim()
    if (!text) return

    setTextInput('')
    setAssistantState('processing')

    // Add user message
    const userMsg: VoiceMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setConversationMessages((prev) => [...prev, userMsg])

    try {
      const recentMessages = conversationMessagesRef.current.slice(-10).map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

      const res = await fetch('/api/voice/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          messages: recentMessages,
          model: selectedModel || undefined,
          generateSpeech: true,
          voice: selectedVoice,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Assistant request failed')
      }

      const data = await res.json()

      if (data.response) {
        const audioUrl = decodeAudioResponse(data)

        const assistantMsg: VoiceMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          audioUrl,
        }
        setConversationMessages((prev) => [...prev, assistantMsg])

        if (audioUrl) {
          await playAudioRef.current(audioUrl, assistantMsg.id)
        }
      }
    } catch (err) {
      console.error('Text assistant error:', err)
      setError(err instanceof Error ? err.message : 'Failed to get response')
    } finally {
      if (assistantState !== 'speaking') {
        setAssistantState(isAlwaysListeningRef.current && isListeningLoopRef.current ? 'wake-word' : 'idle')
      }
    }
  }

  // ── Toggle always-listening ───────────────────────────────────────────

  const toggleAlwaysListening = useCallback(async () => {
    if (isAlwaysListening) {
      // Turn off
      isListeningLoopRef.current = false
      isAlwaysListeningRef.current = false
      setIsAlwaysListening(false)
      setAssistantState('idle')
      stopMicrophone()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current = null
      }
      setIsPlaying(null)
    } else {
      // Turn on
      isAlwaysListeningRef.current = true
      setIsAlwaysListening(true)
      setVoiceActive(true)
      // Call via ref
      await startListeningLoopRef.current()
    }
  }, [isAlwaysListening, stopMicrophone, setVoiceActive]) // No circular deps — uses refs

  // ── Single push-to-talk for assistant mode ────────────────────────────

  const assistantPushToTalk = async () => {
    if (assistantState === 'listening' || assistantState === 'wake-word') {
      // Already listening, stop and process
      handleRecordingCompleteRef.current()
    } else if (assistantState === 'idle') {
      // Start a single listening session (no wake word check)
      isAlwaysListeningRef.current = false
      isListeningLoopRef.current = true
      setAssistantState('listening')
      
      const result = await startMicrophone()
      if (!result) {
        isListeningLoopRef.current = false
        setAssistantState('idle')
        return
      }

      const mediaRecorder = new MediaRecorder(result.stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      mediaRecorder.start(100)
      startSilenceDetectionRef.current(result.analyser)
    }
  }

  // ── Copy transcription ────────────────────────────────────────────────

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Format duration ───────────────────────────────────────────────────

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // ── Clear conversation ────────────────────────────────────────────────

  const clearConversation = () => {
    conversationMessages.forEach((msg) => {
      if (msg.audioUrl) URL.revokeObjectURL(msg.audioUrl)
    })
    setConversationMessages([])
  }

  // ── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      isListeningLoopRef.current = false
      isAlwaysListeningRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      stopLevelMonitoring()
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current = null
      }
      conversationMessages.forEach((msg) => {
        if (msg.audioUrl) URL.revokeObjectURL(msg.audioUrl)
      })
    }
  }, [stopLevelMonitoring])

  // ── Sync with global voice state ──────────────────────────────────────

  useEffect(() => {
    if (!isVoiceActive && isAlwaysListening) {
      isListeningLoopRef.current = false
      isAlwaysListeningRef.current = false
      setIsAlwaysListening(false)
      setAssistantState('idle')
      stopMicrophone()
    }
  }, [isVoiceActive, isAlwaysListening, stopMicrophone])

  // ── Get state color and label ─────────────────────────────────────────

  const getStateInfo = () => {
    switch (assistantState) {
      case 'wake-word':
        return { color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'En écoute... Dis "Fred"', icon: Ear }
      case 'listening':
        return { color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Écoute...', icon: Ear }
      case 'processing':
        return { color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Réflexion...', icon: Loader2 }
      case 'speaking':
        return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Fred parle...', icon: Volume2 }
      default:
        return { color: 'text-gray-400', bg: 'bg-gray-800/80', label: 'Prêt', icon: Mic }
    }
  }

  const stateInfo = getStateInfo()
  const StateIcon = stateInfo.icon

  return (
    <div className="flex flex-col h-full w-full bg-gray-950/80 rounded-xl overflow-hidden border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-white/5 bg-gray-950/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-medium text-gray-200">Fred — Voice Assistant</h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 sm:gap-2 bg-white/5 rounded-lg px-1.5 sm:px-2 py-1">
            <button
              onClick={() => setVoiceMode('assistant')}
              className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-md transition-colors ${
                voiceMode === 'assistant'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-0.5 sm:mr-1" />
              Assistant
            </button>
            <button
              onClick={() => setVoiceMode('transcription')}
              className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-md transition-colors ${
                voiceMode === 'transcription'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Mic className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-0.5 sm:mr-1" />
              Transcribe
            </button>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-1">
            {connectionStatus === 'connected' || assistantState !== 'idle' ? (
              <Wifi className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-600" />
            )}
            <span className="text-[9px] sm:text-[10px] text-gray-500 hidden sm:inline">
              {assistantState !== 'idle' ? 'Active' : 'Idle'}
            </span>
          </div>

          <Badge variant="outline" className="text-[9px] sm:text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">
            FRED
          </Badge>
        </div>
      </div>

      {/* ─── Assistant Mode ──────────────────────────────────────────────── */}
      {voiceMode === 'assistant' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Control bar */}
          <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 border-b border-white/5 bg-gray-950/30 gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Always-listening toggle */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Switch
                  checked={isAlwaysListening}
                  onCheckedChange={toggleAlwaysListening}
                  className="data-[state=checked]:bg-amber-500"
                />
                <span className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1">
                  <Ear className="h-3 w-3" />
                  <span className="hidden sm:inline">Always Listening</span>
                  <span className="sm:hidden">Always On</span>
                </span>
              </div>
              
              {/* Wake word indicator */}
              {isAlwaysListening && (
                <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-300 bg-amber-500/10 gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  Dis &quot;Fred&quot;
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Model selector */}
              <div className="flex items-center gap-1">
                <Cpu className="size-3 text-neutral-500 hidden sm:block" />
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-gray-900/50 border border-white/10 text-[10px] text-neutral-400 rounded-md px-1 py-0.5 h-6 outline-none cursor-pointer hover:border-amber-500/30 focus:border-amber-500/50 transition-colors max-w-[80px] sm:max-w-none"
                >
                  {VOICE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice selector */}
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="h-7 w-[130px] sm:w-[180px] bg-gray-900/50 border-white/10 text-xs text-gray-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  {TTS_VOICES.map(v => (
                    <SelectItem key={v.id} value={v.id} className="text-gray-200 text-xs">
                      {v.emoji} {v.name} ({v.description})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear conversation */}
              {conversationMessages.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearConversation}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-red-400 hover:bg-white/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear conversation</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Conversation + Mic area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Conversation messages */}
            <ScrollArea className="flex-1 px-3 sm:px-4 py-3">
              <div className="max-w-2xl mx-auto space-y-4">
                {conversationMessages.length === 0 && assistantState === 'idle' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-8 sm:py-12 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 shadow-[0_0_24px_rgba(245,158,11,0.15)]">
                      <Sparkles className="h-8 w-8 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-200 mb-1">Fred — Voice Assistant</h3>
                    <p className="text-sm text-gray-500 max-w-sm mb-3">
                      Active &quot;Always Listening&quot; et dis <span className="text-amber-400 font-semibold">&quot;Fred&quot;</span> pour m&apos;activer. Je répondrai avec la voix Jarvis.
                    </p>
                    <p className="text-xs text-gray-600">
                      Ou clique le micro pour parler directement.
                    </p>
                  </motion.div>
                )}

                {conversationMessages.map((msg) => (
                  <VoiceMessageBubble
                    key={msg.id}
                    message={msg}
                    onPlay={handlePlayMessage}
                    isPlaying={isPlaying === msg.id}
                  />
                ))}

                {/* Processing indicator */}
                <AnimatePresence>
                  {assistantState === 'processing' && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
                      </div>
                      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-1.5">
                        <motion.div
                          className="w-2 h-2 bg-amber-400 rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-amber-400 rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-amber-400 rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={conversationEndRef} />
              </div>
            </ScrollArea>

            {/* Mic control area */}
            <div className="px-3 sm:px-4 py-3 border-t border-white/5 bg-gray-950/30">
              <div className="flex items-center gap-4 justify-center">
                {/* Mic button */}
                <div className="relative flex items-center justify-center">
                  {/* Pulse animations when listening / wake-word */}
                  {(assistantState === 'listening' || assistantState === 'wake-word') && (
                    <>
                      <motion.div
                        className="absolute w-20 h-20 rounded-full border-2 border-cyan-400/20"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute w-20 h-20 rounded-full border border-cyan-400/10"
                        animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      />
                    </>
                  )}

                  {/* Speaking animation */}
                  {assistantState === 'speaking' && (
                    <motion.div
                      className="absolute w-20 h-20 rounded-full"
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(16,185,129,0.1)',
                          '0 0 40px rgba(16,185,129,0.2)',
                          '0 0 20px rgba(16,185,129,0.1)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={assistantPushToTalk}
                    disabled={assistantState === 'processing' || assistantState === 'speaking'}
                    className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                      assistantState === 'wake-word'
                        ? 'bg-amber-500/20 border-2 border-amber-400/50 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                        : assistantState === 'listening'
                        ? 'bg-cyan-500/20 border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                        : assistantState === 'speaking'
                        ? 'bg-emerald-500/20 border-2 border-emerald-400/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                        : assistantState === 'processing'
                        ? 'bg-amber-500/15 border-2 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                        : micPermission === 'denied'
                        ? 'bg-red-500/15 border-2 border-red-500/30'
                        : 'bg-gray-800/80 border-2 border-white/10 hover:border-amber-500/30 hover:bg-amber-500/10'
                    }`}
                  >
                    {assistantState === 'processing' ? (
                      <Loader2 className="h-7 w-7 text-amber-400 animate-spin" />
                    ) : assistantState === 'speaking' ? (
                      <Volume2 className="h-7 w-7 text-emerald-400" />
                    ) : assistantState === 'wake-word' ? (
                      <Ear className="h-7 w-7 text-amber-400" />
                    ) : assistantState === 'listening' ? (
                      <Ear className="h-7 w-7 text-cyan-400" />
                    ) : micPermission === 'denied' ? (
                      <AlertCircle className="h-7 w-7 text-red-400" />
                    ) : (
                      <Mic className="h-7 w-7 text-gray-300" />
                    )}
                  </motion.button>
                </div>

                {/* State label */}
                <div className="flex items-center gap-2">
                  <StateIcon className={`h-4 w-4 ${stateInfo.color} ${assistantState === 'processing' ? 'animate-spin' : ''}`} />
                  <span className={`text-sm font-medium ${stateInfo.color}`}>
                    {stateInfo.label}
                  </span>
                  {(assistantState === 'listening' || assistantState === 'wake-word') && (
                    <Radio className="h-3 w-3 text-red-400 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Audio level bar when listening */}
              {(assistantState === 'listening' || assistantState === 'wake-word' || assistantState === 'speaking') && (
                <div className="mt-3 flex items-center gap-2 max-w-md mx-auto">
                  <span className="text-[10px] text-gray-600 w-12">
                    {assistantState === 'speaking' ? 'Output' : 'Level'}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        assistantState === 'speaking'
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                          : assistantState === 'wake-word'
                          ? 'bg-gradient-to-r from-amber-500 to-cyan-500'
                          : 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                      }`}
                      style={{ width: `${audioLevel}%` }}
                      transition={{ duration: 0.05 }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-600 w-8 text-right">{Math.round(audioLevel)}%</span>
                </div>
              )}

              {/* Text input as alternative */}
              <div className="mt-3 flex items-center gap-2 max-w-lg mx-auto">
                <input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendTextToAssistant()
                    }
                  }}
                  placeholder="Ou tape un message..."
                  disabled={assistantState === 'processing' || assistantState === 'speaking'}
                  className="flex-1 h-9 bg-gray-900/80 border border-white/10 rounded-lg px-3 text-sm text-gray-200 placeholder:text-gray-600 focus:border-amber-500/50 focus:outline-none disabled:opacity-50"
                />
                <Button
                  onClick={sendTextToAssistant}
                  disabled={!textInput.trim() || assistantState === 'processing' || assistantState === 'speaking'}
                  className="h-9 px-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 disabled:opacity-30"
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Transcription Mode ──────────────────────────────────────────── */}
      {voiceMode === 'transcription' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
          {/* Microphone button area */}
          <div className="relative flex items-center justify-center mb-6">
            {isRecording && (
              <motion.div
                className="absolute w-40 h-40 rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(6,182,212,0.1)',
                    '0 0 40px rgba(6,182,212,0.2)',
                    '0 0 20px rgba(6,182,212,0.1)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            <AudioLevelRing level={audioLevel} isActive={isRecording} state={isRecording ? 'listening' : 'idle'} />

            {isRecording && (
              <>
                <motion.div
                  className="absolute w-32 h-32 rounded-full border-2 border-cyan-400/20"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute w-32 h-32 rounded-full border border-cyan-400/10"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
              </>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => isRecording ? stopRecording() : startRecording()}
              disabled={isTranscribing}
              className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording
                  ? 'bg-cyan-500/20 border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                  : micPermission === 'denied'
                  ? 'bg-red-500/15 border-2 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                  : 'bg-gray-800/80 border-2 border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
              }`}
            >
              {isTranscribing ? (
                <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-10 w-10 text-cyan-400" />
              ) : micPermission === 'denied' ? (
                <AlertCircle className="h-10 w-10 text-red-400" />
              ) : (
                <Mic className="h-10 w-10 text-gray-300" />
              )}
            </motion.button>
          </div>

          {/* Status text */}
          <div className="text-center mb-4">
            {isRecording ? (
              <div className="flex items-center justify-center gap-2">
                <Radio className="h-4 w-4 text-red-400 animate-pulse" />
                <span className="text-sm text-cyan-400 font-medium">Recording... {formatDuration(recordingDuration)}</span>
              </div>
            ) : isTranscribing ? (
              <span className="text-sm text-amber-400 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transcribing...
              </span>
            ) : (
              <span className="text-sm text-gray-500">Click to start recording</span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2 max-w-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Transcriptions list */}
          {transcriptions.length > 0 && (
            <div className="w-full max-w-lg space-y-3 mt-4">
              <Separator className="bg-white/5" />
              <h3 className="text-xs text-gray-500 uppercase tracking-wider">Transcriptions</h3>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {transcriptions.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-start justify-between gap-2 group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-200 break-words">{t.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-600">
                          {t.timestamp.toLocaleTimeString()}
                        </span>
                        {t.duration > 0 && (
                          <span className="text-[10px] text-gray-600">
                            {formatDuration(t.duration)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(t.text, t.id)}
                      className="flex-shrink-0 p-1 rounded text-gray-600 hover:text-cyan-400 hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {copiedId === t.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error bar for assistant mode */}
      {voiceMode === 'assistant' && error && (
        <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
