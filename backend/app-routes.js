import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { CITY_COORDINATES, DEFAULT_SHIPMENT_BLUEPRINTS } from './fixtures.js'
import {
  buildAnalysisForShipment,
  buildShipmentRecord,
  buildSupportResponse,
  buildWorkflowSteps,
  chooseAgentForTask,
  formatShipmentRow,
  simulateShipmentUpdate,
} from './agent-engine.js'
import { asyncHandler, getCurrentTimestamp, validateEmail, validateName } from './utils.js'

function toWorkflowResponse(row) {
  return {
    id: row.id,
    agentId: row.agentId,
    agentName: row.agentName,
    action: row.action,
    input: row.input ? JSON.parse(row.input) : {},
    output: row.output ? JSON.parse(row.output) : {},
    status: row.status,
    startTime: row.startTime,
    endTime: row.endTime || undefined,
    duration: row.duration || undefined,
  }
}

function buildMockBlockchainHash(seed) {
  const raw = Buffer.from(`${seed}:${Date.now()}:${Math.random()}`)
  return `0x${raw.toString('hex').slice(0, 64).padEnd(64, '0')}`
}

function inferTaskPriority(prompt = '') {
  const normalized = prompt.toLowerCase()
  if (/(urgent|asap|immediate|critical|emergency|blocker)/.test(normalized)) return 'high'
  if (/(low|whenever|later|non-urgent|non urgent)/.test(normalized)) return 'low'
  return 'medium'
}

function extractShipmentId(prompt = '') {
  const match = prompt.match(/(SHP-[A-Za-z0-9-]+)/i)
  return match ? match[1] : null
}

function parseShipmentCreationPrompt(prompt = '') {
  const match = prompt.match(/(?:create|add|new)\s+(?:a\s+)?shipment(?:\s+named\s+(.+?))?\s+from\s+(.+?)\s+to\s+(.+?)(?:\.|$)/i)
  if (!match) {
    return null
  }

  const name = match[1]?.trim() || `Custom Shipment ${new Date().toISOString().slice(11, 19)}`
  const origin = match[2].trim()
  const destination = match[3].trim()

  return { name, origin, destination }
}

function isPromptActionable(prompt = '') {
  return /(analy|assess|scan|simulate|refresh|update tracking|reroute|route|create|add|new shipment)/i.test(prompt)
}

async function executeTaskFromPrompt(db, userId, prompt, preferredShipmentId, options = {}) {
  const normalized = prompt.toLowerCase()
  const mentionedShipmentId = extractShipmentId(prompt)
  const targetShipmentId = preferredShipmentId || mentionedShipmentId

  if (/(create|add|new)\s+(?:a\s+)?shipment/i.test(normalized)) {
    const parsed = parseShipmentCreationPrompt(prompt)
    if (!parsed) {
      return {
        kind: 'create_shipment',
        performed: false,
        summary: 'Unable to create shipment: use "create shipment named <name> from <origin> to <destination>".',
      }
    }

    if (!CITY_COORDINATES[parsed.origin] || !CITY_COORDINATES[parsed.destination]) {
      return {
        kind: 'create_shipment',
        performed: false,
        summary: `Unable to create shipment: origin/destination must match a supported city (got "${parsed.origin}" -> "${parsed.destination}").`,
      }
    }

    const now = getCurrentTimestamp()
    const shipment = buildShipmentRecord(userId, {
      id: `SHP-${Date.now()}-${uuidv4().slice(0, 6)}`,
      name: parsed.name,
      origin: parsed.origin,
      destination: parsed.destination,
      status: 'scheduled',
      riskScore: 25,
      riskLevel: 'low',
      progress: 0,
      lastUpdate: 'Shipment created from user command.',
      averageSpeed: 78,
    }, now)

    await db.run(
      `INSERT INTO shipments (
        id, userId, name, origin, destination, originLat, originLng, destinationLat, destinationLng,
        currentLat, currentLng, status, riskScore, riskLevel, eta, etaTimestamp, progress, lastUpdate,
        estimatedDistance, remainingDistance, averageSpeed, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shipment.id, shipment.userId, shipment.name, shipment.origin, shipment.destination,
        shipment.originLat, shipment.originLng, shipment.destinationLat, shipment.destinationLng,
        shipment.currentLat, shipment.currentLng, shipment.status, shipment.riskScore, shipment.riskLevel,
        shipment.eta, shipment.etaTimestamp, shipment.progress, shipment.lastUpdate,
        shipment.estimatedDistance, shipment.remainingDistance, shipment.averageSpeed,
        shipment.createdAt, shipment.updatedAt,
      ]
    )

    await db.run(
      `INSERT INTO location_history (id, shipmentId, latitude, longitude, speed, heading, timestamp, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), shipment.id, shipment.currentLat, shipment.currentLng, shipment.averageSpeed, 0, now, now]
    )

    return {
      kind: 'create_shipment',
      performed: true,
      shipmentId: shipment.id,
      summary: `Created shipment ${shipment.id} (${shipment.name}) from ${shipment.origin} to ${shipment.destination}.`,
    }
  }

  if (/(analy|assess|scan).*(all|every).*(shipment|route)|analy[sz]e all/i.test(normalized)) {
    const shipments = await db.all('SELECT * FROM shipments WHERE userId = ? ORDER BY createdAt DESC', [userId])
    if (shipments.length === 0) {
      return {
        kind: 'analyze_all',
        performed: false,
        summary: 'No shipments found to analyze.',
      }
    }

    const analyses = []
    const workflowSteps = []
    for (const shipment of shipments) {
      const result = await createAnalysisAndWorkflow(db, userId, shipment)
      analyses.push(result.analysis)
      workflowSteps.push(...result.workflowSteps)
    }

    options.realtime?.emitToUser(userId, 'workflow.updated', { analyses, workflowSteps })

    return {
      kind: 'analyze_all',
      performed: true,
      analyses,
      workflowSteps,
      summary: `Completed analysis for ${analyses.length} shipments.`,
    }
  }

  if (/(analy|assess|scan|risk)/i.test(normalized)) {
    let shipment = null
    if (targetShipmentId) {
      shipment = await db.get('SELECT * FROM shipments WHERE id = ? AND userId = ?', [targetShipmentId, userId])
    }

    if (!shipment) {
      shipment = await db.get('SELECT * FROM shipments WHERE userId = ? ORDER BY riskScore DESC, createdAt DESC LIMIT 1', [userId])
    }

    if (!shipment) {
      return {
        kind: 'analyze_one',
        performed: false,
        summary: 'No shipments found to analyze.',
      }
    }

    const result = await createAnalysisAndWorkflow(db, userId, shipment)
    options.realtime?.emitToUser(userId, 'workflow.updated', {
      analysis: result.analysis,
      workflowSteps: result.workflowSteps,
    })

    return {
      kind: 'analyze_one',
      performed: true,
      shipmentId: shipment.id,
      analysis: result.analysis,
      workflowSteps: result.workflowSteps,
      summary: `Completed risk analysis for ${shipment.name} (${shipment.id}) with ${result.analysis.riskLevel} risk.`,
    }
  }

  if (/(simulate|refresh|update tracking|sync tracking|track update|reroute|route update)/i.test(normalized)) {
    const result = await simulateShipmentsForUser(db, userId, options)
    options.realtime?.emitToUser(userId, 'tracking.updated', {
      shipments: result.shipments,
      notifications: result.notifications,
      source: 'task',
    })

    return {
      kind: 'simulate_tracking',
      performed: true,
      summary: `Tracking simulation completed for ${result.shipments.length} shipments.`,
    }
  }

  return {
    kind: 'generic',
    performed: false,
    summary: 'Captured request and routed it to the selected agent workflow.',
  }
}

async function seedUserShipments(db, userId) {
  const existing = await db.get('SELECT id FROM shipments WHERE userId = ? LIMIT 1', [userId])
  if (existing) {
    return
  }

  const now = getCurrentTimestamp()
  for (const blueprint of DEFAULT_SHIPMENT_BLUEPRINTS) {
    const shipment = buildShipmentRecord(userId, {
      ...blueprint,
      id: `${blueprint.id}-${userId.slice(0, 6)}`,
    }, now)
    await db.run(
      `INSERT INTO shipments (
        id, userId, name, origin, destination, originLat, originLng, destinationLat, destinationLng,
        currentLat, currentLng, status, riskScore, riskLevel, eta, etaTimestamp, progress, lastUpdate,
        estimatedDistance, remainingDistance, averageSpeed, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shipment.id,
        shipment.userId,
        shipment.name,
        shipment.origin,
        shipment.destination,
        shipment.originLat,
        shipment.originLng,
        shipment.destinationLat,
        shipment.destinationLng,
        shipment.currentLat,
        shipment.currentLng,
        shipment.status,
        shipment.riskScore,
        shipment.riskLevel,
        shipment.eta,
        shipment.etaTimestamp,
        shipment.progress,
        shipment.lastUpdate,
        shipment.estimatedDistance,
        shipment.remainingDistance,
        shipment.averageSpeed,
        shipment.createdAt,
        shipment.updatedAt,
      ]
    )

    await db.run(
      `INSERT INTO location_history (id, shipmentId, latitude, longitude, speed, heading, timestamp, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), shipment.id, shipment.currentLat, shipment.currentLng, shipment.averageSpeed, 0, now, now]
    )
  }
}

async function getFormattedShipmentsForUser(db, userId) {
  const rows = await db.all('SELECT * FROM shipments WHERE userId = ? ORDER BY createdAt DESC', [userId])
  const shipments = []

  for (const row of rows) {
    const history = await db.all(
      'SELECT latitude, longitude, speed, heading, timestamp FROM location_history WHERE shipmentId = ? ORDER BY timestamp DESC LIMIT 20',
      [row.id]
    )
    shipments.push(formatShipmentRow(row, history))
  }

  return shipments
}

async function simulateShipmentsForUser(db, userId, options = {}) {
  const rows = await db.all('SELECT * FROM shipments WHERE userId = ? ORDER BY createdAt DESC', [userId])
  const notifications = []
  const now = getCurrentTimestamp()

  for (const row of rows) {
    const updated = simulateShipmentUpdate(row)
    await db.run(
      `UPDATE shipments
       SET currentLat = ?, currentLng = ?, progress = ?, eta = ?, etaTimestamp = ?, remainingDistance = ?, riskScore = ?, riskLevel = ?, status = ?, lastUpdate = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updated.currentLat,
        updated.currentLng,
        updated.progress,
        updated.eta,
        updated.etaTimestamp,
        updated.remainingDistance,
        updated.riskScore,
        updated.riskLevel,
        updated.status,
        updated.lastUpdate,
        now,
        updated.id,
      ]
    )

    await db.run(
      `INSERT INTO location_history (id, shipmentId, latitude, longitude, speed, heading, timestamp, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), updated.id, updated.currentLat, updated.currentLng, updated.averageSpeed, 0, now, now]
    )

    if (options.cloudStore?.enabled) {
      await options.cloudStore.put('shipment_timeline', userId, {
        id: uuidv4(),
        shipmentId: updated.id,
        userId,
        timestamp: now,
        type: 'location_update',
        speed: updated.averageSpeed,
        latitude: updated.currentLat,
        longitude: updated.currentLng,
        progress: updated.progress,
        riskScore: updated.riskScore,
        status: updated.status,
      })
    }

    if (updated.riskLevel !== row.riskLevel || updated.status !== row.status) {
      const notification = {
        id: uuidv4(),
        type: updated.riskLevel === 'critical' ? 'crisis' : updated.status === 'delayed' ? 'delay' : 'eta_update',
        shipmentId: updated.id,
        title: `${updated.name} updated`,
        message: updated.lastUpdate,
        severity: updated.riskLevel === 'critical' ? 'error' : updated.riskLevel === 'medium' ? 'warning' : 'info',
        read: false,
        actionRequired: updated.riskLevel === 'critical',
        timestamp: now,
      }
      notifications.push(notification)
      await db.run(
        `INSERT INTO notifications (id, userId, type, shipmentId, title, message, severity, read, actionRequired, timestamp, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [notification.id, userId, notification.type, notification.shipmentId, notification.title, notification.message, notification.severity, notification.actionRequired ? 1 : 0, notification.timestamp, now]
      )
    }
  }

  const shipments = await getFormattedShipmentsForUser(db, userId)
  return { shipments, notifications }
}

async function createAnalysisAndWorkflow(db, userId, shipment) {
  const analysis = buildAnalysisForShipment(shipment)
  const now = getCurrentTimestamp()
  const analysisId = uuidv4()
  const taskId = uuidv4()
  const workflowSteps = buildWorkflowSteps(taskId, shipment, analysis)

  await db.run(
    `INSERT INTO risk_analyses (id, shipmentId, riskScore, riskLevel, factors, recommendations, analysisTimestamp, analyzedBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      analysisId,
      shipment.id,
      analysis.riskScore,
      analysis.riskLevel,
      JSON.stringify(analysis.factors),
      JSON.stringify(analysis.recommendations),
      now,
      JSON.stringify(analysis.analyzedBy),
      now,
    ]
  )

  await db.run(
    `INSERT INTO agent_tasks (id, userId, shipmentId, title, description, status, priority, assignedAgentId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      taskId,
      userId,
      shipment.id,
      `Analyze ${shipment.name}`,
      analysis.summary,
      'completed',
      analysis.riskLevel,
      'planner',
      now,
      now,
    ]
  )

  for (const step of workflowSteps) {
    await db.run(
      `INSERT INTO workflow_steps (id, taskId, userId, agentId, agentName, action, input, output, status, startTime, endTime, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        step.id,
        taskId,
        userId,
        step.agentId,
        step.agentName,
        step.action,
        JSON.stringify(step.input),
        JSON.stringify(step.output),
        step.status,
        step.startTime,
        step.endTime || null,
        step.duration || null,
      ]
    )
  }

  await db.run(
    'UPDATE shipments SET riskScore = ?, riskLevel = ?, updatedAt = ? WHERE id = ?',
    [analysis.riskScore, analysis.riskLevel, now, shipment.id]
  )

  await db.run(
    `INSERT INTO notifications (id, userId, type, shipmentId, title, message, severity, read, actionRequired, timestamp, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      uuidv4(),
      userId,
      analysis.riskLevel === 'critical' ? 'crisis' : 'risk_increase',
      shipment.id,
      `Analysis completed for ${shipment.name}`,
      analysis.summary,
      analysis.riskLevel === 'critical' ? 'error' : 'warning',
      analysis.riskLevel !== 'low' ? 1 : 0,
      now,
      now,
    ]
  )

  return {
    analysis: {
      shipmentId: shipment.id,
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
      predictiveDisruptionProbability: analysis.predictiveDisruptionProbability,
      predictiveSignals: analysis.predictiveSignals,
      factors: analysis.factors,
      recommendations: analysis.recommendations,
      analysisTimestamp: now,
      analyzedBy: analysis.analyzedBy,
    },
    workflowSteps,
  }
}

export function createAuthRouter(db, jwtSecret, authMiddleware) {
  const router = Router()

  router.post('/login', asyncHandler(async (req, res) => {
    const { name, email } = req.body ?? {}

    if (!validateName(name)) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' })
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const userId = Buffer.from(normalizedEmail).toString('base64url')
    const now = getCurrentTimestamp()

    const existingUser = await db.get('SELECT id, name, email, picture FROM users WHERE id = ?', [userId])

    if (!existingUser) {
      await db.run(
        'INSERT INTO users (id, name, email, picture, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, normalizedName, normalizedEmail, '', now, now]
      )
      await seedUserShipments(db, userId)
    } else {
      await db.run('UPDATE users SET name = ?, updatedAt = ? WHERE id = ?', [normalizedName, now, userId])
    }

    const user = {
      id: userId,
      name: normalizedName,
      email: normalizedEmail,
      picture: '',
    }

    const token = jwt.sign({ sub: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: '7d' })
    res.json({ token, user })
  }))

  router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
    const user = await db.get('SELECT id, name, email, picture FROM users WHERE id = ?', [req.user.id])
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ user })
  }))

  return router
}

export function createShipmentRouter(db, options = {}) {
  const router = Router()

  router.get('/', asyncHandler(async (req, res) => {
    const shipments = await getFormattedShipmentsForUser(db, req.user.id)
    res.json({ shipments })
  }))

  router.post('/simulate', asyncHandler(async (req, res) => {
    const result = await simulateShipmentsForUser(db, req.user.id, options)
    options.realtime?.emitToUser(req.user.id, 'tracking.updated', {
      shipments: result.shipments,
      notifications: result.notifications,
      source: 'http',
    })
    res.json(result)
  }))

  router.get('/:id/history', asyncHandler(async (req, res) => {
    const shipment = await db.get('SELECT * FROM shipments WHERE id = ? AND userId = ?', [req.params.id, req.user.id])
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' })
    }

    const locationRows = await db.all(
      'SELECT latitude, longitude, speed, heading, timestamp FROM location_history WHERE shipmentId = ? ORDER BY timestamp ASC LIMIT 500',
      [shipment.id]
    )
    const riskRows = await db.all(
      'SELECT riskScore, riskLevel, analysisTimestamp FROM risk_analyses WHERE shipmentId = ? ORDER BY analysisTimestamp ASC LIMIT 200',
      [shipment.id]
    )
    const notificationRows = await db.all(
      'SELECT id, type, severity, title, message, timestamp FROM notifications WHERE userId = ? AND shipmentId = ? ORDER BY timestamp ASC LIMIT 200',
      [req.user.id, shipment.id]
    )

    const snapshots = locationRows.map((row, index) => {
      const progress = locationRows.length > 1
        ? (index / (locationRows.length - 1)) * shipment.progress
        : shipment.progress
      const activeRisk = [...riskRows].reverse().find((risk) => risk.analysisTimestamp <= row.timestamp)
      return {
        timestamp: row.timestamp,
        location: { lat: row.latitude, lng: row.longitude },
        speed: row.speed || shipment.averageSpeed,
        riskScore: activeRisk?.riskScore ?? shipment.riskScore,
        status: progress < 100 ? 'in-transit' : shipment.status,
        eta: shipment.eta,
        progress,
      }
    })

    const timeline = [
      ...locationRows.map((row) => ({
        id: uuidv4(),
        timestamp: row.timestamp,
        type: 'location_update',
        title: 'Location update',
        details: `Speed ${Math.round(row.speed || shipment.averageSpeed)} mph`,
      })),
      ...riskRows.map((row) => ({
        id: uuidv4(),
        timestamp: row.analysisTimestamp,
        type: 'risk_analysis',
        title: `Risk ${row.riskLevel}`,
        details: `Risk score ${Math.round(row.riskScore)}`,
      })),
      ...notificationRows.map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        type: row.type,
        title: row.title,
        details: row.message,
        severity: row.severity,
      })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    res.json({
      shipmentId: shipment.id,
      snapshots,
      timeline,
      stats: {
        totalSnapshots: snapshots.length,
        totalRiskAnalyses: riskRows.length,
        totalNotifications: notificationRows.length,
      },
    })
  }))

  router.get('/:id/timeline', asyncHandler(async (req, res) => {
    const shipment = await db.get('SELECT id FROM shipments WHERE id = ? AND userId = ?', [req.params.id, req.user.id])
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' })
    }

    const history = await db.all(
      'SELECT latitude, longitude, speed, heading, timestamp FROM location_history WHERE shipmentId = ? ORDER BY timestamp ASC LIMIT 500',
      [req.params.id]
    )
    res.json({ shipmentId: req.params.id, history })
  }))

  router.get('/:id', asyncHandler(async (req, res) => {
    const row = await db.get('SELECT * FROM shipments WHERE id = ? AND userId = ?', [req.params.id, req.user.id])
    if (!row) {
      return res.status(404).json({ error: 'Shipment not found' })
    }

    const history = await db.all(
      'SELECT latitude, longitude, speed, heading, timestamp FROM location_history WHERE shipmentId = ? ORDER BY timestamp DESC LIMIT 20',
      [row.id]
    )

    res.json({ shipment: formatShipmentRow(row, history) })
  }))

  router.post('/', asyncHandler(async (req, res) => {
    const { name, origin, destination, status = 'scheduled', riskScore = 25, riskLevel = 'low', progress = 0, lastUpdate = 'Shipment created.' } = req.body ?? {}
    if (!name || !origin || !destination) {
      return res.status(400).json({ error: 'Name, origin, and destination are required' })
    }

    const shipment = buildShipmentRecord(req.user.id, {
      id: `SHP-${Date.now()}-${uuidv4().slice(0, 6)}`,
      name,
      origin,
      destination,
      status,
      riskScore,
      riskLevel,
      progress,
      lastUpdate,
      averageSpeed: 78,
    }, getCurrentTimestamp())

    await db.run(
      `INSERT INTO shipments (
        id, userId, name, origin, destination, originLat, originLng, destinationLat, destinationLng,
        currentLat, currentLng, status, riskScore, riskLevel, eta, etaTimestamp, progress, lastUpdate,
        estimatedDistance, remainingDistance, averageSpeed, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shipment.id, shipment.userId, shipment.name, shipment.origin, shipment.destination,
        shipment.originLat, shipment.originLng, shipment.destinationLat, shipment.destinationLng,
        shipment.currentLat, shipment.currentLng, shipment.status, shipment.riskScore, shipment.riskLevel,
        shipment.eta, shipment.etaTimestamp, shipment.progress, shipment.lastUpdate,
        shipment.estimatedDistance, shipment.remainingDistance, shipment.averageSpeed,
        shipment.createdAt, shipment.updatedAt,
      ]
    )

    res.status(201).json({ shipment: formatShipmentRow(shipment, []) })
  }))

  router.patch('/:id', asyncHandler(async (req, res) => {
    const allowed = ['status', 'progress', 'riskScore', 'riskLevel', 'currentLat', 'currentLng', 'lastUpdate', 'eta', 'etaTimestamp', 'remainingDistance']
    const updates = []
    const values = []

    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        updates.push(`${key} = ?`)
        values.push(req.body[key])
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    updates.push('updatedAt = ?')
    values.push(getCurrentTimestamp())
    values.push(req.params.id)
    values.push(req.user.id)

    await db.run(`UPDATE shipments SET ${updates.join(', ')} WHERE id = ? AND userId = ?`, values)

    const updated = await db.get('SELECT * FROM shipments WHERE id = ? AND userId = ?', [req.params.id, req.user.id])
    res.json({ shipment: formatShipmentRow(updated, []) })
  }))

  return router
}

export function createAgentRouter(db, options = {}) {
  const router = Router()

  router.get('/', asyncHandler(async (_req, res) => {
    const agents = await db.all('SELECT id, name, role, status, lastActivity, description FROM agents ORDER BY name')
    res.json({ agents })
  }))

  router.get('/workflow', asyncHandler(async (req, res) => {
    const workflowRows = await db.all(
      'SELECT * FROM workflow_steps WHERE userId = ? ORDER BY startTime DESC LIMIT 50',
      [req.user.id]
    )
    const taskRows = await db.all(
      'SELECT id, title, description, status, assignedAgentId, shipmentId FROM agent_tasks WHERE userId = ? ORDER BY createdAt DESC LIMIT 25',
      [req.user.id]
    )

    res.json({ workflowSteps: workflowRows.map(toWorkflowResponse), tasks: taskRows })
  }))

  router.post('/tasks', asyncHandler(async (req, res) => {
    const { agentId, prompt, shipmentId } = req.body ?? {}
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return res.status(400).json({ error: 'Task prompt must be at least 5 characters' })
    }

    const resolvedAgentId = agentId || chooseAgentForTask(prompt)
    const taskId = uuidv4()
    const now = getCurrentTimestamp()
    const title = prompt.trim().slice(0, 60)
    const priority = inferTaskPriority(prompt)
    const execution = await executeTaskFromPrompt(db, req.user.id, prompt.trim(), shipmentId || null, options)

    await db.run(
      `INSERT INTO agent_tasks (id, userId, shipmentId, title, description, status, priority, assignedAgentId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, req.user.id, execution.shipmentId || shipmentId || null, title, prompt.trim(), 'completed', priority, resolvedAgentId, now, now]
    )

    const agent = await db.get('SELECT id, name FROM agents WHERE id = ?', [resolvedAgentId])
    const workflowSteps = [
      {
        id: `${taskId}-planner`,
        taskId,
        agentId: 'planner',
        agentName: 'Planner Agent',
        action: 'Route user request to best-fit specialist',
        input: { prompt },
        output: { assignedAgentId: resolvedAgentId, priority, intent: execution.kind },
        status: 'completed',
        startTime: now,
        endTime: now,
        duration: 400,
      },
      {
        id: `${taskId}-${resolvedAgentId}`,
        taskId,
        agentId: resolvedAgentId,
        agentName: agent?.name || resolvedAgentId,
        action: 'Complete assigned task',
        input: { prompt, shipmentId: shipmentId || null },
        output: {
          result: execution.summary,
          kind: execution.kind,
          performed: execution.performed,
        },
        status: 'completed',
        startTime: now,
        endTime: now,
        duration: 700,
      },
      {
        id: `${taskId}-executor`,
        taskId,
        agentId: 'executor',
        agentName: 'Executor Agent',
        action: 'Persist completion state',
        input: { taskId },
        output: { status: 'saved', execution: execution.kind },
        status: 'completed',
        startTime: now,
        endTime: now,
        duration: 250,
      },
    ]

    for (const step of workflowSteps) {
      await db.run(
        `INSERT INTO workflow_steps (id, taskId, userId, agentId, agentName, action, input, output, status, startTime, endTime, duration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [step.id, taskId, req.user.id, step.agentId, step.agentName, step.action, JSON.stringify(step.input), JSON.stringify(step.output), step.status, step.startTime, step.endTime, step.duration]
      )
    }

    await db.run('UPDATE agents SET status = ?, lastActivity = ?, updatedAt = ? WHERE id = ?', ['active', `Completed user task: ${execution.summary}`, now, resolvedAgentId])

    const task = await db.get('SELECT id, title, description, status, assignedAgentId, shipmentId FROM agent_tasks WHERE id = ?', [taskId])
    options.realtime?.emitToUser(req.user.id, 'workflow.updated', {
      task,
      workflowSteps: workflowSteps.map(({ taskId: _taskId, ...step }) => step),
    })
    res.status(201).json({ task, workflowSteps: workflowSteps.map(({ taskId: _taskId, ...step }) => step) })
  }))

  router.post('/analyze/:shipmentId', asyncHandler(async (req, res) => {
    const shipment = await db.get('SELECT * FROM shipments WHERE id = ? AND userId = ?', [req.params.shipmentId, req.user.id])
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' })
    }

    const result = await createAnalysisAndWorkflow(db, req.user.id, shipment)
    options.realtime?.emitToUser(req.user.id, 'workflow.updated', {
      analysis: result.analysis,
      workflowSteps: result.workflowSteps,
    })
    res.json(result)
  }))

  router.post('/analyze-all', asyncHandler(async (req, res) => {
    const shipments = await db.all('SELECT * FROM shipments WHERE userId = ? ORDER BY createdAt DESC', [req.user.id])
    const analyses = []
    const workflowSteps = []

    for (const shipment of shipments) {
      const result = await createAnalysisAndWorkflow(db, req.user.id, shipment)
      analyses.push(result.analysis)
      workflowSteps.push(...result.workflowSteps)
    }

    options.realtime?.emitToUser(req.user.id, 'workflow.updated', {
      analyses,
      workflowSteps,
    })

    res.json({ analyses, workflowSteps })
  }))

  return router
}

export function createBlockchainRouter(db, options = {}) {
  const router = Router()

  router.get('/shipment/:shipmentId', asyncHandler(async (req, res) => {
    const shipment = await db.get('SELECT id, name FROM shipments WHERE id = ? AND userId = ?', [req.params.shipmentId, req.user.id])
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' })
    }

    const transactions = await db.all(
      `SELECT id, shipmentId, amount, currency, status, blockchainHash, senderAddress, recipientAddress, gasUsed, timestamp
       FROM payment_transactions WHERE userId = ? AND shipmentId = ? ORDER BY timestamp DESC LIMIT 100`,
      [req.user.id, req.params.shipmentId]
    )
    const events = await db.all(
      `SELECT id, eventType, data, hash, verified, timestamp FROM blockchain_events
       WHERE userId = ? AND shipmentId = ? ORDER BY timestamp DESC LIMIT 200`,
      [req.user.id, req.params.shipmentId]
    )

    res.json({
      shipment,
      transactions: transactions.map((row) => ({
        id: row.id,
        shipmentId: row.shipmentId,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        blockchainHash: row.blockchainHash || undefined,
        timestamp: row.timestamp,
        from: row.senderAddress,
        to: row.recipientAddress,
        gasUsed: row.gasUsed || undefined,
      })),
      events: events.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        data: row.data ? JSON.parse(row.data) : {},
        hash: row.hash,
        timestamp: row.timestamp,
        verified: Boolean(row.verified),
      })),
    })
  }))

  router.post('/payment', asyncHandler(async (req, res) => {
    const { shipmentId, amount, currency = 'ETH', from, to } = req.body ?? {}
    if (!shipmentId || !amount || !from || !to) {
      return res.status(400).json({ error: 'shipmentId, amount, from, and to are required' })
    }

    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid positive number' })
    }

    const shipment = await db.get('SELECT id, name FROM shipments WHERE id = ? AND userId = ?', [shipmentId, req.user.id])
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' })
    }

    const now = getCurrentTimestamp()
    const txId = `TXN-${Date.now()}-${uuidv4().slice(0, 6)}`
    const hash = buildMockBlockchainHash(`${shipmentId}:${numericAmount}`)
    const gasUsed = 21000 + Math.floor(Math.random() * 60000)

    await db.run(
      `INSERT INTO payment_transactions
       (id, userId, shipmentId, amount, currency, status, blockchainHash, senderAddress, recipientAddress, gasUsed, timestamp, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, req.user.id, shipmentId, numericAmount, currency, 'confirmed', hash, from, to, gasUsed, now, now, now]
    )

    const chainEventId = uuidv4()
    const chainPayload = {
      transactionId: txId,
      shipmentId,
      amount: numericAmount,
      currency,
      from,
      to,
      gasUsed,
      confirmedAt: now,
    }

    await db.run(
      `INSERT INTO blockchain_events (id, userId, shipmentId, eventType, data, hash, verified, timestamp, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [chainEventId, req.user.id, shipmentId, 'payment_confirmed', JSON.stringify(chainPayload), hash, now, now]
    )

    if (options.cloudStore?.enabled) {
      await options.cloudStore.put('blockchain_events', req.user.id, {
        id: chainEventId,
        userId: req.user.id,
        shipmentId,
        eventType: 'payment_confirmed',
        data: chainPayload,
        hash,
        verified: true,
        timestamp: now,
      })
      await options.cloudStore.put('payment_transactions', req.user.id, {
        id: txId,
        userId: req.user.id,
        shipmentId,
        amount: numericAmount,
        currency,
        status: 'confirmed',
        blockchainHash: hash,
        senderAddress: from,
        recipientAddress: to,
        gasUsed,
        timestamp: now,
      })
    }

    const transaction = {
      id: txId,
      shipmentId,
      amount: numericAmount,
      currency,
      status: 'confirmed',
      blockchainHash: hash,
      timestamp: now,
      from,
      to,
      gasUsed,
    }

    options.realtime?.emitToUser(req.user.id, 'blockchain.paymentConfirmed', { transaction, shipment })

    res.status(201).json({ transaction })
  }))

  return router
}

export function createRiskRouter(db) {
  const router = Router()

  router.get('/shipment/:shipmentId', asyncHandler(async (req, res) => {
    const analyses = await db.all(
      'SELECT * FROM risk_analyses WHERE shipmentId = ? ORDER BY analysisTimestamp DESC LIMIT 20',
      [req.params.shipmentId]
    )

    res.json({
      analyses: analyses.map((row) => ({
        shipmentId: row.shipmentId,
        riskScore: row.riskScore,
        riskLevel: row.riskLevel,
        factors: row.factors ? JSON.parse(row.factors) : [],
        recommendations: row.recommendations ? JSON.parse(row.recommendations) : [],
        analysisTimestamp: row.analysisTimestamp,
        analyzedBy: row.analyzedBy ? JSON.parse(row.analyzedBy) : [],
      })),
    })
  }))

  return router
}

export function createNotificationRouter(db) {
  const router = Router()

  router.get('/', asyncHandler(async (req, res) => {
    const notifications = await db.all(
      'SELECT id, type, shipmentId, title, message, severity, read, actionRequired, timestamp FROM notifications WHERE userId = ? ORDER BY timestamp DESC LIMIT 50',
      [req.user.id]
    )
    res.json({ notifications: notifications.map((row) => ({ ...row, read: Boolean(row.read), actionRequired: Boolean(row.actionRequired) })) })
  }))

  router.patch('/:id/read', asyncHandler(async (req, res) => {
    await db.run('UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?', [req.params.id, req.user.id])
    res.json({ success: true })
  }))

  router.patch('/read-all', asyncHandler(async (req, res) => {
    await db.run('UPDATE notifications SET read = 1 WHERE userId = ?', [req.user.id])
    res.json({ success: true })
  }))

  return router
}

export function createSupportRouter(db, options = {}) {
  const router = Router()

  router.get('/chat', asyncHandler(async (req, res) => {
    const messages = await db.all(
      'SELECT id, role, message, agentId, createdAt FROM chat_messages WHERE userId = ? ORDER BY createdAt ASC LIMIT 100',
      [req.user.id]
    )
    res.json({ messages })
  }))

  router.post('/chat', asyncHandler(async (req, res) => {
    const { message } = req.body ?? {}
    if (!message || typeof message !== 'string' || message.trim().length < 2) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const now = getCurrentTimestamp()
    const shipments = await db.all('SELECT id, riskLevel FROM shipments WHERE userId = ?', [req.user.id])
    const criticalCount = shipments.filter((shipment) => shipment.riskLevel === 'critical').length

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      message: message.trim(),
      agentId: null,
      createdAt: now,
    }
    await db.run(
      'INSERT INTO chat_messages (id, userId, role, message, agentId, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [userMessage.id, req.user.id, userMessage.role, userMessage.message, userMessage.agentId, userMessage.createdAt]
    )

    const execution = isPromptActionable(message)
      ? await executeTaskFromPrompt(db, req.user.id, message.trim(), null, options)
      : null

    const replyMessage = execution?.performed
      ? `${execution.summary} I have synchronized the workflow and updated backend state.`
      : buildSupportResponse(message, { shipmentCount: shipments.length, criticalCount })

    const reply = {
      id: uuidv4(),
      role: 'assistant',
      message: replyMessage,
      agentId: 'communication',
      createdAt: getCurrentTimestamp(),
    }
    await db.run(
      'INSERT INTO chat_messages (id, userId, role, message, agentId, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [reply.id, req.user.id, reply.role, reply.message, reply.agentId, reply.createdAt]
    )

    const messages = await db.all(
      'SELECT id, role, message, agentId, createdAt FROM chat_messages WHERE userId = ? ORDER BY createdAt ASC LIMIT 100',
      [req.user.id]
    )

    res.json({ reply, messages })
  }))

  return router
}

export { simulateShipmentsForUser }
