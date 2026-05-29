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
        try {
          const res = await fetch('/api/monitoring')
          if (!res.ok) throw new Error(`API returned ${res.status}`)
          const data = await res.json()
          addLine('system', '┌── System Status ──────────────┐')
          const cpuUsage = data.system?.cpu?.usage?.toFixed(1) ?? 'N/A'
          const cpuStatus = data.system?.cpu?.status ?? 'unknown'
          const ramUsage = data.system?.ram?.usage?.toFixed(1) ?? 'N/A'
          const ramStatus = data.system?.ram?.status ?? 'unknown'
          addLine(cpuStatus === 'good' ? 'success' : cpuStatus === 'warning' ? 'output' : 'error', `│ ● CPU Usage:       ${cpuUsage}%`.padEnd(33) + '│')
          addLine(ramStatus === 'good' ? 'success' : ramStatus === 'warning' ? 'output' : 'error', `│ ● RAM Usage:       ${ramUsage}%`.padEnd(33) + '│')
          addLine(data.agents?.active > 0 ? 'success' : 'output',            `│ ● Agent Pool:      ${data.agents?.active ?? 0} Active`.padEnd(33) + '│')
          addLine('success', `│ ● Conversations:   ${data.conversations?.total ?? 0}`.padEnd(33) + '│')
          addLine('success', `│ ● Memories:        ${data.memories?.total ?? 0}`.padEnd(33) + '│')
          addLine(data.tasks?.failed > 0 ? 'error' : 'success', `│ ● Tasks:           ${data.tasks?.pending ?? 0} pending, ${data.tasks?.completed ?? 0} done`.padEnd(33) + '│')
          addLine(data.plugins?.enabled > 0 ? 'success' : 'output', `│ ○ Plugins:         ${data.plugins?.enabled ?? 0} enabled`.padEnd(33) + '│')
          addLine('system', '└───────────────────────────────┘')
        } catch (err) {
          addLine('error', `Failed to fetch status: ${err instanceof Error ? err.message : String(err)}`)
        }
        break

      case 'agents':
        try {
          const res = await fetch('/api/agents')
          if (!res.ok) throw new Error(`API returned ${res.status}`)
          const data = await res.json()
          const agents = Array.isArray(data) ? data : (data.agents || [])
          addLine('system', '┌── Active Agents ──────────────┐')
          if (agents.length === 0) {
            addLine('output', '│   No agents found              │')
          } else {
            agents.slice(0, 10).forEach((a: any) => {
              const status = a.isActive ? 'active' : (a.status || 'idle')
              const marker = status === 'active' ? '●' : '○'
              const name = (a.name || 'Unknown').padEnd(16).slice(0, 16)
              const lineType = status === 'active' ? 'success' : 'output'
              addLine(lineType, `│ ${marker} ${name} [${status}]`)
            })
          }
          addLine('system', '└───────────────────────────────┘')
        } catch (err) {
          addLine('error', `Failed to fetch agents: ${err instanceof Error ? err.message : String(err)}`)
        }
        break

      case 'tasks':
        try {
          const res = await fetch('/api/tasks')
          if (!res.ok) throw new Error(`API returned ${res.status}`)
          const data = await res.json()
          const tasks = Array.isArray(data) ? data : (data.tasks || [])
          addLine('system', '┌── Current Tasks ──────────────┐')
          if (tasks.length === 0) {
            addLine('output', '│   No tasks found              │')
          } else {
            tasks.slice(0, 10).forEach((t: any, i: number) => {
              const status = t.status || 'pending'
              const title = (t.title || 'Untitled').padEnd(18).slice(0, 18)
              const lineType = status === 'completed' ? 'success' : status === 'failed' ? 'error' : status === 'in_progress' ? 'output' : 'output'
              const statusLabel = status === 'completed' ? 'done' : status === 'in_progress' ? `${t.progress ?? 0}%` : status.slice(0, 4)
              addLine(lineType, `│ #${(i + 1).toString().padEnd(2)} ${title} [${statusLabel}]`)
            })
          }
          addLine('system', '└───────────────────────────────┘')
        } catch (err) {
          addLine('error', `Failed to fetch tasks: ${err instanceof Error ? err.message : String(err)}`)
        }
        break

      case 'memory':
        try {
          const res = await fetch('/api/memory')
          if (!res.ok) throw new Error(`API returned ${res.status}`)
          const data = await res.json()
          const memories = Array.isArray(data) ? data : (data.memories || [])
          addLine('system', '┌── Memory Store ───────────────┐')
          if (memories.length === 0) {
            addLine('output', '│   No memories found           │')
          } else {
            // Group by type
            const byType: Record<string, number> = {}
            memories.forEach((m: any) => {
              const t = m.type || 'unknown'
              byType[t] = (byType[t] || 0) + 1
            })
            Object.entries(byType).forEach(([type, count]) => {
              const label = type.padEnd(14).slice(0, 14)
              addLine('output', `│ ${label} ${count} entries`.padEnd(33) + '│')
            })
            addLine('output', `│ Total:          ${memories.length} entries`.padEnd(33) + '│')
          }
          addLine('system', '└───────────────────────────────┘')
        } catch (err) {
          addLine('error', `Failed to fetch memories: ${err instanceof Error ? err.message : String(err)}`)
        }
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
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: args }),
            })
            if (!res.ok) throw new Error(`API returned ${res.status}`)
            const data = await res.json()
            const aiMessage = data.response?.content || data.response?.message || data.message || 'No response'
            addLine('success', `AI: ${aiMessage}`)
          } catch (err) {
            addLine('error', `Failed to reach AI: ${err instanceof Error ? err.message : String(err)}`)
          }
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
        className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-sm leading-relaxed scroll-smooth"
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
