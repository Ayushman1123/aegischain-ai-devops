import { WebSocketServer } from 'ws'
import jwt from 'jsonwebtoken'

function safeParseJSON(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function createRealtimeHub({ server, jwtSecret, simulateForUser }) {
  const wss = new WebSocketServer({ server, path: '/ws' })
  const userSockets = new Map()

  function addSocket(userId, socket) {
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set())
    }
    userSockets.get(userId).add(socket)
  }

  function removeSocket(userId, socket) {
    const sockets = userSockets.get(userId)
    if (!sockets) {
      return
    }
    sockets.delete(socket)
    if (sockets.size === 0) {
      userSockets.delete(userId)
    }
  }

  function onlineUserIds() {
    return [...userSockets.keys()]
  }

  function emitToUser(userId, event, payload) {
    const sockets = userSockets.get(userId)
    if (!sockets || sockets.size === 0) {
      return
    }

    const body = JSON.stringify({ event, payload })
    for (const socket of sockets) {
      if (socket.readyState === 1) {
        socket.send(body)
      }
    }
  }

  wss.on('connection', (socket, request) => {
    const requestUrl = new URL(request.url || '', `http://${request.headers.host}`)
    const token = requestUrl.searchParams.get('token') || ''

    if (!token) {
      socket.close(4001, 'Missing token')
      return
    }

    let payload
    try {
      payload = jwt.verify(token, jwtSecret)
    } catch {
      socket.close(4002, 'Invalid token')
      return
    }

    const userId = payload.sub
    if (!userId) {
      socket.close(4003, 'Invalid subject')
      return
    }

    addSocket(userId, socket)
    emitToUser(userId, 'realtime.connected', { connected: true, at: new Date().toISOString() })

    socket.on('message', async (raw) => {
      const message = safeParseJSON(raw.toString())
      if (!message || typeof message !== 'object') {
        return
      }

      if (message.event === 'tracking.requestTick') {
        try {
          const result = await simulateForUser(userId)
          emitToUser(userId, 'tracking.updated', {
            shipments: result.shipments,
            notifications: result.notifications,
            source: 'manual',
          })
        } catch (err) {
          emitToUser(userId, 'tracking.error', {
            message: err instanceof Error ? err.message : 'Unable to simulate shipment updates',
          })
        }
      }
    })

    socket.on('close', () => {
      removeSocket(userId, socket)
    })

    socket.on('error', () => {
      removeSocket(userId, socket)
    })
  })

  const simulator = setInterval(async () => {
    const users = onlineUserIds()
    if (users.length === 0) {
      return
    }

    for (const userId of users) {
      try {
        const result = await simulateForUser(userId)
        emitToUser(userId, 'tracking.updated', {
          shipments: result.shipments,
          notifications: result.notifications,
          source: 'auto',
        })
      } catch {
        // Keep the simulator resilient across users.
      }
    }
  }, 5000)

  return {
    emitToUser,
    close() {
      clearInterval(simulator)
      wss.close()
    },
  }
}
