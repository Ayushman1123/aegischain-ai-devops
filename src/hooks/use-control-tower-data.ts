import { useCallback, useEffect, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type {
  Agent,
  AgentWorkflowStep,
  NotificationAlert,
  RiskAnalysis,
  Shipment,
} from '@/types'
import { AGENTS, generateMockShipments, generateMockNotifications } from '@/lib/agents'
import { simulateLocationUpdate } from '@/lib/tracking'
import { toast } from 'sonner'

export interface SupportMessage {
  id: string
  role: 'user' | 'assistant'
  message: string
  createdAt: string
  agentId?: string
}

export interface AgentTask {
  id: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  assignedAgentId: string
  shipmentId?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
  completedAt?: string
}

export function useControlTowerData(enabled: boolean) {
  const [shipments, setShipments] = useKV<Shipment[]>('shipments', [])
  const [agents, setAgents] = useKV<Agent[]>('agents', AGENTS)
  const [notifications, setNotifications] = useKV<NotificationAlert[]>('notifications', [])
  const [workflowSteps, setWorkflowSteps] = useKV<AgentWorkflowStep[]>('workflow-steps', [])
  const [agentTasks, setAgentTasks] = useKV<AgentTask[]>('agent-tasks', [])
  const [chatMessages, setChatMessages] = useKV<SupportMessage[]>('chat-messages', [])
  const [loading, setLoading] = useState(true)
  const [trackingEnabled, setTrackingEnabled] = useState(true)

  useEffect(() => {
    let mounted = true

    if (!enabled) {
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    const initialize = async () => {
      try {
        if (!shipments || shipments.length === 0) {
          const mockShipments = generateMockShipments()
          setShipments(() => mockShipments)
        }

        if (!notifications || notifications.length === 0) {
          const mockNotifications = generateMockNotifications()
          setNotifications(() => mockNotifications)
        }

        if (!agents || agents.length === 0) {
          setAgents(() => AGENTS)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [enabled, shipments, notifications, agents, setShipments, setNotifications, setAgents])

  useEffect(() => {
    if (!enabled || !trackingEnabled) {
      return
    }

    const intervalId = window.setInterval(() => {
      setShipments((current) =>
        (current || []).map((shipment) => simulateLocationUpdate(shipment))
      )
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [enabled, trackingEnabled, setShipments])

  const refresh = useCallback(async () => {
  }, [])

  const manualRefresh = useCallback(async () => {
    setShipments((current) =>
      (current || []).map((shipment) => simulateLocationUpdate(shipment))
    )
  }, [setShipments])

  const handleAnalyzeShipment = useCallback(
    async (shipmentId: string): Promise<RiskAnalysis> => {
      const shipment = shipments?.find((s) => s.id === shipmentId)
      if (!shipment) {
        throw new Error('Shipment not found')
      }

      const analysisPrompt = spark.llmPrompt`Analyze this shipment for potential supply chain risks:
      
Shipment ID: ${shipmentId}
Route: ${shipment.origin} → ${shipment.destination}
Current Status: ${shipment.status}
Current Risk Score: ${shipment.riskScore}
ETA: ${shipment.eta}
Progress: ${shipment.progress}%

Provide a detailed risk analysis including:
1. Risk factors (weather, delays, geopolitical, etc.)
2. Severity assessment
3. Actionable recommendations

Return the result as a valid JSON object with this structure:
{
  "riskScore": <number between 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "factors": [
    {
      "category": "<category name>",
      "severity": "<low|medium|high|critical>",
      "description": "<detailed description>",
      "impact": <number between 1-10>
    }
  ],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...]
}`

      const response = await spark.llm(analysisPrompt, 'gpt-4o', true)
      const parsed = JSON.parse(response)

      const analysis: RiskAnalysis = {
        shipmentId,
        riskScore: parsed.riskScore || shipment.riskScore,
        riskLevel: parsed.riskLevel || shipment.riskLevel,
        factors: parsed.factors || [],
        recommendations: parsed.recommendations || [],
        analysisTimestamp: new Date().toISOString(),
        analyzedBy: ['Risk Detection Agent', 'RAG Agent', 'Planner Agent'],
      }

      const steps: AgentWorkflowStep[] = [
        {
          id: `step-${Date.now()}-1`,
          agentId: 'planner',
          agentName: 'Planner Agent',
          action: 'Coordinate Analysis',
          input: { shipmentId },
          output: { status: 'delegated' },
          status: 'completed',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 250,
        },
        {
          id: `step-${Date.now()}-2`,
          agentId: 'risk-detection',
          agentName: 'Risk Detection Agent',
          action: 'Analyze Risk Factors',
          input: { shipment },
          output: analysis,
          status: 'completed',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 1200,
        },
        {
          id: `step-${Date.now()}-3`,
          agentId: 'rag',
          agentName: 'RAG Agent',
          action: 'Retrieve Context',
          input: { query: `risk factors for ${shipment.origin} to ${shipment.destination}` },
          output: { sources: 3, context: 'historical data retrieved' },
          status: 'completed',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 800,
        },
      ]

      setWorkflowSteps(() => steps)

      return analysis
    },
    [shipments, setWorkflowSteps]
  )

  const handleAnalyzeAll = useCallback(async (): Promise<RiskAnalysis[]> => {
    if (!shipments || shipments.length === 0) {
      return []
    }

    const analyses: RiskAnalysis[] = []

    for (const shipment of shipments.slice(0, 3)) {
      try {
        const analysis = await handleAnalyzeShipment(shipment.id)
        analyses.push(analysis)
      } catch (error) {
        console.error(`Failed to analyze shipment ${shipment.id}:`, error)
      }
    }

    toast.success(`Analyzed ${analyses.length} shipments`)
    return analyses
  }, [shipments, handleAnalyzeShipment])

  const handleAssignAgentTask = useCallback(
    async (payload: { 
      agentId?: string
      prompt: string
      shipmentId?: string
      priority?: 'low' | 'medium' | 'high' | 'critical'
    }) => {
      const taskPrompt = spark.llmPrompt`You are an AI agent orchestrator. Break down this task into executable steps:

Task: ${payload.prompt}
Priority: ${payload.priority || 'medium'}
${payload.agentId ? `Assigned to: ${payload.agentId}` : 'Auto-assign appropriate agents'}
${payload.shipmentId ? `Related shipment: ${payload.shipmentId}` : ''}

Provide a structured workflow with steps for execution. Return as JSON:
{
  "title": "<task title>",
  "description": "<task description>",
  "steps": [
    {
      "agentId": "<agent id>",
      "agentName": "<agent name>",
      "action": "<action description>",
      "estimatedDuration": <milliseconds>
    }
  ]
}`

      const response = await spark.llm(taskPrompt, 'gpt-4o', true)
      const parsed = JSON.parse(response)

      const now = new Date().toISOString()
      const task: AgentTask = {
        id: `task-${Date.now()}`,
        title: parsed.title || 'Agent Task',
        description: parsed.description || payload.prompt,
        status: 'completed',
        assignedAgentId: payload.agentId || 'planner',
        shipmentId: payload.shipmentId,
        priority: payload.priority || 'medium',
        createdAt: now,
        completedAt: now,
      }

      setAgentTasks((current) => [...(current || []), task])

      const steps: AgentWorkflowStep[] = (parsed.steps || []).map((step: any, idx: number) => ({
        id: `step-${Date.now()}-${idx}`,
        agentId: step.agentId || 'planner',
        agentName: step.agentName || 'Planner Agent',
        action: step.action || 'Execute task',
        input: { task: payload.prompt },
        output: { status: 'completed' },
        status: 'completed' as const,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: step.estimatedDuration || 500,
      }))

      setWorkflowSteps(() => steps)

      return task
    },
    [setAgentTasks, setWorkflowSteps]
  )

  const handleSendSupportMessage = useCallback(
    async (message: string) => {
      const userMessage: SupportMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        message,
        createdAt: new Date().toISOString(),
      }

      setChatMessages((current) => [...(current || []), userMessage])

      const chatPrompt = spark.llmPrompt`You are a helpful AI assistant for the AegisChain AI supply chain control tower. A user has sent you a message:

"${message}"

Provide a helpful, concise response addressing their question or concern. Be professional and informative.`

      const response = await spark.llm(chatPrompt, 'gpt-4o-mini')

      const assistantMessage: SupportMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        message: response,
        createdAt: new Date().toISOString(),
        agentId: 'communication',
      }

      setChatMessages((current) => [...(current || []), assistantMessage])

      return response
    },
    [setChatMessages]
  )

  const handleMarkNotificationRead = useCallback(
    async (id: string) => {
      setNotifications((current) =>
        (current || []).map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    },
    [setNotifications]
  )

  const handleMarkAllNotificationsRead = useCallback(async () => {
    setNotifications((current) => (current || []).map((n) => ({ ...n, read: true })))
  }, [setNotifications])

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      setAgentTasks((current) => (current || []).filter((t) => t.id !== taskId))
    },
    [setAgentTasks]
  )

  return {
    shipments: shipments || [],
    agents: agents || AGENTS,
    notifications: notifications || [],
    workflowSteps: workflowSteps || [],
    agentTasks: agentTasks || [],
    chatMessages: chatMessages || [],
    loading,
    isTracking: trackingEnabled,
    toggleTracking: () => setTrackingEnabled((value) => !value),
    manualRefresh,
    refresh,
    analyzeShipment: handleAnalyzeShipment,
    analyzeAllShipments: handleAnalyzeAll,
    assignAgentTask: handleAssignAgentTask,
    deleteTask: handleDeleteTask,
    sendSupportMessage: handleSendSupportMessage,
    markNotificationRead: handleMarkNotificationRead,
    markAllNotificationsRead: handleMarkAllNotificationsRead,
  }
}
