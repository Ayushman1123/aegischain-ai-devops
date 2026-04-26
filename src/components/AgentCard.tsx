import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Warning, Graph, ChatCircle, Link, MagnifyingGlass, Lightning, Gear } from '@phosphor-icons/react'
import type { Agent } from '@/types'
import { getAgentStatusColor, getAgentStatusBg } from '@/lib/agents'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  agent: Agent
  onClick?: () => void
}

const AGENT_ICONS: Record<string, React.ComponentType<any>> = {
  'planner': Gear,
  'risk-detection': Warning,
  'supply-optimization': Graph,
  'crisis-response': Lightning,
  'communication': ChatCircle,
  'blockchain': Link,
  'rag': MagnifyingGlass,
  'executor': Brain
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const Icon = AGENT_ICONS[agent.id] || Brain
  const isActive = agent.status === 'active' || agent.status === 'processing'

  return (
    <Card
      className={cn(
        'relative p-4 border transition-all duration-200 cursor-pointer hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10',
        isActive && 'border-accent/30 shadow-md shadow-accent/5'
      )}
      onClick={onClick}
    >
      {isActive && (
        <div className="absolute -top-px -left-px -right-px -bottom-px border-2 border-accent/20 rounded-lg animate-pulse-glow pointer-events-none" />
      )}
      
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          getAgentStatusBg(agent.status),
          isActive && 'animate-pulse-glow'
        )}>
          <Icon className={getAgentStatusColor(agent.status)} size={24} weight="duotone" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm text-foreground truncate">{agent.name}</h3>
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs px-1.5 py-0',
                agent.status === 'active' ? 'bg-accent/20 text-accent border-accent/30' :
                agent.status === 'processing' ? 'bg-primary/20 text-primary border-primary/30' :
                agent.status === 'error' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                agent.status === 'success' ? 'bg-success/20 text-success border-success/30' :
                'bg-muted text-muted-foreground border-border'
              )}
            >
              {agent.status}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground mb-2 truncate">{agent.role}</p>
          
          <p className="text-xs text-foreground/80 leading-relaxed">{agent.lastActivity}</p>
        </div>
      </div>
    </Card>
  )
}
