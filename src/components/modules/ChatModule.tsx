'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Send,
  Plus,
  MessageSquare,
  Settings2,
  Copy,
  Check,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Loader2,
  Bot,
  User,
  Cpu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  contentType?: string
  createdAt: string
}

interface Conversation {
  id: string
  title: string | null
  systemPrompt: string | null
  updatedAt: string
  _count?: { messages: number }
  messages?: Message[]
}

interface ChatResponse {
  conversationId: string
  message: Message
  response: Message
}

// ─── System Prompt Presets ────────────────────────────────────────────────────

const SYSTEM_PROMPTS = [
  { label: 'Default Assistant', value: 'You are a helpful AI assistant.' },
  { label: 'Code Expert', value: 'You are an expert software engineer. Provide clear, well-documented code solutions with explanations.' },
  { label: 'Creative Writer', value: 'You are a creative writer. Help with storytelling, poetry, and creative content.' },
  { label: 'Data Analyst', value: 'You are a data analyst. Help interpret data, create visualizations, and provide analytical insights.' },
  { label: 'System Architect', value: 'You are a system architect. Help design scalable, maintainable system architectures.' },
  { label: 'Custom', value: '' },
]

// ─── Available Models ──────────────────────────────────────────────────────────

const AVAILABLE_MODELS = [
  { id: '', name: 'Z-AI (Default)', provider: 'Built-in', emoji: '✨', color: '#06b6d4' },
  { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'Mistral', emoji: '🌊', color: '#06b6d4' },
  { id: 'mistral-small-latest', name: 'Mistral Small', provider: 'Mistral', emoji: '💧', color: '#06b6d4' },
  { id: 'open-mistral-nemo', name: 'Mistral Nemo', provider: 'Mistral', emoji: '🔹', color: '#06b6d4' },
  { id: 'codestral-latest', name: 'Codestral', provider: 'Mistral', emoji: '💻', color: '#06b6d4' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', emoji: '🧠', color: '#10b981' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', emoji: '⚡', color: '#10b981' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', emoji: '🎭', color: '#f59e0b' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', emoji: '🔍', color: '#ec4899' },
]

// ─── CodeBlock Component ──────────────────────────────────────────────────────

function CodeBlock({ language, children }: { language?: string; children: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-lg overflow-hidden my-2">
      <div className="flex items-center justify-between bg-[#1e1e2e] px-4 py-2 text-xs text-gray-400">
        <span>{language || 'code'}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/10"
        >
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.85rem',
          background: '#1e1e2e',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

// ─── MessageBubble Component ──────────────────────────────────────────────────

function MessageBubble({ message, onCopy }: { message: Message; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    onCopy(message.content)
    setTimeout(() => setCopied(false), 2000)
  }

  const timeStr = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}
    >
      {/* Avatar */}
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

      {/* Message Content */}
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-50'
              : 'bg-white/5 border border-white/10 text-gray-100 backdrop-blur-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:my-0 prose-code:text-cyan-300 prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match && !className
                    if (!isInline && match) {
                      return (
                        <CodeBlock language={match[1]}>
                          {String(children).replace(/\n$/, '')}
                        </CodeBlock>
                      )
                    }
                    return (
                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 text-xs" {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp and copy */}
        <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] text-gray-500">{timeStr}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-5 px-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-300"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="flex gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)]">
        <Bot className="h-4 w-4 text-cyan-400" />
      </div>
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-1.5">
        <motion.div
          className="w-2 h-2 bg-cyan-400 rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-cyan-400 rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
        />
        <motion.div
          className="w-2 h-2 bg-cyan-400 rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
        />
      </div>
    </motion.div>
  )
}

// ─── ConversationList ─────────────────────────────────────────────────────────

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  onNew,
}: {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <Button
          onClick={onNew}
          className="w-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 hover:text-cyan-300 transition-all"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
      <Separator className="bg-white/5" />
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <motion.div
                key={conv.id}
                whileHover={{ x: 2 }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer group transition-all ${
                  selectedId === conv.id
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                    : 'hover:bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent'
                }`}
                onClick={() => onSelect(conv.id)}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {conv.title || 'Untitled'}
                  </p>
                  <p className="text-[10px] text-gray-600">
                    {conv._count?.messages || 0} messages
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(conv.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Main ChatModule ──────────────────────────────────────────────────────────

export default function ChatModule() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.')
  const [customPrompt, setCustomPrompt] = useState('')
  const [selectedPromptPreset, setSelectedPromptPreset] = useState('Default Assistant')
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Fetch conversations on mount ──────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/conversations')
      if (!res.ok) throw new Error('Failed to fetch conversations')
      const data = await res.json()
      setConversations(data)
    } catch (err) {
      console.error('Fetch conversations error:', err)
      setError('Failed to load conversations')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // ── Fetch messages when conversation selected ─────────────────────────────

  const fetchMessages = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/conversations/${id}`)
      if (!res.ok) throw new Error('Failed to fetch messages')
      const data = await res.json()
      setMessages(data.messages || [])
      if (data.systemPrompt) {
        setSystemPrompt(data.systemPrompt)
      }
    } catch (err) {
      console.error('Fetch messages error:', err)
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId)
    } else {
      setMessages([])
    }
  }, [selectedConversationId, fetchMessages])

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isSending) return

    setIsSending(true)
    setError(null)

    // Optimistically add user message
    const optimisticUserMsg: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticUserMsg])
    setInputValue('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: selectedConversationId,
          systemPrompt,
          model: selectedModel || undefined,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to send message')
      }

      const data: ChatResponse = await res.json()

      // Replace optimistic message and add AI response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== optimisticUserMsg.id)
        return [...filtered, data.message, data.response]
      })

      // Update conversation ID if new
      if (!selectedConversationId) {
        setSelectedConversationId(data.conversationId)
        fetchConversations()
      }
    } catch (err) {
      console.error('Send error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id))
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  // ── New conversation ──────────────────────────────────────────────────────

  const handleNewConversation = () => {
    setSelectedConversationId(null)
    setMessages([])
    setSystemPrompt('You are a helpful AI assistant.')
    setSelectedPromptPreset('Default Assistant')
    inputRef.current?.focus()
  }

  // ── Delete conversation ───────────────────────────────────────────────────

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (selectedConversationId === id) {
        handleNewConversation()
      }
      fetchConversations()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  // ── Handle prompt preset change ───────────────────────────────────────────

  const handlePromptChange = (value: string) => {
    setSelectedPromptPreset(value)
    const preset = SYSTEM_PROMPTS.find((p) => p.label === value)
    if (preset && preset.value) {
      setSystemPrompt(preset.value)
    }
  }

  // ── Copy handler ──────────────────────────────────────────────────────────

  const handleCopyMessage = (_text: string) => {
    // Could add toast notification here
  }

  // ── Keyboard shortcut ─────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full w-full bg-gray-950/80 rounded-xl overflow-hidden border border-white/5">
      {/* ── Sidebar ── */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r border-white/5 bg-gray-950/60 overflow-hidden"
          >
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              onDelete={handleDeleteConversation}
              onNew={handleNewConversation}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gray-950/40 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-cyan-400 hover:bg-white/5"
                  >
                    {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle sidebar</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-medium text-gray-200 truncate max-w-[200px] sm:max-w-none">
                {selectedConversationId
                  ? conversations.find((c) => c.id === selectedConversationId)?.title || 'Chat'
                  : 'New Chat'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* System prompt selector */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-gray-400 hover:text-cyan-400 hover:bg-white/5"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Prompt</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-white/10 text-gray-100">
                <DialogHeader>
                  <DialogTitle className="text-cyan-400">System Prompt</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Preset</Label>
                    <Select value={selectedPromptPreset} onValueChange={handlePromptChange}>
                      <SelectTrigger className="bg-gray-800 border-white/10 text-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-white/10">
                        {SYSTEM_PROMPTS.map((p) => (
                          <SelectItem key={p.label} value={p.label} className="text-gray-200 focus:bg-cyan-500/20 focus:text-cyan-300">
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Custom Prompt</Label>
                    <Textarea
                      value={selectedPromptPreset === 'Custom' ? systemPrompt : customPrompt}
                      onChange={(e) => {
                        if (selectedPromptPreset === 'Custom') {
                          setSystemPrompt(e.target.value)
                        }
                        setCustomPrompt(e.target.value)
                      }}
                      placeholder="Enter your custom system prompt..."
                      className="bg-gray-800 border-white/10 text-gray-200 min-h-[120px] resize-none"
                      disabled={selectedPromptPreset !== 'Custom'}
                    />
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-gray-400 mb-1">Active prompt:</p>
                    <p className="text-xs text-cyan-300/80 line-clamp-3">{systemPrompt}</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Model Selector */}
            <div className="flex items-center gap-1.5">
              <Cpu className="size-3.5 text-neutral-500" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-gray-900 border border-white/10 text-[11px] text-neutral-300 rounded-md px-2 py-1 h-7 outline-none cursor-pointer hover:border-cyan-500/30 focus:border-cyan-500/50 transition-colors"
              >
                {AVAILABLE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.emoji} {m.name} {m.provider !== 'Built-in' ? `(${m.provider})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
              AI OS
            </Badge>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && !isSending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 shadow-[0_0_24px_rgba(6,182,212,0.15)]">
                  <Sparkles className="h-8 w-8 text-cyan-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-200 mb-1">Start a conversation</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Type a message below to begin chatting with the AI assistant.
                  You can customize the system prompt for different use cases.
                </p>
              </motion.div>
            )}

            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onCopy={handleCopyMessage} />
            ))}

            <AnimatePresence>
              {isSending && <TypingIndicator />}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-4 py-2"
            >
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="py-2 px-3">
                  <p className="text-xs text-red-400">{error}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="p-4 border-t border-white/5 bg-gray-950/40 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 via-emerald-500/20 to-cyan-500/20 opacity-0 focus-within:opacity-100 transition-opacity blur-sm" />
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="relative bg-gray-900/80 border-white/10 text-gray-100 placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-cyan-500/20 rounded-xl pr-12 h-11"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isSending}
                  className="absolute right-1 top-1 h-9 w-9 p-0 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 hover:text-cyan-300 disabled:opacity-30 disabled:hover:bg-cyan-500/20 disabled:hover:text-cyan-400 transition-all"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5 text-center">
              Press <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-gray-500">Enter</kbd> to send
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
