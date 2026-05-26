'use client';

import React, { useMemo } from 'react';

interface JarvisHUDProps {
  size?: number;
  systemStatus?: 'online' | 'offline' | 'processing';
  agentCount?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  networkStatus?: 'online' | 'offline';
}

// Color palette
const COLORS = {
  cyan: '#22d3ee',
  cyanGlow: '#22d3ee80',
  cyanDim: '#22d3ee30',
  emerald: '#34d399',
  emeraldGlow: '#34d39980',
  emeraldDim: '#34d39930',
  teal: '#2dd4bf',
  tealGlow: '#2dd4bf80',
  tealDim: '#2dd4bf30',
  white: '#ffffff',
  whiteDim: '#ffffff20',
  amber: '#fbbf24',
  amberGlow: '#fbbf2480',
  red: '#ef4444',
  redGlow: '#ef444480',
  green: '#22c55e',
  greenGlow: '#22c55e80',
};

const JarvisHUD: React.FC<JarvisHUDProps> = ({
  size = 400,
  systemStatus = 'online',
  agentCount = 3,
  cpuUsage = 42,
  memoryUsage = 128,
  networkStatus = 'online',
}) => {
  const cx = 200;
  const cy = 200;

  // Generate stable particles using useMemo
  const particles = useMemo(() => {
    const pts: { cx: number; cy: number; r: number; delay: number; duration: number; opacity: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 60 + Math.random() * 120;
      pts.push({
        cx: cx + Math.cos(angle) * dist,
        cy: cy + Math.sin(angle) * dist,
        r: 0.8 + Math.random() * 1.5,
        delay: Math.random() * 6,
        duration: 3 + Math.random() * 4,
        opacity: 0.3 + Math.random() * 0.7,
      });
    }
    return pts;
  }, []);

  // Generate grid lines
  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const spacing = 25;
    for (let i = 0; i <= 400; i += spacing) {
      lines.push({ x1: i, y1: 0, x2: i, y2: 400 });
      lines.push({ x1: 0, y1: i, x2: 400, y2: i });
    }
    return lines;
  }, []);

  // Status color mapping
  const statusColor = systemStatus === 'online'
    ? COLORS.green
    : systemStatus === 'processing'
    ? COLORS.amber
    : COLORS.red;

  const statusGlow = systemStatus === 'online'
    ? COLORS.greenGlow
    : systemStatus === 'processing'
    ? COLORS.amberGlow
    : COLORS.redGlow;

  const networkColor = networkStatus === 'online' ? COLORS.green : COLORS.red;

  // Arc paths - each arc is defined by radius, start angle, end angle, and stroke properties
  const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // Data readout positions
  const dataReadouts = [
    { label: 'CPU', value: `${cpuUsage}%`, x: 30, y: 55, color: COLORS.cyan },
    { label: 'AGENTS', value: `${agentCount} ACTIVE`, x: 280, y: 55, color: COLORS.emerald },
    { label: 'MEMORY', value: `${memoryUsage}MB`, x: 30, y: 355, color: COLORS.teal },
    { label: 'NETWORK', value: networkStatus.toUpperCase(), x: 260, y: 355, color: networkColor },
  ];

  // Status indicators
  const indicators = [
    { x: 18, y: 90, color: systemStatus === 'online' ? COLORS.green : systemStatus === 'processing' ? COLORS.amber : COLORS.red, label: 'SYS' },
    { x: 18, y: 110, color: networkColor, label: 'NET' },
    { x: 18, y: 130, color: agentCount > 0 ? COLORS.green : COLORS.amber, label: 'AGT' },
    { x: 382, y: 90, color: cpuUsage > 80 ? COLORS.amber : COLORS.green, label: 'CPU' },
    { x: 382, y: 110, color: memoryUsage > 200 ? COLORS.amber : COLORS.green, label: 'MEM' },
    { x: 382, y: 130, color: COLORS.green, label: 'I/O' },
  ];

  // Keyframe animations as CSS
  const animationStyles = `
    @keyframes rotateCW1 {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes rotateCW2 {
      from { transform: rotate(45deg); }
      to { transform: rotate(405deg); }
    }
    @keyframes rotateCCW1 {
      from { transform: rotate(0deg); }
      to { transform: rotate(-360deg); }
    }
    @keyframes rotateCCW2 {
      from { transform: rotate(90deg); }
      to { transform: rotate(-270deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.15); }
    }
    @keyframes pulseRing {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.3); }
    }
    @keyframes scanRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes flicker {
      0%, 100% { opacity: 1; }
      5% { opacity: 0.8; }
      10% { opacity: 1; }
      15% { opacity: 0.6; }
      20% { opacity: 1; }
      50% { opacity: 0.95; }
      55% { opacity: 0.7; }
      60% { opacity: 1; }
    }
    @keyframes particleFloat {
      0%, 100% { opacity: 0; transform: scale(0.5); }
      20% { opacity: 1; transform: scale(1); }
      80% { opacity: 0.8; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.5); }
    }
    @keyframes statusBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    @keyframes dashMove {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -40; }
    }
    @keyframes dataSlideIn {
      0% { opacity: 0; transform: translateX(-10px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes coreGlow {
      0%, 100% { 
        filter: drop-shadow(0 0 4px ${COLORS.cyanGlow}) drop-shadow(0 0 8px ${COLORS.cyanGlow});
        opacity: 0.8;
      }
      50% { 
        filter: drop-shadow(0 0 8px ${COLORS.cyanGlow}) drop-shadow(0 0 16px ${COLORS.cyanGlow}) drop-shadow(0 0 24px ${COLORS.cyanDim});
        opacity: 1;
      }
    }
    @keyframes hexRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes breathe {
      0%, 100% { stroke-opacity: 0.3; }
      50% { stroke-opacity: 0.8; }
    }
    @keyframes textGlow {
      0%, 100% { 
        filter: drop-shadow(0 0 2px ${COLORS.cyanGlow});
        opacity: 0.9;
      }
      50% { 
        filter: drop-shadow(0 0 4px ${COLORS.cyanGlow}) drop-shadow(0 0 8px ${COLORS.cyanDim});
        opacity: 1;
      }
    }
  `;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{animationStyles}</style>
      <svg
        viewBox="0 0 400 400"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Glow filters */}
          <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={COLORS.cyan} floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowEmerald" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={COLORS.emerald} floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowTeal" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={COLORS.teal} floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowStrong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor={COLORS.cyan} floodOpacity="0.8" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowSoft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Scan gradient */}
          <linearGradient id="scanGrad" gradientUnits="userSpaceOnUse" x1="200" y1="200" x2="200" y2="0">
            <stop offset="0%" stopColor={COLORS.cyan} stopOpacity="0" />
            <stop offset="60%" stopColor={COLORS.cyan} stopOpacity="0.15" />
            <stop offset="100%" stopColor={COLORS.cyan} stopOpacity="0.4" />
          </linearGradient>

          {/* Arc gradients */}
          <linearGradient id="arcGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={COLORS.cyan} stopOpacity="0.2" />
            <stop offset="50%" stopColor={COLORS.cyan} stopOpacity="1" />
            <stop offset="100%" stopColor={COLORS.emerald} stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="arcGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={COLORS.emerald} stopOpacity="0.2" />
            <stop offset="50%" stopColor={COLORS.emerald} stopOpacity="1" />
            <stop offset="100%" stopColor={COLORS.teal} stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="arcGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={COLORS.teal} stopOpacity="0.15" />
            <stop offset="50%" stopColor={COLORS.teal} stopOpacity="0.9" />
            <stop offset="100%" stopColor={COLORS.cyan} stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="arcGrad4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={COLORS.cyan} stopOpacity="0.1" />
            <stop offset="30%" stopColor={COLORS.emerald} stopOpacity="0.7" />
            <stop offset="70%" stopColor={COLORS.teal} stopOpacity="0.7" />
            <stop offset="100%" stopColor={COLORS.cyan} stopOpacity="0.1" />
          </linearGradient>

          {/* Radial gradient for core */}
          <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COLORS.cyan} stopOpacity="0.9" />
            <stop offset="40%" stopColor={COLORS.cyan} stopOpacity="0.5" />
            <stop offset="70%" stopColor={COLORS.teal} stopOpacity="0.2" />
            <stop offset="100%" stopColor={COLORS.teal} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="coreInnerGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="30%" stopColor={COLORS.cyan} stopOpacity="0.8" />
            <stop offset="100%" stopColor={COLORS.cyan} stopOpacity="0" />
          </radialGradient>

          {/* Clip for scan cone */}
          <clipPath id="scanClip">
            <path d={`M ${cx} ${cy} L ${cx} 0 A 200 200 0 0 1 370 55 Z`} />
          </clipPath>
        </defs>

        {/* ===== BACKGROUND GRID ===== */}
        <g opacity="0.08">
          {gridLines.map((line, i) => (
            <line
              key={`gv${i}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={COLORS.cyan}
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* Concentric faint circles */}
        <g opacity="0.06">
          {[40, 80, 120, 160, 180].map((r, i) => (
            <circle
              key={`bgc${i}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={COLORS.cyan}
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* ===== RING 1 - Outer arc (radius 175) ===== */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'rotateCW1 20s linear infinite',
          }}
        >
          <path
            d={describeArc(cx, cy, 175, 0, 280)}
            fill="none"
            stroke="url(#arcGrad1)"
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#glowCyan)"
          />
          {/* Tick marks on outer ring */}
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = i * 10;
            const p1 = polarToCartesian(cx, cy, 170, angle);
            const p2 = polarToCartesian(cx, cy, i % 3 === 0 ? 165 : 168, angle);
            return (
              <line
                key={`tick1-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={COLORS.cyan}
                strokeWidth={i % 3 === 0 ? 1.5 : 0.5}
                opacity={i % 3 === 0 ? 0.7 : 0.3}
              />
            );
          })}
          {/* Arc end dots */}
          {[
            polarToCartesian(cx, cy, 175, 0),
            polarToCartesian(cx, cy, 175, 280),
          ].map((p, i) => (
            <circle
              key={`dot1-${i}`}
              cx={p.x}
              cy={p.y}
              r="3"
              fill={COLORS.cyan}
              filter="url(#glowCyan)"
            />
          ))}
        </g>

        {/* ===== RING 2 - Second arc (radius 150) ===== */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'rotateCCW1 15s linear infinite',
          }}
        >
          <path
            d={describeArc(cx, cy, 150, 0, 240)}
            fill="none"
            stroke="url(#arcGrad2)"
            strokeWidth="1.5"
            strokeLinecap="round"
            filter="url(#glowEmerald)"
          />
          {/* Dashed ring segment */}
          <circle
            cx={cx}
            cy={cy}
            r={150}
            fill="none"
            stroke={COLORS.emerald}
            strokeWidth="0.5"
            strokeDasharray="4 12"
            opacity="0.3"
            style={{
              animation: 'dashMove 2s linear infinite',
            }}
          />
          {[
            polarToCartesian(cx, cy, 150, 0),
            polarToCartesian(cx, cy, 150, 240),
          ].map((p, i) => (
            <circle
              key={`dot2-${i}`}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill={COLORS.emerald}
              filter="url(#glowEmerald)"
            />
          ))}
        </g>

        {/* ===== RING 3 - Third arc (radius 125) ===== */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'rotateCW2 12s linear infinite',
          }}
        >
          <path
            d={describeArc(cx, cy, 125, 0, 300)}
            fill="none"
            stroke="url(#arcGrad3)"
            strokeWidth="1.5"
            strokeLinecap="round"
            filter="url(#glowTeal)"
          />
          {/* Inner tick marks */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = i * 15;
            const p1 = polarToCartesian(cx, cy, 122, angle);
            const p2 = polarToCartesian(cx, cy, 118, angle);
            return (
              <line
                key={`tick3-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={COLORS.teal}
                strokeWidth={i % 4 === 0 ? 1.2 : 0.5}
                opacity={i % 4 === 0 ? 0.6 : 0.25}
              />
            );
          })}
        </g>

        {/* ===== RING 4 - Innermost arc (radius 100) ===== */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'rotateCCW2 9s linear infinite',
          }}
        >
          <path
            d={describeArc(cx, cy, 100, 0, 260)}
            fill="none"
            stroke="url(#arcGrad4)"
            strokeWidth="1"
            strokeLinecap="round"
            filter="url(#glowCyan)"
            opacity="0.8"
          />
          {/* Animated dash ring */}
          <circle
            cx={cx}
            cy={cy}
            r={100}
            fill="none"
            stroke={COLORS.cyan}
            strokeWidth="0.3"
            strokeDasharray="2 8"
            opacity="0.4"
            style={{
              animation: 'dashMove 3s linear infinite reverse',
            }}
          />
        </g>

        {/* ===== HEXAGONAL RING ===== */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'hexRotate 30s linear infinite',
            opacity: 0.15,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = i * 60;
            const p1 = polarToCartesian(cx, cy, 88, angle);
            const p2 = polarToCartesian(cx, cy, 88, angle + 60);
            return (
              <line
                key={`hex-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={COLORS.cyan}
                strokeWidth="1"
              />
            );
          })}
        </g>

        {/* ===== SCANNING LINE ===== */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'scanRotate 4s linear infinite',
          }}
        >
          {/* Scan line */}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - 180}
            stroke={COLORS.cyan}
            strokeWidth="1"
            opacity="0.6"
            filter="url(#glowSoft)"
          />
          {/* Scan cone / sweep area */}
          <path
            d={`M ${cx} ${cy} L ${cx - 30} ${cy - 175} A 178 178 0 0 1 ${cx} ${cy - 178} Z`}
            fill="url(#scanGrad)"
            opacity="0.5"
          />
        </g>

        {/* ===== CENTRAL CORE ===== */}
        {/* Outer pulse ring */}
        <circle
          cx={cx}
          cy={cy}
          r={30}
          fill="none"
          stroke={COLORS.cyan}
          strokeWidth="1"
          opacity="0.3"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'pulseRing 3s ease-in-out infinite',
          }}
        />
        {/* Second pulse ring */}
        <circle
          cx={cx}
          cy={cy}
          r={22}
          fill="none"
          stroke={COLORS.teal}
          strokeWidth="0.8"
          opacity="0.4"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'pulseRing 3s ease-in-out infinite 0.5s',
          }}
        />
        {/* Core glow background */}
        <circle
          cx={cx}
          cy={cy}
          r={18}
          fill="url(#coreGrad)"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />
        {/* Core inner bright */}
        <circle
          cx={cx}
          cy={cy}
          r={10}
          fill="url(#coreInnerGrad)"
          filter="url(#glowStrong)"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'coreGlow 3s ease-in-out infinite',
          }}
        />
        {/* Core center dot */}
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill={COLORS.cyan}
          filter="url(#glowStrong)"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        {/* Core status ring */}
        <circle
          cx={cx}
          cy={cy}
          r={15}
          fill="none"
          stroke={statusColor}
          strokeWidth="1.5"
          strokeDasharray="3 5"
          opacity="0.6"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'dashMove 4s linear infinite',
          }}
        />

        {/* ===== PARTICLES ===== */}
        {particles.map((p, i) => (
          <circle
            key={`particle-${i}`}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill={i % 3 === 0 ? COLORS.cyan : i % 3 === 1 ? COLORS.emerald : COLORS.teal}
            filter="url(#glowSoft)"
            opacity={p.opacity}
            style={{
              animation: `particleFloat ${p.duration}s ease-in-out infinite ${p.delay}s`,
            }}
          />
        ))}

        {/* ===== CROSSHAIR LINES ===== */}
        <g opacity="0.15">
          <line x1={cx - 195} y1={cy} x2={cx - 60} y2={cy} stroke={COLORS.cyan} strokeWidth="0.5" />
          <line x1={cx + 60} y1={cy} x2={cx + 195} y2={cy} stroke={COLORS.cyan} strokeWidth="0.5" />
          <line x1={cx} y1={cy - 195} x2={cx} y2={cy - 60} stroke={COLORS.cyan} strokeWidth="0.5" />
          <line x1={cx} y1={cy + 60} x2={cx} y2={cy + 195} stroke={COLORS.cyan} strokeWidth="0.5" />
        </g>

        {/* ===== CORNER BRACKETS ===== */}
        <g opacity="0.3" stroke={COLORS.cyan} strokeWidth="1.5" fill="none">
          {/* Top-left */}
          <path d="M 20 35 L 20 20 L 35 20" />
          {/* Top-right */}
          <path d="M 365 20 L 380 20 L 380 35" />
          {/* Bottom-left */}
          <path d="M 20 365 L 20 380 L 35 380" />
          {/* Bottom-right */}
          <path d="M 365 380 L 380 380 L 380 365" />
        </g>

        {/* ===== DATA READOUTS ===== */}
        {dataReadouts.map((item, i) => (
          <g
            key={`data-${i}`}
            style={{
              animation: `flicker ${3 + i * 0.7}s ease-in-out infinite ${i * 0.5}s`,
            }}
          >
            {/* Label */}
            <text
              x={item.x}
              y={item.y}
              fill={item.color}
              fontSize="7"
              fontFamily="'Courier New', monospace"
              fontWeight="bold"
              letterSpacing="1.5"
              opacity="0.7"
              style={{
                filter: `drop-shadow(0 0 3px ${item.color}60)`,
              }}
            >
              {item.label}
            </text>
            {/* Value */}
            <text
              x={item.x}
              y={item.y + 12}
              fill={item.color}
              fontSize="10"
              fontFamily="'Courier New', monospace"
              fontWeight="bold"
              letterSpacing="1"
              style={{
                filter: `drop-shadow(0 0 4px ${item.color}80)`,
              }}
            >
              {item.value}
            </text>
            {/* Underline decoration */}
            <line
              x1={item.x}
              y1={item.y + 15}
              x2={item.x + 55}
              y2={item.y + 15}
              stroke={item.color}
              strokeWidth="0.5"
              opacity="0.3"
            />
          </g>
        ))}

        {/* ===== STATUS INDICATORS ===== */}
        {indicators.map((ind, i) => (
          <g key={`ind-${i}`}>
            <circle
              cx={ind.x}
              cy={ind.y}
              r="3"
              fill={ind.color}
              filter="url(#glowSoft)"
              style={{
                animation: `statusBlink ${1.5 + i * 0.3}s ease-in-out infinite ${i * 0.4}s`,
              }}
            />
            <text
              x={ind.x < 200 ? ind.x + 8 : ind.x - 8}
              y={ind.y + 3}
              fill={COLORS.cyan}
              fontSize="5"
              fontFamily="'Courier New', monospace"
              textAnchor={ind.x < 200 ? 'start' : 'end'}
              opacity="0.5"
            >
              {ind.label}
            </text>
          </g>
        ))}

        {/* ===== ADDITIONAL DECORATIVE ELEMENTS ===== */}

        {/* Breathing circle segments */}
        {[70, 55].map((r, i) => (
          <circle
            key={`breathe-${i}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={i === 0 ? COLORS.cyan : COLORS.emerald}
            strokeWidth="0.5"
            strokeDasharray="2 6"
            style={{
              animation: `breathe ${4 + i}s ease-in-out infinite ${i * 1}s`,
            }}
          />
        ))}

        {/* Small decorative arcs near data readouts */}
        <g opacity="0.3">
          <path
            d={describeArc(55, 60, 35, 250, 290)}
            fill="none"
            stroke={COLORS.cyan}
            strokeWidth="0.8"
          />
          <path
            d={describeArc(340, 60, 35, 250, 290)}
            fill="none"
            stroke={COLORS.emerald}
            strokeWidth="0.8"
          />
          <path
            d={describeArc(55, 345, 35, 70, 110)}
            fill="none"
            stroke={COLORS.teal}
            strokeWidth="0.8"
          />
          <path
            d={describeArc(340, 345, 35, 70, 110)}
            fill="none"
            stroke={networkColor}
            strokeWidth="0.8"
          />
        </g>

        {/* System status text at top */}
        <text
          x={cx}
          y={12}
          fill={statusColor}
          fontSize="7"
          fontFamily="'Courier New', monospace"
          fontWeight="bold"
          letterSpacing="3"
          textAnchor="middle"
          style={{
            animation: 'textGlow 3s ease-in-out infinite',
            filter: `drop-shadow(0 0 4px ${statusGlow})`,
          }}
        >
          ● {systemStatus.toUpperCase()}
        </text>

        {/* Bottom system label */}
        <text
          x={cx}
          y={394}
          fill={COLORS.cyan}
          fontSize="6"
          fontFamily="'Courier New', monospace"
          letterSpacing="2"
          textAnchor="middle"
          opacity="0.4"
        >
          AIOS JARVIS HUD v3.2
        </text>
      </svg>
    </div>
  );
};

export default JarvisHUD;
