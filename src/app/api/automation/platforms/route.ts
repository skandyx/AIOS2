import { NextResponse } from 'next/server'

interface AutomationPlatform {
  id: string
  name: string
  icon: string
  description: string
  url: string
  port: number
}

const PLATFORMS: AutomationPlatform[] = [
  {
    id: 'activepieces',
    name: 'Activepieces',
    icon: '🧩',
    description: 'Open-source alternative to Zapier/n8n',
    url: 'http://localhost:4200',
    port: 4200,
  },
  {
    id: 'node-red',
    name: 'Node-RED',
    icon: '🔴',
    description: 'Flow-based programming tool',
    url: 'http://localhost:1880',
    port: 1880,
  },
  {
    id: 'huginn',
    name: 'Huginn',
    icon: '🦅',
    description: 'Agent-based automation system',
    url: 'http://localhost:3100',
    port: 3100,
  },
  {
    id: 'n8n',
    name: 'n8n',
    icon: '⚡',
    description: 'Workflow automation platform',
    url: 'http://localhost:5678',
    port: 5678,
  },
]

// GET /api/automation/platforms - Return automation platform definitions
// Client-side will check reachability since server-side port checks can block
export async function GET() {
  return NextResponse.json(PLATFORMS)
}
