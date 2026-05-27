'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Network,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCode2,
  FunctionSquare,
  Box,
  Package,
  Link2,
  Lightbulb,
  X,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Bug,
  Shield,
  Gauge,
  Info,
  Send,
  Sparkles,
  FolderOpen,
  Code2,
  ArrowDown,
  ArrowUp,
  Filter,
} from 'lucide-react'

// Dynamic import for ForceGraph2D (uses canvas, needs SSR disabled)
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string
  name: string
  type: string
  path?: string
  description?: string
  summary?: string
  language?: string
  complexity?: number
  linesOfCode?: number
  importance: number
  isExternal: boolean
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number
  fy?: number
  __bckgDimensions?: [number, number]
}

interface GraphEdge {
  id: string
  source: string
  target: string
  type: string
  label?: string
  weight: number
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface Project {
  id: string
  name: string
  description?: string | null
  icon?: string | null
}

interface AnalysisIssue {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  type: 'security' | 'bug' | 'quality' | 'performance'
  title: string
  description: string
  filePath?: string
  lineStart?: number
  lineEnd?: number
  nodeId?: string
  suggestion?: string
}

interface QueryResult {
  answer: string
  relevantNodes: string[]
}

// ─── Color Config ─────────────────────────────────────────────────────────────

const NODE_TYPE_COLORS: Record<string, string> = {
  file: '#3b82f6',       // blue
  function: '#22c55e',   // green
  class: '#f59e0b',      // amber
  module: '#a855f7',     // purple
  dependency: '#ef4444', // red
  concept: '#06b6d4',    // cyan
  import: '#8b5cf6',     // violet
  export: '#14b8a6',     // teal
  config: '#f97316',     // orange
}

const NODE_TYPE_BG_COLORS: Record<string, string> = {
  file: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  function: 'bg-green-500/15 text-green-400 border-green-500/30',
  class: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  module: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  dependency: 'bg-red-500/15 text-red-400 border-red-500/30',
  concept: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  import: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  export: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  config: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

const EDGE_TYPE_COLORS: Record<string, string> = {
  imports: '#06b6d4',    // cyan
  calls: '#22c55e',      // green
  extends: '#f59e0b',    // amber
  contains: '#ffffff',   // white
  depends_on: '#ef4444', // red
  implements: '#a855f7', // purple
  uses: '#14b8a6',       // teal
  exports: '#3b82f6',    // blue
  references: '#8b5cf6', // violet
  inherits: '#f97316',   // orange
}

const SEVERITY_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  critical: { color: 'text-red-400', bgColor: 'bg-red-500/15', icon: <AlertTriangle className="size-3" /> },
  high: { color: 'text-orange-400', bgColor: 'bg-orange-500/15', icon: <AlertTriangle className="size-3" /> },
  medium: { color: 'text-amber-400', bgColor: 'bg-amber-500/15', icon: <Info className="size-3" /> },
  low: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/15', icon: <Info className="size-3" /> },
  info: { color: 'text-slate-400', bgColor: 'bg-slate-500/15', icon: <Info className="size-3" /> },
}

const ISSUE_TYPE_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  security: { color: 'text-red-400', bgColor: 'bg-red-500/15', icon: <Shield className="size-3" /> },
  bug: { color: 'text-orange-400', bgColor: 'bg-orange-500/15', icon: <Bug className="size-3" /> },
  quality: { color: 'text-amber-400', bgColor: 'bg-amber-500/15', icon: <Code2 className="size-3" /> },
  performance: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/15', icon: <Gauge className="size-3" /> },
}

const EXAMPLE_QUERIES = [
  'What are the main dependencies?',
  'Where is authentication handled?',
  'Are there any security vulnerabilities?',
  'Which modules have the highest complexity?',
  'What does the module structure look like?',
]

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getNodeColor(type: string): string {
  return NODE_TYPE_COLORS[type] || '#64748b'
}

function getEdgeColor(type: string): string {
  return EDGE_TYPE_COLORS[type] || '#475569'
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function KnowledgeGraphModule() {
  // ─── State ──────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(false)
  const [building, setBuilding] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [analysisIssues, setAnalysisIssues] = useState<AnalysisIssue[]>([])
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [queryDialogOpen, setQueryDialogOpen] = useState(false)
  const [queryText, setQueryText] = useState('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryLoading, setQueryLoading] = useState(false)
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; node: GraphNode } | null>(null)

  // ─── Refs ───────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<any>(null)
  const [graphDimensions, setGraphDimensions] = useState({ width: 800, height: 600 })

  // ─── Resize Observer ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setGraphDimensions({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        })
      }
    }

    updateDimensions()

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [showAnalysisPanel, selectedNode])

  // ─── Fetch Projects ─────────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setProjects(data)
          if (data.length > 0 && !selectedProjectId) {
            setSelectedProjectId(data[0].id)
          }
        }
      }
    } catch {
      // silently fail
    }
  }, [selectedProjectId])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // ─── Fetch Graph Data ───────────────────────────────────────────────────
  const fetchGraphData = useCallback(async () => {
    if (!selectedProjectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/graph`)
      if (res.ok) {
        const data = await res.json()
        // Transform edges: API uses sourceId/targetId, react-force-graph-2d needs source/target
        const transformedEdges = (data.edges || []).map((edge: Record<string, unknown>) => ({
          id: edge.id as string,
          type: edge.type as string,
          label: (edge.label as string) || undefined,
          weight: (edge.weight as number) || 1,
          source: (edge.sourceId as string) || ((edge.source as { id: string })?.id),
          target: (edge.targetId as string) || ((edge.target as { id: string })?.id),
        }))
        setGraphData({ nodes: data.nodes || [], edges: transformedEdges })
      } else {
        setGraphData(null)
      }
    } catch {
      setGraphData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedProjectId])

  useEffect(() => {
    if (selectedProjectId) {
      fetchGraphData()
    }
  }, [selectedProjectId, fetchGraphData])

  // ─── Build Graph ────────────────────────────────────────────────────────
  const handleBuildGraph = async () => {
    if (!selectedProjectId) return
    setBuilding(true)
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        const transformedEdges = (data.edges || []).map((edge: Record<string, unknown>) => ({
          id: edge.id as string,
          type: edge.type as string,
          label: (edge.label as string) || undefined,
          weight: (edge.weight as number) || 1,
          source: (edge.sourceId as string) || ((edge.source as { id: string })?.id),
          target: (edge.targetId as string) || ((edge.target as { id: string })?.id),
        }))
        setGraphData({ nodes: data.nodes || [], edges: transformedEdges })
      }
    } catch {
      // silently fail
    } finally {
      setBuilding(false)
    }
  }

  // ─── Analyze Code ───────────────────────────────────────────────────────
  const handleAnalyzeCode = async () => {
    if (!selectedProjectId) return
    setAnalyzing(true)
    setShowAnalysisPanel(true)
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/graph/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        // API returns 'analyses' array, map to our interface
        const issues: AnalysisIssue[] = (data.analyses || []).map((a: Record<string, unknown>) => ({
          id: a.id as string,
          severity: (a.severity as AnalysisIssue['severity']) || 'info',
          type: (a.type as AnalysisIssue['type']) || 'quality',
          title: (a.title as string) || 'Unknown issue',
          description: (a.description as string) || '',
          filePath: (a.filePath as string) || undefined,
          lineStart: (a.lineStart as number) || undefined,
          lineEnd: (a.lineEnd as number) || undefined,
          nodeId: (a.nodeId as string) || undefined,
          suggestion: (a.suggestion as string) || undefined,
        }))
        setAnalysisIssues(issues)
      }
    } catch {
      // silently fail
    } finally {
      setAnalyzing(false)
    }
  }

  // ─── Query Graph ────────────────────────────────────────────────────────
  const handleQueryGraph = async () => {
    if (!selectedProjectId || !queryText.trim()) return
    setQueryLoading(true)
    setQueryResult(null)
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/graph/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        // Extract relevant node IDs from the answer by matching node names
        const relevantNodeIds: string[] = []
        if (graphData) {
          for (const node of graphData.nodes) {
            if (data.answer && data.answer.toLowerCase().includes(node.name.toLowerCase())) {
              relevantNodeIds.push(node.id)
            }
          }
        }
        const result: QueryResult = {
          answer: data.answer || 'No answer available',
          relevantNodes: relevantNodeIds,
        }
        setQueryResult(result)
        if (relevantNodeIds.length > 0) {
          setHighlightedNodes(new Set(relevantNodeIds))
          setTimeout(() => {
            if (graphRef.current) {
              graphRef.current.zoomToFit(400, 50)
            }
          }, 500)
        }
      }
    } catch {
      // silently fail
    } finally {
      setQueryLoading(false)
    }
  }

  // ─── Zoom Controls ──────────────────────────────────────────────────────
  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom * 1.5, 300)
    }
  }

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom / 1.5, 300)
    }
  }

  const handleZoomReset = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50)
    }
  }

  // ─── Filtered Nodes ─────────────────────────────────────────────────────
  const getFilteredData = useCallback(() => {
    if (!graphData) return { nodes: [], links: [] }

    let filteredNodes = graphData.nodes

    // Filter by type
    if (filterType !== 'all') {
      filteredNodes = filteredNodes.filter(n => n.type === filterType)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filteredNodes = filteredNodes.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        (n.path && n.path.toLowerCase().includes(q)) ||
        (n.description && n.description.toLowerCase().includes(q))
      )
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id))
    const filteredEdges = graphData.edges.filter(
      e => nodeIds.has(typeof e.source === 'string' ? e.source : (e.source as GraphNode).id) &&
           nodeIds.has(typeof e.target === 'string' ? e.target : (e.target as GraphNode).id)
    )

    return { nodes: filteredNodes, links: filteredEdges }
  }, [graphData, filterType, searchQuery])

  // ─── Get Connected Nodes ────────────────────────────────────────────────
  const getConnectedNodes = useCallback((nodeId: string) => {
    if (!graphData) return { incoming: [] as GraphNode[], outgoing: [] as GraphNode[] }

    const incoming: GraphNode[] = []
    const outgoing: GraphNode[] = []

    graphData.edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as GraphNode).id
      const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as GraphNode).id

      if (targetId === nodeId) {
        const srcNode = graphData.nodes.find(n => n.id === sourceId)
        if (srcNode) incoming.push({ ...srcNode, edgeType: edge.type } as GraphNode & { edgeType: string })
      }
      if (sourceId === nodeId) {
        const tgtNode = graphData.nodes.find(n => n.id === targetId)
        if (tgtNode) outgoing.push({ ...tgtNode, edgeType: edge.type } as GraphNode & { edgeType: string })
      }
    })

    return { incoming, outgoing }
  }, [graphData])

  // ─── Filtered Issues ────────────────────────────────────────────────────
  const filteredIssues = analysisIssues.filter(issue => {
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false
    if (typeFilter !== 'all' && issue.type !== typeFilter) return false
    return true
  })

  // ─── Node Canvas Object ─────────────────────────────────────────────────
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name
    const fontSize = Math.max(12 / globalScale, 2.5)
    const nodeR = Math.max(Math.sqrt(node.importance || 1) * 4, 3)

    const isHighlighted = highlightedNodes.has(node.id)
    const isSelected = selectedNode?.id === node.id
    const isHovered = hoverNode?.id === node.id

    // Draw highlight ring
    if (isHighlighted || isSelected) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, nodeR + 3 / globalScale, 0, 2 * Math.PI)
      ctx.fillStyle = isHighlighted ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.2)'
      ctx.fill()
    }

    // Draw node circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI)
    ctx.fillStyle = getNodeColor(node.type)
    if (isHovered) {
      ctx.shadowColor = getNodeColor(node.type)
      ctx.shadowBlur = 15 / globalScale
    }
    ctx.fill()
    ctx.shadowBlur = 0

    // Draw border
    ctx.strokeStyle = isHovered || isSelected ? '#ffffff' : 'rgba(255,255,255,0.15)'
    ctx.lineWidth = (isHovered || isSelected ? 2 : 0.5) / globalScale
    ctx.stroke()

    // Draw label (only when zoomed in enough)
    if (globalScale > 0.8 || isHovered || isSelected || isHighlighted) {
      ctx.font = `${fontSize}px Sans-Serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Text background
      const textWidth = ctx.measureText(label).width
      const bgPad = 2 / globalScale
      ctx.fillStyle = 'rgba(13, 17, 23, 0.85)'
      ctx.fillRect(
        node.x - textWidth / 2 - bgPad,
        node.y + nodeR + 3 / globalScale - fontSize / 2 - bgPad,
        textWidth + bgPad * 2,
        fontSize + bgPad * 2
      )

      ctx.fillStyle = isHighlighted ? '#06b6d4' : isSelected ? '#ffffff' : '#94a3b8'
      ctx.fillText(label, node.x, node.y + nodeR + 3 / globalScale)

      // Store background dimensions for hit testing
      node.__bckgDimensions = [textWidth + bgPad * 2, fontSize + bgPad * 2]
    } else {
      node.__bckgDimensions = [nodeR * 2, nodeR * 2]
    }
  }, [highlightedNodes, selectedNode, hoverNode])

  // ─── Render ─────────────────────────────────────────────────────────────

  const nodeTypeCounts: Record<string, number> = {}
  if (graphData) {
    graphData.nodes.forEach(n => {
      nodeTypeCounts[n.type] = (nodeTypeCounts[n.type] || 0) + 1
    })
  }

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shrink-0">
            <Network className="size-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Knowledge Graph
            </h2>
            <p className="text-xs text-slate-400 truncate">
              Visualize code structure, dependencies, and relationships
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Project Selector */}
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[180px] h-8 bg-neutral-900 border-neutral-700 text-white text-xs">
              <SelectValue placeholder="Select project..." />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-700">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-white focus:bg-neutral-800 focus:text-white text-xs">
                  {p.icon || '📁'} {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          <Button
            size="sm"
            onClick={handleBuildGraph}
            disabled={building || !selectedProjectId}
            className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white gap-1.5 text-xs"
          >
            {building ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            {building ? 'Building...' : 'Build Graph'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleAnalyzeCode}
            disabled={analyzing || !selectedProjectId}
            className="h-8 border-neutral-700 text-slate-300 hover:text-white gap-1.5 text-xs"
          >
            {analyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Code2 className="size-3.5" />}
            {analyzing ? 'Analyzing...' : 'Analyze Code'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => { setQueryDialogOpen(true); setQueryResult(null) }}
            disabled={!selectedProjectId}
            className="h-8 border-neutral-700 text-slate-300 hover:text-white gap-1.5 text-xs"
          >
            <Sparkles className="size-3.5" />
            Query Graph
          </Button>
        </div>
      </div>

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-800 px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-8 bg-neutral-900 border-neutral-700 text-white text-xs"
          />
        </div>

        {/* Type Filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[130px] h-7 bg-neutral-900 border-neutral-700 text-white text-xs">
            <Filter className="size-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-700">
            <SelectItem value="all" className="text-white focus:bg-neutral-800 text-xs">All Types</SelectItem>
            {Object.keys(NODE_TYPE_COLORS).map(type => (
              <SelectItem key={type} value={type} className="text-white focus:bg-neutral-800 text-xs">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: NODE_TYPE_COLORS[type] }} />
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Node Type Legend */}
        <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400">
          {Object.entries(nodeTypeCounts).map(([type, count]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getNodeColor(type) }} />
              {type} ({count})
            </span>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={handleZoomIn}>
            <ZoomIn className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={handleZoomOut}>
            <ZoomOut className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={handleZoomReset}>
            <Maximize2 className="size-3.5" />
          </Button>
          <Separator orientation="vertical" className="h-5 mx-1 bg-neutral-700" />
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 text-xs gap-1 ${showAnalysisPanel ? 'text-cyan-400' : 'text-slate-400'}`}
            onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}
          >
            <AlertTriangle className="size-3.5" />
            Issues {analysisIssues.length > 0 ? `(${analysisIssues.length})` : ''}
          </Button>
        </div>
      </div>

      {/* ─── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ─── Graph Area ──────────────────────────────────────────────────── */}
        <div className="flex-1 relative min-w-0">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]">
              <div className="text-center">
                <Loader2 className="size-8 text-cyan-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Loading graph data...</p>
              </div>
            </div>
          ) : !graphData || graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]">
              <div className="text-center max-w-sm">
                <Network className="size-12 text-cyan-400/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-1">No Graph Data</h3>
                <p className="text-sm text-slate-400 mb-4">
                  {selectedProjectId
                    ? 'Build the knowledge graph to visualize your project structure'
                    : 'Select a project to get started'}
                </p>
                {selectedProjectId && (
                  <Button
                    onClick={handleBuildGraph}
                    disabled={building}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
                  >
                    {building ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Build Graph
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div ref={containerRef} className="w-full h-full">
                <ForceGraph2D
                  ref={graphRef}
                  graphData={getFilteredData()}
                  nodeId="id"
                  nodeLabel="name"
                  nodeVal={(node: any) => (node.importance || 1) * 5}
                  nodeColor={(node: any) => getNodeColor(node.type)}
                  nodeCanvasObject={nodeCanvasObject}
                  nodeCanvasObjectMode={() => 'replace'}
                  linkSource="source"
                  linkTarget="target"
                  linkColor={(link: any) => getEdgeColor(link.type)}
                  linkWidth={(link: any) => Math.max((link.weight || 1) * 0.5, 0.5)}
                  linkDirectionalArrowLength={3}
                  linkDirectionalArrowRelPos={1}
                  linkDirectionalArrowColor={(link: any) => getEdgeColor(link.type)}
                  onNodeClick={(node: any) => {
                    setSelectedNode(node as GraphNode)
                  }}
                  onNodeHover={(node: any) => {
                    if (node) {
                      setHoverNode(node as GraphNode)
                    } else {
                      setHoverNode(null)
                    }
                  }}
                  onNodeDragEnd={(node: any) => {
                    node.fx = node.x
                    node.fy = node.y
                  }}
                  backgroundColor="#0d1117"
                  width={graphDimensions.width}
                  height={graphDimensions.height}
                  cooldownTicks={100}
                  enableNodeDrag={true}
                  enableZoomInteraction={true}
                  enablePanInteraction={true}
                  d3AlphaDecay={0.03}
                  d3VelocityDecay={0.3}
                />
              </div>

              {/* Hover Tooltip */}
              {hoverNode && !selectedNode && (
                <div className="absolute top-4 left-4 bg-neutral-900/95 border border-neutral-700 rounded-lg px-3 py-2 max-w-xs pointer-events-none shadow-xl z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getNodeColor(hoverNode.type) }} />
                    <span className="text-xs font-medium text-white">{hoverNode.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    <span className="capitalize">{hoverNode.type}</span>
                    {hoverNode.summary && <span> · {hoverNode.summary.slice(0, 80)}</span>}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Click to see details
                  </div>
                </div>
              )}

              {/* Stats Overlay */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
                <Badge variant="outline" className="text-[10px] h-5 border-neutral-700 text-slate-400 bg-neutral-900/80">
                  {graphData.nodes.length} nodes
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5 border-neutral-700 text-slate-400 bg-neutral-900/80">
                  {graphData.edges.length} edges
                </Badge>
                {highlightedNodes.size > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                    {highlightedNodes.size} highlighted
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>

        {/* ─── Side Panel (Node Details) ──────────────────────────────────── */}
        {selectedNode && (
          <div className="w-80 border-l border-neutral-800 bg-[#0d1117] flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <span className="text-sm font-medium text-white">Node Details</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => setSelectedNode(null)}>
                <X className="size-3.5" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Node Header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getNodeColor(selectedNode.type) }} />
                    <span className="text-sm font-medium text-white truncate">{selectedNode.name}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 capitalize ${NODE_TYPE_BG_COLORS[selectedNode.type] || 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30'}`}
                  >
                    {selectedNode.type}
                  </Badge>
                  {selectedNode.isExternal && (
                    <Badge variant="outline" className="text-[10px] h-5 ml-1 text-orange-400 bg-orange-500/15 border-orange-500/30">
                      External
                    </Badge>
                  )}
                </div>

                <Separator className="bg-neutral-800" />

                {/* Node Info */}
                <div className="space-y-2">
                  {selectedNode.path && (
                    <div className="flex items-start gap-2">
                      <FolderOpen className="size-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-500">Path</p>
                        <p className="text-xs text-slate-300 break-all">{selectedNode.path}</p>
                      </div>
                    </div>
                  )}
                  {selectedNode.description && (
                    <div className="flex items-start gap-2">
                      <Info className="size-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-500">Description</p>
                        <p className="text-xs text-slate-300">{selectedNode.description}</p>
                      </div>
                    </div>
                  )}
                  {selectedNode.language && (
                    <div className="flex items-start gap-2">
                      <Code2 className="size-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-500">Language</p>
                        <p className="text-xs text-slate-300">{selectedNode.language}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                {(selectedNode.complexity !== undefined || selectedNode.linesOfCode !== undefined || selectedNode.importance !== undefined) && (
                  <>
                    <Separator className="bg-neutral-800" />
                    <div>
                      <p className="text-[10px] text-slate-500 mb-2">Metrics</p>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedNode.importance !== undefined && (
                          <div className="bg-neutral-900 rounded-md p-2 text-center">
                            <p className="text-lg font-bold text-cyan-400">{selectedNode.importance.toFixed(1)}</p>
                            <p className="text-[9px] text-slate-500">Importance</p>
                          </div>
                        )}
                        {selectedNode.complexity !== undefined && (
                          <div className="bg-neutral-900 rounded-md p-2 text-center">
                            <p className="text-lg font-bold text-amber-400">{selectedNode.complexity}</p>
                            <p className="text-[9px] text-slate-500">Complexity</p>
                          </div>
                        )}
                        {selectedNode.linesOfCode !== undefined && (
                          <div className="bg-neutral-900 rounded-md p-2 text-center">
                            <p className="text-lg font-bold text-emerald-400">{selectedNode.linesOfCode}</p>
                            <p className="text-[9px] text-slate-500">Lines</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Connected Nodes */}
                <Separator className="bg-neutral-800" />
                <div>
                  <p className="text-[10px] text-slate-500 mb-2">Connections</p>
                  {(() => {
                    const { incoming, outgoing } = getConnectedNodes(selectedNode.id)
                    return (
                      <div className="space-y-2">
                        {incoming.length > 0 && (
                          <div>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                              <ArrowDown className="size-3 text-emerald-400" /> Incoming ({incoming.length})
                            </p>
                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                              {incoming.slice(0, 10).map(n => (
                                <button
                                  key={n.id}
                                  onClick={() => setSelectedNode(n)}
                                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-slate-300 hover:bg-neutral-800 transition-colors text-left"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getNodeColor(n.type) }} />
                                  <span className="truncate">{n.name}</span>
                                  <span className="ml-auto text-slate-500 capitalize text-[9px]">{(n as any).edgeType}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {outgoing.length > 0 && (
                          <div>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                              <ArrowUp className="size-3 text-cyan-400" /> Outgoing ({outgoing.length})
                            </p>
                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                              {outgoing.slice(0, 10).map(n => (
                                <button
                                  key={n.id}
                                  onClick={() => setSelectedNode(n)}
                                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-slate-300 hover:bg-neutral-800 transition-colors text-left"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getNodeColor(n.type) }} />
                                  <span className="truncate">{n.name}</span>
                                  <span className="ml-auto text-slate-500 capitalize text-[9px]">{(n as any).edgeType}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {incoming.length === 0 && outgoing.length === 0 && (
                          <p className="text-[10px] text-slate-500">No connections found</p>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* Related Issues */}
                {analysisIssues.length > 0 && (() => {
                  const relatedIssues = analysisIssues.filter(i => i.nodeId === selectedNode.id || i.filePath === selectedNode.path)
                  if (relatedIssues.length === 0) return null
                  return (
                    <>
                      <Separator className="bg-neutral-800" />
                      <div>
                        <p className="text-[10px] text-slate-500 mb-2">Related Issues ({relatedIssues.length})</p>
                        <div className="space-y-1.5">
                          {relatedIssues.map(issue => (
                            <div key={issue.id} className="bg-neutral-900 rounded-md p-2">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Badge variant="outline" className={`text-[9px] h-4 gap-0.5 ${SEVERITY_CONFIG[issue.severity]?.color} ${SEVERITY_CONFIG[issue.severity]?.bgColor} border-neutral-700`}>
                                  {SEVERITY_CONFIG[issue.severity]?.icon}
                                  {issue.severity}
                                </Badge>
                                <span className="text-[10px] text-slate-300 truncate">{issue.title}</span>
                              </div>
                              {issue.suggestion && (
                                <p className="text-[9px] text-slate-500 line-clamp-2">{issue.suggestion}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )
                })()}

                {/* Quick Actions */}
                <Separator className="bg-neutral-800" />
                <div className="space-y-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs gap-1.5 border-neutral-700 text-slate-300 hover:text-white"
                    onClick={() => {
                      setHighlightedNodes(new Set([selectedNode.id]))
                      // Also highlight connected nodes
                      const { incoming, outgoing } = getConnectedNodes(selectedNode.id)
                      const allIds = new Set([selectedNode.id, ...incoming.map(n => n.id), ...outgoing.map(n => n.id)])
                      setHighlightedNodes(allIds)
                    }}
                  >
                    <Network className="size-3.5" />
                    Analyze Dependencies
                  </Button>
                  {selectedNode.path && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs gap-1.5 border-neutral-700 text-slate-300 hover:text-white"
                      onClick={() => {
                        // Highlight this file node and all its children
                        const connectedIds = new Set<string>([selectedNode.id])
                        graphData?.edges.forEach(e => {
                          const srcId = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id
                          const tgtId = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id
                          if (srcId === selectedNode.id && e.type === 'contains') connectedIds.add(tgtId)
                          if (tgtId === selectedNode.id && e.type === 'contains') connectedIds.add(srcId)
                        })
                        setHighlightedNodes(connectedIds)
                      }}
                    >
                      <FileCode2 className="size-3.5" />
                      View File Contents
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        {/* ─── Analysis Panel ──────────────────────────────────────────────── */}
        {showAnalysisPanel && (
          <div className="w-96 border-l border-neutral-800 bg-[#0d1117] flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <span className="text-sm font-medium text-white flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-400" />
                Code Analysis
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => setShowAnalysisPanel(false)}>
                <X className="size-3.5" />
              </Button>
            </div>

            {/* Filters */}
            <div className="px-4 py-2 border-b border-neutral-800 flex items-center gap-2 flex-wrap">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[110px] h-7 bg-neutral-900 border-neutral-700 text-white text-xs">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  <SelectItem value="all" className="text-white focus:bg-neutral-800 text-xs">All Severity</SelectItem>
                  {Object.entries(SEVERITY_CONFIG).map(([key, conf]) => (
                    <SelectItem key={key} value={key} className="text-white focus:bg-neutral-800 text-xs">
                      <span className="flex items-center gap-1.5">{conf.icon} {key}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[110px] h-7 bg-neutral-900 border-neutral-700 text-white text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  <SelectItem value="all" className="text-white focus:bg-neutral-800 text-xs">All Types</SelectItem>
                  {Object.entries(ISSUE_TYPE_CONFIG).map(([key, conf]) => (
                    <SelectItem key={key} value={key} className="text-white focus:bg-neutral-800 text-xs">
                      <span className="flex items-center gap-1.5">{conf.icon} {key}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Issues List */}
            <ScrollArea className="flex-1">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="size-6 text-cyan-400 animate-spin mb-3" />
                  <p className="text-sm text-slate-400">Analyzing code...</p>
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Shield className="size-8 text-emerald-400/30 mb-3" />
                  <p className="text-sm text-slate-400">
                    {analysisIssues.length === 0 ? 'No issues found' : 'No issues match filters'}
                  </p>
                  {analysisIssues.length === 0 && (
                    <p className="text-xs text-slate-500 mt-1">Run analysis to find code issues</p>
                  )}
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {filteredIssues.map(issue => {
                    const sevConf = SEVERITY_CONFIG[issue.severity]
                    const typeConf = ISSUE_TYPE_CONFIG[issue.type]
                    return (
                      <Card
                        key={issue.id}
                        className="bg-neutral-900 border-neutral-800 hover:border-cyan-500/30 transition-colors cursor-pointer py-0"
                        onClick={() => {
                          if (issue.nodeId) {
                            const node = graphData?.nodes.find(n => n.id === issue.nodeId)
                            if (node) setSelectedNode(node)
                            setHighlightedNodes(new Set([issue.nodeId]))
                          }
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <div className={`shrink-0 w-5 h-5 rounded flex items-center justify-center ${typeConf?.bgColor}`}>
                              {typeConf?.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Badge variant="outline" className={`text-[9px] h-4 gap-0.5 ${sevConf?.color} ${sevConf?.bgColor} border-neutral-700`}>
                                  {sevConf?.icon}
                                  {issue.severity}
                                </Badge>
                                <span className="text-xs font-medium text-white truncate">{issue.title}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 line-clamp-2 mb-1">{issue.description}</p>
                              {issue.filePath && (
                                <p className="text-[9px] text-slate-500 font-mono truncate">
                                  {issue.filePath}
                                  {issue.lineStart && `:${issue.lineStart}`}
                                  {issue.lineEnd && `-${issue.lineEnd}`}
                                </p>
                              )}
                              {issue.suggestion && (
                                <div className="mt-1.5 bg-cyan-500/5 border border-cyan-500/10 rounded px-2 py-1">
                                  <p className="text-[10px] text-cyan-300">
                                    <Sparkles className="size-2.5 inline mr-1" />
                                    {issue.suggestion}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Summary Footer */}
            {analysisIssues.length > 0 && (
              <div className="border-t border-neutral-800 px-4 py-2 flex items-center gap-2 flex-wrap text-[10px]">
                {Object.entries(SEVERITY_CONFIG).map(([key, conf]) => {
                  const count = analysisIssues.filter(i => i.severity === key).length
                  if (count === 0) return null
                  return (
                    <span key={key} className={`flex items-center gap-1 ${conf.color}`}>
                      {conf.icon} {count} {key}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Query Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={queryDialogOpen} onOpenChange={setQueryDialogOpen}>
        <DialogContent className="bg-[#0d1117] border-neutral-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 flex items-center gap-2">
              <Sparkles className="size-5" />
              Query Knowledge Graph
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Example Queries */}
            <div>
              <p className="text-[10px] text-slate-500 mb-2">Example queries:</p>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_QUERIES.map(eq => (
                  <button
                    key={eq}
                    onClick={() => setQueryText(eq)}
                    className="text-[10px] px-2 py-1 rounded-md bg-neutral-900 border border-neutral-700 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-400 transition-colors"
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question about your codebase..."
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleQueryGraph()
                  }
                }}
                className="bg-neutral-900 border-neutral-700 text-white"
              />
              <Button
                onClick={handleQueryGraph}
                disabled={queryLoading || !queryText.trim()}
                className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
              >
                {queryLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>

            {/* Query Result */}
            {queryResult && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <Sparkles className="size-4" />
                  AI Response
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {queryResult.answer}
                </p>
                {queryResult.relevantNodes.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1.5">Relevant nodes highlighted in graph:</p>
                    <div className="flex flex-wrap gap-1">
                      {queryResult.relevantNodes.slice(0, 10).map(nodeId => {
                        const node = graphData?.nodes.find(n => n.id === nodeId)
                        return (
                          <Badge
                            key={nodeId}
                            variant="outline"
                            className="text-[9px] h-5 cursor-pointer hover:bg-cyan-500/10 border-neutral-700"
                            onClick={() => {
                              if (node) setSelectedNode(node)
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: node ? getNodeColor(node.type) : '#64748b' }} />
                            {node?.name || nodeId.slice(0, 8)}
                          </Badge>
                        )
                      })}
                      {queryResult.relevantNodes.length > 10 && (
                        <Badge variant="outline" className="text-[9px] h-5 border-neutral-700 text-slate-400">
                          +{queryResult.relevantNodes.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQueryDialogOpen(false)
                setQueryResult(null)
                setQueryText('')
                setHighlightedNodes(new Set())
              }}
              className="border-neutral-700 text-slate-300"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
