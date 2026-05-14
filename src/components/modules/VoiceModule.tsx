'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Volume2,
  Wifi,
  WifiOff,
  Languages,
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

// ─── Types ────────────────────────────────────────────────────────────────────

type VoiceMode = 'transcription' | 'assistant'
type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking'

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

// ─── Available Models (shared with ChatModule) ────────────────────────────────

const AVAILABLE_MODELS = [
  { id: '', name: 'Z-AI (Default)', provider: 'Built-in', emoji: '✨' },
  { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'Mistral', emoji: '🌊' },
  { id: 'mistral-small-latest', name: 'Mistral Small', provider: 'Mistral', emoji: '💧' },
  { id: 'open-mistral-nemo', name: 'Mistral Nemo', provider: 'Mistral', emoji: '🔹' },
  { id: 'codestral-latest', name: 'Codestral', provider: 'Mistral', emoji: '💻' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', emoji: '🧠' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', emoji: '⚡' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', emoji: '🎭' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', emoji: '🔍' },
]

// ─── Available Languages ──────────────────────────────────────────────────────

const AVAILABLE_LANGUAGES = [
  { id: 'fr', name: 'Français', flag: '🇫🇷' },
  { id: 'en', name: 'English', flag: '🇬🇧' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
  { id: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { id: 'it', name: 'Italiano', flag: '🇮🇹' },
  { id: 'pt', name: 'Português', flag: '🇵🇹' },
  { id: 'ar', name: 'العربية', flag: '🇸🇦' },
  { id: 'zh', name: '中文', flag: '🇨🇳' },
  { id: 'ja', name: '日本語', flag: '🇯🇵' },
  { id: 'ko', name: '한국어', flag: '🇰🇷' },
  { id: 'ru', name: 'Русский', flag: '🇷🇺' },
  { id: 'nl', name: 'Nederlands', flag: '🇳🇱' },
]

// ─── Audio Level Ring ─────────────────────────────────────────────────────────

function AudioLevelRing({
  level,
  isActive,
  state,
  size = 152,
}: {
  level: number
  isActive: boolean
  state: AssistantState
  size?: number
}) {
  const radius = (size - 8) / 2
  const strokeWidth = 4
  const normalizedLevel = Math.min(level / 100, 1)
  const circumference = 2 * Math.PI * radius
  const filledLength = circumference * normalizedLevel

  const getColor = () => {
    if (state === 'speaking') return 'rgba(16, 185, 129, 0.6)'
    if (state === 'processing') return 'rgba(245, 158, 11, 0.6)'
    if (state === 'listening') return 'rgba(6, 182, 212, 0.6)'
    return 'rgba(6, 182, 212, 0.15)'
  }

  const getGlowColor = () => {
    if (state === 'speaking') return 'rgba(16, 185, 129, 0.2)'
    if (state === 'processing') return 'rgba(245, 158, 11, 0.2)'
    return 'rgba(6, 182, 212, 0.2)'
  }

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0 -rotate-90 pointer-events-none"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
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
          cx={size / 2}
          cy={size / 2}
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
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Bot className="h-4 w-4 text-cyan-400" />
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
              className="mt-2 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
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
  const { isVoiceActive, setVoiceActive, selectedModel, setSelectedModel, selectedLanguage, setSelectedLanguage } = useAIOSStore()

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
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Assistant mode state
  const [conversationMessages, setConversationMessages] = useState<VoiceMessage[]>([])
  const [textInput, setTextInput] = useState('')
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState('tongtong')

  // Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const levelAnimRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceStartRef = useRef<number>(0)
  const conversationEndRef = useRef<HTMLDivElement>(null)
  const isListeningLoopRef = useRef(false)

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

  // ── Silence detection for always-listening ────────────────────────────

  const startSilenceDetection = useCallback((analyser: AnalyserNode) => {
    const SILENCE_THRESHOLD = 8
    const SILENCE_DURATION = 2000
    const MIN_SPEECH_DURATION = 1000
    const recordingStartTime = Date.now()

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let isSpeaking = false

    const checkSilence = () => {
      if (!isListeningLoopRef.current) return

      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length

      if (avg > SILENCE_THRESHOLD) {
        isSpeaking = true
        silenceStartRef.current = 0
      } else if (isSpeaking) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now()
        } else if (
          Date.now() - silenceStartRef.current > SILENCE_DURATION &&
          Date.now() - recordingStartTime > MIN_SPEECH_DURATION
        ) {
          silenceStartRef.current = 0
          isSpeaking = false
          handleRecordingComplete()
          return
        }
      }

      requestAnimationFrame(checkSilence)
    }

    checkSilence()
  }, [])

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

  // ── Start always-listening loop ───────────────────────────────────────

  const startListeningLoop = useCallback(async () => {
    if (isListeningLoopRef.current) return
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

    startSilenceDetection(result.analyser)
  }, [startMicrophone, startSilenceDetection])

  // ── Handle recording complete (silence detected) ──────────────────────

  const handleRecordingComplete = useCallback(async () => {
    if (!isListeningLoopRef.current) return

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopLevelMonitoring()

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    chunksRef.current = []

    if (blob.size < 1000) {
      restartListening()
      return
    }

    setAssistantState('processing')

    try {
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const dataUrl = reader.result as string
          const base64 = dataUrl.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(blob)
      const audioBase64 = await base64Promise

      const recentMessages = conversationMessages.slice(-10).map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

      const res = await fetch('/api/voice/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          messages: recentMessages,
          model: selectedModel || undefined,
          generateSpeech: true,
          voice: selectedVoice,
          language: selectedLanguage,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Assistant request failed')
      }

      const data = await res.json()

      if (data.transcription && data.transcription.trim()) {
        const userMsg: VoiceMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: data.transcription,
          timestamp: new Date(),
        }
        setConversationMessages((prev) => [...prev, userMsg])

        if (data.response) {
          let audioUrl: string | undefined
          if (data.audioBase64) {
            try {
              const binaryString = atob(data.audioBase64)
              const bytes = new Uint8Array(binaryString.length)
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
              }
              const mimeType = data.audioFormat === 'wav' ? 'audio/wav' : data.audioFormat === 'mp3' ? 'audio/mp3' : 'audio/wav'
              const audioBlob = new Blob([bytes], { type: mimeType })
              audioUrl = URL.createObjectURL(audioBlob)
            } catch {
              console.warn('Failed to decode TTS audio')
            }
          }

          const assistantMsg: VoiceMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            audioUrl,
          }
          setConversationMessages((prev) => [...prev, assistantMsg])

          if (audioUrl) {
            await playAudio(audioUrl, assistantMsg.id)
          }
        }
      }
    } catch (err) {
      console.error('Voice assistant error:', err)
      setError(err instanceof Error ? err.message : 'Voice assistant error')
    }

    if (isListeningLoopRef.current && isAlwaysListening) {
      restartListening()
    } else {
      setAssistantState('idle')
      isListeningLoopRef.current = false
    }
  }, [conversationMessages, selectedModel, selectedVoice, selectedLanguage, isAlwaysListening, stopLevelMonitoring])

  // ── Restart listening after response ──────────────────────────────────

  const restartListening = useCallback(() => {
    if (!isListeningLoopRef.current) return

    setAssistantState('listening')

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
        startSilenceDetection(analyserRef.current)
      }
    } else {
      startListeningLoop()
    }
  }, [startLevelMonitoring, startSilenceDetection, startListeningLoop])

  // ── Play audio ────────────────────────────────────────────────────────

  const playAudio = async (url: string, messageId: string) => {
    return new Promise<void>((resolve) => {
      setAssistantState('speaking')
      setIsPlaying(messageId)

      const audio = new Audio(url)
      audioPlayerRef.current = audio

      audio.onended = () => {
        setAssistantState('idle')
        setIsPlaying(null)
        audioPlayerRef.current = null
        resolve()
      }

      audio.onerror = () => {
        setAssistantState('idle')
        setIsPlaying(null)
        audioPlayerRef.current = null
        resolve()
      }

      audio.play().catch(() => {
        setAssistantState('idle')
        setIsPlaying(null)
        audioPlayerRef.current = null
        resolve()
      })
    })
  }

  // ── Handle play message audio ─────────────────────────────────────────

  const handlePlayMessage = useCallback((msg: VoiceMessage) => {
    if (isPlaying === msg.id && audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      setIsPlaying(null)
      audioPlayerRef.current = null
      return
    }

    if (msg.audioUrl) {
      playAudio(msg.audioUrl, msg.id)
    }
  }, [isPlaying])

  // ── Transcribe audio (transcription mode) ─────────────────────────────

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true)
    setError(null)

    try {
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const dataUrl = reader.result as string
          const base64 = dataUrl.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
      })

      reader.readAsDataURL(blob)
      const audioBase64 = await base64Promise

      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, language: selectedLanguage }),
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

    const userMsg: VoiceMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setConversationMessages((prev) => [...prev, userMsg])

    try {
      const recentMessages = conversationMessages.slice(-10).map((m) => ({
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
          language: selectedLanguage,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Assistant request failed')
      }

      const data = await res.json()

      if (data.response) {
        let audioUrl: string | undefined
        if (data.audioBase64) {
          try {
            const binaryString = atob(data.audioBase64)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            const mimeType = data.audioFormat === 'wav' ? 'audio/wav' : data.audioFormat === 'mp3' ? 'audio/mp3' : 'audio/wav'
            const audioBlob = new Blob([bytes], { type: mimeType })
            audioUrl = URL.createObjectURL(audioBlob)
          } catch {
            console.warn('Failed to decode TTS audio')
          }
        }

        const assistantMsg: VoiceMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          audioUrl,
        }
        setConversationMessages((prev) => [...prev, assistantMsg])

        if (audioUrl) {
          await playAudio(audioUrl, assistantMsg.id)
        }
      }
    } catch (err) {
      console.error('Text assistant error:', err)
      setError(err instanceof Error ? err.message : 'Failed to get response')
    } finally {
      if (assistantState !== 'speaking') {
        setAssistantState(isAlwaysListening && isListeningLoopRef.current ? 'listening' : 'idle')
      }
    }
  }

  // ── Toggle always-listening ───────────────────────────────────────────

  const toggleAlwaysListening = useCallback(async () => {
    if (isAlwaysListening) {
      isListeningLoopRef.current = false
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
      setIsAlwaysListening(true)
      setVoiceActive(true)
      await startListeningLoop()
    }
  }, [isAlwaysListening, stopMicrophone, startListeningLoop, setVoiceActive])

  // ── Single push-to-talk for assistant mode ────────────────────────────

  const assistantPushToTalk = async () => {
    if (assistantState === 'listening') {
      handleRecordingComplete()
    } else if (assistantState === 'idle') {
      isListeningLoopRef.current = true
      await startListeningLoop()
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      stopLevelMonitoring()
      if (timerRef.current) clearInterval(timerRef.current)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
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
      setIsAlwaysListening(false)
      setAssistantState('idle')
      stopMicrophone()
    }
  }, [isVoiceActive, isAlwaysListening, stopMicrophone])

  // ── Get state color and label ─────────────────────────────────────────

  const getStateInfo = () => {
    switch (assistantState) {
      case 'listening':
        return { color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Listening...', icon: Ear }
      case 'processing':
        return { color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Thinking...', icon: Loader2 }
      case 'speaking':
        return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Speaking...', icon: Volume2 }
      default:
        return { color: 'text-gray-400', bg: 'bg-gray-800/80', label: 'Ready', icon: Mic }
    }
  }

  const stateInfo = getStateInfo()
  const StateIcon = stateInfo.icon

  // Ring size for transcription mode
  const RING_SIZE = 152

  return (
    <div className="flex flex-col h-full w-full bg-gray-950/80 rounded-xl overflow-hidden border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gray-950/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-medium text-gray-200">Voice Assistant</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1">
            <button
              onClick={() => setVoiceMode('assistant')}
              className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                voiceMode === 'assistant'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 inline mr-1" />
              Assistant
            </button>
            <button
              onClick={() => setVoiceMode('transcription')}
              className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                voiceMode === 'transcription'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Mic className="h-3.5 w-3.5 inline mr-1" />
              Transcribe
            </button>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            {connectionStatus === 'connected' || assistantState !== 'idle' ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-gray-600" />
            )}
            <span className="text-[10px] text-gray-500">
              {assistantState !== 'idle' ? 'Active' : 'Idle'}
            </span>
          </div>

          <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
            VOICE
          </Badge>
        </div>
      </div>

      {/* ─── Assistant Mode ──────────────────────────────────────────────── */}
      {voiceMode === 'assistant' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Control bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-gray-950/30 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {/* Always-listening toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={isAlwaysListening}
                  onCheckedChange={toggleAlwaysListening}
                  className="data-[state=checked]:bg-cyan-500"
                />
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Ear className="h-3 w-3" />
                  Always Listening
                </span>
              </div>

              {/* Language selector */}
              <div className="flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-gray-500" />
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="h-7 w-[110px] bg-gray-900/50 border-white/10 text-xs text-gray-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10">
                    {AVAILABLE_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id} className="text-gray-200 text-xs">
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Model selector */}
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-gray-500" />
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-gray-900/50 border border-white/10 text-[11px] text-gray-400 rounded-md px-2 py-1 h-7 outline-none cursor-pointer hover:border-cyan-500/30 focus:border-cyan-500/50 transition-colors"
                >
                  {AVAILABLE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice selector */}
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="h-7 w-[100px] bg-gray-900/50 border-white/10 text-xs text-gray-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="tongtong" className="text-gray-200 text-xs">Tongtong</SelectItem>
                  <SelectItem value="xiaoyi" className="text-gray-200 text-xs">Xiaoyi</SelectItem>
                  <SelectItem value="xiaomei" className="text-gray-200 text-xs">Xiaomei</SelectItem>
                  <SelectItem value="xiaomo" className="text-gray-200 text-xs">Xiaomo</SelectItem>
                  <SelectItem value="xiaoxuan" className="text-gray-200 text-xs">Xiaoxuan</SelectItem>
                  <SelectItem value="xiaorui" className="text-gray-200 text-xs">Xiaorui</SelectItem>
                  <SelectItem value="xiaoshuang" className="text-gray-200 text-xs">Xiaoshuang</SelectItem>
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
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="max-w-2xl mx-auto space-y-4">
                {conversationMessages.length === 0 && assistantState === 'idle' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 shadow-[0_0_24px_rgba(6,182,212,0.15)]">
                      <Sparkles className="h-8 w-8 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-200 mb-1">Voice Assistant</h3>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Toggle &quot;Always Listening&quot; for hands-free conversation, or press the mic to talk.
                      I&apos;ll listen, think, and respond with voice.
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
            <div className="px-4 py-3 border-t border-white/5 bg-gray-950/30">
              <div className="flex items-center gap-4 justify-center">
                {/* Mic button with proper centering */}
                <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
                  {/* Pulse animations when listening */}
                  {assistantState === 'listening' && (
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
                      assistantState === 'listening'
                        ? 'bg-cyan-500/20 border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                        : assistantState === 'speaking'
                        ? 'bg-emerald-500/20 border-2 border-emerald-400/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                        : assistantState === 'processing'
                        ? 'bg-amber-500/15 border-2 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                        : micPermission === 'denied'
                        ? 'bg-red-500/15 border-2 border-red-500/30'
                        : 'bg-gray-800/80 border-2 border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/10'
                    }`}
                  >
                    {assistantState === 'processing' ? (
                      <Loader2 className="h-7 w-7 text-amber-400 animate-spin" />
                    ) : assistantState === 'speaking' ? (
                      <Volume2 className="h-7 w-7 text-emerald-400" />
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
                  {assistantState === 'listening' && (
                    <Radio className="h-3 w-3 text-red-400 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Audio level bar when listening */}
              {(assistantState === 'listening' || assistantState === 'speaking') && (
                <div className="mt-3 flex items-center gap-2 max-w-md mx-auto">
                  <span className="text-[10px] text-gray-600 w-12">
                    {assistantState === 'speaking' ? 'Output' : 'Level'}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        assistantState === 'speaking'
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
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
                  placeholder="Or type a message..."
                  disabled={assistantState === 'processing' || assistantState === 'speaking'}
                  className="flex-1 h-9 bg-gray-900/80 border border-white/10 rounded-lg px-3 text-sm text-gray-200 placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none disabled:opacity-50"
                />
                <Button
                  onClick={sendTextToAssistant}
                  disabled={!textInput.trim() || assistantState === 'processing' || assistantState === 'speaking'}
                  className="h-9 px-3 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30"
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
        <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
          {/* Language selector */}
          <div className="w-full max-w-md mb-4 flex items-center justify-center gap-2">
            <Languages className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-500">Language:</span>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="h-7 w-[130px] bg-gray-900/50 border-white/10 text-xs text-gray-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10">
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id} className="text-gray-200 text-xs">
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Microphone button area - properly centered */}
          <div
            className="relative flex items-center justify-center mb-6"
            style={{ width: RING_SIZE, height: RING_SIZE }}
          >
            {isRecording && (
              <motion.div
                className="absolute rounded-full"
                style={{ width: RING_SIZE, height: RING_SIZE }}
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

            <AudioLevelRing level={audioLevel} isActive={isRecording} state={isRecording ? 'listening' : 'idle'} size={RING_SIZE} />

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
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Radio className="h-3 w-3 text-red-400 animate-pulse" />
                <span className="text-sm text-cyan-400 font-medium">Recording</span>
                <span className="text-sm text-gray-500 font-mono">{formatDuration(recordingDuration)}</span>
              </motion.div>
            ) : isTranscribing ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="h-3 w-3 text-cyan-400 animate-spin" />
                <span className="text-sm text-cyan-400">Transcribing...</span>
              </motion.div>
            ) : micPermission === 'denied' ? (
              <p className="text-sm text-red-400">Microphone access denied</p>
            ) : (
              <p className="text-sm text-gray-500">Click the microphone to start recording</p>
            )}
          </div>

          {/* Waveform visualization */}
          <div className="w-full max-w-md mb-6">
            <WaveformVisualizer analyser={analyserRef.current} isActive={isRecording} />
            {isRecording && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] text-gray-600 w-8">Level</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                    style={{ width: `${audioLevel}%` }}
                    transition={{ duration: 0.05 }}
                  />
                </div>
                <span className="text-[10px] text-gray-600 w-8 text-right">{Math.round(audioLevel)}%</span>
              </div>
            )}
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="w-full max-w-md mb-4"
              >
                <Card className="bg-red-500/10 border-red-500/30">
                  <CardContent className="py-2 px-3">
                    <p className="text-xs text-red-400">{error}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transcriptions list */}
          {transcriptions.length > 0 && (
            <div className="w-full max-w-md mt-2">
              <Separator className="bg-white/5 mb-4" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Transcriptions</h3>
                <Badge variant="outline" className="text-[10px] border-white/10 text-gray-500">
                  {transcriptions.length}
                </Badge>
              </div>
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {transcriptions.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-colors">
                        <CardContent className="py-2.5 px-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-200 break-words">{entry.text}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-gray-600">
                                  {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {entry.duration > 0 && (
                                  <span className="text-[10px] text-gray-600">
                                    {formatDuration(entry.duration)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopy(entry.text, entry.id)}
                                      className="h-7 w-7 p-0 text-gray-500 hover:text-cyan-400 hover:bg-white/5"
                                    >
                                      {copiedId === entry.id ? (
                                        <Check className="h-3 w-3" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Empty state */}
          {transcriptions.length === 0 && !isRecording && !isTranscribing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                <Mic className="h-6 w-6 text-cyan-400/60" />
              </div>
              <p className="text-sm text-gray-500 max-w-xs">
                Record your voice and get instant transcriptions powered by AI.
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Footer info */}
      <div className="px-4 py-2 border-t border-white/5 bg-gray-950/40 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-3 text-[10px] text-gray-600">
          {voiceMode === 'assistant' ? (
            <>
              <span>Voice Assistant</span>
              <span>•</span>
              <span>ASR + LLM + TTS</span>
              <span>•</span>
              <span className={isAlwaysListening ? 'text-cyan-500' : 'text-gray-600'}>
                {isAlwaysListening ? '🔊 Always On' : '🔇 Manual'}
              </span>
              <span>•</span>
              <span className="text-gray-500">
                {AVAILABLE_LANGUAGES.find(l => l.id === selectedLanguage)?.flag} {AVAILABLE_LANGUAGES.find(l => l.id === selectedLanguage)?.name}
              </span>
            </>
          ) : (
            <>
              <span>Web Audio API</span>
              <span>•</span>
              <span>ASR Transcription</span>
              <span>•</span>
              <span className={micPermission === 'granted' ? 'text-emerald-500' : micPermission === 'denied' ? 'text-red-500' : 'text-yellow-500'}>
                Mic: {micPermission}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
