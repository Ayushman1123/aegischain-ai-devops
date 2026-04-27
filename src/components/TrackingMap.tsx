import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Shipment, Coordinates } from '@/types'
import { getRiskLevelColor, getShipmentStatusBadge } from '@/lib/agents'
import { formatDistance, formatSpeed } from '@/lib/tracking'
import { MapPin, NavigationArrow, Gauge, Path, Globe } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface TrackingMapProps {
  shipments: Shipment[]
  selectedShipment?: Shipment | null
  onSelectShipment?: (shipment: Shipment) => void
}

export function TrackingMap({ shipments, selectedShipment, onSelectShipment }: TrackingMapProps) {
  // World map coordinates (mercator projection)
  const projectCoord = (coord: Coordinates) => {
    // Convert latitude/longitude to mercator projection (0-100 scale)
    const x = ((coord.lng + 180) / 360) * 100
    const latRad = (coord.lat * Math.PI) / 180
    const y = ((1 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) / 2) * 100
    return { x, y }
  }

  return (
    <Card className="p-6 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe size={20} className="text-primary" weight="duotone" />
              <h3 className="text-lg font-semibold">World Tracking Map</h3>
            </div>
            <p className="text-sm text-muted-foreground">Global shipment locations and routes</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-blue-950/20 via-blue-900/10 to-cyan-950/20 rounded-lg border border-border overflow-hidden" style={{ aspectRatio: '20/12' }}>
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.4), rgba(6,78,115,0.2))' }}
          >
            {/* World Map Grid */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="0.3" />
              </pattern>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.7" />
              </linearGradient>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#06b6d4" opacity="0.6" />
              </marker>
            </defs>

            {/* Grid background */}
            <rect width="100" height="100" fill="url(#grid)" />

            {/* Latitude lines */}
            <g stroke="rgba(148,163,184,0.08)" strokeWidth="0.2">
              {[0, 20, 40, 60, 80].map((lat) => (
                <line key={`lat-${lat}`} x1="0" y1={lat} x2="100" y2={lat} />
              ))}
            </g>

            {/* Longitude lines */}
            <g stroke="rgba(148,163,184,0.08)" strokeWidth="0.2">
              {[0, 25, 50, 75].map((lng) => (
                <line key={`lng-${lng}`} x1={lng} y1="0" x2={lng} y2="100" />
              ))}
            </g>

            {/* Render shipment routes and tracking elements */}
            {shipments.map((shipment) => {
              const origin = projectCoord(shipment.originCoords)
              const destination = projectCoord(shipment.destinationCoords)
              const current = projectCoord(shipment.currentLocation)
              const isSelected = selectedShipment?.id === shipment.id

              return (
                <g key={shipment.id}>
                  {/* Route line with arrow */}
                  <line
                    x1={origin.x}
                    y1={origin.y}
                    x2={destination.x}
                    y2={destination.y}
                    stroke="url(#routeGradient)"
                    strokeWidth={isSelected ? '0.4' : '0.25'}
                    strokeDasharray={isSelected ? '1 0.5' : '0.8 0.4'}
                    markerEnd="url(#arrowhead)"
                    opacity={isSelected ? '1' : '0.6'}
                    className="transition-all duration-300"
                  />

                  {/* Origin marker (departure) */}
                  <g>
                    <circle
                      cx={origin.x}
                      cy={origin.y}
                      r={isSelected ? '0.7' : '0.5'}
                      className="fill-cyan-400/30 stroke-cyan-400 transition-all duration-300"
                      strokeWidth="0.15"
                    />
                    <circle
                      cx={origin.x}
                      cy={origin.y}
                      r={isSelected ? '1.2' : '0.8'}
                      className="fill-transparent stroke-cyan-300 transition-all duration-300"
                      strokeWidth="0.1"
                      opacity="0.4"
                    />
                  </g>

                  {/* Destination marker (arrival) */}
                  <g>
                    <circle
                      cx={destination.x}
                      cy={destination.y}
                      r={isSelected ? '0.7' : '0.5'}
                      className="fill-emerald-400/30 stroke-emerald-400 transition-all duration-300"
                      strokeWidth="0.15"
                    />
                    <circle
                      cx={destination.x}
                      cy={destination.y}
                      r={isSelected ? '1.2' : '0.8'}
                      className="fill-transparent stroke-emerald-300 transition-all duration-300"
                      strokeWidth="0.1"
                      opacity="0.4"
                    />
                  </g>

                  {/* Current location marker with risk-based color */}
                  <g className="cursor-pointer" onClick={() => onSelectShipment?.(shipment)}>
                    <circle
                      cx={current.x}
                      cy={current.y}
                      r={isSelected ? '1.2' : '0.8'}
                      className={cn(
                        'transition-all duration-300',
                        shipment.riskLevel === 'critical'
                          ? 'fill-red-500/40 stroke-red-400'
                          : shipment.riskLevel === 'high'
                          ? 'fill-orange-500/40 stroke-orange-400'
                          : shipment.riskLevel === 'medium'
                          ? 'fill-yellow-500/40 stroke-yellow-400'
                          : 'fill-green-500/40 stroke-green-400'
                      )}
                      strokeWidth="0.2"
                    />
                    {/* Pulsing outer ring for current location */}
                    <circle
                      cx={current.x}
                      cy={current.y}
                      r={isSelected ? '1.8' : '1.3'}
                      className={cn(
                        'fill-transparent transition-all duration-300',
                        shipment.riskLevel === 'critical'
                          ? 'stroke-red-400 animate-pulse'
                          : shipment.riskLevel === 'high'
                          ? 'stroke-orange-400'
                          : shipment.riskLevel === 'medium'
                          ? 'stroke-yellow-400'
                          : 'stroke-green-400'
                      )}
                      strokeWidth="0.12"
                      opacity="0.5"
                    />
                  </g>

                  {/* Speed indicator line */}
                  {isSelected && shipment.averageSpeed > 0 && (
                    <g opacity="0.6">
                      <circle
                        cx={current.x}
                        cy={current.y}
                        r="2"
                        className="fill-transparent stroke-accent animate-pulse"
                        strokeWidth="0.1"
                      />
                    </g>
                  )}

                  {/* Distance progress indicator (show percentage along route) */}
                  {isSelected && (
                    <>
                      <circle
                        cx={current.x}
                        cy={current.y}
                        r="2.5"
                        className="fill-transparent stroke-accent/30"
                        strokeWidth="0.08"
                      />
                      <circle
                        cx={current.x}
                        cy={current.y}
                        r="3.2"
                        className="fill-transparent stroke-accent/20"
                        strokeWidth="0.06"
                      />
                    </>
                  )}
                </g>
              )
            })}
          </svg>

          {/* Legend and Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-3">
            {/* Risk Level Legend */}
            <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 text-xs space-y-2 max-w-48">
              <div className="font-semibold text-foreground mb-2">Risk Levels</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 border border-green-400" />
                <span className="text-muted-foreground">Low Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-400" />
                <span className="text-muted-foreground">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500 border border-orange-400" />
                <span className="text-muted-foreground">High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 border border-red-400 animate-pulse" />
                <span className="text-muted-foreground">Critical</span>
              </div>
            </div>

            {/* Tracking Elements Legend */}
            <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 text-xs space-y-2 max-w-48">
              <div className="font-semibold text-foreground mb-2">Map Elements</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-muted-foreground">Origin (Departure)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-muted-foreground">Destination (Arrival)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-muted-foreground">Current Position</span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipment Details Panel */}
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-muted-foreground" weight="duotone" />
                  <div>
                    <div className="text-muted-foreground">Location</div>
                    <div className="font-mono text-foreground text-[11px]">
                      {selectedShipment.currentLocation.lat.toFixed(2)}°, {selectedShipment.currentLocation.lng.toFixed(2)}°
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
