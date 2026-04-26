import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/types'
import { getRiskLevelColor } from '@/lib/agents'

interface RiskGaugeProps {
  score: number
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
}

export function RiskGauge({ score, level, size = 'md' }: RiskGaugeProps) {
  const radius = size === 'sm' ? 32 : size === 'lg' ? 56 : 44
  const strokeWidth = size === 'sm' ? 4 : size === 'lg' ? 8 : 6
  const normalizedRadius = radius - strokeWidth * 0.5
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getGradientId = () => `risk-gradient-${level}`

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={getGradientId()} x1="0%" y1="0%" x2="100%" y2="100%">
            {level === 'low' && (
              <>
                <stop offset="0%" stopColor="oklch(0.65 0.18 145)" />
                <stop offset="100%" stopColor="oklch(0.75 0.20 155)" />
              </>
            )}
            {level === 'medium' && (
              <>
                <stop offset="0%" stopColor="oklch(0.70 0.15 65)" />
                <stop offset="100%" stopColor="oklch(0.75 0.18 55)" />
              </>
            )}
            {(level === 'high' || level === 'critical') && (
              <>
                <stop offset="0%" stopColor="oklch(0.60 0.22 25)" />
                <stop offset="100%" stopColor="oklch(0.65 0.25 15)" />
              </>
            )}
          </linearGradient>
        </defs>
        
        <circle
          stroke="oklch(0.25 0.01 250)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        
        <circle
          stroke={`url(#${getGradientId()})`}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={level === 'critical' ? 'animate-pulse-glow' : ''}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={cn(
          'font-bold font-mono',
          getRiskLevelColor(level),
          size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'
        )}>
          {score}
        </div>
        <div className={cn(
          'text-muted-foreground uppercase tracking-wider',
          size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-[10px]'
        )}>
          {level}
        </div>
      </div>
    </div>
  )
}
