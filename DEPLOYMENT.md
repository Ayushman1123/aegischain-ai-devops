# AegisChain AI - Deployment Guide

## Overview

AegisChain AI is a production-ready supply chain intelligence platform combining agentic AI, blockchain, and real-time tracking. This guide covers local development, Docker deployment, and Azure Container Apps (ACA) deployment.

## Quick Start (Local Development)

### Prerequisites
- Node.js v20+ 
- npm v10+
- SQLite3 (included with Node)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment

Create `.env.local` (frontend):
```bash
VITE_API_BASE_URL=http://localhost:8787
```

Backend `.env` is pre-configured at `backend/.env`:
```bash
NODE_ENV=development
PORT=8787
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=dev-secret-change-in-production
DB_PATH=./data/aegischain.db
```

### 3. Start Services

**Option A: Using provided start script**
```bash
./start.sh
```

**Option B: Manual startup (two terminals)**

Terminal 1 - Backend:
```bash
npm run dev:backend
```

Terminal 2 - Frontend:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Default Login
- **Name**: Control Tower Operator (or any name)
- **Email**: operator@aegischain.ai (or any email)

## Docker Deployment

### Build Docker Image
```bash
docker build -t aegischain-ai:latest .
```

### Run Container Locally
```bash
docker run -p 8787:8787 -p 5173:5173 \
  -e JWT_SECRET="your-secret-key" \
  -e CORS_ORIGIN="http://localhost:5173" \
  -e NODE_ENV=production \
  aegischain-ai:latest
```

## Azure Container Apps (ACA) Deployment

### Prerequisites
- Azure CLI v2.50+
- An Azure subscription
- Resource group created

### Option 1: Quick Deploy with Script
```bash
# Set environment variables
export JWT_SECRET="your-very-long-random-secret"
export CORS_ORIGIN="https://your-frontend-domain.azurewebsites.net"
export AZURE_COSMOS_ENDPOINT="https://your-account.documents.azure.com:443/"  # Optional
export AZURE_COSMOS_KEY="your-cosmos-key"  # Optional
export AZURE_COSMOS_DATABASE="aegischain"

# Run deployment script
bash infra/aca/deploy.sh <resource-group> <region> <app-name> <acr-name>
```

### Option 2: Using Terraform (IaC)
```bash
cd infra/aca/terraform
terraform init
terraform plan -var="resource_group=my-rg" -var="location=eastus"
terraform apply
```

### Option 3: Using Bicep (IaC)
```bash
cd infra/aca/bicep
az deployment group create \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters main.bicepsparams
```

## Environment Variables

### Backend Variables
| Variable | Required | Example | Purpose |
|---|---|---|---|
| `JWT_SECRET` | Yes | `long-random-secret` | Cryptographic key for JWT tokens |
| `PORT` | No (default 8787) | `8787` | Backend HTTP/WebSocket port |
| `CORS_ORIGIN` | Yes | `https://frontend.example.com` | Allowed browser origin |
| `NODE_ENV` | No | `production` | Environment mode |
| `DB_PATH` | No | `./data/aegischain.db` | SQLite database location |
| `AZURE_COSMOS_ENDPOINT` | No | `https://xxx.documents.azure.com:443/` | Azure Cosmos DB endpoint |
| `AZURE_COSMOS_KEY` | No | `...` | Azure Cosmos DB key  |
| `AZURE_COSMOS_DATABASE` | No | `aegischain` | Cosmos DB database name |

### Frontend Variables (Vite)
| Variable | Required | Example | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | `https://backend.example.com` | Backend API base URL |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with name and email
- `GET /api/auth/me` - Get current user

### Dashboard & Data
- `GET /api/dashboard` - Get complete dashboard data
- `GET /api/shipments` - List shipments
- `GET /api/agents` - List AI agents
- `GET /api/notifications` - Get notifications

### Shipments & Tracking
- `POST /api/shipments` - Create shipment
- `GET /api/shipments/:id` - Get shipment details
- `PATCH /api/shipments/:id` - Update shipment
- `GET /api/shipments/:id/history` - Get historical data
- `POST /api/shipments/simulate` - Simulate tracking updates

### AI Agents & Workflows
- `GET /api/agents/workflow` - Get workflow history
- `POST /api/agents/tasks` - Assign task to agent
- `POST /api/agents/analyze/:shipmentId` - Analyze shipment
- `POST /api/agents/analyze-all` - Analyze all shipments

### Risk Management
- `GET /api/risk/shipment/:shipmentId` - Get risk analysis
- `POST /api/risk` - Create risk analysis

### Blockchain & Payments
- `POST /api/blockchain/payment` - Create payment transaction
- `GET /api/blockchain/shipment/:shipmentId` - Get blockchain events

### Support
- `GET /api/support/chat` - Get chat history
- `POST /api/support/chat` - Send message to support bot

### Real-Time
- `WS /ws` - WebSocket for real-time updates

## Database Schema

The application uses SQLite with the following main tables:
- `users` - User accounts
- `shipments` - Shipment tracking data
- `agents` - AI agent definitions
- `risk_analyses` - Risk assessments
- `notifications` - User notifications
- `location_history` - GPS tracking history
- `agent_tasks` - Task assignments
- `workflow_steps` - Workflow execution history
- `blockchain_events` - Blockchain audit trail
- `payment_transactions` - Cryptocurrency payments
- `chat_messages` - Support chatbot history

## Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` to your frontend URL
- [ ] Set up Azure Cosmos DB for cloud persistence (optional)
- [ ] Configure proper logging and monitoring
- [ ] Set up SSL/TLS certificates
- [ ] Configure backup strategy
- [ ] Test all API endpoints
- [ ] Load test with expected traffic
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure CI/CD pipeline
- [ ] Document deployment procedures

## Monitoring & Observability

### Logs
- Backend logs: Check Docker logs or `/tmp/backend.log`
- Frontend logs: Browser console (F12)

### Health Checks
```bash
# Check backend health
curl http://localhost:8787/api/health

# Check if auth is working
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}'
```

### Metrics to Monitor
- API response times
- Database query performance
- WebSocket connection count
- Authentication success rate
- Shipment processing latency

## Troubleshooting

### "Control Tower Unavailable" Error
**Cause**: Backend not running or not reachable
**Solution**: 
```bash
# Check if backend is running
lsof -i :8787

# Start backend
npm run dev:backend

# Check logs
curl http://localhost:8787/api/health
```

### WebSocket Connection Errors
**Cause**: WebSocket proxy not configured correctly
**Solution**: Ensure `vite.config.ts` has `/ws` proxy configured

### Database Locked Error
**Cause**: Multiple processes accessing SQLite
**Solution**: Ensure only one backend instance is running

### CORS Errors
**Cause**: frontend URL not in `CORS_ORIGIN`
**Solution**: Update `CORS_ORIGIN` to match your frontend URL

## Support

For issues or questions:
1. Check the logs: `tail -f /tmp/backend.log`
2. Review API responses with `curl -v`
3. Check browser console for frontend errors
4. Consult the main [README.md](../README.md)

## Maintenance

### Database Backups
```bash
# Backup SQLite database
cp ./data/aegischain.db ./backups/aegischain_$(date +%Y%m%d).db
```

### Updating Dependencies
```bash
npm update
npm audit fix
npm run build
```

### Performance Optimization
- Enable Cosmos DB mirroring for production
- Implement caching layer for frequently accessed data
- Consider CDN for static assets
- Monitor and optimize slow queries

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-27
