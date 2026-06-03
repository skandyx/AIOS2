'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  Activity,
  Key,
  Server,
  Eye,
  CheckCircle2,
  XCircle,
  Fingerprint,
  Clock,
  FileWarning,
  Save,
} from 'lucide-react'

type AutonomyLevel = 'manual' | 'assisted' | 'semi_autonomous' | 'supervised_autonomous' | 'fully_autonomous'

interface AutonomyOption {
  id: AutonomyLevel
  label: string
  description: string
  icon: React.ReactNode
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical'
}

interface PermissionRow {
  name: string
  manual: boolean
  assisted: boolean
  semiAuto: boolean
  supervisedAuto: boolean
  fullyAuto: boolean
}

interface AuditEntry {
  id: string
  action: string
  agent: string
  timestamp: string
  status: 'allowed' | 'denied' | 'pending'
  risk: 'low' | 'medium' | 'high'
}

const AUTONOMY_OPTIONS: AutonomyOption[] = [
  { id: 'manual', label: 'Manual', description: 'Every action requires explicit approval', icon: <Lock className="size-5" />, risk: 'none' },
  { id: 'assisted', label: 'Assisted', description: 'AI suggests, user decides and confirms', icon: <Eye className="size-5" />, risk: 'low' },
  { id: 'semi_autonomous', label: 'Semi-Auto', description: 'AI acts independently on safe tasks', icon: <Shield className="size-5" />, risk: 'medium' },
  { id: 'supervised_autonomous', label: 'Supervised Auto', description: 'AI acts freely, reports after action', icon: <ShieldCheck className="size-5" />, risk: 'high' },
  { id: 'fully_autonomous', label: 'Full Auto', description: 'AI has unrestricted autonomy', icon: <Unlock className="size-5" />, risk: 'critical' },
]

const PERMISSIONS: PermissionRow[] = [
  { name: 'Read files', manual: true, assisted: true, semiAuto: true, supervisedAuto: true, fullyAuto: true },
  { name: 'Disk access', manual: false, assisted: true, semiAuto: true, supervisedAuto: true, fullyAuto: true },
  { name: 'Write files', manual: false, assisted: true, semiAuto: true, supervisedAuto: true, fullyAuto: true },
  { name: 'Execute commands', manual: false, assisted: false, semiAuto: true, supervisedAuto: true, fullyAuto: true },
  { name: 'Network requests', manual: false, assisted: false, semiAuto: true, supervisedAuto: true, fullyAuto: true },
  { name: 'Install packages', manual: false, assisted: false, semiAuto: false, supervisedAuto: true, fullyAuto: true },
  { name: 'Delete files', manual: false, assisted: false, semiAuto: false, supervisedAuto: true, fullyAuto: true },
  { name: 'System configuration', manual: false, assisted: false, semiAuto: false, supervisedAuto: false, fullyAuto: true },
  { name: 'Credential access', manual: false, assisted: false, semiAuto: false, supervisedAuto: false, fullyAuto: true },
  { name: 'Self-modify app', manual: false, assisted: false, semiAuto: false, supervisedAuto: true, fullyAuto: true },
]

const AUDIT_LOG: AuditEntry[] = [
  { id: '1', action: 'File read: /src/app/page.tsx', agent: 'Developer', timestamp: '2 min ago', status: 'allowed', risk: 'low' },
  { id: '2', action: 'Package install: lodash@4.17', agent: 'Developer', timestamp: '5 min ago', status: 'pending', risk: 'medium' },
  { id: '3', action: 'Network request: api.github.com', agent: 'Research', timestamp: '8 min ago', status: 'allowed', risk: 'low' },
  { id: '4', action: 'File delete: /tmp/cache/*', agent: 'System', timestamp: '12 min ago', status: 'denied', risk: 'high' },
  { id: '5', action: 'Command exec: npm run build', agent: 'Developer', timestamp: '15 min ago', status: 'allowed', risk: 'medium' },
  { id: '6', action: 'Credential access: API key rotation', agent: 'Security', timestamp: '20 min ago', status: 'denied', risk: 'high' },
  { id: '7', action: 'Config update: autonomy level', agent: 'Coordinator', timestamp: '25 min ago', status: 'allowed', risk: 'medium' },
  { id: '8', action: 'File write: /src/lib/utils.ts', agent: 'Developer', timestamp: '30 min ago', status: 'allowed', risk: 'low' },
]

const DANGER_ACTIONS = [
  'Delete files or directories',
  'Execute shell commands',
  'Access stored credentials',
  'Modify system configuration',
  'Send network requests to unknown hosts',
  'Install unverified packages',
  'Modify security policies',
  'Access other users\' data',
]

export default function SecurityModule() {
  const [selectedLevel, setSelectedLevel] = useState<AutonomyLevel>('assisted')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [initialLevel, setInitialLevel] = useState<AutonomyLevel>('assisted')

  const { toast } = useToast()

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/security/settings')
        if (res.ok) {
          const data = await res.json()
          const settings = data.settings || data
          if (settings.autonomyLevel) {
            setSelectedLevel(settings.autonomyLevel)
            setInitialLevel(settings.autonomyLevel)
          }
        }
      } catch {
        // Use defaults
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // Track dirty state when selectedLevel changes
  useEffect(() => {
    setIsDirty(selectedLevel !== initialLevel)
  }, [selectedLevel, initialLevel])

  // Save handler
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/security/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            autonomyLevel: selectedLevel,
          },
        }),
      })
      if (res.ok) {
        setInitialLevel(selectedLevel)
        setIsDirty(false)
        toast({ title: 'Settings saved', description: 'Security settings updated successfully' })
      } else {
        toast({ title: 'Save failed', description: 'Could not save security settings', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Save failed', description: 'Network error', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }, [selectedLevel, toast])

  const securityScore = useMemo(() => {
    const scores: Record<AutonomyLevel, number> = {
      manual: 98,
      assisted: 92,
      semi_autonomous: 78,
      supervised_autonomous: 62,
      fully_autonomous: 34,
    }
    return scores[selectedLevel]
  }, [selectedLevel])

  const securityGrade = useMemo(() => {
    if (securityScore >= 90) return 'A'
    if (securityScore >= 80) return 'B'
    if (securityScore >= 70) return 'C'
    if (securityScore >= 60) return 'D'
    return 'F'
  }, [securityScore])

  const scoreColor = useMemo(() => {
    if (securityScore >= 90) return 'text-green-400'
    if (securityScore >= 70) return 'text-amber-400'
    return 'text-red-400'
  }, [securityScore])

  const scoreStroke = useMemo(() => {
    if (securityScore >= 90) return '#4ade80'
    if (securityScore >= 70) return '#fbbf24'
    return '#f87171'
  }, [securityScore])

  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (securityScore / 100) * circumference

  const currentOption = AUTONOMY_OPTIONS.find(o => o.id === selectedLevel)!
  const currentLevelIndex = AUTONOMY_OPTIONS.findIndex(o => o.id === selectedLevel)

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'none': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20'
      default: return 'text-neutral-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'allowed': return <CheckCircle2 className="size-3.5 text-green-400" />
      case 'denied': return <XCircle className="size-3.5 text-red-400" />
      case 'pending': return <Clock className="size-3.5 text-amber-400" />
      default: return null
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-2 border-neutral-600 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-sm text-neutral-400">Loading security settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Save Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-[#0d1117]">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-neutral-200">Security Configuration</span>
          {isDirty && (
            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 bg-amber-500/10">
              Unsaved changes
            </Badge>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={`gap-2 h-8 text-xs ${isDirty ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'bg-neutral-800 text-neutral-500'}`}
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 p-6">
      {/* Top Row: Security Score + Autonomy Level */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Security Score Gauge */}
        <Card className="bg-[#0d1117] border-neutral-800">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="relative size-36">
              <svg className="size-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke={scoreStroke}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold font-mono ${scoreColor}`}>{securityScore}</span>
                <span className={`text-lg font-bold ${scoreColor}`}>Grade {securityGrade}</span>
              </div>
            </div>
            <p className="text-sm text-neutral-400 mt-3 text-center">Security Score</p>
            <Badge className={`mt-2 ${getRiskColor(currentOption.risk)} border`}>
              {currentOption.risk === 'none' ? 'No Risk' : `${currentOption.risk.charAt(0).toUpperCase() + currentOption.risk.slice(1)} Risk`}
            </Badge>
          </CardContent>
        </Card>

        {/* Autonomy Level Selector */}
        <Card className="bg-[#0d1117] border-neutral-800 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-400" />
              Autonomy Level
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Control how independently the AI can operate
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Slider-style level selector */}
            <div className="relative mb-3">
              <div className="h-2 rounded-full bg-neutral-800 relative overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${((currentLevelIndex + 1) / AUTONOMY_OPTIONS.length) * 100}%`,
                    background: `linear-gradient(90deg, #4ade80, #fbbf24, #f87171)`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 mt-4">
              {AUTONOMY_OPTIONS.map((option, index) => {
                const isActive = selectedLevel === option.id
                const isLower = index <= currentLevelIndex
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedLevel(option.id)}
                    className={`
                      flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-200
                      ${isActive
                        ? 'bg-neutral-800/80 border-amber-500/50 text-amber-400 shadow-lg shadow-amber-500/5'
                        : isLower
                          ? 'bg-neutral-900/50 border-neutral-700/50 text-neutral-400 hover:border-neutral-600'
                          : 'bg-neutral-900/30 border-neutral-800/50 text-neutral-600 hover:border-neutral-700'
                      }
                    `}
                  >
                    <div className={`${isActive ? 'text-amber-400' : isLower ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      {option.icon}
                    </div>
                    <span className="text-[10px] font-semibold leading-tight text-center">{option.label}</span>
                  </button>
                )
              })}
            </div>

            {selectedLevel && (
              <div className="mt-3 p-3 rounded-lg bg-neutral-900/50 border border-neutral-800">
                <p className="text-xs text-neutral-300">{currentOption.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Permission Grid */}
      <Card className="bg-[#0d1117] border-neutral-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <Fingerprint className="size-4 text-cyan-400" />
            Permission Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-2 pr-4 text-neutral-400 font-medium">Action</th>
                  {AUTONOMY_OPTIONS.map(opt => (
                    <th
                      key={opt.id}
                      className={`text-center py-2 px-2 font-medium min-w-[72px] ${selectedLevel === opt.id ? 'text-amber-400' : 'text-neutral-500'}`}
                    >
                      {opt.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((perm, idx) => (
                  <tr key={idx} className="border-b border-neutral-800/50">
                    <td className="py-2 pr-4 text-neutral-300 font-mono">{perm.name}</td>
                    {[
                      perm.manual,
                      perm.assisted,
                      perm.semiAuto,
                      perm.supervisedAuto,
                      perm.fullyAuto,
                    ].map((allowed, i) => (
                      <td key={i} className="text-center py-2 px-2">
                        {allowed ? (
                          <CheckCircle2 className="size-4 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="size-4 text-neutral-700 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row: Audit Log + Danger Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Audit Log */}
        <Card className="bg-[#0d1117] border-neutral-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <Activity className="size-4 text-cyan-400" />
              Security Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              <div className="px-6 pb-4 space-y-1">
                {AUDIT_LOG.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-neutral-800/50 last:border-0">
                    {getStatusIcon(entry.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-300 truncate">{entry.action}</p>
                      <p className="text-[10px] text-neutral-600">{entry.agent} • {entry.timestamp}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${getRiskColor(entry.risk)} border`}>
                      {entry.risk}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Column: Danger Zone + Sandbox + Vault */}
        <div className="flex flex-col gap-4">
          {/* Danger Zone */}
          <Card className="bg-[#0d1117] border-red-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
                <AlertTriangle className="size-4" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-[10px] text-red-400/60">
                These actions always require user confirmation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {DANGER_ACTIONS.map((action, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1">
                    <FileWarning className="size-3 text-red-400/60 shrink-0" />
                    <span className="text-xs text-red-300/80">{action}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Effective Permissions */}
          <Card className="bg-[#0d1117] border-cyan-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-cyan-400 flex items-center gap-2">
                <ShieldCheck className="size-3.5" />
                Currently Allowed ({selectedLevel.replace('_', ' ')})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {PERMISSIONS.filter(perm => {
                  const levelKey = selectedLevel === 'manual' ? 'manual'
                    : selectedLevel === 'assisted' ? 'assisted'
                    : selectedLevel === 'semi_autonomous' ? 'semiAuto'
                    : selectedLevel === 'supervised_autonomous' ? 'supervisedAuto'
                    : 'fullyAuto'
                  return perm[levelKey as keyof PermissionRow] as boolean
                }).map(perm => (
                  <Badge key={perm.name} variant="outline" className="text-[10px] border-green-500/30 text-green-400 bg-green-500/10">
                    <CheckCircle2 className="size-2.5 mr-1" />
                    {perm.name}
                  </Badge>
                ))}
                {PERMISSIONS.filter(perm => {
                  const levelKey = selectedLevel === 'manual' ? 'manual'
                    : selectedLevel === 'assisted' ? 'assisted'
                    : selectedLevel === 'semi_autonomous' ? 'semiAuto'
                    : selectedLevel === 'supervised_autonomous' ? 'supervisedAuto'
                    : 'fullyAuto'
                  return !(perm[levelKey as keyof PermissionRow] as boolean)
                }).map(perm => (
                  <Badge key={perm.name} variant="outline" className="text-[10px] border-neutral-700/50 text-neutral-600 bg-neutral-800/50">
                    <XCircle className="size-2.5 mr-1" />
                    {perm.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sandbox & Vault Status */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-[#0d1117] border-neutral-800">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Server className="size-5 text-emerald-400" />
                <span className="text-xs font-semibold text-neutral-200">Sandbox</span>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  Active
                </Badge>
              </CardContent>
            </Card>
            <Card className="bg-[#0d1117] border-neutral-800">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Key className="size-5 text-amber-400" />
                <span className="text-xs font-semibold text-neutral-200">Vault</span>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">
                  Secured
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Recent Events */}
          <Card className="bg-[#0d1117] border-neutral-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-neutral-400">Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="size-1.5 rounded-full bg-green-400" />
                  <span className="text-neutral-400">Auth check passed</span>
                  <span className="text-neutral-600 ml-auto">1m ago</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="size-1.5 rounded-full bg-amber-400" />
                  <span className="text-neutral-400">API key rotation suggested</span>
                  <span className="text-neutral-600 ml-auto">5m ago</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="size-1.5 rounded-full bg-red-400" />
                  <span className="text-neutral-400">Unauthorized delete blocked</span>
                  <span className="text-neutral-600 ml-auto">12m ago</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="size-1.5 rounded-full bg-green-400" />
                  <span className="text-neutral-400">Sandbox integrity verified</span>
                  <span className="text-neutral-600 ml-auto">18m ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        </div>
      </ScrollArea>
    </div>
  )
}
