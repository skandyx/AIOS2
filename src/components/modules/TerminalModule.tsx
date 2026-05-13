'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Terminal,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

interface TerminalLine {
  id: string
  type: 'input' | 'output' | 'error' | 'system' | 'success'
  content: string
  timestamp: Date
}

const COMMANDS = [
  { cmd: 'help', desc: 'Show available commands' },
  { cmd: 'status', desc: 'System status overview' },
  { cmd: 'agents', desc: 'List active agents' },
  { cmd: 'tasks', desc: 'List current tasks' },
  { cmd: 'memory', desc: 'List stored memories' },
  { cmd: 'clear', desc: 'Clear terminal output' },
  { cmd: 'run <task>', desc: 'Create and run a task' },
  { cmd: 'chat <message>', desc: 'Send message to AI' },
  { cmd: 'scan', desc: 'Run security scan' },
]

const WELCOME_LINES: TerminalLine[] = [
  {
    id: 'welcome-1',
    type: 'system',
    content: '╔══════════════════════════════════════════╗',
    timestamp: new Date(),
  },
  {
    id: 'welcome-2',
    type: 'system',
    content: '║   Z.ai OS Terminal v1.0.0               ║',
    timestamp: new Date(),
  },
  {
    id: 'welcome-3',
    type: 'system',
    content: '║   Type "help" for available commands     ║',
    timestamp: new Date(),
  },
  {
    id: 'welcome-4',
    type: 'system',
    content: '╚══════════════════════════════════════════╝',
    timestamp: new Date(),
  },
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function formatTimestamp(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function TerminalModule() {
  const [lines, setLines] = useState<TerminalLine[]>(WELCOME_LINES)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [lines, scrollToBottom])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setLines(prev => [...prev, { id: generateId(), type, content, timestamp: new Date() }])
  }, [])

  const processCommand = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) return

    addLine('input', trimmed)
    setHistory(prev => [...prev, trimmed])
    setHistoryIndex(-1)
    setIsProcessing(true)

    const parts = trimmed.split(' ')
    const command = parts[0].toLowerCase()
    const args = parts.slice(1).join(' ')

    // Small delay for realistic feel
    await new Promise(r => setTimeout(r, 150))

    switch (command) {
      case 'help':
        addLine('system', 'Available Commands:')
        addLine('system', '─────────────────────────────────')
        COMMANDS.forEach(c => {
          addLine('output', `  ${c.cmd.padEnd(16)} ${c.desc}`)
        })
        addLine('system', '─────────────────────────────────')
        break

      case 'status':
        addLine('system', '┌── System Status ──────────────┐')
        addLine('success', '│ ● Core Engine:     Online     │')
        addLine('success', '│ ● Memory Store:    Active     │')
        addLine('success', '│ ● Agent Pool:      6 Active   │')
        addLine('output',  '│ ○ Ollama Local:    Standby    │')
        addLine('success', '│ ● WebSocket:       Connected  │')
        addLine('output',  '│ ○ GPU Usage:       12%        │')
        addLine('output',  '│ ○ Memory Usage:    342 MB     │')
        addLine('system', '└───────────────────────────────┘')
        break

      case 'agents':
        addLine('system', '┌── Active Agents ──────────────┐')
        addLine('success', '│ ● Coordinator   [idle]        │')
        addLine('success', '│ ● Developer     [active]      │')
        addLine('success', '│ ● Security      [monitoring]  │')
        addLine('output',  '│ ○ Debugger      [standby]     │')
        addLine('success', '│ ● Research      [active]      │')
        addLine('output',  '│ ○ Memory Mgmt   [idle]        │')
        addLine('system', '└───────────────────────────────┘')
        break

      case 'tasks':
        addLine('system', '┌── Current Tasks ──────────────┐')
        addLine('output',  '│ #1  Code review       [67%]   │')
        addLine('success', '│ #2  API integration   [done]  │')
        addLine('output',  '│ #3  Data migration    [23%]   │')
        addLine('error',   '│ #4  Deploy staging    [fail]  │')
        addLine('output',  '│ #5  Security audit    [pend]  │')
        addLine('system', '└───────────────────────────────┘')
        break

      case 'memory':
        addLine('system', '┌── Memory Store ───────────────┐')
        addLine('output',  '│ Short-term:    24 entries      │')
        addLine('output',  '│ Long-term:     156 entries     │')
        addLine('output',  '│ Contextual:    8 entries       │')
        addLine('output',  '│ Procedural:    42 entries      │')
        addLine('output',  '│ Total size:    12.4 MB        │')
        addLine('system', '└───────────────────────────────┘')
        break

      case 'clear':
        setLines([])
        break

      case 'run':
        if (!args) {
          addLine('error', 'Error: Missing task name. Usage: run <task>')
        } else {
          addLine('system', `Creating task: "${args}"`)
          await new Promise(r => setTimeout(r, 500))
          addLine('success', `Task created successfully [ID: ${generateId()}]`)
          addLine('output', `Assigning to: Coordinator Agent`)
          addLine('output', `Status: Pending execution`)
        }
        break

      case 'chat':
        if (!args) {
          addLine('error', 'Error: Missing message. Usage: chat <message>')
        } else {
          addLine('system', `Sending to AI: "${args}"`)
          await new Promise(r => setTimeout(r, 800))
          addLine('success', 'AI: I received your message and I\'m processing it. The system is currently operating within normal parameters.')
        }
        break

      case 'scan':
        addLine('system', 'Running security scan...')
        await new Promise(r => setTimeout(r, 300))
        addLine('output', '[1/4] Checking authentication...')
        await new Promise(r => setTimeout(r, 300))
        addLine('success', '  ✓ Auth: No issues found')
        addLine('output', '[2/4] Scanning permissions...')
        await new Promise(r => setTimeout(r, 300))
        addLine('success', '  ✓ Permissions: All within policy')
        addLine('output', '[3/4] Auditing API keys...')
        await new Promise(r => setTimeout(r, 300))
        addLine('output', '  ⚠ API key rotation recommended')
        addLine('output', '[4/4] Checking sandbox...')
        await new Promise(r => setTimeout(r, 300))
        addLine('success', '  ✓ Sandbox: Secure')
        addLine('system', 'Scan complete. Security score: 94/100')
        break

      default:
        addLine('error', `Unknown command: "${command}". Type "help" for available commands.`)
    }

    setIsProcessing(false)
  }, [addLine])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    processCommand(input)
    setInput('')
    setSuggestions([])
  }, [input, processCommand])

  const handleInputChange = useCallback((value: string) => {
    setInput(value)
    if (value.trim()) {
      const matches = COMMANDS.filter(c =>
        c.cmd.toLowerCase().startsWith(value.toLowerCase().split(' ')[0])
      ).map(c => c.cmd)
      setSuggestions(matches.length > 0 && matches[0] !== value ? matches : [])
    } else {
      setSuggestions([])
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setInput(history[newIndex])
        setSuggestions([])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1
        if (newIndex >= history.length) {
          setHistoryIndex(-1)
          setInput('')
        } else {
          setHistoryIndex(newIndex)
          setInput(history[newIndex])
        }
        setSuggestions([])
      }
    } else if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault()
      setInput(suggestions[0].split(' ')[0] + ' ')
      setSuggestions([])
    }
  }, [history, historyIndex, suggestions])

  const handleCopy = useCallback(() => {
    const text = lines.map(l => l.content).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [lines])

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return 'text-emerald-400'
      case 'output': return 'text-cyan-300'
      case 'error': return 'text-red-400'
      case 'system': return 'text-amber-400'
      case 'success': return 'text-green-400'
      default: return 'text-cyan-300'
    }
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-neutral-800 bg-[#0a0e14] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-[#0d1117]">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400 font-mono">Z.ai Terminal</span>
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            v1.0
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && (
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3 text-amber-400 animate-pulse" />
              <span className="text-[10px] text-amber-400 font-mono">processing</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-neutral-500 hover:text-neutral-300"
          >
            {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed scroll-smooth"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map(line => (
          <div key={line.id} className="flex gap-2 group">
            {line.type === 'input' && (
              <span className="text-emerald-500 select-none shrink-0">❯</span>
            )}
            <span className={`${getLineColor(line.type)} whitespace-pre-wrap break-all`}>
              {line.content}
            </span>
          </div>
        ))}

        {/* Current Input Line */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-1">
          <span className="text-emerald-500 select-none shrink-0">❯</span>
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-none text-emerald-400 font-mono text-sm p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-neutral-600 caret-emerald-400"
              placeholder="Type a command..."
              disabled={isProcessing}
              autoComplete="off"
              spellCheck={false}
            />
            {/* Blinking cursor placeholder */}
            {!input && !isProcessing && (
              <span className="absolute left-0 top-0 text-emerald-400 animate-pulse pointer-events-none select-none">
                ▊
              </span>
            )}
          </div>
        </form>

        {/* Autocomplete suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => {
                  setInput(s.split(' ')[0] + ' ')
                  setSuggestions([])
                  inputRef.current?.focus()
                }}
                className="px-2 py-0.5 rounded text-xs font-mono bg-neutral-800/60 text-cyan-300 hover:bg-neutral-700/80 transition-colors border border-neutral-700/50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-neutral-800 bg-[#0d1117]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-neutral-500 font-mono">connected</span>
          </div>
          <span className="text-[10px] text-neutral-600 font-mono">|</span>
          <span className="text-[10px] text-neutral-500 font-mono">
            {lines.length} lines
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-neutral-500 font-mono">
            ↑↓ history
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">
            tab autocomplete
          </span>
        </div>
      </div>
    </div>
  )
}
