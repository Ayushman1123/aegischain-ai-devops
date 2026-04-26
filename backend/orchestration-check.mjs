const base = 'http://localhost:8787'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function api(path, init = {}, token) {
  const headers = { 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${base}${path}`, { ...init, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${path} failed ${res.status} ${JSON.stringify(body)}`)
  return body
}

async function run() {
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name: 'Orchestrator QA', email: 'orchestrator.qa@example.com' }),
  })
  const token = login.token

  const shipments = (await api('/api/shipments', {}, token)).shipments
  assert(Array.isArray(shipments) && shipments.length > 0, 'no shipments')
  const one = shipments[0]

  const wsEvents = []
  const ws = new WebSocket(`ws://localhost:8787/ws?token=${encodeURIComponent(token)}`)
  ws.onmessage = (event) => {
    try {
      wsEvents.push(JSON.parse(event.data))
    } catch {
      // Ignore malformed payloads.
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 600))

  const oneAnalysis = await api(`/api/agents/analyze/${one.id}`, { method: 'POST', body: JSON.stringify({}) }, token)
  assert(oneAnalysis.analysis?.shipmentId === one.id, 'analysis missing/invalid')
  assert(oneAnalysis.workflowSteps?.length >= 5, 'workflow too short for single analysis')

  const assign = await api('/api/agents/tasks', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'Optimize route and notify customer for delay', shipmentId: one.id }),
  }, token)
  assert(assign.task?.id, 'task not created')
  assert(assign.workflowSteps?.length >= 3, 'assignment workflow too short')

  const all = await api('/api/agents/analyze-all', { method: 'POST', body: JSON.stringify({}) }, token)
  assert(all.analyses?.length === shipments.length, 'analyze-all count mismatch')

  const workflow = await api('/api/agents/workflow', {}, token)
  assert(Array.isArray(workflow.workflowSteps) && workflow.workflowSteps.length > 0, 'no workflow steps persisted')

  const recentAgentIds = workflow.workflowSteps.slice(0, 50).map((step) => step.agentId)
  const requiredAgents = ['planner', 'rag', 'risk-detection', 'supply-optimization', 'communication', 'executor']
  for (const id of requiredAgents) {
    assert(recentAgentIds.includes(id), `missing agent in orchestration: ${id}`)
  }

  await new Promise((resolve) => setTimeout(resolve, 2500))
  ws.close()

  const wsEventNames = wsEvents.map((event) => event.event)
  assert(wsEventNames.includes('realtime.connected'), 'missing websocket connected event')
  assert(wsEventNames.includes('workflow.updated'), 'missing websocket workflow update')

  console.log(JSON.stringify({
    ok: true,
    shipmentCount: shipments.length,
    singleAnalysisWorkflowSteps: oneAnalysis.workflowSteps.length,
    assignWorkflowSteps: assign.workflowSteps.length,
    analyzeAllCount: all.analyses.length,
    persistedWorkflowSteps: workflow.workflowSteps.length,
    websocketEvents: [...new Set(wsEventNames)],
  }, null, 2))
}

run().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
