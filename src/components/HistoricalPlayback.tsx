import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, PauseCircle, ArrowCounterClockwise, FastForward } from '@phosphor-icons/react'
import type { Shipment, HistoricalSnapshot } from '@/types'
import { formatDistance, formatSpeed } from '@/lib/tracking'
import { getRiskLevelColor, getShipmentStatusBadge } from '@/lib/agents'
import { cn } from '@/lib/utils'

interface HistoricalPlaybackProps {
  shipment: Shipment
  onClose?: () => void
}

function generateHistoricalSnapshots(shipment: Shipment): HistoricalSnapshot[] {
  const snapshots: HistoricalSnapshot[] = []
  const steps = shipment.locationHistory.length
  
  shipment.locationHistory.forEach((update, index) => {
    const progressAtTime = (index / Math.max(1, steps - 1)) * shipment.progress
    snapshots.push({
      timestamp: update.timestamp,
      location: update.location,
      speed: update.speed,
      riskScore: shipment.riskScore - Math.random() * 10,
      status: progressAtTime < 30 ? 'scheduled' : progressAtTime < 90 ? 'in-transit' : shipment.status,
      eta: `${Math.round((100 - progressAtTime) * 2)}h ${Math.round(Math.random() * 60)}m`,
      progress: progressAtTime,
    })
  })
  
  return snapshots
}

export function HistoricalPlayback({ shipment, onClose }: HistoricalPlaybackProps) {
  const [snapshots] = useState<HistoricalSnapshot[]>(() => generateHistoricalSnapshots(shipment))
  const [currentIndex, setCurrentIndex] = useState(snapshots.length - 1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const intervalRef = useRef<number | null>(null)

  const currentSnapshot = snapshots[currentIndex] || snapshots[snapshots.length - 1]

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= snapshots.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 1000 / playbackSpeed)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, playbackSpeed, snapshots.length])

  const handlePlayPause = () => {
    if (currentIndex >= snapshots.length - 1 && !isPlaying) {
      setCurrentIndex(0)
    }
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentIndex(0)
  }

  const handleSliderChange = (value: number[]) => {
    setIsPlaying(false)
    setCurrentIndex(value[0])
  }

  const cycleSpeed = () => {
    setPlaybackSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1))
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Historical Tracking Playback</h3>
          <p className="text-sm text-muted-foreground">{shipment.name}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-secondary/20 rounded-lg">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Timestamp</div>
          <div className="text-sm font-mono">
            {new Date(currentSnapshot.timestamp).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Location</div>
          <div className="text-sm font-mono">
            {currentSnapshot.location.lat.toFixed(4)}°, {currentSnapshot.location.lng.toFixed(4)}°
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Speed</div>
          <div className="text-sm font-mono">{formatSpeed(currentSnapshot.speed)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Progress</div>
          <div className="text-sm font-mono">{currentSnapshot.progress.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Status</div>
          <Badge className={cn('text-xs', getShipmentStatusBadge(currentSnapshot.status))}>
            {currentSnapshot.status}
          </Badge>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">ETA</div>
          <div className="text-sm font-mono">{currentSnapshot.eta}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Risk Score</div>
          <div className={cn('text-sm font-mono font-bold', getRiskLevelColor(shipment.riskLevel))}>
            {currentSnapshot.riskScore.toFixed(0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Frame</div>
          <div className="text-sm font-mono">
            {currentIndex + 1} / {snapshots.length}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Slider
          value={[currentIndex]}
          onValueChange={handleSliderChange}
          max={snapshots.length - 1}
          step={1}
          className="w-full"
        />

        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <ArrowCounterClockwise size={16} weight="duotone" />
            Reset
          </Button>
          <Button size="sm" onClick={handlePlayPause} className="gap-2">
            {isPlaying ? (
              <>
                <PauseCircle size={16} weight="duotone" />
                Pause
              </>
            ) : (
              <>
                <PlayCircle size={16} weight="duotone" />
                Play
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={cycleSpeed} className="gap-2">
            <FastForward size={16} weight="duotone" />
            {playbackSpeed}x
          </Button>
        </div>
      </div>

      <div className="relative h-48 bg-secondary/20 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
              <div className={cn(
                'w-10 h-10 rounded-full animate-pulse-glow',
                currentSnapshot.riskScore > 70 ? 'bg-destructive' :
                currentSnapshot.riskScore > 40 ? 'bg-warning' : 'bg-success'
              )} />
            </div>
            <p className="text-sm text-muted-foreground">
              Visual route playback on map
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
