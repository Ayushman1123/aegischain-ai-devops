# AegisChain AI Backend

A scalable, production-ready backend for the AegisChain AI Supply Chain Intelligence Platform.

## Features

- **User Authentication**: JWT-based authentication with SQLite persistence
- **Shipment Management**: Full CRUD operations for shipments with real-time location tracking
- **Risk Analysis**: Store and retrieve supply chain risk assessments
- **Agent Management**: Control and monitor AI agents
- **Notifications**: User notification system with read status
- **Database Persistence**: SQLite with structured schema (easily scalable to PostgreSQL)
- **Error Handling**: Comprehensive error handling and validation
- **Logging**: Request/response logging for debugging

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
cd backend
npm install
```

## Configuration

Create a `.env` file in the backend directory:

```env
NODE_ENV=development
PORT=8787
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DB_PATH=./data/aegischain.db
LOG_LEVEL=info
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## Database

The backend uses SQLite for data persistence. The database is automatically initialized on server startup.

### Database Schema

- **users**: User accounts with profile information
- **shipments**: Shipment records with tracking data
- **agents**: AI agent definitions and status
- **risk_analyses**: Historical risk analysis results
- **notifications**: User notifications
- **crisis_events**: Emergency events and responses
- **blockchain_events**: Immutable audit logs
- **location_history**: GPS tracking history

## API Endpoints

### Authentication

```
POST   /api/auth/login       - Login/register user
  Body: { name: string, email: string }
  Returns: { token: string, user: User }

GET    /api/auth/me          - Get current user profile
  Headers: Authorization: Bearer {token}
  Returns: { user: User }
```

### Shipments

```
GET    /api/shipments        - Get all user's shipments
  Headers: Authorization: Bearer {token}
  Returns: { shipments: Shipment[] }

GET    /api/shipments/:id    - Get specific shipment with location history
  Headers: Authorization: Bearer {token}
  Returns: { shipment: Shipment }

POST   /api/shipments        - Create new shipment
  Headers: Authorization: Bearer {token}
  Body: { name, origin, destination, status?, riskScore?, riskLevel? }
  Returns: { shipment: Shipment }

PATCH  /api/shipments/:id    - Update shipment
  Headers: Authorization: Bearer {token}
  Body: { status?, progress?, riskScore?, riskLevel?, currentLat?, currentLng?, lastUpdate? }
  Returns: { shipment: Shipment }

POST   /api/shipments/:id/location - Record new location
  Headers: Authorization: Bearer {token}
  Body: { latitude, longitude, speed, heading }
  Returns: { success: true, locationId: string }

POST   /api/shipments/:id/risk-analysis - Create risk analysis
  Headers: Authorization: Bearer {token}
  Body: { riskScore, riskLevel, factors?, recommendations?, analyzedBy? }
  Returns: { analysisId: string, success: true }
```

### Agents

```
GET    /api/agents           - Get all agents
  Headers: Authorization: Bearer {token}
  Returns: { agents: Agent[] }

PATCH  /api/agents/:id       - Update agent status
  Headers: Authorization: Bearer {token}
  Body: { status?, lastActivity? }
  Returns: { agent: Agent }
```

### Risk Analysis

```
GET    /api/risk/shipment/:shipmentId - Get historical risk analyses
  Headers: Authorization: Bearer {token}
  Returns: { analyses: RiskAnalysis[] }

POST   /api/risk             - Create new risk analysis
  Headers: Authorization: Bearer {token}
  Body: { shipmentId, riskScore, riskLevel, factors?, recommendations?, analyzedBy? }
  Returns: { analysis: RiskAnalysis }
```

### Notifications

```
GET    /api/notifications    - Get user's notifications
  Headers: Authorization: Bearer {token}
  Returns: { notifications: Notification[] }

POST   /api/notifications    - Create notification
  Headers: Authorization: Bearer {token}
  Body: { type, shipmentId?, title, message?, severity?, actionRequired? }
  Returns: { notification: Notification }

PATCH  /api/notifications/:id/read - Mark notification as read
  Headers: Authorization: Bearer {token}
  Returns: { success: true }
```

### Dashboard

```
GET    /api/dashboard        - Get dashboard data (shipments, agents, stats)
  Headers: Authorization: Bearer {token}
  Returns: { shipments, agents, notifications, crisisEvents, stats }
```

### Health

```
GET    /api/health           - Server health check
  Returns: { ok: true, timestamp, uptime, environment }
```

## Data Models

### User
```typescript
{
  id: string
  name: string
  email: string
  picture: string
  createdAt: string
  updatedAt: string
}
```

### Shipment
```typescript
{
  id: string
  userId: string
  name: string
  origin: string
  destination: string
  originCoords: { lat: number, lng: number }
  destinationCoords: { lat: number, lng: number }
  currentLocation: { lat: number, lng: number }
  status: 'scheduled' | 'in-transit' | 'delayed' | 'delivered' | 'crisis'
  riskScore: number (0-100)
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  eta: string
  etaTimestamp: number
  progress: number (0-100)
  lastUpdate: string
  estimatedDistance: number (km)
  remainingDistance: number (km)
  averageSpeed: number (km/h)
  locationHistory: LocationUpdate[]
  createdAt: string
  updatedAt: string
}
```

### Agent
```typescript
{
  id: string
  name: string
  role: string
  status: 'idle' | 'active' | 'processing' | 'error' | 'success'
  lastActivity: string
  description: string
  createdAt: string
  updatedAt: string
}
```

### Notification
```typescript
{
  id: string
  userId: string
  type: 'eta_update' | 'delay' | 'risk_increase' | 'weather' | 'traffic' | 'crisis'
  shipmentId?: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'success'
  read: boolean
  actionRequired: boolean
  timestamp: string
  createdAt: string
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Possible HTTP status codes:
- `200` - Success
- `201` - Resource created
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not found
- `500` - Internal server error

## Scaling

### To PostgreSQL/MySQL

1. Replace SQLite initialization in `db.js` with PostgreSQL driver
2. Update SQL queries to use parameterized statements (already in place)
3. Add connection pooling
4. Update `.env` with database credentials

### To MongoDB

1. Create models using MongoDB schema definitions
2. Replace database layer with MongoDB driver
3. Update route handlers to use MongoDB queries

### To Redis Caching

1. Add Redis client initialization
2. Cache frequently accessed data (agents, recent shipments)
3. Implement cache invalidation on updates

## Development

### Project Structure

```
backend/
├── server.js          - Main application server
├── db.js              - Database class and initialization
├── routes.js          - API route handlers
├── utils.js           - Utility functions
├── package.json       - Dependencies
├── .env               - Configuration
└── data/              - SQLite database files
```

### Adding New Features

1. Create new route handler in `routes.js`
2. Add database schema to `db.js` if needed
3. Mount router in `server.js` with auth middleware
4. Update documentation

## Performance Optimization

- Database queries are indexed on frequently searched columns
- Location history is limited to last 20 records per shipment
- Notifications are cached with read status
- Use pagination for large datasets

## Security Considerations

- JWT tokens expire after 7 days
- All routes except `/api/health` and `/api/auth/login` require authentication
- CORS is configured to allow only frontend origin
- Input validation on all endpoints
- SQL injection prevention through parameterized queries

## Monitoring & Logging

Request logging includes:
- Timestamp
- HTTP method and path
- Response status code
- Response time in milliseconds

Example log:
```
[2024-01-15T10:30:00.000Z] POST /api/shipments - 201 (45ms)
```

## License

See LICENSE in the root directory
