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
      websocketRef.current?.close()
      websocketRef.current = null
      return
    }

    const token = getStoredToken()
    if (!token) {
      return
    }

    const socket = new WebSocket(`${getWebSocketUrl()}?token=${encodeURIComponent(token)}`)
    websocketRef.current = socket

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

    socket.onclose = () => {
      if (websocketRef.current === socket) {
        websocketRef.current = null
      }
    }

    return () => {
      if (websocketRef.current === socket) {
        websocketRef.current = null
      }
      socket.close()
    }
  }, [enabled, refresh, trackingEnabled])

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
