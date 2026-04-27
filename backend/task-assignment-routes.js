/**
 * Task Assignment Routes
 * API endpoints for assigning and managing custom tasks to AI agents
 */

import { Router } from 'express'
import { asyncHandler, getCurrentTimestamp } from './utils.js'

export function createTaskAssignmentRouter(taskManager, authMiddleware) {
  const router = Router()

  // Assign a single task to an agent
  router.post('/assign', authMiddleware, asyncHandler(async (req, res) => {
    const { agentId, taskDescription, taskType, priority, parameters, deadline, shipmentId } = req.body

    if (!agentId || !taskDescription) {
      return res.status(400).json({ error: 'agentId and taskDescription required' })
    }

    const result = await taskManager.assignTask({
      agentId,
      taskDescription,
      taskType: taskType || 'custom',
      priority: priority || 'medium',
      parameters: parameters || {},
      deadline,
      userId: req.user.id,
      shipmentId,
      context: { user: req.user }
    })

    res.json({
      ...result,
      timestamp: getCurrentTimestamp()
    })
  }))

  // Assign multiple tasks at once
  router.post('/batch-assign', authMiddleware, asyncHandler(async (req, res) => {
    const { assignments } = req.body

    if (!Array.isArray(assignments)) {
      return res.status(400).json({ error: 'assignments must be an array' })
    }

    // Add userId and context to each assignment
    const enrichedAssignments = assignments.map(a => ({
      ...a,
      userId: req.user.id,
      context: { user: req.user }
    }))

    const result = await taskManager.assignMultipleTasks(enrichedAssignments)

    res.json({
      ...result,
      timestamp: getCurrentTimestamp()
    })
  }))

  // Execute pending tasks
  router.post('/execute-pending', authMiddleware, asyncHandler(async (req, res) => {
    const results = await taskManager.executePendingTasks()

    res.json({
      executedTasks: results.length,
      results: results.slice(0, 20), // Return first 20 results
      timestamp: getCurrentTimestamp()
    })
  }))

  // Get task status
  router.get('/status/:taskId', authMiddleware, asyncHandler(async (req, res) => {
    const { taskId } = req.params

    const status = taskManager.getTaskStatus(taskId)

    if (status.error) {
      return res.status(404).json(status)
    }

    res.json({
      ...status,
      timestamp: getCurrentTimestamp()
    })
  }))

  // Get all tasks for current user
  router.get('/my-tasks', authMiddleware, asyncHandler(async (req, res) => {
    const tasks = taskManager.getUserTasks(req.user.id)

    res.json({
      userId: req.user.id,
      ...tasks,
      totalTasks: Object.values(tasks).reduce((sum, arr) => sum + arr.length, 0),
      timestamp: getCurrentTimestamp()
    })
  }))

  // Get queue statistics
  router.get('/queue-stats', authMiddleware, asyncHandler(async (req, res) => {
    const stats = taskManager.getQueueStats()

    res.json({
      ...stats,
      timestamp: getCurrentTimestamp()
    })
  }))

  // Cancel a task
  router.post('/cancel/:taskId', authMiddleware, asyncHandler(async (req, res) => {
    const { taskId } = req.params

    const result = taskManager.cancelTask(taskId)

    if (!result.success) {
      return res.status(400).json(result)
    }

    res.json({
      ...result,
      timestamp: getCurrentTimestamp()
    })
  }))

  // Retry a failed task
  router.post('/retry/:taskId', authMiddleware, asyncHandler(async (req, res) => {
    const { taskId } = req.params

    const result = await taskManager.retryTask(taskId)

    if (!result.success) {
      return res.status(400).json(result)
    }

    res.json({
      ...result,
      timestamp: getCurrentTimestamp()
    })
  }))

  // Get task history
  router.get('/history', authMiddleware, asyncHandler(async (req, res) => {
    const { agentId, status, startDate, endDate } = req.query

    const history = taskManager.getTaskHistory({
      userId: req.user.id,
      agentId,
      status,
      startDate,
      endDate
    })

    res.json({
      ...history,
      timestamp: getCurrentTimestamp()
    })
  }))

  // Get available task types for an agent
  router.get('/agent/:agentId/task-types', authMiddleware, asyncHandler(async (req, res) => {
    const { agentId } = req.params

    const taskTypes = taskManager.getAvailableTaskTypes(agentId)

    if (taskTypes.error) {
      return res.status(404).json(taskTypes)
    }

    res.json({
      ...taskTypes,
      timestamp: getCurrentTimestamp()
    })
  }))

  // Quick assign with predefined task types
  router.post('/quick-assign', authMiddleware, asyncHandler(async (req, res) => {
    const { agentId, quickTaskType, shipmentId, priority } = req.body

    if (!agentId || !quickTaskType) {
      return res.status(400).json({ error: 'agentId and quickTaskType required' })
    }

    // Predefined quick tasks
    const quickTasks = {
      'analyze-shipment': {
        taskDescription: `Analyze shipment ${shipmentId || 'current'} for risks and performance`,
        taskType: 'analyze',
        parameters: { shipmentId, scope: 'full' }
      },
      'optimize-route': {
        taskDescription: `Optimize route for shipment ${shipmentId || 'current'}`,
        taskType: 'optimize-route',
        parameters: { shipmentId, options: 'fastest' }
      },
      'detect-issues': {
        taskDescription: `Detect issues and disruptions for shipment ${shipmentId || 'current'}`,
        taskType: 'detect-risk',
        parameters: { shipmentId, sensitivity: 'high' }
      },
      'send-updates': {
        taskDescription: `Send updates for shipment ${shipmentId || 'current'}`,
        taskType: 'send-notification',
        parameters: { shipmentId, audiences: ['customer', 'operator'] }
      },
      'crisis-response': {
        taskDescription: `Handle crisis for shipment ${shipmentId || 'current'}`,
        taskType: 'handle-crisis',
        parameters: { shipmentId, escalate: true }
      }
    }

    const taskConfig = quickTasks[quickTaskType]
    if (!taskConfig) {
      return res.status(400).json({
        error: `Unknown quick task type: ${quickTaskType}`,
        availableTypes: Object.keys(quickTasks)
      })
    }

    const result = await taskManager.assignTask({
      agentId,
      ...taskConfig,
      priority: priority || 'medium',
      userId: req.user.id,
      shipmentId,
      context: { user: req.user, quickTask: true }
    })

    res.json({
      ...result,
      timestamp: getCurrentTimestamp()
    })
  }))

  // Advanced task builder
  router.post('/build-task', authMiddleware, asyncHandler(async (req, res) => {
    const { agentId, functionName, parameters, priority, shipmentId, description } = req.body

    if (!agentId || !functionName) {
      return res.status(400).json({ error: 'agentId and functionName required' })
    }

    const agent = taskManager.orchestrator?.getAgentCapabilities(agentId)
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    if (!agent.functions[functionName]) {
      return res.status(400).json({
        error: `Function ${functionName} not found on agent`,
        availableFunctions: Object.keys(agent.functions)
      })
    }

    const result = await taskManager.assignTask({
      agentId,
      taskDescription: description || `Execute ${functionName}`,
      taskType: functionName,
      parameters: parameters || {},
      priority: priority || 'medium',
      userId: req.user.id,
      shipmentId,
      context: { user: req.user, function: functionName }
    })

    res.json({
      ...result,
      timestamp: getCurrentTimestamp()
    })
  }))

  return router
}

export default createTaskAssignmentRouter
