'use client'

import React, { useRef, useEffect, useCallback } from 'react'

interface NeuralNetworkVizProps {
  width?: number
  height?: number
  activeNodes?: number // 0-1, percentage of nodes that are active
  signalSpeed?: number // speed of signal propagation
  className?: string
}

interface NodeData {
  x: number
  y: number
  layerIndex: number
  nodeIndex: number
  activity: number // 0-1
  targetActivity: number
  pulsePhase: number
  radius: number
}

interface ConnectionData {
  from: NodeData
  to: NodeData
  opacity: number
}

interface SignalData {
  connection: ConnectionData
  progress: number // 0-1 along the connection
  speed: number
  brightness: number
  size: number
}

const COLORS = {
  connection: '#22d3ee',
  activeNode: '#34d399',
  inactiveNode: '#64748b',
  gridLine: 'rgba(100, 116, 139, 0.06)',
  gridDot: 'rgba(100, 116, 139, 0.12)',
  bgGradientStart: '#0a0f1a',
  bgGradientEnd: '#0f1729',
}

const LAYER_CONFIG = [
  { label: 'Input', nodeCount: 6 },
  { label: 'Processing', nodeCount: 8 },
  { label: 'Reasoning', nodeCount: 10 },
  { label: 'Planning', nodeCount: 7 },
  { label: 'Output', nodeCount: 4 },
]

function NeuralNetworkViz({
  width = 900,
  height = 500,
  activeNodes = 0.5,
  signalSpeed = 1,
  className = '',
}: NeuralNetworkVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const nodesRef = useRef<NodeData[][]>([])
  const connectionsRef = useRef<ConnectionData[]>([])
  const signalsRef = useRef<SignalData[]>([])
  const gridOffsetRef = useRef<number>(0)
  const activeNodesRef = useRef(activeNodes)
  const signalSpeedRef = useRef(signalSpeed)

  // Keep refs in sync with props (avoids animation loop restart)
  useEffect(() => {
    activeNodesRef.current = activeNodes
  }, [activeNodes])

  useEffect(() => {
    signalSpeedRef.current = signalSpeed
  }, [signalSpeed])

  const buildNetwork = useCallback(
    (w: number, h: number) => {
      const nodes: NodeData[][] = []
      const connections: ConnectionData[] = []
      const paddingX = 100
      const paddingY = 60
      const layerSpacing = (w - paddingX * 2) / (LAYER_CONFIG.length - 1)

      for (let l = 0; l < LAYER_CONFIG.length; l++) {
        const layerNodes: NodeData[] = []
        const count = LAYER_CONFIG[l].nodeCount
        const totalHeight = h - paddingY * 2
        const nodeSpacing = totalHeight / (count + 1)

        for (let n = 0; n < count; n++) {
          const isActive = Math.random() < activeNodes
          layerNodes.push({
            x: paddingX + l * layerSpacing,
            y: paddingY + (n + 1) * nodeSpacing,
            layerIndex: l,
            nodeIndex: n,
            activity: isActive ? 0.6 + Math.random() * 0.4 : 0.05 + Math.random() * 0.15,
            targetActivity: isActive ? 0.6 + Math.random() * 0.4 : 0.05 + Math.random() * 0.15,
            pulsePhase: Math.random() * Math.PI * 2,
            radius: 5 + Math.random() * 2,
          })
        }
        nodes.push(layerNodes)
      }

      for (let l = 0; l < nodes.length - 1; l++) {
        for (const fromNode of nodes[l]) {
          for (const toNode of nodes[l + 1]) {
            const dy = Math.abs(fromNode.y - toNode.y) / h
            const connectProb = dy < 0.3 ? 0.6 : dy < 0.5 ? 0.3 : 0.1
            if (Math.random() < connectProb) {
              const activity = (fromNode.activity + toNode.activity) / 2
              connections.push({
                from: fromNode,
                to: toNode,
                opacity: 0.05 + activity * 0.15,
              })
            }
          }
        }
      }

      nodesRef.current = nodes
      connectionsRef.current = connections
      signalsRef.current = []
    },
    [activeNodes]
  )

  const spawnSignal = useCallback(() => {
    const connections = connectionsRef.current
    if (connections.length === 0) return

    const conn = connections[Math.floor(Math.random() * connections.length)]
    const isHighActivity = conn.from.activity > 0.4 || conn.to.activity > 0.4
    const spd = signalSpeedRef.current

    signalsRef.current.push({
      connection: conn,
      progress: 0,
      speed: (0.003 + Math.random() * 0.005) * spd,
      brightness: isHighActivity ? 0.7 + Math.random() * 0.3 : 0.3 + Math.random() * 0.3,
      size: isHighActivity ? 2.5 + Math.random() * 1.5 : 1.5 + Math.random() * 1,
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    buildNetwork(width, height)

    // Seed initial signals
    for (let i = 0; i < 15; i++) {
      spawnSignal()
      if (signalsRef.current.length > 0) {
        signalsRef.current[signalsRef.current.length - 1].progress = Math.random()
      }
    }

    let lastTime = performance.now()

    const draw = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05) // cap delta
      lastTime = timestamp
      timeRef.current += dt

      const t = timeRef.current
      const currentActiveNodes = activeNodesRef.current
      const currentSignalSpeed = signalSpeedRef.current

      // ---- Clear & Background ----
      const bgGrad = ctx.createLinearGradient(0, 0, width, height)
      bgGrad.addColorStop(0, COLORS.bgGradientStart)
      bgGrad.addColorStop(1, COLORS.bgGradientEnd)
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // ---- Background Grid with parallax ----
      gridOffsetRef.current += dt * 8 * currentSignalSpeed
      if (gridOffsetRef.current > 40) gridOffsetRef.current -= 40

      const gridSpacing = 40
      const offset = gridOffsetRef.current

      ctx.strokeStyle = COLORS.gridLine
      ctx.lineWidth = 0.5
      for (let x = -gridSpacing + (offset % gridSpacing); x < width + gridSpacing; x += gridSpacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = -gridSpacing + ((offset * 0.3) % gridSpacing); y < height + gridSpacing; y += gridSpacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      ctx.fillStyle = COLORS.gridDot
      for (let x = -gridSpacing + (offset % gridSpacing); x < width + gridSpacing; x += gridSpacing) {
        for (let y = -gridSpacing + ((offset * 0.3) % gridSpacing); y < height + gridSpacing; y += gridSpacing) {
          ctx.beginPath()
          ctx.arc(x, y, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // ---- Ambient glow behind network ----
      const nodes = nodesRef.current
      for (let l = 0; l < nodes.length; l++) {
        const layerNodes = nodes[l]
        if (layerNodes.length === 0) continue
        const avgX = layerNodes[0].x
        const avgY = height / 2
        const activeCount = layerNodes.filter((n) => n.activity > 0.4).length
        const intensity = activeCount / layerNodes.length

        const glowGrad = ctx.createRadialGradient(avgX, avgY, 0, avgX, avgY, 120)
        glowGrad.addColorStop(0, `rgba(34, 211, 238, ${0.03 * intensity})`)
        glowGrad.addColorStop(0.5, `rgba(52, 211, 153, ${0.015 * intensity})`)
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = glowGrad
        ctx.fillRect(avgX - 150, avgY - 150, 300, 300)
      }

      // ---- Draw Connections ----
      const connections = connectionsRef.current
      for (const conn of connections) {
        const { from, to } = conn
        const combinedActivity = (from.activity + to.activity) / 2

        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        const cpOffset = (from.y - to.y) * 0.15

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.quadraticCurveTo(midX, midY + cpOffset, to.x, to.y)

        const lineAlpha = 0.04 + combinedActivity * 0.2
        ctx.strokeStyle = `rgba(34, 211, 238, ${lineAlpha})`
        ctx.lineWidth = 0.5 + combinedActivity * 1
        ctx.stroke()
      }

      // ---- Update & Draw Signals ----
      const signals = signalsRef.current
      for (let i = signals.length - 1; i >= 0; i--) {
        const sig = signals[i]
        sig.progress += sig.speed * currentSignalSpeed

        if (sig.progress > 1) {
          signals.splice(i, 1)
          continue
        }

        const { from, to } = sig.connection
        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        const cpOffset = (from.y - to.y) * 0.15

        // Quadratic bezier interpolation
        const p = sig.progress
        const invP = 1 - p
        const sx = invP * invP * from.x + 2 * invP * p * midX + p * p * to.x
        const sy = invP * invP * from.y + 2 * invP * p * (midY + cpOffset) + p * p * to.y

        // Fade in/out at edges
        const fadeAlpha = Math.min(p * 5, (1 - p) * 5, 1)
        const alpha = fadeAlpha * sig.brightness

        // Signal glow
        const glowSize = sig.size * 4
        const signalGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowSize)
        signalGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`)
        signalGrad.addColorStop(0.3, `rgba(34, 211, 238, ${alpha * 0.5})`)
        signalGrad.addColorStop(0.7, `rgba(34, 211, 238, ${alpha * 0.15})`)
        signalGrad.addColorStop(1, 'rgba(34, 211, 238, 0)')

        ctx.fillStyle = signalGrad
        ctx.beginPath()
        ctx.arc(sx, sy, glowSize, 0, Math.PI * 2)
        ctx.fill()

        // Signal core
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(sx, sy, sig.size * 0.8, 0, Math.PI * 2)
        ctx.fill()

        // Signal trail - subtle streak behind
        const trailLen = 3
        for (let tp = 1; tp <= trailLen; tp++) {
          const trailP = Math.max(0, p - tp * 0.01)
          const trailInvP = 1 - trailP
          const tx = trailInvP * trailInvP * from.x + 2 * trailInvP * trailP * midX + trailP * trailP * to.x
          const ty = trailInvP * trailInvP * from.y + 2 * trailInvP * trailP * (midY + cpOffset) + trailP * trailP * to.y
          const trailAlpha = alpha * (1 - tp / (trailLen + 1)) * 0.3
          ctx.fillStyle = `rgba(34, 211, 238, ${trailAlpha})`
          ctx.beginPath()
          ctx.arc(tx, ty, sig.size * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // ---- Update & Draw Nodes ----
      for (const layerNodes of nodes) {
        for (const node of layerNodes) {
          // Smoothly transition activity toward target
          const activityDelta = node.targetActivity - node.activity
          node.activity += activityDelta * dt * 2

          // Randomly change target activity
          if (Math.random() < 0.005) {
            const isActive = Math.random() < currentActiveNodes
            node.targetActivity = isActive
              ? 0.5 + Math.random() * 0.5
              : 0.05 + Math.random() * 0.2
          }

          const pulse = Math.sin(t * 2 + node.pulsePhase) * 0.5 + 0.5
          const activity = node.activity
          const isActive = activity > 0.3
          const effectivePulse = isActive ? pulse * activity : pulse * 0.1

          // Node outer glow
          if (isActive) {
            const glowRadius = node.radius * 6 + effectivePulse * 8
            const nodeGlow = ctx.createRadialGradient(
              node.x, node.y, 0,
              node.x, node.y, glowRadius
            )
            nodeGlow.addColorStop(0, `rgba(52, 211, 153, ${0.15 * activity})`)
            nodeGlow.addColorStop(0.4, `rgba(34, 211, 238, ${0.06 * activity})`)
            nodeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
            ctx.fillStyle = nodeGlow
            ctx.beginPath()
            ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2)
            ctx.fill()
          }

          // Node ring
          const ringRadius = node.radius + 2 + effectivePulse * 2
          ctx.beginPath()
          ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2)
          if (isActive) {
            ctx.strokeStyle = `rgba(52, 211, 153, ${0.2 + activity * 0.4})`
            ctx.lineWidth = 1
          } else {
            ctx.strokeStyle = `rgba(100, 116, 139, ${0.15 + activity * 0.15})`
            ctx.lineWidth = 0.5
          }
          ctx.stroke()

          // Node core
          const coreRadius = node.radius + effectivePulse * 1.5
          const coreGrad = ctx.createRadialGradient(
            node.x - coreRadius * 0.2, node.y - coreRadius * 0.2, 0,
            node.x, node.y, coreRadius
          )

          if (isActive) {
            coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.6 + activity * 0.4})`)
            coreGrad.addColorStop(0.5, `rgba(52, 211, 153, ${0.5 + activity * 0.5})`)
            coreGrad.addColorStop(1, `rgba(34, 211, 238, ${0.2 + activity * 0.3})`)
          } else {
            coreGrad.addColorStop(0, `rgba(148, 163, 184, ${0.3 + activity * 0.3})`)
            coreGrad.addColorStop(0.5, `rgba(100, 116, 139, ${0.2 + activity * 0.2})`)
            coreGrad.addColorStop(1, `rgba(71, 85, 105, ${0.1 + activity * 0.1})`)
          }

          ctx.fillStyle = coreGrad
          ctx.beginPath()
          ctx.arc(node.x, node.y, coreRadius, 0, Math.PI * 2)
          ctx.fill()

          // Bright center dot for active nodes
          if (isActive) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + effectivePulse * 0.4})`
            ctx.beginPath()
            ctx.arc(node.x, node.y, coreRadius * 0.3, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // ---- Layer Labels ----
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

      for (let l = 0; l < nodes.length; l++) {
        const layerNodes = nodes[l]
        if (layerNodes.length === 0) continue
        const x = layerNodes[0].x
        const activeCount = layerNodes.filter((n) => n.activity > 0.4).length
        const intensity = activeCount / layerNodes.length

        // Label background glow
        const labelGlow = ctx.createRadialGradient(x, 30, 0, x, 30, 60)
        labelGlow.addColorStop(0, `rgba(34, 211, 238, ${0.04 * intensity})`)
        labelGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = labelGlow
        ctx.fillRect(x - 60, 10, 120, 40)

        // Label text
        ctx.fillStyle = `rgba(148, 163, 184, ${0.4 + intensity * 0.4})`
        ctx.fillText(LAYER_CONFIG[l].label.toUpperCase(), x, 24)

        // Activity bar under label
        const barWidth = 40
        const barHeight = 2
        const barX = x - barWidth / 2
        const barY = 40

        ctx.fillStyle = 'rgba(100, 116, 139, 0.15)'
        ctx.fillRect(barX, barY, barWidth, barHeight)

        ctx.fillStyle = `rgba(34, 211, 238, ${0.3 + intensity * 0.5})`
        ctx.fillRect(barX, barY, barWidth * intensity, barHeight)
      }

      // ---- Spawn new signals ----
      const totalActivity = nodes.flat().reduce((sum, n) => sum + n.activity, 0)
      const avgActivity = totalActivity / nodes.flat().length
      const spawnRate = 2 + avgActivity * 8

      if (Math.random() < spawnRate * dt) {
        spawnSignal()
      }

      if (signalsRef.current.length > 50) {
        signalsRef.current.splice(0, signalsRef.current.length - 50)
      }

      // ---- Horizontal scan line effect ----
      const scanY = ((t * 30 * currentSignalSpeed) % (height + 40)) - 20
      const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20)
      scanGrad.addColorStop(0, 'rgba(34, 211, 238, 0)')
      scanGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.015)')
      scanGrad.addColorStop(1, 'rgba(34, 211, 238, 0)')
      ctx.fillStyle = scanGrad
      ctx.fillRect(0, scanY - 20, width, 40)

      // ---- Vignette ----
      const vignetteGrad = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.7
      )
      vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)')
      ctx.fillStyle = vignetteGrad
      ctx.fillRect(0, 0, width, height)

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [width, height, buildNetwork, spawnSignal])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', aspectRatio: `${width} / ${height}` }}
      className={className}
    />
  )
}

export default NeuralNetworkViz
