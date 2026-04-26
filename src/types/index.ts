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
  predictiveDisruptionProbability?: number
  predictiveSignals?: PredictiveDisruptionSignals
  factors: RiskFactor[]
  recommendations: string[]
  analysisTimestamp: string
  analyzedBy: string[]
}

export interface PredictiveDisruptionSignals {
  etaVariance: number
  weatherAnomaly: number
  portCongestionAnomaly: number
  fuelPriceAnomaly: number
  carrierReliabilityRisk: number
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

export interface HistoricalSnapshot {
  timestamp: string
  location: Coordinates
  speed: number
  riskScore: number
  status: ShipmentStatus
  eta: string
  progress: number
}

export interface PaymentTransaction {
  id: string
  shipmentId: string
  amount: number
  currency: string
  status: 'pending' | 'confirmed' | 'failed'
  blockchainHash?: string
  timestamp: string
  from: string
  to: string
  gasUsed?: number
}

export interface WeatherData {
  location: Coordinates
  temperature: number
  conditions: string
  windSpeed: number
  precipitation: number
  visibility: number
  alerts: WeatherAlert[]
}

export interface WeatherAlert {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  validUntil: string
}

export interface TrafficData {
  location: Coordinates
  congestionLevel: number
  averageSpeed: number
  incidents: TrafficIncident[]
  delayMinutes: number
}

export interface TrafficIncident {
  type: 'accident' | 'construction' | 'closure' | 'congestion'
  severity: 'low' | 'medium' | 'high'
  description: string
  location: Coordinates
}

export interface NotificationAlert {
  id: string
  type: 'eta_update' | 'delay' | 'risk_increase' | 'weather' | 'traffic' | 'crisis'
  shipmentId: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'success'
  timestamp: string
  read: boolean
  actionRequired: boolean
}

export interface AgentWorkflowStep {
  id: string
  agentId: string
  agentName: string
  action: string
  input: Record<string, any>
  output: Record<string, any>
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime: string
  endTime?: string
  duration?: number
}
