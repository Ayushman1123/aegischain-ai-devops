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
const API_BASE_STORAGE_KEY = 'aegischain.api.base'
const REQUEST_TIMEOUT_MS = 10000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 500

let activeApiBase = ''

function normalizeBase(base: string) {
  if (!base) {
    return ''
  }
  return base.replace(/\/+$/, '')
}

function getCodespacesSiblingOrigins() {
  const { protocol, host } = window.location
  const match = host.match(/^(.*)-(\d+)(\..+)$/)
  if (!match) {
    return []
  }

  const [, prefix, activePort, suffix] = match
  const candidatePorts = ['5000', '4173', '4174', '4175', '8787']

  return candidatePorts
    .filter((port) => port !== activePort)
    .map((port) => `${protocol}//${prefix}-${port}${suffix}`)
}

function getApiBaseCandidates() {
  const candidates = new Set<string>()

  if (API_BASE_URL) {
    candidates.add(normalizeBase(API_BASE_URL))
  }

  if (activeApiBase && !activeApiBase.includes('localhost') && !activeApiBase.match(/:\d+$/)) {
    candidates.add(normalizeBase(activeApiBase))
  }

  const stored = localStorage.getItem(API_BASE_STORAGE_KEY)
  if (stored && !stored.includes('localhost') && !stored.match(/:\d+$/)) {
    candidates.add(normalizeBase(stored))
  }

  // Always try same-origin (proxied by Vite) — works in Codespaces and local dev
  candidates.add('')

  // If current page is on a non-proxied Codespaces port, try sibling forwarded ports.
  for (const origin of getCodespacesSiblingOrigins()) {
    candidates.add(normalizeBase(origin))
  }

  return [...candidates]
}

function persistWorkingApiBase(base: string) {
  const normalized = normalizeBase(base)
  activeApiBase = normalized
  localStorage.setItem(API_BASE_STORAGE_KEY, normalized)
}

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

  for (const apiBase of getApiBaseCandidates()) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      const headers = new Headers(init?.headers)
      headers.set('Content-Type', 'application/json')
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const response = await fetch(`${apiBase}${path}`, {
          ...init,
          headers,
          signal: controller.signal,
        })

        if (!response.ok) {
          if (attempt < MAX_RETRIES && shouldRetryStatus(response.status)) {
            await wait(RETRY_DELAY_MS * attempt)
            continue
          }

          if ([404, 502, 503, 504].includes(response.status)) {
            lastError = new Error(response.statusText || 'Request failed')
            break
          }

          const payload = await response.json().catch(() => ({ error: 'Request failed' })) as { error?: string }
          throw new Error(payload.error || 'Request failed')
        }

        persistWorkingApiBase(apiBase)
        const body = await response.text()
        try {
          return JSON.parse(body) as T
        } catch {
          throw new Error('Server returned an unexpected response. Please try again.')
        }
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
  const stored = localStorage.getItem(API_BASE_STORAGE_KEY)
  const preferredBase = normalizeBase(API_BASE_URL || activeApiBase || stored || '')

  if (preferredBase) {
    const base = preferredBase.replace(/^http/i, 'ws')
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
