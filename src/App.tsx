import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AgentCard } from '@/components/AgentCard'
import { ShipmentCard } from '@/components/ShipmentCard'
import { RiskGauge } from '@/components/RiskGauge'
import { AGENTS, SAMPLE_SHIPMENTS, formatTimestamp } from '@/lib/agents'
import { Brain, Lightning, ChartLine, Bell, Cube } from '@phosphor-icons/react'
import type { Agent, Shipment, RiskAnalysis } from '@/types'
import { toast } from 'sonner'

function App() {
  const [agents] = useState<Agent[]>(AGENTS)
  const [shipments] = useState<Shipment[]>(SAMPLE_SHIPMENTS)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysis | null>(null)
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false)

  const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'processing')
  const criticalShipments = shipments.filter(s => s.riskLevel === 'critical' || s.status === 'crisis')
  const avgRisk = Math.round(shipments.reduce((sum, s) => sum + s.riskScore, 0) / shipments.length)

  const handleAnalyzeShipment = async (shipment: Shipment) => {
    setIsAnalyzing(true)
    setShowAnalysisDialog(true)
    
    try {
      const prompt = (window.spark.llmPrompt as any)`You are a supply chain risk analysis AI agent. Analyze the following shipment and provide a detailed risk assessment.

Shipment Details:
- ID: ${shipment.id}
- Name: ${shipment.name}
- Route: ${shipment.origin} → ${shipment.destination}
- Current Status: ${shipment.status}
- Current Risk Score: ${shipment.riskScore}/100
- Progress: ${shipment.progress}%
- ETA: ${shipment.eta}
- Last Update: ${shipment.lastUpdate}

Provide a comprehensive risk analysis including:
1. 3-5 specific risk factors with severity levels (low/medium/high/critical)
2. 3-5 actionable recommendations to mitigate risks
3. Overall assessment summary

Return ONLY valid JSON in this exact format:
{
  "riskFactors": [
    {"category": "factor name", "severity": "low|medium|high|critical", "description": "detailed explanation", "impact": 1-10}
  ],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "summary": "brief overall assessment"
}`

      const response = await window.spark.llm(prompt, 'gpt-4o', true)
      const data = JSON.parse(response)
      
      const analysis: RiskAnalysis = {
        shipmentId: shipment.id,
        riskScore: shipment.riskScore,
        riskLevel: shipment.riskLevel,
        factors: data.riskFactors || [],
        recommendations: data.recommendations || [],
        analysisTimestamp: new Date().toISOString(),
        analyzedBy: ['Risk Detection Agent', 'RAG Agent', 'Planner Agent']
      }
      
      setAnalysisResult(analysis)
      toast.success('Risk analysis complete', {
        description: 'Multi-agent analysis finished successfully'
      })
    } catch (error) {
      console.error('Analysis error:', error)
      toast.error('Analysis failed', {
        description: 'Unable to complete risk analysis. Please try again.'
      })
      setAnalysisResult(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
      
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Cube className="text-primary" size={28} weight="duotone" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">AegisChain AI</h1>
                <p className="text-sm text-muted-foreground">Supply Chain Intelligence Platform</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Brain className="text-accent" size={18} weight="duotone" />
                  <span className="text-muted-foreground">Active Agents:</span>
                  <span className="font-bold text-accent">{activeAgents.length}</span>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2">
                  <Lightning className="text-destructive" size={18} weight="duotone" />
                  <span className="text-muted-foreground">Critical Alerts:</span>
                  <span className="font-bold text-destructive">{criticalShipments.length}</span>
                </div>
              </div>
              <Button size="sm" className="gap-2">
                <Bell size={16} weight="duotone" />
                Alerts
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="shipments">Shipments</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">System Status</h3>
                  <Brain className="text-accent" size={20} weight="duotone" />
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{agents.length}</div>
                  <p className="text-sm text-muted-foreground">AI Agents Online</p>
                  <Badge className="bg-accent/20 text-accent border-accent/30">Operational</Badge>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Shipments</h3>
                  <ChartLine className="text-primary" size={20} weight="duotone" />
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{shipments.length}</div>
                  <p className="text-sm text-muted-foreground">Currently Tracking</p>
                  <Badge className="bg-primary/20 text-primary border-primary/30">Monitoring</Badge>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Average Risk</h3>
                  <Lightning className="text-warning" size={20} weight="duotone" />
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{avgRisk}</div>
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                  <Badge className="bg-warning/20 text-warning border-warning/30">Medium</Badge>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Critical Shipments</h2>
                  <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">
                    {criticalShipments.length} Alert{criticalShipments.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {criticalShipments.length > 0 ? (
                    criticalShipments.map(shipment => (
                      <ShipmentCard
                        key={shipment.id}
                        shipment={shipment}
                        onClick={() => {
                          setSelectedShipment(shipment)
                          handleAnalyzeShipment(shipment)
                        }}
                      />
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                      <Lightning size={48} className="mx-auto mb-3 opacity-50" weight="duotone" />
                      <p>No critical alerts at this time</p>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-6">Active AI Agents</h2>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {agents.map(agent => (
                      <div
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent)}
                        className="cursor-pointer"
                      >
                        <AgentCard agent={agent} />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="shipments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">All Shipments</h2>
              <Button className="gap-2">
                <Lightning size={18} weight="duotone" />
                Analyze All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shipments.map(shipment => (
                <ShipmentCard
                  key={shipment.id}
                  shipment={shipment}
                  onClick={() => {
                    setSelectedShipment(shipment)
                    handleAnalyzeShipment(shipment)
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Multi-Agent System</h2>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
                <span className="text-muted-foreground">{activeAgents.length} agents processing</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={() => setSelectedAgent(agent)}
                />
              ))}
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Agent Orchestration Flow</h3>
              <div className="space-y-3 text-sm font-mono">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Input → Planner Agent</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground ml-4">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span>Planner → Risk Detection Agent</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground ml-8">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span>IF risk &gt; threshold → Crisis Response</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground ml-12">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span>→ Communication Agent</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground ml-12">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span>→ Blockchain Logger</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground ml-8">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span>ELSE → Supply Chain Optimizer</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground ml-4">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Always → RAG Agent (grounding)</span>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={selectedAgent !== null} onOpenChange={(open) => !open && setSelectedAgent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAgent?.name}</DialogTitle>
            <DialogDescription>{selectedAgent?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-xs text-muted-foreground">Role</Label>
              <p className="text-sm font-medium">{selectedAgent?.role}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <p className="text-sm font-medium capitalize">{selectedAgent?.status}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Last Activity</Label>
              <p className="text-sm">{selectedAgent?.lastActivity}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Risk Analysis</DialogTitle>
            <DialogDescription>
              {selectedShipment?.name} ({selectedShipment?.id})
            </DialogDescription>
          </DialogHeader>
          
          {isAnalyzing ? (
            <div className="py-12 text-center space-y-4">
              <Brain size={48} className="mx-auto text-accent animate-pulse-glow" weight="duotone" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Multi-Agent Analysis in Progress</p>
                <p className="text-sm text-muted-foreground">Risk Detection, RAG Context, and Planner agents coordinating...</p>
              </div>
            </div>
          ) : analysisResult ? (
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-center">
                <RiskGauge 
                  score={analysisResult.riskScore} 
                  level={analysisResult.riskLevel}
                  size="lg"
                />
              </div>

              <div>
                <h3 className="font-semibold mb-3">Risk Factors</h3>
                <div className="space-y-2">
                  {analysisResult.factors.map((factor, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{factor.category}</h4>
                            <Badge variant="outline" className="text-xs capitalize">
                              {factor.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{factor.description}</p>
                        </div>
                        <span className="text-sm font-mono text-muted-foreground">
                          Impact: {factor.impact}/10
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Recommendations</h3>
                <div className="space-y-2">
                  {analysisResult.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center font-mono text-xs mt-0.5 shrink-0">
                        {idx + 1}
                      </div>
                      <p className="flex-1 pt-0.5">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Analyzed by: {analysisResult.analyzedBy.join(', ')} • {formatTimestamp(new Date(analysisResult.analysisTimestamp))}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p>Analysis failed. Please try again.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App