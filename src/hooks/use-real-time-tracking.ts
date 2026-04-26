import { useEffect, useState, useCallback, useRef } from 'react'
import type { Shipment } from '@/types'
import { simulateLocationUpdate } from '@/lib/tracking'

export function useRealTimeTracking(initialShipments: Shipment[], updateInterval: number = 5000) {
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments)
  const [isTracking, setIsTracking] = useState(true)
  const intervalRef = useRef<number | null>(null)

  const updateLocations = useCallback(() => {
    setShipments((currentShipments) => 
      currentShipments.map((shipment) => simulateLocationUpdate(shipment))
    )
  }, [])

  useEffect(() => {
    if (!isTracking) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = window.setInterval(updateLocations, updateInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isTracking, updateInterval, updateLocations])

  const toggleTracking = useCallback(() => {
    setIsTracking((prev) => !prev)
  }, [])

  const manualUpdate = useCallback(() => {
    updateLocations()
  }, [updateLocations])

  return {
    shipments,
    isTracking,
    toggleTracking,
    manualUpdate,
  }
}
