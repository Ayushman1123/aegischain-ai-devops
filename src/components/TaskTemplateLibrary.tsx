import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  TASK_TEMPLATES,
  INDUSTRY_LABELS,
  CATEGORY_LABELS,
  getTemplatesByIndustry,
  getTemplatesByCategory,
  searchTemplates,
  interpolateTemplate,
  type TaskTemplate,
  type IndustryType,
  type TaskCategory,
} from '@/lib/task-templates'
import {
  BookOpen,
  MagnifyingGlass,
  Sparkle,
  Clock,
  Lightning,
  CheckCircle,
  Factory,
  Package,
  ShieldCheck,
  ChartLine,
  FirstAid,
  Pill,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { Agent, Shipment } from '@/types'

interface TaskTemplateLibraryProps {
  agents: Agent[]
  shipments: Shipment[]
  onUseTemplate: (task: {
    agentId?: string
    prompt: string
    shipmentId?: string
    priority: 'low' | 'medium' | 'high' | 'critical'
  }) => Promise<void>
}

const INDUSTRY_ICONS: Record<IndustryType, React.ReactNode> = {
  logistics: <Package size={20} weight="duotone" />,
  manufacturing: <Factory size={20} weight="duotone" />,
  retail: <ChartLine size={20} weight="duotone" />,
  healthcare: <FirstAid size={20} weight="duotone" />,
  'food-beverage': <Package size={20} weight="duotone" />,
  pharma: <Pill size={20} weight="duotone" />,
  automotive: <Factory size={20} weight="duotone" />,
  electronics: <Lightning size={20} weight="duotone" />,
}

export function TaskTemplateLibrary({ agents, shipments, onUseTemplate }: TaskTemplateLibraryProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [templateVariables, setTemplateVariables] = useState<Record<string, string | number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getFilteredTemplates = () => {
    let templates = TASK_TEMPLATES

    if (searchQuery) {
      templates = searchTemplates(searchQuery)
    }

    if (selectedIndustry !== 'all') {
      templates = templates.filter(t => t.industry === selectedIndustry)
    }

    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory)
    }

    return templates
  }

  const filteredTemplates = getFilteredTemplates()

  const handleTemplateSelect = (template: TaskTemplate) => {
    setSelectedTemplate(template)
    const initialVariables: Record<string, string | number> = {}
    
    template.variables.forEach(variable => {
      if (variable.defaultValue !== undefined) {
        initialVariables[variable.key] = variable.defaultValue
      } else if (variable.key === 'shipmentId' && shipments.length > 0) {
        initialVariables[variable.key] = shipments[0].id
      } else {
        initialVariables[variable.key] = variable.type === 'number' ? 0 : ''
      }
    })
    
    setTemplateVariables(initialVariables)
  }

  const handleVariableChange = (key: string, value: string | number) => {
    setTemplateVariables(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleUseTemplate = async () => {
    if (!selectedTemplate) return

    const requiredVars = selectedTemplate.variables.filter(v => v.required)
    const missingVars = requiredVars.filter(v => !templateVariables[v.key])
    
    if (missingVars.length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const interpolatedPrompt = interpolateTemplate(selectedTemplate, templateVariables)
      
      await onUseTemplate({
        prompt: interpolatedPrompt,
        priority: selectedTemplate.priority,
        shipmentId: templateVariables.shipmentId as string | undefined,
      })

      setSelectedTemplate(null)
      setTemplateVariables({})
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-destructive/20 text-destructive border-destructive/30'
      case 'high':
        return 'bg-warning/20 text-warning border-warning/30'
      case 'medium':
        return 'bg-accent/20 text-accent border-accent/30'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent/20 rounded-lg">
          <BookOpen className="text-accent" size={24} weight="duotone" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Task Template Library</h2>
          <p className="text-sm text-muted-foreground">
            Industry-specific workflows and best practices for AI agent orchestration
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={selectedIndustry} onValueChange={(value) => setSelectedIndustry(value as IndustryType | 'all')}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {Object.entries(INDUSTRY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as TaskCategory | 'all')}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="quick-start">Quick Start</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ScrollArea className="h-[600px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <Card
                  key={template.id}
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-border/60"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-accent">
                          {INDUSTRY_ICONS[template.industry]}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {INDUSTRY_LABELS[template.industry]}
                        </Badge>
                      </div>
                      <Badge className={cn('text-xs', getPriorityColor(template.priority))}>
                        {template.priority}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                        {template.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {template.description}
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock size={14} weight="duotone" />
                        <span>{template.estimatedDuration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Sparkle size={14} weight="duotone" />
                        <span>{template.requiredAgents.length} agent{template.requiredAgents.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs bg-muted/50">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-muted/50">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    <Button size="sm" className="w-full gap-2">
                      <Sparkle size={14} weight="duotone" />
                      Use Template
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen size={48} className="mx-auto mb-3 opacity-50" weight="duotone" />
                <p>No templates found matching your criteria</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="quick-start" className="space-y-4">
          <ScrollArea className="h-[600px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates
                .filter(t => t.category === 'risk-management' || t.category === 'crisis-response')
                .map(template => (
                  <Card
                    key={template.id}
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-border/60"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="text-accent">
                            {INDUSTRY_ICONS[template.industry]}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {INDUSTRY_LABELS[template.industry]}
                          </Badge>
                        </div>
                        <Badge className={cn('text-xs', getPriorityColor(template.priority))}>
                          {template.priority}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                          {template.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {template.description}
                        </p>
                      </div>

                      <Button size="sm" className="w-full gap-2">
                        <Sparkle size={14} weight="duotone" />
                        Use Template
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <ScrollArea className="h-[600px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates
                .filter(t => t.variables.length > 3 || t.requiredAgents.length > 3)
                .map(template => (
                  <Card
                    key={template.id}
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-border/60"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="text-accent">
                            {INDUSTRY_ICONS[template.industry]}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {INDUSTRY_LABELS[template.industry]}
                          </Badge>
                        </div>
                        <Badge className={cn('text-xs', getPriorityColor(template.priority))}>
                          {template.priority}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                          {template.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {template.description}
                        </p>
                      </div>

                      <Button size="sm" className="w-full gap-2">
                        <Sparkle size={14} weight="duotone" />
                        Use Template
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Dialog open={selectedTemplate !== null} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkle className="text-accent" size={20} weight="duotone" />
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {INDUSTRY_LABELS[selectedTemplate.industry]}
                </Badge>
                <Badge variant="outline">
                  {CATEGORY_LABELS[selectedTemplate.category]}
                </Badge>
                <Badge className={getPriorityColor(selectedTemplate.priority)}>
                  {selectedTemplate.priority}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Estimated Duration</Label>
                  <p className="font-medium">{selectedTemplate.estimatedDuration}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Required Agents</Label>
                  <p className="font-medium">{selectedTemplate.requiredAgents.length} agents</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-semibold mb-2 block">Required Agents</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.requiredAgents.map(agentName => (
                    <Badge key={agentName} variant="outline" className="bg-accent/10">
                      {agentName}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-semibold mb-3 block">Configure Template</Label>
                <div className="space-y-4">
                  {selectedTemplate.variables.map(variable => (
                    <div key={variable.key}>
                      <Label htmlFor={variable.key} className="text-sm mb-1.5 block">
                        {variable.label}
                        {variable.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      
                      {variable.type === 'select' && variable.options ? (
                        <Select
                          value={String(templateVariables[variable.key] || variable.defaultValue || '')}
                          onValueChange={(value) => handleVariableChange(variable.key, value)}
                        >
                          <SelectTrigger id={variable.key}>
                            <SelectValue placeholder={variable.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {variable.options.map(option => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : variable.type === 'number' ? (
                        <Input
                          id={variable.key}
                          type="number"
                          placeholder={variable.placeholder}
                          value={templateVariables[variable.key] || ''}
                          onChange={(e) => handleVariableChange(variable.key, Number(e.target.value))}
                        />
                      ) : variable.key === 'shipmentId' && shipments.length > 0 ? (
                        <Select
                          value={String(templateVariables[variable.key] || shipments[0].id)}
                          onValueChange={(value) => handleVariableChange(variable.key, value)}
                        >
                          <SelectTrigger id={variable.key}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {shipments.map(shipment => (
                              <SelectItem key={shipment.id} value={shipment.id}>
                                {shipment.name} ({shipment.id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={variable.key}
                          type="text"
                          placeholder={variable.placeholder}
                          value={templateVariables[variable.key] || ''}
                          onChange={(e) => handleVariableChange(variable.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-semibold mb-2 block">Expected Outcomes</Label>
                <div className="space-y-2">
                  {selectedTemplate.expectedOutcomes.map((outcome, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle size={16} className="text-success mt-0.5 shrink-0" weight="duotone" />
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button
                  onClick={() => void handleUseTemplate()}
                  disabled={isSubmitting}
                  className="flex-1 gap-2"
                >
                  <Lightning size={16} weight="duotone" />
                  {isSubmitting ? 'Executing...' : 'Execute Template'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTemplate(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
