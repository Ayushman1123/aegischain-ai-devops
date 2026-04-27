#!/bin/bash

# AegisChain Backend API Test Script
# Start the backend with: npm start

API_BASE_URL="http://localhost:8787"
STATUS_OK=0

mark_failure() {
  STATUS_OK=1
}

echo "🧪 Testing AegisChain Backend API..."
echo ""

# Test health check
echo "✓ Testing /api/health..."
curl -s "$API_BASE_URL/api/health" | grep -q "ok" && echo "  ✅ Health check passed" || echo "  ❌ Health check failed"
curl -s "$API_BASE_URL/api/health" | grep -q "ok" || mark_failure
echo ""

# Test login
echo "✓ Testing POST /api/auth/login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "  ✅ Login successful, token: ${TOKEN:0:20}..."
else
  echo "  ❌ Login failed"
  echo "$LOGIN_RESPONSE"
  mark_failure
fi
echo ""

# Test get current user
echo "✓ Testing GET /api/auth/me..."
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE_URL/api/auth/me" | grep -q "test@example.com" && echo "  ✅ Get user passed" || { echo "  ❌ Get user failed"; mark_failure; }
echo ""

# Test get agents
echo "✓ Testing GET /api/agents..."
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE_URL/api/agents" | grep -q "planner" && echo "  ✅ Get agents passed" || { echo "  ❌ Get agents failed"; mark_failure; }
echo ""

# Test dashboard
echo "✓ Testing GET /api/dashboard..."
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE_URL/api/dashboard" | grep -q "stats" && echo "  ✅ Get dashboard passed" || { echo "  ❌ Get dashboard failed"; mark_failure; }
echo ""

# Test create shipment
echo "✓ Testing POST /api/shipments..."
CREATE_RESP=$(curl -s -X POST "$API_BASE_URL/api/shipments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Shipment","origin":"New York, NY","destination":"Los Angeles, CA"}')

SHIPMENT_ID=$(echo "$CREATE_RESP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$SHIPMENT_ID" ]; then
  echo "  ✅ Create shipment passed, ID: $SHIPMENT_ID"
else
  echo "  ❌ Create shipment failed"
  echo "$CREATE_RESP"
  mark_failure
fi
echo ""

# Test get shipments
echo "✓ Testing GET /api/shipments..."
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE_URL/api/shipments" | grep -q "Test Shipment" && echo "  ✅ Get shipments passed" || { echo "  ❌ Get shipments failed"; mark_failure; }
echo ""

if [ -n "$SHIPMENT_ID" ]; then
  # Test create notification
  echo "✓ Testing POST /api/notifications..."
  curl -s -X POST "$API_BASE_URL/api/notifications" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"eta_update\",\"shipmentId\":\"$SHIPMENT_ID\",\"title\":\"ETA Updated\",\"message\":\"Your shipment is on track\"}" | grep -q '"notification"' && echo "  ✅ Create notification passed" || { echo "  ❌ Create notification failed"; mark_failure; }
  echo ""

  # Test create risk analysis
  echo "✓ Testing POST /api/risk..."
  curl -s -X POST "$API_BASE_URL/api/risk" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"shipmentId\":\"$SHIPMENT_ID\",\"riskScore\":45,\"riskLevel\":\"medium\",\"factors\":[],\"recommendations\":[],\"analyzedBy\":[]}" | grep -q '"analysis"' && echo "  ✅ Create risk analysis passed" || { echo "  ❌ Create risk analysis failed"; mark_failure; }
  echo ""
fi

if [ "$STATUS_OK" -eq 0 ]; then
  echo "✅ API testing complete!"
else
  echo "❌ API testing completed with failures"
  exit 1
fi
