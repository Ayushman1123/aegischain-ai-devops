import type { Agent, Shipment, AgentActivity, RiskAnalysis, CrisisEvent, RiskLevel, ShipmentStatus, AgentStatus } from '@/types'

export const AGENTS: Agent[] = [
  {
    id: 'planner',
    name: 'Planner Agent',
    role: 'Master Orchestrator',
    status: 'active',
    lastActivity: 'Coordinating multi-agent workflow',
    description: 'Breaks down complex tasks into subtasks and delegates to specialized agents'
  },
  {
    id: 'risk-detection',
    name: 'Risk Detection Agent',
    role: 'Threat Analysis',
    status: 'active',
    lastActivity: 'Scanning for supply chain disruptions',
    description: 'Detects delays, weather events, and anomalies in real-time'
  },
  {
    id: 'supply-optimization',
    name: 'Supply Chain Optimizer',
    role: 'Route Planning',
    status: 'idle',
    lastActivity: 'Standing by for optimization requests',
    description: 'Suggests alternate routes and logistics strategies'
  },
  {
    id: 'crisis-response',
    name: 'Crisis Response Agent',
    role: 'Emergency Management',
    status: 'idle',
    lastActivity: 'Monitoring for critical events',
    description: 'Handles emergency protocols and escalation procedures'
  },
  {
    id: 'communication',
    name: 'Communication Agent',
    role: 'Stakeholder Relations',
    status: 'idle',
    lastActivity: 'Ready to notify stakeholders',
    description: 'Drafts and sends contextual notifications to affected parties'
  },
  {
    id: 'blockchain',
    name: 'Blockchain Logger',
    role: 'Immutable Audit',
    status: 'active',
    lastActivity: 'Logging events to distributed ledger',
    description: 'Creates tamper-proof records of critical events'
  },
  {
    id: 'rag',
    name: 'RAG Context Agent',
    role: 'Knowledge Retrieval',
    status: 'active',
    lastActivity: 'Indexing supply chain documentation',
    description: 'Retrieves factual context to ground AI responses'
  },
  {
    id: 'executor',
    name: 'Executor Agent',
    role: 'Action Execution',
    status: 'idle',
    lastActivity: 'Awaiting tool calls',
    description: 'Executes approved actions and tool invocations'
  }
]

export const SAMPLE_SHIPMENTS: Shipment[] = [
  {
    id: 'SHP-2024-001',
    name: 'Medical Supplies - Chicago',
    origin: 'New York, NY',
    destination: 'Chicago, IL',
    status: 'in-transit',
    riskScore: 32,
    riskLevel: 'low',
    eta: '2 hours',
    progress: 67,
    lastUpdate: 'On schedule, no delays detected'
  },
  {
    id: 'SHP-2024-002',
    name: 'Electronics - Seattle',
    origin: 'Los Angeles, CA',
    destination: 'Seattle, WA',
    status: 'delayed',
    riskScore: 68,
    riskLevel: 'medium',
    eta: '6 hours (delayed 2h)',
    progress: 45,
    lastUpdate: 'Weather delay in Portland area'
  },
  {
    id: 'SHP-2024-003',
    name: 'Perishable Goods - Miami',
    origin: 'Atlanta, GA',
    destination: 'Miami, FL',
    status: 'crisis',
    riskScore: 89,
    riskLevel: 'critical',
    eta: 'Unknown',
    progress: 58,
    lastUpdate: 'Refrigeration system failure detected'
  },
  {
    id: 'SHP-2024-004',
    name: 'Manufacturing Parts - Detroit',
    origin: 'Cleveland, OH',
    destination: 'Detroit, MI',
    status: 'in-transit',
    riskScore: 45,
    riskLevel: 'medium',
    eta: '3.5 hours',
    progress: 72,
    lastUpdate: 'Minor traffic delays on I-75'
  },
  {
    id: 'SHP-2024-005',
    name: 'Pharmaceuticals - Boston',
    origin: 'Philadelphia, PA',
    destination: 'Boston, MA',
    status: 'in-transit',
    riskScore: 28,
    riskLevel: 'low',
    eta: '1.5 hours',
    progress: 81,
    lastUpdate: 'Ahead of schedule'
  }
]

export function getRiskLevelColor(level: RiskLevel): string {
  const colors = {
    low: 'text-success',
    medium: 'text-warning',
    high: 'text-destructive',
    critical: 'text-destructive'
  }
  return colors[level]
}

export function getRiskLevelBg(level: RiskLevel): string {
  const colors = {
    low: 'bg-success/20 border-success/30',
    medium: 'bg-warning/20 border-warning/30',
    high: 'bg-destructive/20 border-destructive/30',
    critical: 'bg-destructive/30 border-destructive/50'
  }
  return colors[level]
}

export function getShipmentStatusColor(status: ShipmentStatus): string {
  const colors = {
    scheduled: 'text-muted-foreground',
    'in-transit': 'text-accent',
    delayed: 'text-warning',
    delivered: 'text-success',
    crisis: 'text-destructive'
  }
  return colors[status]
}

export function getShipmentStatusBadge(status: ShipmentStatus): string {
  const badges = {
    scheduled: 'bg-muted text-muted-foreground',
    'in-transit': 'bg-accent/20 text-accent border-accent/30',
    delayed: 'bg-warning/20 text-warning border-warning/30',
    delivered: 'bg-success/20 text-success border-success/30',
    crisis: 'bg-destructive/20 text-destructive border-destructive/30'
  }
  return badges[status]
}

export function getAgentStatusColor(status: AgentStatus): string {
  const colors = {
    idle: 'text-muted-foreground',
    active: 'text-accent',
    processing: 'text-primary',
    error: 'text-destructive',
    success: 'text-success'
  }
  return colors[status]
}

export function getAgentStatusBg(status: AgentStatus): string {
  const colors = {
    idle: 'bg-muted',
    active: 'bg-accent/20',
    processing: 'bg-primary/20',
    error: 'bg-destructive/20',
    success: 'bg-success/20'
  }
  return colors[status]
}

export function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

export function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export function generateMockActivity(agents: Agent[]): AgentActivity[] {
  const activities: AgentActivity[] = []
  const now = new Date()
  
  agents.forEach((agent, idx) => {
    if (agent.status === 'active' || agent.status === 'processing') {
      activities.push({
        id: `activity-${agent.id}-${idx}`,
        agentId: agent.id,
        agentName: agent.name,
        timestamp: new Date(now.getTime() - idx * 30000).toISOString(),
        action: agent.lastActivity,
        details: `Processing workflow step ${idx + 1}`,
        type: 'info'
      })
    }
  })
  
  return activities.slice(0, 10)
}
