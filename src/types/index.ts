export type AgentStatus = 'idle' | 'active' | 'processing' | 'error' | 'success'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type ShipmentStatus = 'scheduled' | 'in-transit' | 'delayed' | 'delivered' | 'crisis'

export interface Agent {
  id: string
  name: string
  role: string
  status: AgentStatus
  lastActivity: string
  description: string
}

export interface Coordinates {
  lat: number
  lng: number
}

export interface LocationUpdate {
  timestamp: string
  location: Coordinates
  speed: number
  heading: number
}

export interface Shipment {
  id: string
  name: string
  origin: string
  destination: string
  originCoords: Coordinates
  destinationCoords: Coordinates
  currentLocation: Coordinates
  status: ShipmentStatus
  riskScore: number
  riskLevel: RiskLevel
  eta: string
  etaTimestamp: number
  progress: number
  lastUpdate: string
  locationHistory: LocationUpdate[]
  estimatedDistance: number
  remainingDistance: number
  averageSpeed: number
}

export interface AgentActivity {
  id: string
  agentId: string
  agentName: string
  timestamp: string
  action: string
  details: string
  type: 'info' | 'warning' | 'error' | 'success'
}

export interface RiskAnalysis {
  shipmentId: string
  riskScore: number
  riskLevel: RiskLevel
  factors: RiskFactor[]
  recommendations: string[]
  analysisTimestamp: string
  analyzedBy: string[]
}

export interface RiskFactor {
  category: string
  severity: RiskLevel
  description: string
  impact: number
}

export interface CrisisEvent {
  id: string
  shipmentId: string
  title: string
  description: string
  severity: RiskLevel
  timestamp: string
  status: 'active' | 'resolving' | 'resolved'
  affectedStakeholders: string[]
  responseActions: ResponseAction[]
}

export interface ResponseAction {
  id: string
  action: string
  assignedAgent: string
  status: 'pending' | 'in-progress' | 'completed'
  timestamp: string
}

export interface Stakeholder {
  id: string
  name: string
  role: string
  contact: string
  affectedShipments: string[]
}

export interface BlockchainEvent {
  id: string
  eventType: string
  data: Record<string, any>
  hash: string
  timestamp: string
  verified: boolean
}

export interface OptimizationResult {
  alternatives: RouteAlternative[]
  recommendation: string
  estimatedSavings: {
    time: number
    cost: number
  }
}

export interface RouteAlternative {
  id: string
  description: string
  estimatedTime: string
  estimatedCost: number
  reliability: number
  tradeoffs: string[]
}
