import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import jwt from 'jsonwebtoken'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 8787)
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me'
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'

if (jwtSecret === 'dev-secret-change-me') {
  console.warn('JWT_SECRET is using the default value. Set a strong secret in .env for production.')
}

app.use(cors({ origin: corsOrigin }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { name, email } = req.body ?? {}

    const normalizedName = typeof name === 'string' ? name.trim() : ''
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!normalizedName || normalizedName.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' })
    }

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Valid email is required' })
    }

    const userId = Buffer.from(normalizedEmail).toString('base64url')

    const user = {
      id: userId,
      name: normalizedName,
      email: normalizedEmail,
      picture: '',
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

    return res.json({ token, user })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(401).json({ error: 'Authentication failed' })
  }
})

app.get('/api/auth/me', (req, res) => {
  try {
    const authHeader = req.header('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!token) {
      return res.status(401).json({ error: 'Missing token' })
    }

    const payload = jwt.verify(token, jwtSecret)

    return res.json({
      user: {
        id: String(payload.sub || ''),
        name: String(payload.name || ''),
        email: String(payload.email || ''),
        picture: String(payload.picture || ''),
      },
    })
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
})

app.listen(port, () => {
  console.log(`Auth backend listening on http://localhost:${port}`)
})
