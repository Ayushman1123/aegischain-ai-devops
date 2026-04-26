import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Brain, CheckCircle, Clock, XCircle, ArrowRight } from '@phosphor-icons/react'
import type { AgentWorkflowStep } from '@/types'
import { cn } from '@/lib/utils'
import { formatTimestamp } from '@/lib/agents'

interface AgentWorkflowViewProps {
  workflowSteps: AgentWorkflowStep[]
}

export function AgentWorkflowView({ workflowSteps }: AgentWorkflowViewProps) {
  const getStatusIcon = (status: AgentWorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className="text-success" weight="duotone" />
      case 'running':
        return <Clock size={20} className="text-accent animate-pulse-glow" weight="duotone" />
      case 'failed':
        return <XCircle size={20} className="text-destructive" weight="duotone" />
      default:
        return <Clock size={20} className="text-muted-foreground" weight="duotone" />
    }
  }

  const getStatusBadge = (status: AgentWorkflowStep['status']) => {
    const variants = {
      pending: 'bg-muted text-muted-foreground',
      running: 'bg-accent/20 text-accent border-accent/30 animate-pulse-glow',
      completed: 'bg-success/20 text-success border-success/30',
      failed: 'bg-destructive/20 text-destructive border-destructive/30',
    }
    return variants[status]
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Brain size={24} className="text-accent" weight="duotone" />
        <h3 className="text-lg font-semibold">AI Agent Workflow</h3>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-4">
          {workflowSteps.map((step, index) => (
            <div key={step.id} className="relative">
              {index < workflowSteps.length - 1 && (
                <div className="absolute left-2.5 top-12 w-0.5 h-full bg-border" />
              )}

              <Card className={cn(
                'p-4 border transition-all',
                step.status === 'running' && 'border-accent/50 shadow-lg shadow-accent/10',
                step.status === 'completed' && 'border-success/30',
                step.status === 'failed' && 'border-destructive/30'
              )}>
                <div className="flex items-start gap-3">
                  <div className="relative z-10 shrink-0">
                    {getStatusIcon(step.status)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{step.agentName}</h4>
                          <ArrowRight size={12} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{step.action}</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatTimestamp(new Date(step.startTime))}
                        </p>
                      </div>
                      <Badge className={cn('text-xs shrink-0', getStatusBadge(step.status))}>
                        {step.status}
                      </Badge>
                    </div>

                    {Object.keys(step.input).length > 0 && (
                      <div className="text-xs">
                        <div className="text-muted-foreground mb-1">Input:</div>
                        <div className="bg-secondary/20 rounded px-2 py-1 font-mono text-xs">
                          {JSON.stringify(step.input, null, 2).substring(0, 100)}...
                        </div>
                      </div>
                    )}

                    {step.status === 'completed' && Object.keys(step.output).length > 0 && (
                      <div className="text-xs">
                        <div className="text-muted-foreground mb-1">Output:</div>
                        <div className="bg-success/5 border border-success/20 rounded px-2 py-1 font-mono text-xs">
                          {JSON.stringify(step.output, null, 2).substring(0, 100)}...
                        </div>
                      </div>
                    )}

                    {step.duration && (
                      <div className="text-xs text-muted-foreground">
                        Duration: {step.duration}ms
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          ))}

          {workflowSteps.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Brain size={48} className="mx-auto mb-3 opacity-50" weight="duotone" />
              <p>No active workflow</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}
