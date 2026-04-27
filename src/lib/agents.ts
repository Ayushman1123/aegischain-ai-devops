import type { Agent, Shipment, AgentActivity, RiskAnalysis, CrisisEvent, RiskLevel, ShipmentStatus, AgentStatus } from '@/types'
import { CITY_COORDINATES, interpolatePosition, calculateDistance, calculateETA, generateLocationHistory } from '@/lib/tracking'

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

function createShipment(
  id: string,
  name: string,
  origin: string,
  destination: string,
  status: ShipmentStatus,
  riskScore: number,
  riskLevel: RiskLevel,
  progress: number,
  lastUpdate: string,
  averageSpeed: number = 80
): Shipment {
  const originCoords = CITY_COORDINATES[origin]
  const destinationCoords = CITY_COORDINATES[destination]
  const currentLocation = interpolatePosition(originCoords, destinationCoords, progress)
  const estimatedDistance = calculateDistance(originCoords, destinationCoords)
  const remainingDistance = calculateDistance(currentLocation, destinationCoords)
  const { eta, etaTimestamp } = calculateETA(currentLocation, destinationCoords, averageSpeed)
  const locationHistory = generateLocationHistory(originCoords, currentLocation, progress)

  return {
    id,
    name,
    origin,
    destination,
    originCoords,
    destinationCoords,
    currentLocation,
    status,
    riskScore,
    riskLevel,
    eta,
    etaTimestamp,
    progress,
    lastUpdate,
    locationHistory,
    estimatedDistance,
    remainingDistance,
    averageSpeed,
  }
}

export const SAMPLE_SHIPMENTS: Shipment[] = [
  createShipment(
    'SHP-2024-001',
    'Medical Supplies - Chicago',
    'New York, NY',
    'Chicago, IL',
    'in-transit',
    32,
    'low',
    67,
    'On schedule, no delays detected',
    85
  ),
  createShipment(
    'SHP-2024-002',
    'Electronics - Seattle',
    'Los Angeles, CA',
    'Seattle, WA',
    'delayed',
    68,
    'medium',
    45,
    'Weather delay in Portland area',
    65
  ),
  createShipment(
    'SHP-2024-003',
    'Perishable Goods - Miami',
    'Atlanta, GA',
    'Miami, FL',
    'crisis',
    89,
    'critical',
    58,
    'Refrigeration system failure detected',
    40
  ),
  createShipment(
    'SHP-2024-004',
    'Manufacturing Parts - Detroit',
    'Cleveland, OH',
    'Detroit, MI',
    'in-transit',
    45,
    'medium',
    72,
    'Minor traffic delays on I-75',
    75
  ),
  createShipment(
    'SHP-2024-005',
    'Pharmaceuticals - Boston',
    'Philadelphia, PA',
    'Boston, MA',
    'in-transit',
    28,
    'low',
    81,
    'Ahead of schedule',
    90
  ),
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

export function generateMockShipments(): Shipment[] {
  return [...SAMPLE_SHIPMENTS]
}

export function generateMockNotifications(): import('@/types').NotificationAlert[] {
  const now = new Date()
  return [
    {
      id: 'notif-1',
      type: 'crisis',
      shipmentId: 'SHP-2024-003',
      title: 'Critical Alert: Refrigeration Failure',
      message: 'Perishable Goods - Miami shipment experiencing refrigeration system failure',
      severity: 'error',
      timestamp: new Date(now.getTime() - 300000).toISOString(),
      read: false,
      actionRequired: true,
    },
    {
      id: 'notif-2',
      type: 'delay',
      shipmentId: 'SHP-2024-002',
      title: 'Weather Delay',
      message: 'Electronics - Seattle shipment delayed due to weather in Portland area',
      severity: 'warning',
      timestamp: new Date(now.getTime() - 600000).toISOString(),
      read: false,
      actionRequired: false,
    },
    {
      id: 'notif-3',
      type: 'eta_update',
      shipmentId: 'SHP-2024-005',
      title: 'ETA Update: Ahead of Schedule',
      message: 'Pharmaceuticals - Boston shipment is ahead of schedule',
      severity: 'success',
      timestamp: new Date(now.getTime() - 900000).toISOString(),
      read: false,
      actionRequired: false,
    },
    {
      id: 'notif-4',
      type: 'traffic',
      shipmentId: 'SHP-2024-004',
      title: 'Traffic Delay',
      message: 'Manufacturing Parts - Detroit experiencing minor traffic delays on I-75',
      severity: 'info',
      timestamp: new Date(now.getTime() - 1200000).toISOString(),
      read: true,
      actionRequired: false,
    },
  ]
}
