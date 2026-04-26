import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import Database from './db.js'
import { getCurrentTimestamp, asyncHandler } from './utils.js'
import {
  createAuthRouter,
  createShipmentRouter,
  createAgentRouter,
  createRiskRouter,
  createNotificationRouter
} from './routes.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 8787)
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me'
const dbPath = process.env.DB_PATH || './data/aegischain.db'
  app.get('/api/dashboard', authMiddleware, asyncHandler(async (req, res) => {
if (jwtSecret === 'dev-secret-change-me') {
  console.warn('⚠️  JWT_SECRET is using the default value. Set a strong secret in .env for production.')
}

let db

app.use(cors({ origin: corsOrigin }))
app.use(express.json())

app.use((req, res, next) => {
  const startTime = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - startTime
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`)
  })
  next()
})

function authMiddleware(req, res, next) {
  const authHeader = req.header('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' })
  }

  try {
    const payload = jwt.verify(token, jwtSecret)
    req.user = { id: payload.sub, email: payload.email, name: payload.name }
    next()
  }))
    res.status(401).json({ error: 'Invalid or expired token' })
  app.post('/api/shipments/:id/location', authMiddleware, asyncHandler(async (req, res) => {
}

app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true,
    timestamp: getCurrentTimestamp(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

function registerRoutes() {
  app.use('/api/auth', createAuthRouter(db, jwtSecret))
  app.use('/api/shipments', authMiddleware, createShipmentRouter(db))
  app.use('/api/agents', authMiddleware, createAgentRouter(db))
  app.use('/api/risk', authMiddleware, createRiskRouter(db))
  }))
}
  app.post('/api/shipments/:id/risk-analysis', authMiddleware, asyncHandler(async (req, res) => {
app.get('/api/dashboard', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id

  const shipments = await db.all(
    'SELECT * FROM shipments WHERE userId = ? ORDER BY createdAt DESC LIMIT 10',
    [userId]
  )

  const agents = await db.all('SELECT * FROM agents LIMIT 10')

  const notifications = await db.all(
    'SELECT * FROM notifications WHERE userId = ? AND read = 0 ORDER BY timestamp DESC LIMIT 5',
    [userId]
  )

  const crisisEvents = await db.all(
    'SELECT * FROM crisis_events WHERE status = "active" LIMIT 5'
  )

  }))
}
    shipments,
    agents,
    notifications,
    crisisEvents,
    stats: {
      totalShipments: shipments.length,
      activeShipments: shipments.filter(s => s.status === 'in-transit').length,
      criticalAlerts: crisisEvents.length,
      unreadNotifications: notifications.length
    }
  })
}))

app.post('/api/shipments/:id/location', authMiddleware, asyncHandler(async (req, res) => {
  const { latitude, longitude, speed, heading } = req.body
  const locationId = uuidv4()
  const now = getCurrentTimestamp()

  await db.run(
    `INSERT INTO location_history (id, shipmentId, latitude, longitude, speed, heading, timestamp, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [locationId, req.params.id, latitude, longitude, speed, heading, now, now]
  )

  await db.run(
    'UPDATE shipments SET currentLat = ?, currentLng = ?, updatedAt = ? WHERE id = ?',
    [latitude, longitude, now, req.params.id]
  )

  res.status(201).json({ success: true, locationId })
}))

app.post('/api/shipments/:id/risk-analysis', authMiddleware, asyncHandler(async (req, res) => {
  const { riskScore, riskLevel, factors, recommendations, analyzedBy } = req.body
  const analysisId = uuidv4()
  const now = getCurrentTimestamp()

  await db.run(
    `INSERT INTO risk_analyses (id, shipmentId, riskScore, riskLevel, factors, recommendations, analysisTimestamp, analyzedBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [analysisId, req.params.id, riskScore, riskLevel, JSON.stringify(factors || []), JSON.stringify(recommendations || []), now, JSON.stringify(analyzedBy || []), now]
  )

  await db.run(
    'UPDATE shipments SET riskScore = ?, riskLevel = ?, updatedAt = ? WHERE id = ?',
    [riskScore, riskLevel, now, req.params.id]
  )

  res.status(201).json({ 
    analysisId,
    success: true
  })
}))

function setupErrorHandler() {
  app.use((err, req, res, next) => {
    console.error('❌ Error:', err)
    const status = err.status || 500
    const message = err.message || 'Internal server error'
    res.status(status).json({
      error: message,
      timestamp: getCurrentTimestamp()
    })
