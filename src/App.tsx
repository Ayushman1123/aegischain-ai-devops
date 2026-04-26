import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AgentCard } from '@/components/AgentCard'
import { ShipmentCard } from '@/components/ShipmentCard'
import { RiskGauge } from '@/components/RiskGauge'
import { TrackingMap } from '@/components/TrackingMap'
import { HistoricalPlayback } from '@/components/HistoricalPlayback'
import { BlockchainPayment } from '@/components/BlockchainPayment'
import { AgentWorkflowView } from '@/components/AgentWorkflowView'
import { NotificationCenter } from '@/components/NotificationCenter'
import { SupportChatbot } from '@/components/SupportChatbot'
import { formatTimestamp } from '@/lib/agents'
import { useControlTowerData } from '@/hooks/use-control-tower-data'
import { useAuthSession } from '@/hooks/use-auth-session'
import { Brain, Lightning, ChartLine, Bell, Cube, PlayCircle, PauseCircle, ArrowsClockwise, ClockCounterClockwise, CurrencyDollar } from '@phosphor-icons/react'
import type { Agent, Shipment, RiskAnalysis } from '@/types'
import { toast } from 'sonner'

function App() {
  const { user, loading: authLoading, profileError, updateProfile } = useAuthSession()
  const {
    agents,
    shipments,
    notifications,
    workflowSteps,
    chatMessages,
    loading: controlTowerLoading,
    isTracking,
    toggleTracking,
    manualRefresh,
    analyzeShipment,
    analyzeAllShipments,
    assignAgentTask,
    sendSupportMessage,
    markNotificationRead,
    markAllNotificationsRead,
  } = useControlTowerData(Boolean(user))
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAnalyzeAllRunning, setIsAnalyzeAllRunning] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysis | null>(null)
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false)
  const [showHistoricalPlayback, setShowHistoricalPlayback] = useState(false)
  const [showBlockchainPayment, setShowBlockchainPayment] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showWorkflow, setShowWorkflow] = useState(false)
  const [agentTaskPrompt, setAgentTaskPrompt] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')

  const activeAgents = agents.filter((agent) => agent.status === 'active' || agent.status === 'processing')
  const criticalShipments = shipments.filter((shipment) => shipment.riskLevel === 'critical' || shipment.status === 'crisis')
  const avgRisk = shipments.length > 0 ? Math.round(shipments.reduce((sum, shipment) => sum + shipment.riskScore, 0) / shipments.length) : 0
  const unreadNotifications = notifications.filter((notification) => !notification.read).length

  useEffect(() => {
    if (!profileName && user?.name) {
      setProfileName(user.name)
    }
    if (!profileEmail && user?.email) {
      setProfileEmail(user.email)
    }
  }, [profileName, profileEmail, user])

  if (authLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">Connecting to control tower...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (user && controlTowerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">Loading control tower...</div>
      </div>
    )
  }

  const handleAnalyzeShipment = async (shipment: Shipment) => {
    setIsAnalyzing(true)
    setShowAnalysisDialog(true)

    try {
      const analysis = await analyzeShipment(shipment.id)
      setAnalysisResult(analysis)
      toast.success('Shipment analysis completed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed')
      setAnalysisResult(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAnalyzeAllShipments = async () => {
    setIsAnalyzeAllRunning(true)
    try {
      const analyses = await analyzeAllShipments()
      const preferredAnalysis = selectedShipment
        ? analyses.find((analysis) => analysis.shipmentId === selectedShipment.id)
        : analyses[0]
      const preferredShipment = selectedShipment || shipments[0] || null

      setAnalysisResult(preferredAnalysis || analyses[0] || null)
      setSelectedShipment(preferredShipment)
      setShowAnalysisDialog(Boolean(preferredAnalysis || analyses[0]))
      toast.success(`Analyzed ${analyses.length} shipments successfully`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analyze all failed')
    } finally {
      setIsAnalyzeAllRunning(false)
    }
  }

  const handleAssignTask = async () => {
    if (agentTaskPrompt.trim().length < 5) {
      toast.error('Enter a clear task for orchestration')
      return
    }

    try {
      await assignAgentTask({
        agentId: selectedAgent?.id,
        prompt: agentTaskPrompt.trim(),
        shipmentId: selectedShipment?.id,
      })
      setAgentTaskPrompt('')
      toast.success(`${selectedAgent?.name || 'Orchestration agents'} completed the assigned task`)
      setShowWorkflow(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Task assignment failed')
    }
  }

  const handleUpdateProfile = async () => {
    const normalizedName = profileName.trim()
    const normalizedEmail = profileEmail.trim().toLowerCase()

    if (normalizedName.length < 2) {
      toast.error('Enter a valid name')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Enter a valid email address')
      return
    }

    try {
      await updateProfile(normalizedName, normalizedEmail)
      toast.success('Profile updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update profile')
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
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground mr-2">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full border border-border" />
                  ) : (
                    <div className="w-7 h-7 rounded-full border border-border bg-muted" />
                  )}
                  <span>{user.name}</span>
                </div>
                <div className="hidden xl:flex items-end gap-2 mr-2">
                  <div className="grid gap-1">
                    <Label htmlFor="operator-name" className="text-[10px] uppercase tracking-wide text-muted-foreground">Operator</Label>
                    <Input
                      id="operator-name"
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      className="h-8 w-36"
                      disabled={authLoading}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="operator-email" className="text-[10px] uppercase tracking-wide text-muted-foreground">Email</Label>
                    <Input
                      id="operator-email"
                      value={profileEmail}
                      onChange={(event) => setProfileEmail(event.target.value)}
                      className="h-8 w-48"
                      disabled={authLoading}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={authLoading}
                    onClick={() => {
                      void handleUpdateProfile()
                    }}
                  >
                    Apply
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant={isTracking ? "default" : "outline"}
                  className="gap-2"
                  onClick={toggleTracking}
                >
                  {isTracking ? (
                    <>
                      <PauseCircle size={16} weight="duotone" />
                      Pause
                    </>
                  ) : (
                    <>
                      <PlayCircle size={16} weight="duotone" />
                      Resume
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    void manualRefresh().then(() => {
                      toast.success('Locations updated')
                    }).catch((error: Error) => {
                      toast.error(error.message)
                    })
                  }}
                >
                  <ArrowsClockwise size={16} weight="duotone" />
                  Refresh
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2 relative"
                  onClick={() => setShowNotifications(true)}
                >
                  <Bell size={16} weight="duotone" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {profileError && (
        <div className="container mx-auto px-6 pt-4">
          <div className="text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3">
            {profileError}
          </div>
        </div>
      )}

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

            <TrackingMap
              shipments={shipments}
              selectedShipment={selectedShipment}
              onSelectShipment={setSelectedShipment}
            />

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
              <Button className="gap-2" onClick={() => void handleAnalyzeAllShipments()} disabled={isAnalyzeAllRunning || shipments.length === 0}>
                <Lightning size={18} weight="duotone" />
                {isAnalyzeAllRunning ? 'Analyzing...' : 'Analyze All'}
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
              <h2 className="text-2xl font-bold">AI Agent System</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowWorkflow(!showWorkflow)}>
                  <Brain size={16} weight="duotone" />
                  {showWorkflow ? 'Hide' : 'Show'} Workflow
                </Button>
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

            {showWorkflow && (
              <AgentWorkflowView workflowSteps={workflowSteps} />
            )}
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
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Assign Work</Label>
              <Input
                value={agentTaskPrompt}
                onChange={(event) => setAgentTaskPrompt(event.target.value)}
                placeholder="Example: Review delays and prepare customer update"
              />
              <Button className="w-full" onClick={() => void handleAssignTask()}>
                Assign Task{selectedAgent?.name ? ` To ${selectedAgent.name}` : ''}
              </Button>
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
          
          <div className="flex items-center justify-center gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => {
                setShowHistoricalPlayback(true)
              }}
            >
              <ClockCounterClockwise size={16} weight="duotone" />
              Historical Playback
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => {
                setShowBlockchainPayment(true)
              }}
            >
              <CurrencyDollar size={16} weight="duotone" />
              Blockchain Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoricalPlayback} onOpenChange={setShowHistoricalPlayback}>
        <DialogContent className="max-w-4xl">
          {selectedShipment && (
            <HistoricalPlayback 
              shipment={selectedShipment} 
              onClose={() => setShowHistoricalPlayback(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showBlockchainPayment} onOpenChange={setShowBlockchainPayment}>
        <DialogContent className="max-w-3xl">
          {selectedShipment && (
            <BlockchainPayment 
              shipment={selectedShipment} 
              onClose={() => setShowBlockchainPayment(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-3xl">
          <NotificationCenter
            notifications={notifications}
            onClose={() => setShowNotifications(false)}
            onMarkAsRead={(id) => void markNotificationRead(id)}
            onMarkAllRead={() => void markAllNotificationsRead()}
          />
        </DialogContent>
      </Dialog>

      <SupportChatbot
        messages={chatMessages}
        onSend={async (message) => {
          await sendSupportMessage(message)
          toast.success('Assistant responded')
        }}
      />
    </div>
  )
}

export default App