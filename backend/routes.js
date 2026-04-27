import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import { validateEmail, validateName, getCurrentTimestamp, asyncHandler } from './utils.js'

export function createAuthRouter(db, jwtSecret) {
  const router = Router()

  router.post('/login', asyncHandler(async (req, res) => {
    const { name, email } = req.body

    if (!validateName(name)) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' })
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const userId = Buffer.from(normalizedEmail).toString('base64url')

    let user = await db.get(
      'SELECT id, name, email, picture FROM users WHERE id = ?',
      [userId]
    )

    if (!user) {
      await db.run(
        'INSERT INTO users (id, name, email, picture, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, name, normalizedEmail, '', getCurrentTimestamp(), getCurrentTimestamp()]
      )
      user = { id: userId, name, email: normalizedEmail, picture: '' }
    } else {
      await db.run(
        'UPDATE users SET name = ?, updatedAt = ? WHERE id = ?',
        [name, getCurrentTimestamp(), userId]
      )
      user.name = name
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
      },
      jwtSecret,
      { expiresIn: '7d' }
    )

    res.json({ token, user })
  }))

  router.get('/me', asyncHandler(async (req, res) => {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const user = await db.get(
      'SELECT id, name, email, picture FROM users WHERE id = ?',
      [userId]
    )

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  }))

  return router
}

export function createShipmentRouter(db) {
  const router = Router()

  router.get('/', asyncHandler(async (req, res) => {
    const userId = req.user?.id
    const shipments = await db.all(
      `SELECT id, name, origin, destination, originLat as originLatitude, originLng as originLongitude,
              destinationLat, destinationLng, currentLat, currentLng, status, riskScore, riskLevel,
              eta, etaTimestamp, progress, lastUpdate, estimatedDistance, remainingDistance, averageSpeed
       FROM shipments WHERE userId = ? ORDER BY createdAt DESC`,
      [userId]
    )

    res.json({ shipments })
  }))

  router.get('/:id', asyncHandler(async (req, res) => {
    const userId = req.user?.id
    const shipment = await db.get(
      `SELECT * FROM shipments WHERE id = ? AND userId = ?`,
      [req.params.id, userId]
    )

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' })
    }

    const locationHistory = await db.all(
      `SELECT latitude as lat, longitude as lng, speed, heading, timestamp FROM location_history WHERE shipmentId = ? ORDER BY timestamp DESC LIMIT 20`,
      [req.params.id]
    )

    res.json({ 
      shipment: {
        ...shipment,
        originCoords: { lat: shipment.originLat, lng: shipment.originLng },
        destinationCoords: { lat: shipment.destinationLat, lng: shipment.destinationLng },
        currentLocation: { lat: shipment.currentLat, lng: shipment.currentLng },
        locationHistory: locationHistory.map(h => ({ ...h, location: { lat: h.lat, lng: h.lng } }))
      }
    })
  }))

  router.post('/', asyncHandler(async (req, res) => {
    const userId = req.user?.id
    const { name, origin, destination, status = 'scheduled', riskScore = 0, riskLevel = 'low' } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const shipmentId = `SHP-${Date.now()}-${uuidv4().slice(0, 8)}`
    const now = getCurrentTimestamp()

    await db.run(
      `INSERT INTO shipments (id, userId, name, origin, destination, status, riskScore, riskLevel, 
       progress, lastUpdate, estimatedDistance, remainingDistance, averageSpeed, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [shipmentId, userId, name, origin, destination, status, riskScore, riskLevel, 0, now, 0, 0, 80, now, now]
    )

    const shipment = await db.get('SELECT * FROM shipments WHERE id = ?', [shipmentId])
    res.status(201).json({ shipment })
  }))

  router.patch('/:id', asyncHandler(async (req, res) => {
    const userId = req.user?.id
    const { status, progress, riskScore, riskLevel, currentLat, currentLng, lastUpdate } = req.body

    const updates = []
    const values = []

    if (status !== undefined) {
      updates.push('status = ?')
      values.push(status)
    }
    if (progress !== undefined) {
      updates.push('progress = ?')
      values.push(progress)
    }
    if (riskScore !== undefined) {
      updates.push('riskScore = ?')
      values.push(riskScore)
    }
    if (riskLevel !== undefined) {
      updates.push('riskLevel = ?')
      values.push(riskLevel)
    }
    if (currentLat !== undefined) {
      updates.push('currentLat = ?')
      values.push(currentLat)
    }
    if (currentLng !== undefined) {
      updates.push('currentLng = ?')
      values.push(currentLng)
    }
    if (lastUpdate !== undefined) {
      updates.push('lastUpdate = ?')
      values.push(lastUpdate)
    }

    updates.push('updatedAt = ?')
    values.push(getCurrentTimestamp())
    values.push(req.params.id)
    values.push(userId)

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    await db.run(
      `UPDATE shipments SET ${updates.join(', ')} WHERE id = ? AND userId = ?`,
      values
    )

    const shipment = await db.get('SELECT * FROM shipments WHERE id = ?', [req.params.id])
    res.json({ shipment })
  }))

  return router
}

export function createAgentRouter(db) {
  const router = Router()

  router.get('/', asyncHandler(async (req, res) => {
    const agents = await db.all(
      `SELECT id, name, role, status, lastActivity, description FROM agents ORDER BY name`
    )
    res.json({ agents })
  }))

  router.patch('/:id', asyncHandler(async (req, res) => {
    const { status, lastActivity } = req.body

    const updates = []
    const values = []

    if (status !== undefined) {
      updates.push('status = ?')
      values.push(status)
    }
    if (lastActivity !== undefined) {
      updates.push('lastActivity = ?')
      values.push(lastActivity)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    updates.push('updatedAt = ?')
    values.push(getCurrentTimestamp())
    values.push(req.params.id)

    await db.run(
      `UPDATE agents SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    const agent = await db.get('SELECT * FROM agents WHERE id = ?', [req.params.id])
    res.json({ agent })
  }))

  return router
}

export function createRiskRouter(db) {
  const router = Router()

  router.get('/shipment/:shipmentId', asyncHandler(async (req, res) => {
    const analyses = await db.all(
      `SELECT id, shipmentId, riskScore, riskLevel, factors, recommendations, analysisTimestamp, analyzedBy
       FROM risk_analyses WHERE shipmentId = ? ORDER BY analysisTimestamp DESC LIMIT 10`,
      [req.params.shipmentId]
    )

    const parsed = analyses.map(a => ({
      ...a,
      factors: a.factors ? JSON.parse(a.factors) : [],
      recommendations: a.recommendations ? JSON.parse(a.recommendations) : [],
      analyzedBy: a.analyzedBy ? JSON.parse(a.analyzedBy) : []
    }))

    res.json({ analyses: parsed })
  }))

  router.post('/', asyncHandler(async (req, res) => {
    const { shipmentId, riskScore, riskLevel, factors = [], recommendations = [], analyzedBy = [] } = req.body

    const analysisId = uuidv4()
    const now = getCurrentTimestamp()

    await db.run(
      `INSERT INTO risk_analyses (id, shipmentId, riskScore, riskLevel, factors, recommendations, analysisTimestamp, analyzedBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [analysisId, shipmentId, riskScore, riskLevel, JSON.stringify(factors), JSON.stringify(recommendations), now, JSON.stringify(analyzedBy), now]
    )

    res.status(201).json({ 
      analysis: {
        id: analysisId,
        shipmentId,
        riskScore,
        riskLevel,
        factors,
        recommendations,
        analysisTimestamp: now,
        analyzedBy
      }
    })
  }))

  return router
}

export function createNotificationRouter(db) {
  const router = Router()

  router.get('/', asyncHandler(async (req, res) => {
    const userId = req.user?.id
    const notifications = await db.all(
      `SELECT id, type, shipmentId, title, message, severity, read, actionRequired, timestamp
       FROM notifications WHERE userId = ? ORDER BY timestamp DESC LIMIT 50`,
      [userId]
    )
    res.json({ notifications })
  }))

  router.post('/', asyncHandler(async (req, res) => {
    const userId = req.user?.id
    const { type, shipmentId, title, message, severity = 'info', actionRequired = false } = req.body

    const notificationId = uuidv4()
    const now = getCurrentTimestamp()

    await db.run(
      `INSERT INTO notifications (id, userId, type, shipmentId, title, message, severity, read, actionRequired, timestamp, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [notificationId, userId, type, shipmentId, title, message, severity, actionRequired ? 1 : 0, now, now]
    )

    res.status(201).json({ 
      notification: {
        id: notificationId,
        type,
        shipmentId,
        title,
        message,
        severity,
        read: false,
        actionRequired,
        timestamp: now
      }
    })
  }))

  router.patch('/:id/read', asyncHandler(async (req, res) => {
    const userId = req.user?.id
    await db.run(
      'UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?',
      [req.params.id, userId]
    )
    res.json({ success: true })
  }))

  return router
}
