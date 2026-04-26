import { useCallback, useEffect, useRef, useState } from 'react'
import type { Agent, AgentWorkflowStep, NotificationAlert, RiskAnalysis, Shipment } from '@/types'
import {
  analyzeAllShipments,
  analyzeShipment,
  assignAgentTask,
  fetchDashboard,
  fetchNotifications,
  fetchSupportMessages,
  fetchWorkflow,
  getWebSocketUrl,
  markAllNotificationsRead,
  markNotificationRead,
  sendSupportMessage,
  simulateTracking,
  type AgentTask,
  type SupportMessage,
} from '@/lib/api'
import { getStoredToken } from '@/lib/auth'

export function useControlTowerData(enabled: boolean) {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [notifications, setNotifications] = useState<NotificationAlert[]>([])
  const [workflowSteps, setWorkflowSteps] = useState<AgentWorkflowStep[]>([])
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([])
  const [chatMessages, setChatMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [trackingEnabled, setTrackingEnabled] = useState(true)
  const websocketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    const [dashboard, workflow, notifRes, chatRes] = await Promise.all([
      fetchDashboard(),
      fetchWorkflow(),
      fetchNotifications(),
      fetchSupportMessages(),
    ])

    setShipments(dashboard.shipments)
    setAgents(dashboard.agents)
    setNotifications(notifRes.notifications)
    setWorkflowSteps(workflow.workflowSteps)
    setAgentTasks(workflow.tasks)
    setChatMessages(chatRes.messages)
  }, [])

  useEffect(() => {
    let mounted = true

    if (!enabled) {
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    const load = async () => {
      try {
        await refresh()
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [enabled, refresh])

  useEffect(() => {
    if (!enabled || !trackingEnabled) {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      websocketRef.current?.close()
      websocketRef.current = null
      return
    }

    const token = getStoredToken()
    if (!token) {
      return
    }

    let stopped = false
    let reconnectDelay = 1000

    const connect = () => {
      if (stopped) {
        return
      }

      const socket = new WebSocket(`${getWebSocketUrl()}?token=${encodeURIComponent(token)}`)
      websocketRef.current = socket

      socket.onopen = () => {
        reconnectDelay = 1000
      }

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as {
            event: string
            payload?: {
              shipments?: Shipment[]
              notifications?: NotificationAlert[]
            }
          }

          if (parsed.event === 'tracking.updated') {
            if (parsed.payload?.shipments) {
              setShipments(parsed.payload.shipments)
            }
            if (parsed.payload?.notifications) {
              setNotifications((current) => [...parsed.payload!.notifications!, ...current].slice(0, 100))
            }
          }

          if (
            parsed.event === 'workflow.updated' ||
            parsed.event === 'blockchain.paymentConfirmed'
          ) {
            void refresh()
          }
        } catch {
          // Ignore malformed websocket payloads.
        }
      }

      socket.onerror = () => {
        socket.close()
      }

      socket.onclose = () => {
        if (websocketRef.current === socket) {
          websocketRef.current = null
        }

        if (!stopped) {
          reconnectTimerRef.current = window.setTimeout(() => {
            connect()
          }, reconnectDelay)
          reconnectDelay = Math.min(reconnectDelay * 2, 15000)
        }
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      websocketRef.current?.close()
      websocketRef.current = null
    }
  }, [enabled, refresh, trackingEnabled])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const intervalId = window.setInterval(() => {
      void refresh().catch(() => {
        // Keep running; retries are handled at request level.
      })
    }, 20000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [enabled, refresh])

  const manualRefresh = useCallback(async () => {
    await simulateTracking()
    await refresh()
  }, [refresh])

  const handleAnalyzeShipment = useCallback(async (shipmentId: string) => {
    const result = await analyzeShipment(shipmentId)
    setWorkflowSteps(result.workflowSteps)
    await refresh()
    return result.analysis
  }, [refresh])

  const handleAnalyzeAll = useCallback(async () => {
    const result = await analyzeAllShipments()
    setWorkflowSteps(result.workflowSteps)
    await refresh()
    return result.analyses
  }, [refresh])

  const handleAssignAgentTask = useCallback(async (payload: { agentId?: string; prompt: string; shipmentId?: string }) => {
    const result = await assignAgentTask(payload)
    setWorkflowSteps(result.workflowSteps)
    await refresh()
    return result.task
  }, [refresh])

  const handleSendSupportMessage = useCallback(async (message: string) => {
    const result = await sendSupportMessage(message)
    setChatMessages(result.messages)
    return result.reply
  }, [])

  const handleMarkNotificationRead = useCallback(async (id: string) => {
    await markNotificationRead(id)
    await refresh()
  }, [refresh])

  const handleMarkAllNotificationsRead = useCallback(async () => {
    await markAllNotificationsRead()
    await refresh()
  }, [refresh])

  return {
    shipments,
    agents,
    notifications,
    workflowSteps,
    agentTasks,
    chatMessages,
    loading,
    isTracking: trackingEnabled,
    toggleTracking: () => setTrackingEnabled((value) => !value),
    manualRefresh,
    refresh,
    analyzeShipment: handleAnalyzeShipment,
    analyzeAllShipments: handleAnalyzeAll,
    assignAgentTask: handleAssignAgentTask,
    sendSupportMessage: handleSendSupportMessage,
    markNotificationRead: handleMarkNotificationRead,
    markAllNotificationsRead: handleMarkAllNotificationsRead,
  }
}
