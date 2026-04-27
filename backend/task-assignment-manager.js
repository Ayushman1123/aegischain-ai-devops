/**
 * Task Assignment System for AI Agents
 * Allows users to assign custom tasks to specific agents via the orchestrator
 */

class TaskAssignmentManager {
  constructor(db, agentOrchestrator) {
    this.db = db
    this.orchestrator = agentOrchestrator
    this.taskQueue = []
    this.activeTasks = new Map()
    this.completedTasks = []
  }

  /**
   * Create and assign a custom task to an agent
   */
  async assignTask(assignmentRequest) {
    const {
      agentId,
      taskDescription,
      taskType,
      priority = 'medium',
      parameters = {},
      deadline,
      userId,
      shipmentId,
      context = {}
    } = assignmentRequest

    // Validate agent exists
    const agent = this.orchestrator.getAgentCapabilities(agentId)
    if (!agent) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
        taskId: null
      }
    }

    // Create task object
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(7)}`,
      agentId,
      taskDescription,
      taskType,
      priority,
      parameters,
      deadline,
      userId,
      shipmentId,
      context,
      status: 'pending',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      retryCount: 0,
      maxRetries: 3
    }

    // Add to queue
    this.taskQueue.push(task)
    this.activeTasks.set(task.id, task)

    return {
      success: true,
      taskId: task.id,
      message: `Task assigned to ${agent.name}`,
      task
    }
  }

  /**
   * Assign multiple tasks at once
   */
  async assignMultipleTasks(assignments) {
    const results = []

    for (const assignment of assignments) {
      const result = await this.assignTask(assignment)
      results.push(result)
    }

    return {
      totalAssignments: assignments.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results
    }
  }

  /**
   * Execute pending tasks from the queue
   */
  async executePendingTasks() {
    // Sort by priority
    const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 }
    this.taskQueue.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority])

    const executionResults = []

    for (const task of this.taskQueue) {
      if (task.status === 'pending') {
        const result = await this.executeTask(task)
        executionResults.push(result)
      }
    }

    // Remove completed tasks from queue
    this.taskQueue = this.taskQueue.filter(t => t.status === 'pending')

    return executionResults
  }

  /**
   * Execute a single task
   */
  async executeTask(task) {
    try {
      task.status = 'executing'
      task.startedAt = new Date().toISOString()

      // Get agent capabilities
      const agentCapabilities = this.orchestrator.getAgentCapabilities(task.agentId)
      if (!agentCapabilities) {
        throw new Error(`Agent ${task.agentId} not found`)
      }

      // Get the appropriate function from agent
      const functionName = this.determineFunctionName(task)
      const agentFunction = agentCapabilities.functions[functionName]

      if (!agentFunction) {
        throw new Error(`Function ${functionName} not found on agent ${task.agentId}`)
      }

      // Execute the function
      let result = await agentFunction(task.context, task.parameters)

      // If result is a promise, await it
      if (result && typeof result.then === 'function') {
        result = await result
      }

      task.status = 'completed'
      task.result = result
      task.completedAt = new Date().toISOString()

      // Move to completed tasks
      this.completedTasks.push(task)
      this.activeTasks.delete(task.id)

      return {
        taskId: task.id,
        status: 'completed',
        result,
        executionTime: new Date(task.completedAt) - new Date(task.startedAt)
      }
    } catch (error) {
      task.error = error.message
      task.retryCount++

      if (task.retryCount < task.maxRetries) {
        task.status = 'pending'
        return {
          taskId: task.id,
          status: 'retry',
          error: error.message,
          retryCount: task.retryCount,
          maxRetries: task.maxRetries
        }
      } else {
        task.status = 'failed'
        task.completedAt = new Date().toISOString()
        this.activeTasks.delete(task.id)

        return {
          taskId: task.id,
          status: 'failed',
          error: error.message,
          message: `Task failed after ${task.retryCount} retries`
        }
      }
    }
  }

  /**
   * Determine which function to call based on task type
   */
  determineFunctionName(task) {
    const typeMap = {
      'analyze': 'scanShipmentHealth',
      'detect-risk': 'detectDisruptions',
      'score-risk': 'scoreRisk',
      'optimize-route': 'optimizeRoute',
      'calculate-eta': 'calculateETAConfidence',
      'recommend-speed': 'recommendSpeedAdjustments',
      'send-notification': 'generateStatusUpdate',
      'create-alert': 'createAlert',
      'gather-data': 'gatherRouteContext',
      'retrieve-context': 'retrieveHistoricalData',
      'execute-action': 'executeAction',
      'log-event': 'logEvent',
      'handle-crisis': 'handleIncident',
    }

    return typeMap[task.taskType] || 'breakdownTask'
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId) {
    const task = this.activeTasks.get(taskId)
    if (!task) {
      // Check completed tasks
      const completed = this.completedTasks.find(t => t.id === taskId)
      if (completed) {
        return {
          taskId: completed.id,
          status: completed.status,
          result: completed.result,
          error: completed.error,
          completedAt: completed.completedAt
        }
      }
      return { error: 'Task not found' }
    }

    return {
      taskId: task.id,
      status: task.status,
      agentId: task.agentId,
      description: task.taskDescription,
      priority: task.priority,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      result: task.result,
      error: task.error,
      retryCount: task.retryCount
    }
  }

  /**
   * Get all tasks for a user
   */
  getUserTasks(userId) {
    const userTasks = {
      pending: [],
      executing: [],
      completed: [],
      failed: []
    }

    // Check active tasks
    for (const task of this.activeTasks.values()) {
      if (task.userId === userId) {
        if (task.status === 'pending') userTasks.pending.push(task)
        else if (task.status === 'executing') userTasks.executing.push(task)
      }
    }

    // Check completed tasks
    for (const task of this.completedTasks) {
      if (task.userId === userId) {
        if (task.status === 'completed') userTasks.completed.push(task)
        else if (task.status === 'failed') userTasks.failed.push(task)
      }
    }

    return userTasks
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    const stats = {
      totalQueued: this.taskQueue.length,
      totalActive: this.activeTasks.size,
      totalCompleted: this.completedTasks.length,
      byPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      byStatus: {
        pending: 0,
        executing: 0,
        completed: 0,
        failed: 0
      },
      byAgent: {}
    }

    // Count by priority
    for (const task of this.taskQueue) {
      stats.byPriority[task.priority]++
    }

    // Count by status
    for (const task of this.activeTasks.values()) {
      stats.byStatus[task.status]++
    }
    for (const task of this.completedTasks) {
      stats.byStatus[task.status]++
    }

    // Count by agent
    for (const task of this.activeTasks.values()) {
      if (!stats.byAgent[task.agentId]) {
        stats.byAgent[task.agentId] = 0
      }
      stats.byAgent[task.agentId]++
    }

    return stats
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId) {
    const task = this.activeTasks.get(taskId)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    if (task.status === 'executing') {
      return { success: false, error: 'Cannot cancel executing task' }
    }

    task.status = 'cancelled'
    task.completedAt = new Date().toISOString()
    this.activeTasks.delete(taskId)
    this.completedTasks.push(task)

    return { success: true, message: 'Task cancelled' }
  }

  /**
   * Retry a failed task
   */
  async retryTask(taskId) {
    const task = this.completedTasks.find(t => t.id === taskId)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    if (task.status !== 'failed') {
      return { success: false, error: 'Task is not failed' }
    }

    // Reset task
    task.status = 'pending'
    task.retryCount = 0
    task.result = null
    task.error = null
    task.startedAt = null
    task.completedAt = null

    // Remove from completed and add back to queue
    this.completedTasks = this.completedTasks.filter(t => t.id !== taskId)
    this.taskQueue.push(task)
    this.activeTasks.set(taskId, task)

    // Execute immediately
    const result = await this.executeTask(task)
    return { success: true, result }
  }

  /**
   * Get task history for analytics
   */
  getTaskHistory(filters = {}) {
    let history = [...this.completedTasks]

    if (filters.agentId) {
      history = history.filter(t => t.agentId === filters.agentId)
    }

    if (filters.userId) {
      history = history.filter(t => t.userId === filters.userId)
    }

    if (filters.status) {
      history = history.filter(t => t.status === filters.status)
    }

    if (filters.startDate) {
      history = history.filter(t => new Date(t.createdAt) >= new Date(filters.startDate))
    }

    if (filters.endDate) {
      history = history.filter(t => new Date(t.createdAt) <= new Date(filters.endDate))
    }

    // Calculate statistics
    const stats = {
      totalTasks: history.length,
      successRate: history.filter(t => t.status === 'completed').length / (history.length || 1),
      averageExecutionTime: this.calculateAverageExecutionTime(history),
      tasksByAgent: this.groupBy(history, 'agentId'),
      tasksByStatus: this.groupBy(history, 'status'),
      tasksByPriority: this.groupBy(history, 'priority')
    }

    return {
      history: history.slice(0, 100), // Return last 100 tasks
      stats
    }
  }

  calculateAverageExecutionTime(tasks) {
    const completedTasks = tasks.filter(t => t.startedAt && t.completedAt)
    if (completedTasks.length === 0) return 0

    const total = completedTasks.reduce((sum, t) => {
      return sum + (new Date(t.completedAt) - new Date(t.startedAt))
    }, 0)

    return Math.round(total / completedTasks.length)
  }

  groupBy(tasks, key) {
    return tasks.reduce((grouped, task) => {
      const value = task[key]
      grouped[value] = (grouped[value] || 0) + 1
      return grouped
    }, {})
  }

  /**
   * Get available task types for an agent
   */
  getAvailableTaskTypes(agentId) {
    const agent = this.orchestrator.getAgentCapabilities(agentId)
    if (!agent) {
      return { error: 'Agent not found' }
    }

    const taskTypes = Object.keys(agent.functions).map(funcName => ({
      functionName: funcName,
      taskType: this.getFunctionTaskType(funcName),
      description: `Execute ${funcName} on ${agent.name}`
    }))

    return {
      agentId,
      agentName: agent.name,
      availableTaskTypes: taskTypes,
      count: taskTypes.length
    }
  }

  getFunctionTaskType(functionName) {
    const typeMap = {
      'scanShipmentHealth': 'analyze',
      'detectDisruptions': 'detect-risk',
      'scoreRisk': 'score-risk',
      'optimizeRoute': 'optimize-route',
      'calculateETAConfidence': 'calculate-eta',
      'recommendSpeedAdjustments': 'recommend-speed',
      'generateStatusUpdate': 'send-notification',
      'createAlert': 'create-alert',
      'gatherRouteContext': 'gather-data',
      'retrieveHistoricalData': 'retrieve-context',
      'executeAction': 'execute-action',
      'logEvent': 'log-event',
      'handleIncident': 'handle-crisis'
    }

    return typeMap[functionName] || functionName
  }
}

export default TaskAssignmentManager
