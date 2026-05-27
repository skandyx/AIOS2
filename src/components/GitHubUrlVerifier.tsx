'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Github,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  GitFork,
  Clock,
  FileCode,
  Shield,
  Package,
  Server,
  Puzzle,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Info,
  Wrench,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VerificationData {
  valid: boolean
  repoInfo: {
    name: string
    full_name: string
    description: string | null
    html_url: string
    stargazers_count: number
    forks_count: number
    open_issues_count: number
    language: string | null
    topics: string[]
    license: { spdx_id: string; name: string } | null
    created_at: string
    updated_at: string
    pushed_at: string
    default_branch: string
    archived: boolean
    disabled: boolean
    size: number
    owner: { login: string; avatar_url: string; type: string }
  } | null
  detectedType: 'skill' | 'mcp' | 'plugin' | 'unknown'
  usefulness: {
    score: number
    level: 'critical' | 'high' | 'medium' | 'low' | 'not-useful'
    reasons: string[]
    warnings: string[]
  }
  alreadyInstalled: {
    skill: boolean
    mcp: boolean
    plugin: boolean
    details: { type: string; name: string; id: string; isEnabled: boolean }[]
  }
  readme: string | null
  packageJson: {
    name: string | null
    version: string | null
    dependencies: string[] | null
    scripts: string[] | null
  } | null
  source?: 'github' | 'url'
  urlTitle?: string
  error?: string
}

interface GitHubUrlVerifierProps {
  /** Pre-filled URL value */
  value?: string
  /** Called when URL input changes */
  onValueChange?: (url: string) => void
  /** Called after successful verification with the result */
  onVerified?: (data: VerificationData) => void
  /** Called when user wants to install the verified item */
  onInstall?: (data: VerificationData) => void
  /** Placeholder text for input */
  placeholder?: string
  /** Whether the install is currently in progress */
  installing?: boolean
  /** Whether to show compact layout */
  compact?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatStars(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-cyan-400'
  if (score >= 40) return 'text-amber-400'
  if (score >= 20) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
  if (score >= 60) return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
  if (score >= 40) return 'bg-amber-500/15 border-amber-500/30 text-amber-400'
  if (score >= 20) return 'bg-orange-500/15 border-orange-500/30 text-orange-400'
  return 'bg-red-500/15 border-red-500/30 text-red-400'
}

function getProgressColor(score: number): string {
  if (score >= 80) return '[&>div]:bg-emerald-500'
  if (score >= 60) return '[&>div]:bg-cyan-500'
  if (score >= 40) return '[&>div]:bg-amber-500'
  if (score >= 20) return '[&>div]:bg-orange-500'
  return '[&>div]:bg-red-500'
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'skill': return <Sparkles className="h-3.5 w-3.5" />
    case 'mcp': return <Server className="h-3.5 w-3.5" />
    case 'plugin': return <Puzzle className="h-3.5 w-3.5" />
    default: return <Package className="h-3.5 w-3.5" />
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'skill': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
    case 'mcp': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'plugin': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    default: return 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30'
  }
}

function getLevelLabel(level: string): string {
  switch (level) {
    case 'critical': return 'Essential'
    case 'high': return 'Highly Recommended'
    case 'medium': return 'Useful'
    case 'low': return 'Limited Use'
    case 'not-useful': return 'Not Recommended'
    default: return level
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GitHubUrlVerifier({
  value = '',
  onValueChange,
  onVerified,
  onInstall,
  placeholder = 'Paste any URL (GitHub repo, skill manifest, etc.)',
  installing = false,
  compact = false,
}: GitHubUrlVerifierProps) {
  const [url, setUrl] = useState(value)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<VerificationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const handleUrlChange = useCallback((newUrl: string) => {
    setUrl(newUrl)
    setError(null)
    setResult(null)
    onValueChange?.(newUrl)
  }, [onValueChange])

  const handleVerify = useCallback(async () => {
    if (!url.trim()) return

    setVerifying(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/github/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.valid) {
        setError(data.error || 'Failed to verify this GitHub repository')
        setResult(data)
        return
      }

      setResult(data)
      onVerified?.(data)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setVerifying(false)
    }
  }, [url, onVerified])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && url.trim() && !verifying) {
      handleVerify()
    }
  }, [url, verifying, handleVerify])

  const isAlreadyInstalled = result?.alreadyInstalled && (
    result.alreadyInstalled.skill || result.alreadyInstalled.mcp || result.alreadyInstalled.plugin
  )

  return (
    <div className="space-y-3">
      {/* URL Input Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-9 pr-3 border-neutral-800 bg-neutral-900/50 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-cyan-500/50 focus:ring-cyan-500/20"
            disabled={verifying || installing}
          />
        </div>
        <Button
          onClick={handleVerify}
          disabled={!url.trim() || verifying || installing}
          className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
        >
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Verifying...</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Verify</span>
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] text-red-400 font-medium">Verification Failed</p>
            <p className="text-[10px] text-neutral-500 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Verification Result — GitHub Source */}
      {result && result.valid && result.repoInfo && result.source !== 'url' && (
        <div className="space-y-3">
          {/* Main Result Card */}
          <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800 space-y-3">
            {/* Header: Repo Info */}
            <div className="flex items-start gap-3">
              <img
                src={result.repoInfo.owner.avatar_url}
                alt={result.repoInfo.owner.login}
                className="w-10 h-10 rounded-lg border border-neutral-700"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-neutral-200 truncate">{result.repoInfo.name}</p>
                  <Badge className={`text-[9px] gap-1 border ${getTypeColor(result.detectedType)}`}>
                    {getTypeIcon(result.detectedType)}
                    {result.detectedType.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-500">
                  by <span className="text-neutral-400">{result.repoInfo.owner.login}</span>
                </p>
                {result.repoInfo.description && (
                  <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">{result.repoInfo.description}</p>
                )}
              </div>
              <a
                href={result.repoInfo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-cyan-400 transition-colors shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                {formatStars(result.repoInfo.stargazers_count)}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                <GitFork className="h-3.5 w-3.5 text-neutral-400" />
                {formatStars(result.repoInfo.forks_count)}
              </span>
              {result.repoInfo.language && (
                <Badge variant="outline" className="text-[9px] border-neutral-700 text-neutral-400 px-1.5">
                  {result.repoInfo.language}
                </Badge>
              )}
              {result.repoInfo.license && (
                <Badge variant="outline" className="text-[9px] border-neutral-700 text-neutral-400 px-1.5 gap-1">
                  <Shield className="h-2.5 w-2.5" />
                  {result.repoInfo.license.spdx_id}
                </Badge>
              )}
              <span className="flex items-center gap-1 text-[11px] text-neutral-600">
                <Clock className="h-3 w-3" />
                Updated {formatDate(result.repoInfo.pushed_at)}
              </span>
            </div>

            {/* Topics */}
            {result.repoInfo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.repoInfo.topics.slice(0, 8).map((topic) => (
                  <Badge key={topic} variant="outline" className="text-[9px] border-neutral-700 text-neutral-500 px-1.5">
                    {topic}
                  </Badge>
                ))}
                {result.repoInfo.topics.length > 8 && (
                  <Badge variant="outline" className="text-[9px] border-neutral-700 text-neutral-600 px-1.5">
                    +{result.repoInfo.topics.length - 8} more
                  </Badge>
                )}
              </div>
            )}

            <Separator className="bg-neutral-800" />

            {/* Usefulness Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-neutral-500 font-medium flex items-center gap-1.5">
                  <ThumbsUp className="h-3 w-3" />
                  Usefulness Score
                </p>
                <Badge className={`text-[9px] border ${getScoreBg(result.usefulness.score)}`}>
                  {getLevelLabel(result.usefulness.level)}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={result.usefulness.score} className={`h-2 flex-1 ${getProgressColor(result.usefulness.score)}`} />
                <span className={`text-sm font-bold tabular-nums ${getScoreColor(result.usefulness.score)}`}>
                  {result.usefulness.score}
                </span>
              </div>

              {/* Reasons */}
              {result.usefulness.reasons.length > 0 && (
                <div className="space-y-1">
                  {result.usefulness.reasons.slice(0, 4).map((reason, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-neutral-400">{reason}</p>
                    </div>
                  ))}
                  {result.usefulness.reasons.length > 4 && !showDetails && (
                    <button
                      onClick={() => setShowDetails(true)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 ml-4"
                    >
                      +{result.usefulness.reasons.length - 4} more reasons
                    </button>
                  )}
                </div>
              )}

              {/* Warnings */}
              {result.usefulness.warnings.length > 0 && (
                <div className="space-y-1">
                  {result.usefulness.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-amber-400/80">{warning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Already Installed Warning */}
            {isAlreadyInstalled && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-amber-400 font-medium">Already Installed</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    This repository is already installed as:{' '}
                    {result.alreadyInstalled.details.map((d, i) => (
                      <span key={i}>
                        {i > 0 ? ', ' : ''}
                        <span className="text-amber-300">{d.name}</span>
                        <span className="text-neutral-600"> ({d.type})</span>
                        {d.isEnabled ? ' ✅' : ' ⏸️'}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            )}

            {/* Package Info */}
            {result.packageJson && (
              <div className="space-y-1">
                <p className="text-[10px] text-neutral-500 font-medium flex items-center gap-1">
                  <FileCode className="h-3 w-3" />
                  Package Info
                </p>
                <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                  {result.packageJson.name && <span>📦 {result.packageJson.name}</span>}
                  {result.packageJson.version && <span>v{result.packageJson.version}</span>}
                  {result.packageJson.dependencies && (
                    <span>{result.packageJson.dependencies.length} deps</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Install Button */}
          {!isAlreadyInstalled && result.usefulness.level !== 'not-useful' && onInstall && (
            <Button
              onClick={() => onInstall(result)}
              disabled={installing || result.repoInfo.archived || result.repoInfo.disabled}
              className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700 text-white h-10"
            >
              {installing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Install as {result.detectedType === 'unknown' ? 'Plugin' : result.detectedType.toUpperCase()}
                </>
              )}
            </Button>
          )}

          {isAlreadyInstalled && (
            <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-[11px] text-neutral-400">Already installed in your system</span>
            </div>
          )}
        </div>
      )}

      {/* Verification Result — Direct URL Source */}
      {result && result.valid && result.source === 'url' && (
        <div className="space-y-3">
          {/* Main Result Card */}
          <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800 space-y-3">
            {/* Header: URL Title & Type */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-800 border border-neutral-700">
                <Globe className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-neutral-200 truncate">{result.urlTitle || 'External URL'}</p>
                  <Badge className={`text-[9px] gap-1 border ${getTypeColor(result.detectedType)}`}>
                    {getTypeIcon(result.detectedType)}
                    {result.detectedType.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                  Source: Direct URL
                </p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-cyan-400 transition-colors shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <Separator className="bg-neutral-800" />

            {/* Usefulness Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-neutral-500 font-medium flex items-center gap-1.5">
                  <ThumbsUp className="h-3 w-3" />
                  Usefulness Score
                </p>
                <Badge className={`text-[9px] border ${getScoreBg(result.usefulness.score)}`}>
                  {getLevelLabel(result.usefulness.level)}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={result.usefulness.score} className={`h-2 flex-1 ${getProgressColor(result.usefulness.score)}`} />
                <span className={`text-sm font-bold tabular-nums ${getScoreColor(result.usefulness.score)}`}>
                  {result.usefulness.score}
                </span>
              </div>

              {/* Reasons */}
              {result.usefulness.reasons.length > 0 && (
                <div className="space-y-1">
                  {result.usefulness.reasons.slice(0, 4).map((reason, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-neutral-400">{reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {result.usefulness.warnings.length > 0 && (
                <div className="space-y-1">
                  {result.usefulness.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-amber-400/80">{warning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Already Installed Warning */}
            {isAlreadyInstalled && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-amber-400 font-medium">Already Installed</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    This URL is already installed as:{' '}
                    {result.alreadyInstalled.details.map((d, i) => (
                      <span key={i}>
                        {i > 0 ? ', ' : ''}
                        <span className="text-amber-300">{d.name}</span>
                        <span className="text-neutral-600"> ({d.type})</span>
                        {d.isEnabled ? ' ✅' : ' ⏸️'}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            )}

            {/* Content Preview */}
            {result.readme && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-neutral-500 font-medium flex items-center gap-1">
                  <FileCode className="h-3 w-3" />
                  Content Preview
                </p>
                <div className="max-h-40 overflow-y-auto rounded-lg bg-neutral-900 border border-neutral-800 p-3">
                  <pre className="text-[10px] text-neutral-400 whitespace-pre-wrap break-words font-mono">
                    {result.readme.substring(0, 2000)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Install Button */}
          {!isAlreadyInstalled && result.usefulness.level !== 'not-useful' && onInstall && (
            <Button
              onClick={() => onInstall(result)}
              disabled={installing}
              className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700 text-white h-10"
            >
              {installing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Install as {result.detectedType === 'unknown' ? 'Plugin' : result.detectedType.toUpperCase()}
                </>
              )}
            </Button>
          )}

          {isAlreadyInstalled && (
            <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-[11px] text-neutral-400">Already installed in your system</span>
            </div>
          )}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="bg-[#0d1117] border-neutral-800 text-neutral-200 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-cyan-400" />
              Verification Details
            </DialogTitle>
            <DialogDescription className="text-neutral-500">
              Full analysis of {result?.repoInfo?.full_name}
            </DialogDescription>
          </DialogHeader>

          {result && (
            <ScrollArea className="max-h-96">
              <div className="space-y-4 py-4">
                {/* All Reasons */}
                {result.usefulness.reasons.length > 0 && (
                  <div>
                    <p className="text-[10px] text-neutral-500 font-medium mb-2 flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      Positive Signals
                    </p>
                    <div className="space-y-1">
                      {result.usefulness.reasons.map((reason, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                          <p className="text-[10px] text-neutral-400">{reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Warnings */}
                {result.usefulness.warnings.length > 0 && (
                  <div>
                    <p className="text-[10px] text-neutral-500 font-medium mb-2 flex items-center gap-1">
                      <ThumbsDown className="h-3 w-3" />
                      Warnings
                    </p>
                    <div className="space-y-1">
                      {result.usefulness.warnings.map((warning, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                          <p className="text-[10px] text-amber-400/80">{warning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Package Details */}
                {result.packageJson && (
                  <div>
                    <p className="text-[10px] text-neutral-500 font-medium mb-2 flex items-center gap-1">
                      <FileCode className="h-3 w-3" />
                      Package Details
                    </p>
                    {result.packageJson.dependencies && result.packageJson.dependencies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.packageJson.dependencies.map((dep) => (
                          <Badge key={dep} variant="outline" className="text-[9px] border-neutral-700 text-neutral-500 px-1.5">
                            {dep}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="border-neutral-700 text-neutral-400"
              onClick={() => setShowDetails(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
