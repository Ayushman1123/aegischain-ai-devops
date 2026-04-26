import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Package, MapPin, Clock, Warning } from '@phosphor-icons/react'
import type { Shipment } from '@/types'
import { getRiskLevelColor, getShipmentStatusBadge } from '@/lib/agents'
import { cn } from '@/lib/utils'

interface ShipmentCardProps {
  shipment: Shipment
  onClick?: () => void
}

export function ShipmentCard({ shipment, onClick }: ShipmentCardProps) {
  const isCritical = shipment.riskLevel === 'critical' || shipment.status === 'crisis'

  return (
    <Card
      className={cn(
        'p-4 border transition-all duration-200 cursor-pointer hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10',
        isCritical && 'border-destructive/30 shadow-md shadow-destructive/5'
      )}
      onClick={onClick}
    >
      {isCritical && (
        <div className="absolute -top-px -left-px -right-px -bottom-px border-2 border-destructive/20 rounded-lg animate-pulse-glow pointer-events-none" />
      )}
      
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Package className="text-accent mt-0.5 shrink-0" size={20} weight="duotone" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">{shipment.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">{shipment.id}</p>
            </div>
          </div>
          <Badge className={cn('text-xs shrink-0', getShipmentStatusBadge(shipment.status))}>
            {shipment.status}
          </Badge>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin size={14} weight="duotone" />
            <span className="truncate">{shipment.origin} → {shipment.destination}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock size={14} weight="duotone" />
            <span>ETA: {shipment.eta}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono text-foreground">{shipment.progress}%</span>
          </div>
          <Progress value={shipment.progress} className="h-1.5" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Warning className={getRiskLevelColor(shipment.riskLevel)} size={16} weight="duotone" />
            <span className="text-xs text-muted-foreground">Risk Score:</span>
          </div>
          <span className={cn('text-sm font-bold font-mono', getRiskLevelColor(shipment.riskLevel))}>
            {shipment.riskScore}
          </span>
        </div>

        <p className="text-xs text-foreground/70 leading-relaxed pt-1">{shipment.lastUpdate}</p>
      </div>
    </Card>
  )
}
