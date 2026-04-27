#!/bin/bash
# AegisChain AI - Comprehensive Verification Script
# This validates all application features are working correctly

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

test_count=0
passed=0
failed=0

assert_endpoint() {
  local name=$1
  local method=$2
  local url=$3
  local token=$4
  local data=$5
  local expected_field=$6

  test_count=$((test_count + 1))
  echo -ne "Test $test_count: $name... "

  if [ -z "$token" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$url" -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json")
  fi

  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    if [ -n "$expected_field" ]; then
      if echo "$body" | jq -e ".$expected_field" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        passed=$((passed + 1))
      else
        echo -e "${RED}✗ (missing: $expected_field)${NC}"
        echo "  Response: $body"
        failed=$((failed + 1))
      fi
    else
      echo -e "${GREEN}✓${NC}"
      passed=$((passed + 1))
    fi
  else
    echo -e "${RED}✗ (HTTP $http_code)${NC}"
    echo "  Response: $body"
    failed=$((failed + 1))
  fi
}

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       AegisChain AI - Verification Suite          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if backend is running
echo -e "${YELLOW}→ Checking backend availability...${NC}"
if ! curl -s http://localhost:8787/api/health > /dev/null; then
  echo -e "${RED}✗ Backend not running on port 8787${NC}"
  echo "  Start it with: npm run dev:backend"
  exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Get authentication token
echo -e "${YELLOW}→ Authenticating...${NC}"
auth_response=$(curl -s -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"name":"Verification User","email":"verify@aegischain.ai"}')

TOKEN=$(echo "$auth_response" | jq -r '.token')
USER_ID=$(echo "$auth_response" | jq -r '.user.id')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Authentication failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Authenticated successfully${NC}"
echo ""

# Test Section 1: Core API
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. Core API Endpoints${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
assert_endpoint "Health Check" "GET" "http://localhost:8787/api/health" "" "" "ok"
assert_endpoint "Get Current User" "GET" "http://localhost:8787/api/auth/me" "$TOKEN" "" "user"
assert_endpoint "Get Dashboard" "GET" "http://localhost:8787/api/dashboard" "$TOKEN" "" "shipments"
echo ""

# Test Section 2: Shipment Management
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2. Shipment Management${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
assert_endpoint "List Shipments" "GET" "http://localhost:8787/api/shipments" "$TOKEN" "" "shipments"

# Get a shipment ID for further tests
shipment_response=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8787/api/shipments)
SHIPMENT_ID=$(echo "$shipment_response" | jq -r '.shipments[0].id')

if [ "$SHIPMENT_ID" != "null" ] && [ -n "$SHIPMENT_ID" ]; then
  assert_endpoint "Get Shipment Details" "GET" "http://localhost:8787/api/shipments/$SHIPMENT_ID" "$TOKEN" "" "shipment"
  assert_endpoint "Simulate Tracking Update" "POST" "http://localhost:8787/api/shipments/simulate" "$TOKEN" "{}" "shipments"
else
  echo -e "${YELLOW}⚠ No shipments found to test details${NC}"
fi
echo ""

# Test Section 3: AI Agents & Workflows
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3. AI Agents & Workflows${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
assert_endpoint "Get Agents" "GET" "http://localhost:8787/api/agents" "$TOKEN" "" "agents"
assert_endpoint "Get Workflow History" "GET" "http://localhost:8787/api/agents/workflow" "$TOKEN" "" "workflowSteps"

if [ "$SHIPMENT_ID" != "null" ] && [ -n "$SHIPMENT_ID" ]; then
  assert_endpoint "Analyze Shipment" "POST" "http://localhost:8787/api/agents/analyze/$SHIPMENT_ID" "$TOKEN" "{}" "analysis"
  assert_endpoint "Assign Agent Task" "POST" "http://localhost:8787/api/agents/tasks" "$TOKEN" \
    "{\"prompt\":\"Review shipment status\",\"shipmentId\":\"$SHIPMENT_ID\"}" "task"
fi
echo ""

# Test Section 4: Risk Management
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4. Risk Management${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$SHIPMENT_ID" != "null" ] && [ -n "$SHIPMENT_ID" ]; then
  assert_endpoint "Get Risk Analysis" "GET" "http://localhost:8787/api/risk/shipment/$SHIPMENT_ID" "$TOKEN" "" "analyses"
fi
echo ""

# Test Section 5: Notifications
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5. Notifications${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
assert_endpoint "Get Notifications" "GET" "http://localhost:8787/api/notifications" "$TOKEN" "" "notifications"
echo ""

# Test Section 6: Support Chat
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6. Support Chat${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
assert_endpoint "Get Chat History" "GET" "http://localhost:8787/api/support/chat" "$TOKEN" "" "messages"
assert_endpoint "Send Support Message" "POST" "http://localhost:8787/api/support/chat" "$TOKEN" \
  "{\"message\":\"What is the shipment status?\"}" "reply"
echo ""

# Test Section 7: Blockchain (optional)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}7. Blockchain Integration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$SHIPMENT_ID" != "null" ] && [ -n "$SHIPMENT_ID" ]; then
  assert_endpoint "Get Blockchain Events" "GET" "http://localhost:8787/api/blockchain/shipment/$SHIPMENT_ID" "$TOKEN" "" "transactions"
  assert_endpoint "Create Payment Transaction" "POST" "http://localhost:8787/api/blockchain/payment" "$TOKEN" \
    "{\"shipmentId\":\"$SHIPMENT_ID\",\"amount\":100,\"currency\":\"ETH\",\"from\":\"0x1234\",\"to\":\"0x5678\"}" "transaction"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
total=$((passed + failed))
echo "Total Tests: $total"
echo -e "  ${GREEN}Passed: $passed${NC}"
echo -e "  ${RED}Failed: $failed${NC}"

if [ $failed -eq 0 ]; then
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║           ✓ All verification tests passed!         ║${NC}"
  echo -e "${GREEN}║     Application is ready for deployment 🚀         ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║      ✗ Some tests failed. Please review above.     ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
  exit 1
fi
