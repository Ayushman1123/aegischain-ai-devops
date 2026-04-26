import { CITY_COORDINATES } from './fixtures.js'

const AGENT_SEQUENCE = [
  'planner',
  'rag',
  'risk-detection',
  'supply-optimization',
  'communication',
  'executor',
]

function toRad(degrees) {
  return degrees * (Math.PI / 180)
}

export function calculateDistance(coord1, coord2) {
  const R = 6371
  const dLat = toRad(coord2.lat - coord1.lat)
  const dLng = toRad(coord2.lng - coord1.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function interpolatePosition(start, end, progress) {
  const normalizedProgress = Math.max(0, Math.min(1, progress / 100))
  return {
    lat: start.lat + (end.lat - start.lat) * normalizedProgress,
    lng: start.lng + (end.lng - start.lng) * normalizedProgress,
  }
}

export function calculateETA(currentLocation, destination, averageSpeed) {
  const remainingDistance = calculateDistance(currentLocation, destination)
  const hoursRemaining = remainingDistance / Math.max(averageSpeed, 20)
  const minutesRemaining = hoursRemaining * 60
  const etaTimestamp = Date.now() + minutesRemaining * 60 * 1000

  let eta = ''
  if (minutesRemaining < 60) {
    eta = `${Math.round(minutesRemaining)} min`
  } else if (hoursRemaining < 24) {
    const hours = Math.floor(hoursRemaining)
    const minutes = Math.round((hoursRemaining - hours) * 60)
    eta = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  } else {
    const days = Math.floor(hoursRemaining / 24)
    const hours = Math.round(hoursRemaining % 24)
    eta = hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }

  return { eta, etaTimestamp, remainingDistance }
}

export function buildShipmentRecord(userId, blueprint, now) {
  const originCoords = CITY_COORDINATES[blueprint.origin]
  const destinationCoords = CITY_COORDINATES[blueprint.destination]
  const currentLocation = interpolatePosition(originCoords, destinationCoords, blueprint.progress)
  const estimatedDistance = calculateDistance(originCoords, destinationCoords)
  const { eta, etaTimestamp, remainingDistance } = calculateETA(currentLocation, destinationCoords, blueprint.averageSpeed)

  return {
    id: blueprint.id,
    userId,
    name: blueprint.name,
    origin: blueprint.origin,
    destination: blueprint.destination,
    originLat: originCoords.lat,
    originLng: originCoords.lng,
    destinationLat: destinationCoords.lat,
    destinationLng: destinationCoords.lng,
    currentLat: currentLocation.lat,
    currentLng: currentLocation.lng,
    status: blueprint.status,
    riskScore: blueprint.riskScore,
    riskLevel: blueprint.riskLevel,
    eta,
    etaTimestamp,
    progress: blueprint.progress,
    lastUpdate: blueprint.lastUpdate,
    estimatedDistance,
    remainingDistance,
    averageSpeed: blueprint.averageSpeed,
    createdAt: now,
    updatedAt: now,
  }
}

export function formatShipmentRow(shipment, locationHistory = []) {
  return {
    id: shipment.id,
    name: shipment.name,
    origin: shipment.origin,
    destination: shipment.destination,
    originCoords: { lat: shipment.originLat, lng: shipment.originLng },
    destinationCoords: { lat: shipment.destinationLat, lng: shipment.destinationLng },
    currentLocation: { lat: shipment.currentLat, lng: shipment.currentLng },
    status: shipment.status,
    riskScore: shipment.riskScore,
    riskLevel: shipment.riskLevel,
    eta: shipment.eta,
    etaTimestamp: shipment.etaTimestamp,
    progress: shipment.progress,
    lastUpdate: shipment.lastUpdate,
    estimatedDistance: shipment.estimatedDistance,
    remainingDistance: shipment.remainingDistance,
    averageSpeed: shipment.averageSpeed,
    locationHistory: locationHistory.map((entry) => ({
      timestamp: entry.timestamp,
      location: { lat: entry.latitude ?? entry.lat, lng: entry.longitude ?? entry.lng },
      speed: entry.speed,
      heading: entry.heading,
    })),
  }
}

function nextRiskLevel(score) {
  if (score >= 85) return 'critical'
  if (score >= 65) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function deterministicSignal(shipmentId, salt) {
  const seed = `${shipmentId}:${salt}`
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000
  }
  return hash / 100000
}

function parseEtaToMinutes(eta) {
  if (!eta || typeof eta !== 'string') return 0

  const minuteMatch = eta.match(/(\d+)\s*min/i)
  const hourMatch = eta.match(/(\d+)\s*h/i)
  const dayMatch = eta.match(/(\d+)\s*d/i)

  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0
  const hours = hourMatch ? Number(hourMatch[1]) : 0
  const days = dayMatch ? Number(dayMatch[1]) : 0

  return minutes + (hours * 60) + (days * 24 * 60)
}

function buildPredictiveDisruptionIntelligence(shipment) {
  const averageSpeed = Math.max(Number(shipment.averageSpeed) || 20, 20)
  const estimatedDistance = Number(shipment.estimatedDistance) || 0
  const remainingDistance = Number(shipment.remainingDistance) || 0
  const progress = clamp(Number(shipment.progress) || 0, 0, 100)
  const riskBaseline = clamp((Number(shipment.riskScore) || 0) / 100, 0, 1)
  const etaMinutes = parseEtaToMinutes(shipment.eta)
  const baselineMinutes = estimatedDistance > 0 ? (estimatedDistance / averageSpeed) * 60 : 0
  const baselineProgress = baselineMinutes > 0
    ? clamp(((baselineMinutes - etaMinutes) / baselineMinutes) * 100, 0, 100)
    : progress

  const etaVariance = clamp(Math.abs(progress - baselineProgress) / 100, 0, 1)
  const weatherAnomaly = clamp(
    (shipment.status === 'crisis' ? 0.55 : shipment.status === 'delayed' ? 0.35 : 0.2) +
    clamp(remainingDistance / 1800, 0, 0.25) +
    deterministicSignal(shipment.id, 'weather') * 0.2,
    0,
    1
  )
  const portCongestionAnomaly = clamp(
    (shipment.status === 'delayed' ? 0.45 : 0.2) +
    clamp((100 - progress) / 250, 0, 0.35) +
    deterministicSignal(shipment.id, 'port') * 0.2,
    0,
    1
  )
  const fuelPriceAnomaly = clamp(
    0.2 +
    (averageSpeed < 60 ? 0.2 : 0.1) +
    deterministicSignal(shipment.id, 'fuel') * 0.25,
    0,
    1
  )
  const carrierReliabilityRisk = clamp(
    0.15 +
    riskBaseline * 0.5 +
    (shipment.status === 'crisis' ? 0.2 : 0) +
    deterministicSignal(shipment.id, 'carrier') * 0.2,
    0,
    1
  )

  const disruptionProbability = Math.round(clamp(
    (etaVariance * 0.24) +
    (weatherAnomaly * 0.19) +
    (portCongestionAnomaly * 0.19) +
    (fuelPriceAnomaly * 0.14) +
    (carrierReliabilityRisk * 0.14) +
    (riskBaseline * 0.1),
    0,
    1
  ) * 100)

  return {
    disruptionProbability,
    signals: {
      etaVariance: Math.round(etaVariance * 100),
      weatherAnomaly: Math.round(weatherAnomaly * 100),
      portCongestionAnomaly: Math.round(portCongestionAnomaly * 100),
      fuelPriceAnomaly: Math.round(fuelPriceAnomaly * 100),
      carrierReliabilityRisk: Math.round(carrierReliabilityRisk * 100),
    },
  }
}

export function simulateShipmentUpdate(shipment) {
  if (shipment.status === 'delivered') {
    return shipment
  }

  const increment = shipment.status === 'delayed' ? 1.2 : shipment.status === 'crisis' ? 0.4 : 2.1
  const nextProgress = Math.min(100, Number(shipment.progress) + increment)
  const origin = { lat: shipment.originLat, lng: shipment.originLng }
  const destination = { lat: shipment.destinationLat, lng: shipment.destinationLng }
  const nextLocation = interpolatePosition(origin, destination, nextProgress)
  const { eta, etaTimestamp, remainingDistance } = calculateETA(nextLocation, destination, Number(shipment.averageSpeed))

  let riskScore = Number(shipment.riskScore)
  if (shipment.status === 'crisis') {
    riskScore = Math.max(riskScore, 88)
  } else if (shipment.status === 'delayed') {
    riskScore = Math.min(92, riskScore + 2)
  } else {
    riskScore = Math.max(18, riskScore - 1)
  }

  const riskLevel = nextRiskLevel(riskScore)
  const status = nextProgress >= 100 ? 'delivered' : shipment.status === 'crisis' ? 'crisis' : shipment.status
  const lastUpdate = nextProgress >= 100
    ? 'Delivery completed successfully.'
    : `Tracking update at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`

  return {
    ...shipment,
    currentLat: nextLocation.lat,
    currentLng: nextLocation.lng,
    progress: nextProgress,
    eta,
    etaTimestamp,
    remainingDistance,
    riskScore,
    riskLevel,
    status,
    lastUpdate,
  }
}

export function buildAnalysisForShipment(shipment) {
  const factors = []
  const recommendations = []
  const predictive = buildPredictiveDisruptionIntelligence(shipment)

  if (predictive.disruptionProbability >= 35) {
    factors.push({
      category: 'Predictive disruption outlook',
      severity: predictive.disruptionProbability >= 75 ? 'critical' : predictive.disruptionProbability >= 55 ? 'high' : 'medium',
      description: `Time-series ETA variance and anomaly signals forecast a ${predictive.disruptionProbability}% disruption probability (weather ${predictive.signals.weatherAnomaly}%, port congestion ${predictive.signals.portCongestionAnomaly}%, fuel-price volatility ${predictive.signals.fuelPriceAnomaly}%, carrier reliability risk ${predictive.signals.carrierReliabilityRisk}%).`,
      impact: Math.max(4, Math.round(predictive.disruptionProbability / 10)),
    })
    recommendations.push('Run route re-optimization now and compare the top alternatives before the next delay threshold is crossed.')
  }

  if (predictive.disruptionProbability >= 70) {
    recommendations.push('Escalate to proactive mitigation: pre-book alternate capacity and notify stakeholders of likely ETA impact.')
  }

  if (shipment.status === 'crisis') {
    factors.push({
      category: 'Critical disruption',
      severity: 'critical',
      description: 'Shipment is flagged as crisis and requires immediate intervention.',
      impact: 10,
    })
    recommendations.push('Escalate the shipment to the crisis-response agent immediately.')
    recommendations.push('Hold downstream commitments until a recovery plan is confirmed.')
  }

  if (shipment.status === 'delayed') {
    factors.push({
      category: 'Schedule slippage',
      severity: 'high',
      description: 'ETA drift and delay status indicate elevated service risk.',
      impact: 8,
    })
    recommendations.push('Re-route through the supply optimization agent for alternate path review.')
  }

  if (shipment.riskScore >= 60) {
    factors.push({
      category: 'Elevated risk score',
      severity: shipment.riskLevel === 'critical' ? 'critical' : 'high',
      description: 'Current telemetry indicates above-threshold operational risk.',
      impact: 7,
    })
    recommendations.push('Increase notification frequency for stakeholders until risk drops.')
  }

  if (shipment.remainingDistance > 600) {
    factors.push({
      category: 'Long remaining route',
      severity: 'medium',
      description: 'Large remaining distance increases exposure window for weather and traffic issues.',
      impact: 5,
    })
    recommendations.push('Monitor route conditions every refresh cycle for the next leg.')
  }

  if (factors.length === 0) {
    factors.push({
      category: 'Stable movement',
      severity: 'low',
      description: 'Shipment is progressing normally with no immediate disruption indicators.',
      impact: 3,
    })
    recommendations.push('Maintain standard tracking cadence and customer visibility.')
  }

  return {
    shipmentId: shipment.id,
    riskScore: shipment.riskScore,
    riskLevel: shipment.riskLevel,
    predictiveDisruptionProbability: predictive.disruptionProbability,
    predictiveSignals: predictive.signals,
    factors,
    recommendations,
    analyzedBy: ['Planner Agent', 'RAG Context Agent', 'Risk Detection Agent'],
    summary: `${shipment.name} is currently ${shipment.status} with ${shipment.riskLevel} risk and ${Math.round(shipment.progress)}% completion.`,
  }
}

export function buildWorkflowSteps(taskId, shipment, analysis) {
  const now = Date.now()
  return AGENT_SEQUENCE.map((agentId, index) => ({
    id: `${taskId}-${agentId}`,
    taskId,
    agentId,
    agentName: agentLabel(agentId),
    action: workflowAction(agentId),
    input: {
      shipmentId: shipment.id,
      shipmentStatus: shipment.status,
      riskLevel: shipment.riskLevel,
    },
    output: workflowOutput(agentId, shipment, analysis),
    status: 'completed',
    startTime: new Date(now + index * 1200).toISOString(),
    endTime: new Date(now + index * 1200 + 900).toISOString(),
    duration: 900,
  }))
}

function workflowAction(agentId) {
  switch (agentId) {
    case 'planner': return 'Plan work sequence'
    case 'rag': return 'Retrieve route context'
    case 'risk-detection': return 'Score shipment risk'
    case 'supply-optimization': return 'Optimize route options'
    case 'communication': return 'Prepare stakeholder update'
    case 'executor': return 'Apply approved actions'
    default: return 'Process request'
  }
}

function workflowOutput(agentId, shipment, analysis) {
  switch (agentId) {
    case 'planner':
      return { objective: `Stabilize ${shipment.name}`, priority: shipment.riskLevel }
    case 'rag':
      return { context: `Retrieved route knowledge for ${shipment.origin} to ${shipment.destination}.` }
    case 'risk-detection':
      return {
        factors: analysis.factors.slice(0, 2),
        predictiveDisruptionProbability: analysis.predictiveDisruptionProbability,
      }
    case 'supply-optimization':
      return { recommendation: analysis.recommendations[0] }
    case 'communication':
      return { summary: analysis.summary }
    case 'executor':
      return { state: 'Backend records updated successfully.' }
    default:
      return {}
  }
}

function agentLabel(agentId) {
  return {
    planner: 'Planner Agent',
    rag: 'RAG Context Agent',
    'risk-detection': 'Risk Detection Agent',
    'supply-optimization': 'Supply Chain Optimizer',
    communication: 'Communication Agent',
    executor: 'Executor Agent',
  }[agentId] || agentId
}

export function chooseAgentForTask(prompt) {
  const normalized = prompt.toLowerCase()
  if (/(risk|delay|incident|problem|issue)/.test(normalized)) return 'risk-detection'
  if (/(route|optimi|eta|speed|deliver)/.test(normalized)) return 'supply-optimization'
  if (/(alert|message|notify|customer|communicat)/.test(normalized)) return 'communication'
  if (/(crisis|urgent|emergency|critical)/.test(normalized)) return 'crisis-response'
  if (/(ledger|payment|audit|blockchain)/.test(normalized)) return 'blockchain'
  if (/(context|document|knowledge|policy)/.test(normalized)) return 'rag'
  if (/(execute|apply|complete|update)/.test(normalized)) return 'executor'
  return 'planner'
}

export function buildSupportResponse(message, context = {}) {
  const normalized = message.toLowerCase()
  const shipmentCount = context.shipmentCount ?? 0
  const criticalCount = context.criticalCount ?? 0

  if (/(track|map|where|location)/.test(normalized)) {
    return 'Use the live tracking map to inspect each route. The backend now refreshes shipment positions and ETA from the tracking simulation endpoint, so map markers and shipment cards stay aligned.'
  }

  if (/(analyz|risk|delay|problem)/.test(normalized)) {
    return 'Use Analyze All to send every shipment through the planner, context, risk, optimization, communication, and executor agents. High-risk shipments will also create notifications and workflow history.'
  }

  if (/(agent|assign|task|workflow)/.test(normalized)) {
    return 'Open an agent card, assign a task, and the backend will store the assignment, attach workflow steps, and update the responsible agent activity so users can track progress clearly.'
  }

  return `You currently have ${shipmentCount} tracked shipments and ${criticalCount} critical alerts. Ask me about tracking, agent assignment, analysis, or notifications and I will guide you to the right control.`
}
