import type { Coordinates, LocationUpdate, Shipment } from '@/types'

export const CITY_COORDINATES: Record<string, Coordinates> = {
  'New York, NY': { lat: 40.7128, lng: -74.0060 },
  'Chicago, IL': { lat: 41.8781, lng: -87.6298 },
  'Los Angeles, CA': { lat: 34.0522, lng: -118.2437 },
  'Seattle, WA': { lat: 47.6062, lng: -122.3321 },
  'Atlanta, GA': { lat: 33.7490, lng: -84.3880 },
  'Miami, FL': { lat: 25.7617, lng: -80.1918 },
  'Cleveland, OH': { lat: 41.4993, lng: -81.6944 },
  'Detroit, MI': { lat: 42.3314, lng: -83.0458 },
  'Philadelphia, PA': { lat: 39.9526, lng: -75.1652 },
  'Boston, MA': { lat: 42.3601, lng: -71.0589 },
}

export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
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

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export function interpolatePosition(
  start: Coordinates,
  end: Coordinates,
  progress: number
): Coordinates {
  const normalizedProgress = Math.max(0, Math.min(1, progress / 100))
  
  return {
    lat: start.lat + (end.lat - start.lat) * normalizedProgress,
    lng: start.lng + (end.lng - start.lng) * normalizedProgress,
  }
}

export function calculateETA(
  currentLocation: Coordinates,
  destination: Coordinates,
  averageSpeed: number
): { eta: string; etaTimestamp: number } {
  const remainingDistance = calculateDistance(currentLocation, destination)
  const hoursRemaining = remainingDistance / averageSpeed
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
  
  return { eta, etaTimestamp }
}

export function calculateHeading(from: Coordinates, to: Coordinates): number {
  const dLng = toRad(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(toRad(to.lat))
  const x = Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
            Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLng)
  
  const bearing = Math.atan2(y, x)
  return (bearing * 180 / Math.PI + 360) % 360
}

export function generateLocationHistory(
  origin: Coordinates,
  current: Coordinates,
  progress: number
): LocationUpdate[] {
  const history: LocationUpdate[] = []
  const steps = Math.max(5, Math.floor(progress / 10))
  
  for (let i = 0; i <= steps; i++) {
    const stepProgress = (i / steps) * progress
    const position = interpolatePosition(origin, current, stepProgress)
    const timestamp = new Date(Date.now() - (steps - i) * 15 * 60 * 1000).toISOString()
    
    history.push({
      timestamp,
      location: position,
      speed: 60 + Math.random() * 20,
      heading: calculateHeading(
        i > 0 ? history[i - 1].location : origin,
        position
      ),
    })
  }
  
  return history
}

export function simulateLocationUpdate(shipment: Shipment): Shipment {
  if (shipment.status === 'delivered' || shipment.status === 'crisis') {
    return shipment
  }

  const progressIncrement = Math.random() * 2
  const newProgress = Math.min(100, shipment.progress + progressIncrement)
  
  const newLocation = interpolatePosition(
    shipment.originCoords,
    shipment.destinationCoords,
    newProgress
  )
  
  const remainingDistance = calculateDistance(newLocation, shipment.destinationCoords)
  const { eta, etaTimestamp } = calculateETA(
    newLocation,
    shipment.destinationCoords,
    shipment.averageSpeed
  )
  
  const newLocationUpdate: LocationUpdate = {
    timestamp: new Date().toISOString(),
    location: newLocation,
    speed: shipment.averageSpeed + (Math.random() - 0.5) * 10,
    heading: calculateHeading(shipment.currentLocation, newLocation),
  }
  
  return {
    ...shipment,
    progress: newProgress,
    currentLocation: newLocation,
    remainingDistance,
    eta,
    etaTimestamp,
    locationHistory: [...shipment.locationHistory, newLocationUpdate].slice(-20),
  }
}

export function formatETA(etaTimestamp: number): string {
  const now = Date.now()
  const diff = etaTimestamp - now
  
  if (diff <= 0) return 'Arriving now'
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (minutes < 60) {
    return `${minutes} min`
  } else if (hours < 24) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  } else {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  } else if (km < 100) {
    return `${km.toFixed(1)}km`
  } else {
    return `${Math.round(km)}km`
  }
}

export function formatSpeed(kmh: number): string {
  return `${Math.round(kmh)} km/h`
}
