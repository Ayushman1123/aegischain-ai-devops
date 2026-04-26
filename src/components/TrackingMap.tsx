import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Shipment, Coordinates } from '@/types'
import { getRiskLevelColor, getShipmentStatusBadge } from '@/lib/agents'
import { formatDistance, formatSpeed } from '@/lib/tracking'
import { MapPin, NavigationArrow, Gauge, Path } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface TrackingMapProps {
  shipments: Shipment[]
  selectedShipment?: Shipment | null
  onSelectShipment?: (shipment: Shipment) => void
}

export function TrackingMap({ shipments, selectedShipment, onSelectShipment }: TrackingMapProps) {
  const bounds = useMemo(() => {
    const allCoords: Coordinates[] = shipments.flatMap((s) => [
      s.originCoords,
      s.destinationCoords,
      s.currentLocation,
    ])

    const lats = allCoords.map((c) => c.lat)
    const lngs = allCoords.map((c) => c.lng)

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    }
  }, [shipments])

  const viewBox = useMemo(() => {
    const padding = 2
    const width = bounds.maxLng - bounds.minLng + padding * 2
    const height = bounds.maxLat - bounds.minLat + padding * 2

    return {
      x: bounds.minLng - padding,
      y: bounds.minLat - padding,
      width,
      height,
    }
  }, [bounds])

  const projectCoord = (coord: Coordinates) => {
    const x = coord.lng
    const y = -coord.lat
    return { x, y }
  }

  return (
    <Card className="p-6 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="relative">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">Live Tracking Map</h3>
          <p className="text-sm text-muted-foreground">Real-time shipment locations and routes</p>
        </div>

        <div className="relative bg-secondary/20 rounded-lg border border-border overflow-hidden" style={{ aspectRatio: '16/10' }}>
          <svg
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            className="w-full h-full"
            style={{ transform: 'scaleY(-1)' }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  className="fill-accent/40"
                />
              </marker>

              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-muted)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {shipments.map((shipment) => {
              const origin = projectCoord(shipment.originCoords)
              const destination = projectCoord(shipment.destinationCoords)
              const current = projectCoord(shipment.currentLocation)
              const isSelected = selectedShipment?.id === shipment.id

              return (
                <g key={shipment.id}>
                  <line
                    x1={origin.x}
                    y1={origin.y}
                    x2={destination.x}
                    y2={destination.y}
                    stroke="url(#routeGradient)"
                    strokeWidth={isSelected ? '0.08' : '0.04'}
                    strokeDasharray={isSelected ? '0.2 0.1' : '0.15 0.1'}
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-300"
                  />

                  <circle
                    cx={origin.x}
                    cy={origin.y}
                    r={isSelected ? '0.15' : '0.1'}
                    className="fill-muted stroke-border transition-all duration-300"
                    strokeWidth="0.02"
                  />

                  <circle
                    cx={destination.x}
                    cy={destination.y}
                    r={isSelected ? '0.15' : '0.1'}
                    className="fill-accent stroke-accent-foreground transition-all duration-300"
                    strokeWidth="0.02"
                  />

                  <circle
                    cx={current.x}
                    cy={current.y}
                    r={isSelected ? '0.25' : '0.18'}
                    className={cn(
                      'cursor-pointer transition-all duration-300',
                      shipment.riskLevel === 'critical'
                        ? 'fill-destructive stroke-destructive-foreground animate-pulse-glow'
                        : shipment.riskLevel === 'high'
                        ? 'fill-destructive stroke-destructive-foreground'
                        : shipment.riskLevel === 'medium'
                        ? 'fill-warning stroke-warning-foreground'
                        : 'fill-success stroke-success-foreground'
                    )}
                    strokeWidth="0.04"
                    onClick={() => onSelectShipment?.(shipment)}
                  />

                  {isSelected && (
                    <>
                      <circle
                        cx={current.x}
                        cy={current.y}
                        r="0.4"
                        className="fill-transparent stroke-accent animate-pulse-glow"
                        strokeWidth="0.03"
                        opacity="0.6"
                      />
                      <circle
                        cx={current.x}
                        cy={current.y}
                        r="0.55"
                        className="fill-transparent stroke-accent animate-pulse-glow"
                        strokeWidth="0.02"
                        opacity="0.3"
                      />
                    </>
                  )}
                </g>
              )
            })}
          </svg>

          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success border-2 border-success-foreground" />
                <span className="text-muted-foreground">Low Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning border-2 border-warning-foreground" />
                <span className="text-muted-foreground">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive border-2 border-destructive-foreground" />
                <span className="text-muted-foreground">High/Critical</span>
              </div>
            </div>
          </div>
        </div>

        {selectedShipment && (
          <Card className="mt-4 p-4 bg-accent/5 border-accent/30">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{selectedShipment.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono">{selectedShipment.id}</p>
                </div>
                <Badge className={getShipmentStatusBadge(selectedShipment.status)}>
                  {selectedShipment.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-muted-foreground" weight="duotone" />
                  <div>
                    <div className="text-muted-foreground">Current Location</div>
                    <div className="font-mono text-foreground">
                      {selectedShipment.currentLocation.lat.toFixed(4)}°, {selectedShipment.currentLocation.lng.toFixed(4)}°
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Gauge size={16} className="text-muted-foreground" weight="duotone" />
                  <div>
                    <div className="text-muted-foreground">Speed</div>
                    <div className="font-mono text-foreground">
                      {formatSpeed(selectedShipment.averageSpeed)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Path size={16} className="text-muted-foreground" weight="duotone" />
                  <div>
                    <div className="text-muted-foreground">Remaining</div>
                    <div className="font-mono text-foreground">
                      {formatDistance(selectedShipment.remainingDistance)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <NavigationArrow size={16} className="text-muted-foreground" weight="duotone" />
                  <div>
                    <div className="text-muted-foreground">ETA</div>
                    <div className="font-mono text-foreground">
                      {selectedShipment.eta}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Risk Score</span>
                  <span className={cn('font-bold font-mono', getRiskLevelColor(selectedShipment.riskLevel))}>
                    {selectedShipment.riskScore}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Card>
  )
}
