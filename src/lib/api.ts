import { getStoredToken } from '@/lib/auth'
import type {
  Agent,
  AgentWorkflowStep,
  BlockchainEvent,
  HistoricalSnapshot,
  NotificationAlert,
  PaymentTransaction,
  RiskAnalysis,
  Shipment,
} from '@/types'

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const API_BASE_URL = configuredApiBaseUrl ? configuredApiBaseUrl.replace(/\/+$/, '') : ''
const REQUEST_TIMEOUT_MS = 10000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 500

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function shouldRetryStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

type SupportMessage = {
  id: string
  role: 'user' | 'assistant'
  message: string
  createdAt: string
  agentId?: string
}

type AgentTask = {
  id: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  assignedAgentId: string
  shipmentId?: string
}

type DashboardResponse = {
  shipments: Shipment[]
  agents: Agent[]
  notifications: NotificationAlert[]
  crisisEvents: Array<Record<string, unknown>>
  stats: {
    totalShipments: number
    activeShipments: number
    criticalAlerts: number
    unreadNotifications: number
  }
}

type ShipmentHistoryTimelineItem = {
  id: string
  timestamp: string
  type: string
  title: string
  details: string
  severity?: 'info' | 'warning' | 'error' | 'success'
}

type ShipmentHistoryResponse = {
  shipmentId: string
  snapshots: HistoricalSnapshot[]
  timeline: ShipmentHistoryTimelineItem[]
  stats: {
    totalSnapshots: number
    totalRiskAnalyses: number
    totalNotifications: number
  }
}

type BlockchainPaymentResponse = {
  shipment: { id: string; name: string }
  transactions: PaymentTransaction[]
  events: BlockchainEvent[]
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const headers = new Headers(init?.headers)
    headers.set('Content-Type', 'application/json')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      })

      if (!response.ok) {
        if (attempt < MAX_RETRIES && shouldRetryStatus(response.status)) {
          await wait(RETRY_DELAY_MS * attempt)
          continue
        }
        const payload = await response.json().catch(() => ({ error: 'Request failed' })) as { error?: string }
        throw new Error(payload.error || 'Request failed')
      }

      return response.json() as Promise<T>
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === 'AbortError'
      lastError = isAbortError ? new Error('Backend request timed out') : (error as Error)

      if (attempt < MAX_RETRIES) {
        await wait(RETRY_DELAY_MS * attempt)
        continue
      }
    } finally {
      window.clearTimeout(timeout)
    }
  }

  throw new Error(lastError?.message || 'Cannot reach backend service. Please verify backend availability.')
}

export async function fetchDashboard() {
  return apiRequest<DashboardResponse>('/api/dashboard')
}

export async function fetchWorkflow() {
  return apiRequest<{ workflowSteps: AgentWorkflowStep[]; tasks: AgentTask[] }>('/api/agents/workflow')
}

export async function fetchNotifications() {
  return apiRequest<{ notifications: NotificationAlert[] }>('/api/notifications')
}

export async function simulateTracking() {
  return apiRequest<{ shipments: Shipment[]; notifications: NotificationAlert[] }>('/api/shipments/simulate', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function analyzeShipment(shipmentId: string) {
  return apiRequest<{ analysis: RiskAnalysis; workflowSteps: AgentWorkflowStep[] }>(`/api/agents/analyze/${shipmentId}`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function analyzeAllShipments() {
  return apiRequest<{ analyses: RiskAnalysis[]; workflowSteps: AgentWorkflowStep[] }>('/api/agents/analyze-all', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function assignAgentTask(payload: { agentId?: string; prompt: string; shipmentId?: string }) {
  return apiRequest<{ task: AgentTask; workflowSteps: AgentWorkflowStep[] }>('/api/agents/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function sendSupportMessage(message: string) {
  return apiRequest<{ reply: SupportMessage; messages: SupportMessage[] }>('/api/support/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export async function fetchSupportMessages() {
  return apiRequest<{ messages: SupportMessage[] }>('/api/support/chat')
}

export async function markNotificationRead(id: string) {
  return apiRequest<{ success: boolean }>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  })
}

export async function markAllNotificationsRead() {
  return apiRequest<{ success: boolean }>('/api/notifications/read-all', {
    method: 'PATCH',
    body: JSON.stringify({}),
  })
}

export async function fetchShipmentHistory(shipmentId: string) {
  return apiRequest<ShipmentHistoryResponse>(`/api/shipments/${shipmentId}/history`)
}

export async function fetchBlockchainPaymentData(shipmentId: string) {
  return apiRequest<BlockchainPaymentResponse>(`/api/blockchain/shipment/${shipmentId}`)
}

export async function createBlockchainPayment(payload: {
  shipmentId: string
  amount: number
  currency?: string
  from: string
  to: string
}) {
  return apiRequest<{ transaction: PaymentTransaction }>('/api/blockchain/payment', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getWebSocketUrl() {
  if (API_BASE_URL) {
    const base = API_BASE_URL.replace(/^http/i, 'ws')
    return `${base}/ws`
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export type {
  SupportMessage,
  AgentTask,
  ShipmentHistoryResponse,
  ShipmentHistoryTimelineItem,
  BlockchainPaymentResponse,
}
