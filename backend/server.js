import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import jwt from 'jsonwebtoken'
import { createServer } from 'http'
import Database from './db.js'
import { formatShipmentRow } from './agent-engine.js'
import { DEFAULT_AGENTS } from './fixtures.js'
import { createCloudStore } from './cloud-store.js'
import { createRealtimeHub } from './realtime.js'
import { getCurrentTimestamp, asyncHandler } from './utils.js'
import {
  createAuthRouter,
  createShipmentRouter,
  createAgentRouter,
  createRiskRouter,
  createNotificationRouter,
  createSupportRouter,
  createBlockchainRouter,
  simulateShipmentsForUser,
} from './app-routes.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 8787)
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me'
const corsOrigin = process.env.CORS_ORIGIN || '*'
const dbPath = process.env.DB_PATH || './data/aegischain.db'

if (jwtSecret === 'dev-secret-change-me') {
  console.warn('⚠️  JWT_SECRET is using the default value. Set a strong secret in .env for production.')
}

let db
let realtime
let httpServer
let cloudStore

const corsOptions = corsOrigin === '*'
  ? {}
  : { origin: corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean) }

app.use(cors(corsOptions))
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
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true,
    timestamp: getCurrentTimestamp(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

async function buildDashboardPayload(userId) {
  const shipmentRows = await db.all(
    'SELECT * FROM shipments WHERE userId = ? ORDER BY createdAt DESC LIMIT 10',
    [userId]
  )

  const shipments = []
  for (const shipment of shipmentRows) {
    const history = await db.all(
      'SELECT latitude, longitude, speed, heading, timestamp FROM location_history WHERE shipmentId = ? ORDER BY timestamp DESC LIMIT 20',
      [shipment.id]
    )
    shipments.push(formatShipmentRow(shipment, history))
  }

  const agents = await db.all('SELECT id, name, role, status, lastActivity, description FROM agents ORDER BY name LIMIT 10')
  const notifications = await db.all(
    'SELECT id, type, shipmentId, title, message, severity, read, actionRequired, timestamp FROM notifications WHERE userId = ? ORDER BY timestamp DESC LIMIT 5',
    [userId]
  )
  const crisisEvents = await db.all(
    'SELECT * FROM crisis_events WHERE status = "active" ORDER BY createdAt DESC LIMIT 5'
  )

  return {
    shipments,
    agents,
    notifications: notifications.map((row) => ({ ...row, read: Boolean(row.read), actionRequired: Boolean(row.actionRequired) })),
    crisisEvents,
    stats: {
      totalShipments: shipments.length,
      activeShipments: shipments.filter((shipment) => shipment.status === 'in-transit').length,
      criticalAlerts: crisisEvents.length,
      unreadNotifications: notifications.filter((notification) => !notification.read).length,
    },
  }
}

function registerRoutes() {
  app.use('/api/auth', createAuthRouter(db, jwtSecret, authMiddleware))
  app.use('/api/shipments', authMiddleware, createShipmentRouter(db, { realtime, cloudStore }))
  app.use('/api/agents', authMiddleware, createAgentRouter(db, { realtime, cloudStore }))
  app.use('/api/risk', authMiddleware, createRiskRouter(db))
  app.use('/api/notifications', authMiddleware, createNotificationRouter(db))
  app.use('/api/support', authMiddleware, createSupportRouter(db, { realtime, cloudStore }))
  app.use('/api/blockchain', authMiddleware, createBlockchainRouter(db, { realtime, cloudStore }))

  app.get('/api/dashboard', authMiddleware, asyncHandler(async (req, res) => {
    res.json(await buildDashboardPayload(req.user.id))
  }))
}

function setupErrorHandler() {
  // eslint-disable-next-line
  app.use((err, req, res, next) => {
    console.error('❌ Error:', err)
    const status = err.status || 500
    const message = err.message || 'Internal server error'
    res.status(status).json({
      error: message,
      timestamp: getCurrentTimestamp()
    })
  })
}

async function initializeServer() {
  try {
    console.log('📦 Initializing AegisChain Backend...')
    
    db = new Database(dbPath)
    await db.initialize()
    console.log('✅ Database initialized')

    cloudStore = createCloudStore()
    if (cloudStore.enabled) {
      console.log('✅ Azure Cosmos DB cloud store enabled')
    } else {
      console.log('ℹ️ Azure Cosmos DB cloud store disabled (missing AZURE_COSMOS_ENDPOINT/AZURE_COSMOS_KEY)')
    }

    for (const agent of DEFAULT_AGENTS) {
      const existing = await db.get('SELECT id FROM agents WHERE id = ?', [agent.id])
      if (!existing) {
        const now = getCurrentTimestamp()
        await db.run(
          `INSERT INTO agents (id, name, role, status, lastActivity, description, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [agent.id, agent.name, agent.role, agent.status, agent.lastActivity, agent.description, now, now]
        )
      }
    }

    console.log('✅ Seeded agents')

    httpServer = createServer(app)
    realtime = createRealtimeHub({
      server: httpServer,
      jwtSecret,
      simulateForUser: async (userId) => simulateShipmentsForUser(db, userId, { cloudStore }),
    })
    console.log('✅ Real-time WebSocket hub ready on /ws')

    registerRoutes()
    setupErrorHandler()

    httpServer.listen(port, () => {
      console.log(`✅ AegisChain Backend running on http://localhost:${port}`)
      console.log(`📚 API Documentation:`)
      console.log(`   POST   /api/auth/login         - User login`)
      console.log(`   GET    /api/auth/me            - Get current user`)
      console.log(`   GET    /api/dashboard          - Get dashboard data`)
      console.log(`   GET    /api/shipments          - Get user shipments`)
      console.log(`   POST   /api/shipments          - Create shipment`)
      console.log(`   GET    /api/shipments/:id      - Get shipment details`)
      console.log(`   PATCH  /api/shipments/:id      - Update shipment`)
      console.log(`   POST   /api/shipments/:id/location - Update location`)
      console.log(`   GET    /api/agents             - Get agents`)
      console.log(`   PATCH  /api/agents/:id         - Update agent`)
      console.log(`   GET    /api/risk/shipment/:id  - Get risk analysis`)
      console.log(`   POST   /api/risk               - Create risk analysis`)
      console.log(`   GET    /api/notifications      - Get notifications`)
      console.log(`   POST   /api/notifications      - Create notification`)
      console.log(`   PATCH  /api/notifications/:id/read - Mark as read`)
      console.log(`   PATCH  /api/notifications/read-all - Mark all notifications as read`)
      console.log(`   GET    /api/agents/workflow      - Get agent workflow history`)
      console.log(`   POST   /api/agents/tasks         - Assign work to agents`)
      console.log(`   POST   /api/agents/analyze/:id   - Analyze one shipment`)
      console.log(`   POST   /api/agents/analyze-all   - Analyze all shipments`)
      console.log(`   GET    /api/support/chat         - Get chatbot history`)
      console.log(`   POST   /api/support/chat         - Send chatbot message`)
      console.log(`   GET    /api/shipments/:id/history - Get shipment historical playback snapshots`)
      console.log(`   GET    /api/blockchain/shipment/:id - Get shipment blockchain transactions/events`)
      console.log(`   POST   /api/blockchain/payment     - Submit and confirm blockchain payment`)
      console.log(`   WS     /ws                         - Real-time tracking and workflow updates`)
      console.log('')
    })
  } catch (err) {
    console.error('❌ Failed to initialize server:', err)
    process.exit(1)
  }
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...')
  realtime?.close()
  httpServer?.close()
  await db.close()
  process.exit(0)
})

initializeServer()
