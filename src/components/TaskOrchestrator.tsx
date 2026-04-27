import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Brain, Lightning, CheckCircle, Clock, XCircle, Trash, Plus } from '@phosphor-icons/react'
import type { Agent, Shipment } from '@/types'
import { cn } from '@/lib/utils'

interface AgentTask {
  id: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  assignedAgentId: string
  shipmentId?: string
  createdAt: string
  completedAt?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

interface TaskOrchestratorProps {
  agents: Agent[]
  shipments: Shipment[]
  onAssignTask: (task: {
    agentId?: string
    prompt: string
    shipmentId?: string
    priority: 'low' | 'medium' | 'high' | 'critical'
  }) => Promise<void>
  existingTasks?: AgentTask[]
  onDeleteTask?: (taskId: string) => void
}

export function TaskOrchestrator({ 
  agents, 
  shipments, 
  onAssignTask,
  existingTasks = [],
  onDeleteTask
}: TaskOrchestratorProps) {
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('auto')
  const [selectedShipment, setSelectedShipment] = useState<string>('none')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitTask = async () => {
    if (!taskTitle.trim() || !taskDescription.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      const prompt = `${taskTitle}\n\n${taskDescription}`
      await onAssignTask({
        agentId: selectedAgent === 'auto' ? undefined : selectedAgent,
        prompt,
        shipmentId: selectedShipment === 'none' ? undefined : selectedShipment,
        priority,
      })

      setTaskTitle('')
      setTaskDescription('')
      setSelectedAgent('auto')
      setSelectedShipment('none')
      setPriority('medium')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusIcon = (status: AgentTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-success" weight="duotone" />
      case 'running':
        return <Clock size={16} className="text-accent animate-pulse-glow" weight="duotone" />
      case 'failed':
        return <XCircle size={16} className="text-destructive" weight="duotone" />
      default:
        return <Clock size={16} className="text-muted-foreground" weight="duotone" />
    }
  }

  const getPriorityBadge = (priority: AgentTask['priority']) => {
    const variants = {
      low: 'bg-muted text-muted-foreground',
      medium: 'bg-accent/20 text-accent border-accent/30',
      high: 'bg-warning/20 text-warning border-warning/30',
      critical: 'bg-destructive/20 text-destructive border-destructive/30',
    }
    return variants[priority]
  }

  const taskExamples = [
    { title: 'Review Delayed Shipments', desc: 'Analyze all shipments with delays over 24 hours and provide mitigation strategies' },
    { title: 'Optimize Route Planning', desc: 'Evaluate current routes and suggest alternatives based on weather and traffic data' },
    { title: 'Customer Communication', desc: 'Prepare update emails for all stakeholders affected by critical shipments' },
    { title: 'Risk Assessment', desc: 'Run comprehensive risk analysis across all active shipments and flag high-priority issues' },
    { title: 'Blockchain Logging', desc: 'Log all critical events from the last 24 hours to the blockchain for audit trail' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Lightning size={24} className="text-accent" weight="duotone" />
          <h3 className="text-lg font-semibold">Create Agent Task</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Enter task title"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Task Description</Label>
            <Textarea
              id="task-description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Provide detailed instructions for the AI agents to execute"
              className="min-h-[120px]"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-select">Assign To</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent} disabled={isSubmitting}>
                <SelectTrigger id="agent-select">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-assign (Orchestrator)</SelectItem>
                  <Separator className="my-2" />
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority-select">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)} disabled={isSubmitting}>
                <SelectTrigger id="priority-select">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipment-select">Related Shipment (Optional)</Label>
            <Select value={selectedShipment} onValueChange={setSelectedShipment} disabled={isSubmitting}>
              <SelectTrigger id="shipment-select">
                <SelectValue placeholder="Select shipment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <Separator className="my-2" />
                {shipments.map((shipment) => (
                  <SelectItem key={shipment.id} value={shipment.id}>
                    {shipment.name} ({shipment.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full gap-2" 
            onClick={handleSubmitTask}
            disabled={isSubmitting || !taskTitle.trim() || !taskDescription.trim()}
          >
            <Plus size={18} weight="duotone" />
            {isSubmitting ? 'Assigning Task...' : 'Assign Task to AI Agents'}
          </Button>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-3">Quick Examples:</p>
            <div className="space-y-2">
              {taskExamples.slice(0, 3).map((example, idx) => (
                <button
                  key={idx}
                  className="w-full text-left text-xs p-2 rounded border border-border hover:border-accent/50 hover:bg-accent/5 transition-colors"
                  onClick={() => {
                    setTaskTitle(example.title)
                    setTaskDescription(example.desc)
                  }}
                  disabled={isSubmitting}
                >
                  <div className="font-medium">{example.title}</div>
                  <div className="text-muted-foreground mt-0.5">{example.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Brain size={24} className="text-accent" weight="duotone" />
            <h3 className="text-lg font-semibold">Task Queue</h3>
          </div>
          <Badge variant="outline">{existingTasks.length} Tasks</Badge>
        </div>

        <ScrollArea className="h-[580px] pr-4">
          <div className="space-y-3">
            {existingTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Lightning size={48} className="mx-auto mb-3 opacity-50" weight="duotone" />
                <p className="text-sm">No tasks assigned yet</p>
                <p className="text-xs mt-1">Create a task to orchestrate AI agents</p>
              </div>
            ) : (
              existingTasks.map((task) => {
                const agent = agents.find((a) => a.id === task.assignedAgentId)
                const shipment = task.shipmentId ? shipments.find((s) => s.id === task.shipmentId) : null

                return (
                  <Card key={task.id} className={cn(
                    'p-4 border transition-all',
                    task.status === 'running' && 'border-accent/50',
                    task.status === 'completed' && 'border-success/30',
                    task.status === 'failed' && 'border-destructive/30'
                  )}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(task.status)}
                            <h4 className="font-semibold text-sm">{task.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        </div>
                        {onDeleteTask && task.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => onDeleteTask(task.id)}
                          >
                            <Trash size={14} />
                          </Button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge className={cn('text-xs', getPriorityBadge(task.priority))}>
                          {task.priority}
                        </Badge>
                        {agent && (
                          <Badge variant="outline" className="text-xs">
                            {agent.name}
                          </Badge>
                        )}
                        {shipment && (
                          <Badge variant="outline" className="text-xs">
                            {shipment.name}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(task.createdAt).toLocaleString()}</span>
                        {task.completedAt && (
                          <span>✓ {new Date(task.completedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}
