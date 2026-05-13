'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Wifi,
  WifiOff,
  Languages,
  Copy,
  Check,
  Loader2,
  Radio,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptionEntry {
  id: string
  text: string
  timestamp: Date
  duration: number
}

// ─── Audio Level Ring ─────────────────────────────────────────────────────────

function AudioLevelRing({
  level,
  isRecording,
}: {
  level: number
  isRecording: boolean
}) {
  const radius = 72
  const strokeWidth = 4
  const normalizedLevel = Math.min(level / 100, 1)
  const circumference = 2 * Math.PI * radius
  const filledLength = circumference * normalizedLevel

  return (
    <svg
      width={(radius + strokeWidth) * 2}
      height={(radius + strokeWidth) * 2}
      className="absolute inset-0 -rotate-90"
    >
      {/* Background ring */}
      <circle
        cx={radius + strokeWidth}
        cy={radius + strokeWidth}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={strokeWidth}
      />
      {/* Active level ring */}
      <circle
        cx={radius + strokeWidth}
        cy={radius + strokeWidth}
        r={radius}
        fill="none"
        stroke={isRecording ? 'rgba(6,182,212,0.6)' : 'rgba(6,182,212,0.15)'}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - filledLength}
        strokeLinecap="round"
        className="transition-all duration-75"
      />
      {/* Glow ring when recording */}
      {isRecording && (
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="rgba(6,182,212,0.2)"
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
  isRecording,
}: {
  analyser: AnalyserNode | null
  isRecording: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    if (!canvasRef.current || !analyser || !isRecording) return

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
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)'
      ctx.shadowColor = 'rgba(6, 182, 212, 0.4)'
      ctx.shadowBlur = 8
      ctx.beginPath()

      const sliceWidth = width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
        x += sliceWidth
      }

      ctx.lineTo(width, height / 2)
      ctx.stroke()
    }

    draw()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [analyser, isRecording])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-20 rounded-lg opacity-80"
      style={{ display: isRecording ? 'block' : 'none' }}
    />
  )
}

// ─── Main VoiceModule ─────────────────────────────────────────────────────────

export default function VoiceModule() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const levelAnimRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Check mic permission on mount ─────────────────────────────────────────

  useEffect(() => {
    async function checkPermission() {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setMicPermission(result.state as 'granted' | 'denied' | 'prompt')
        result.onchange = () => {
          setMicPermission(result.state as 'granted' | 'denied' | 'prompt')
        }
      } catch {
        // permissions query may not be supported
        setMicPermission('prompt')
      }
    }
    checkPermission()
  }, [])

  // ── Monitor audio levels ──────────────────────────────────────────────────

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

  // ── Start recording ───────────────────────────────────────────────────────

  const startRecording = async () => {
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

      // Set up audio context and analyser
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(blob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setMicPermission('granted')
      setConnectionStatus('connected')

      // Start level monitoring
      startLevelMonitoring(analyser)

      // Start timer
      setRecordingDuration(0)
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Failed to start recording:', err)
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setMicPermission('denied')
        setError('Microphone access denied. Please allow microphone access in your browser settings.')
      } else {
        setError('Failed to access microphone. Please check your device.')
      }
    }
  }

  // ── Stop recording ────────────────────────────────────────────────────────

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    stopLevelMonitoring()
    setIsRecording(false)
    setConnectionStatus('disconnected')

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // ── Transcribe audio ──────────────────────────────────────────────────────

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true)
    setError(null)

    try {
      // Convert blob to base64
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

  // ── Toggle recording ──────────────────────────────────────────────────────

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // ── Send transcription to chat ────────────────────────────────────────────

  const sendToChat = async (text: string) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          systemPrompt: 'You are a helpful AI assistant.',
        }),
      })

      if (!res.ok) throw new Error('Failed to send to chat')

      // The chat API will handle it — we could show a toast
    } catch (err) {
      console.error('Send to chat error:', err)
      setError('Failed to send transcription to chat')
    }
  }

  // ── Copy transcription ────────────────────────────────────────────────────

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Format duration ───────────────────────────────────────────────────────

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      stopLevelMonitoring()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [stopLevelMonitoring])

  return (
    <div className="flex flex-col h-full w-full bg-gray-950/80 rounded-xl overflow-hidden border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gray-950/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-medium text-gray-200">Voice Interaction</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            {connectionStatus === 'connected' ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-gray-600" />
            )}
            <span className="text-[10px] text-gray-500">
              {connectionStatus === 'connected' ? 'Connected' : 'Idle'}
            </span>
          </div>

          {/* Language selector */}
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="h-7 w-[80px] bg-gray-900/50 border-white/10 text-xs text-gray-400">
              <Languages className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10">
              <SelectItem value="en" className="text-gray-200 text-xs">English</SelectItem>
              <SelectItem value="zh" className="text-gray-200 text-xs">中文</SelectItem>
              <SelectItem value="ja" className="text-gray-200 text-xs">日本語</SelectItem>
              <SelectItem value="ko" className="text-gray-200 text-xs">한국어</SelectItem>
              <SelectItem value="es" className="text-gray-200 text-xs">Español</SelectItem>
              <SelectItem value="fr" className="text-gray-200 text-xs">Français</SelectItem>
              <SelectItem value="de" className="text-gray-200 text-xs">Deutsch</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
            VOICE
          </Badge>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        {/* Microphone button area */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Outer glow ring */}
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

          {/* Audio level ring */}
          <AudioLevelRing level={audioLevel} isRecording={isRecording} />

          {/* Pulse animation when recording */}
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

          {/* Main mic button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleRecording}
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
          <WaveformVisualizer analyser={analyserRef.current} isRecording={isRecording} />

          {/* Audio level bar */}
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
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => sendToChat(entry.text)}
                                    className="h-7 w-7 p-0 text-gray-500 hover:text-emerald-400 hover:bg-white/5"
                                  >
                                    <Send className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send to chat</TooltipContent>
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
              <Volume2 className="h-6 w-6 text-cyan-400/60" />
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              Record your voice and get instant transcriptions powered by AI.
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 border-t border-white/5 bg-gray-950/40 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-3 text-[10px] text-gray-600">
          <span>Web Audio API</span>
          <span>•</span>
          <span>ASR Transcription</span>
          <span>•</span>
          <span className={micPermission === 'granted' ? 'text-emerald-500' : micPermission === 'denied' ? 'text-red-500' : 'text-yellow-500'}>
            Mic: {micPermission}
          </span>
        </div>
      </div>
    </div>
  )
}
