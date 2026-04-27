#!/bin/bash
# AegisChain AI - Complete Application Startup Script
# This script starts both the frontend and backend services

set -e

echo "🚀 AegisChain AI - Control Tower"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is already running
if lsof -i :8787 > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Backend already running on port 8787${NC}"
else
  echo -e "${BLUE}📦 Starting Backend Server...${NC}"
  npm run dev:backend > /tmp/backend.log 2>&1 &
  BACKEND_PID=$!
  echo "Backend PID: $BACKEND_PID"

  # Wait for backend to start
  echo "⏳ Waiting for backend to start..."
  sleep 3

  # Verify backend is running
  if curl -s http://localhost:8787/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend started successfully${NC}"
  else
    echo -e "${YELLOW}⚠️  Backend startup delayed, checking in 2 more seconds...${NC}"
    sleep 2
    if curl -s http://localhost:8787/api/health > /dev/null; then
      echo -e "${GREEN}✅ Backend started successfully${NC}"
    else
      echo "❌ Backend failed to start. Check /tmp/backend.log"
      exit 1
    fi
  fi
fi

echo ""
echo -e "${BLUE}🎨 Starting Frontend Development Server...${NC}"
npm run dev:frontend

trap "echo -e '${YELLOW}Shutting down...${NC}'; kill $BACKEND_PID 2>/dev/null; exit 0" SIGINT

# Keep script running
wait
