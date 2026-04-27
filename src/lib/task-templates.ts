export type IndustryType = 'logistics' | 'manufacturing' | 'retail' | 'healthcare' | 'food-beverage' | 'pharma' | 'automotive' | 'electronics'

export type TaskCategory = 'risk-management' | 'optimization' | 'compliance' | 'crisis-response' | 'quality-control' | 'inventory' | 'communication'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface TaskTemplateVariable {
  key: string
  label: string
  type: 'text' | 'select' | 'number' | 'date'
  options?: string[]
  placeholder?: string
  required: boolean
  defaultValue?: string | number
}

export interface TaskTemplate {
  id: string
  name: string
  description: string
  industry: IndustryType
  category: TaskCategory
  priority: TaskPriority
  estimatedDuration: string
  requiredAgents: string[]
  variables: TaskTemplateVariable[]
  promptTemplate: string
  expectedOutcomes: string[]
  tags: string[]
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'logistics-delay-analysis',
    name: 'Shipment Delay Root Cause Analysis',
    description: 'Comprehensive analysis of shipment delays with predictive insights and corrective action recommendations',
    industry: 'logistics',
    category: 'risk-management',
    priority: 'high',
    estimatedDuration: '5-10 minutes',
    requiredAgents: ['Risk Detection Agent', 'RAG Agent', 'Planner Agent'],
    variables: [
      {
        key: 'shipmentId',
        label: 'Shipment ID',
        type: 'text',
        placeholder: 'SH-001',
        required: true,
      },
      {
        key: 'delayHours',
        label: 'Delay Duration (hours)',
        type: 'number',
        placeholder: '24',
        required: true,
      },
      {
        key: 'analysisDepth',
        label: 'Analysis Depth',
        type: 'select',
        options: ['Basic', 'Standard', 'Comprehensive'],
        required: true,
        defaultValue: 'Standard',
      },
    ],
    promptTemplate: `Analyze the delay for shipment {{shipmentId}} which is delayed by {{delayHours}} hours. Perform a {{analysisDepth}} analysis including:
1. Root cause identification (weather, traffic, customs, operational)
2. Impact assessment on downstream operations
3. Historical pattern analysis from similar routes
4. Predictive modeling for future delays
5. Recommended corrective actions with priority levels

Provide specific, actionable insights with data-backed recommendations.`,
    expectedOutcomes: [
      'Root cause report with confidence scores',
      'Impact assessment on delivery timeline',
      'Risk mitigation strategies',
      'Preventive measures for future shipments',
    ],
    tags: ['delay', 'analysis', 'risk', 'predictive'],
  },
  {
    id: 'logistics-route-optimization',
    name: 'Dynamic Route Optimization',
    description: 'Optimize shipping routes based on real-time traffic, weather, and cost factors',
    industry: 'logistics',
    category: 'optimization',
    priority: 'medium',
    estimatedDuration: '3-7 minutes',
    requiredAgents: ['Supply Chain Optimization Agent', 'RAG Agent'],
    variables: [
      {
        key: 'shipmentId',
        label: 'Shipment ID',
        type: 'text',
        required: true,
      },
      {
        key: 'optimizationGoal',
        label: 'Optimization Goal',
        type: 'select',
        options: ['Fastest', 'Cheapest', 'Most Reliable', 'Balanced'],
        required: true,
        defaultValue: 'Balanced',
      },
      {
        key: 'maxDetour',
        label: 'Maximum Detour (%)',
        type: 'number',
        placeholder: '20',
        required: false,
        defaultValue: 15,
      },
    ],
    promptTemplate: `Optimize the route for shipment {{shipmentId}} with {{optimizationGoal}} as the primary goal. Consider:
1. Real-time traffic conditions
2. Weather forecasts for next 48 hours
3. Fuel costs and toll fees
4. Historical reliability data
5. Maximum acceptable detour of {{maxDetour}}%

Generate 3-5 alternative routes with detailed cost-benefit analysis for each option.`,
    expectedOutcomes: [
      'Alternative route recommendations',
      'Cost-benefit analysis per route',
      'Time and cost savings estimates',
      'Risk assessment for each alternative',
    ],
    tags: ['optimization', 'routing', 'cost-savings', 'real-time'],
  },
  {
    id: 'logistics-crisis-response',
    name: 'Emergency Crisis Response',
    description: 'Immediate crisis response protocol for critical shipment disruptions',
    industry: 'logistics',
    category: 'crisis-response',
    priority: 'critical',
    estimatedDuration: '2-5 minutes',
    requiredAgents: ['Crisis Response Agent', 'Communication Agent', 'Blockchain Agent'],
    variables: [
      {
        key: 'shipmentId',
        label: 'Shipment ID',
        type: 'text',
        required: true,
      },
      {
        key: 'crisisType',
        label: 'Crisis Type',
        type: 'select',
        options: ['Accident', 'Theft', 'Natural Disaster', 'Equipment Failure', 'Customs Hold', 'Other'],
        required: true,
      },
      {
        key: 'impactLevel',
        label: 'Impact Level',
        type: 'select',
        options: ['Minor', 'Moderate', 'Severe', 'Critical'],
        required: true,
      },
    ],
    promptTemplate: `Execute emergency crisis response for shipment {{shipmentId}} experiencing {{crisisType}} with {{impactLevel}} impact level:

IMMEDIATE ACTIONS:
1. Assess situation severity and safety risks
2. Notify all stakeholders (customer, carrier, operations team)
3. Activate contingency protocols
4. Document incident on blockchain for audit trail
5. Identify immediate recovery options

RECOVERY PLANNING:
1. Alternative delivery arrangements
2. Insurance claim preparation
3. Customer communication plan
4. Supplier notification if applicable
5. Post-incident analysis requirements

Prioritize safety, transparency, and rapid resolution.`,
    expectedOutcomes: [
      'Immediate action checklist',
      'Stakeholder notification log',
      'Recovery plan with timeline',
      'Blockchain-verified incident record',
    ],
    tags: ['crisis', 'emergency', 'response', 'stakeholder-management'],
  },
  {
    id: 'pharma-compliance-check',
    name: 'Pharmaceutical Cold Chain Compliance Audit',
    description: 'Verify temperature-controlled shipment compliance with regulatory standards',
    industry: 'pharma',
    category: 'compliance',
    priority: 'critical',
    estimatedDuration: '4-8 minutes',
    requiredAgents: ['Risk Detection Agent', 'RAG Agent', 'Blockchain Agent'],
    variables: [
      {
        key: 'shipmentId',
        label: 'Shipment ID',
        type: 'text',
        required: true,
      },
      {
        key: 'regulatoryStandard',
        label: 'Regulatory Standard',
        type: 'select',
        options: ['FDA 21 CFR Part 11', 'EU GDP', 'WHO TRS', 'ICH Q10'],
        required: true,
      },
      {
        key: 'tempRange',
        label: 'Required Temperature Range',
        type: 'text',
        placeholder: '2-8°C',
        required: true,
      },
    ],
    promptTemplate: `Conduct comprehensive cold chain compliance audit for pharmaceutical shipment {{shipmentId}} per {{regulatoryStandard}} standards:

COMPLIANCE CHECKS:
1. Temperature monitoring: Verify {{tempRange}} maintained throughout journey
2. Chain of custody documentation
3. Equipment calibration records
4. Deviation logging and corrective actions
5. Storage facility qualifications

RISK ASSESSMENT:
1. Temperature excursion events analysis
2. Impact on product integrity
3. Regulatory violation risks
4. Documentation completeness

Generate compliance certificate or non-conformance report with blockchain verification.`,
    expectedOutcomes: [
      'Compliance status report',
      'Temperature excursion analysis',
      'Regulatory risk assessment',
      'Blockchain-verified compliance certificate',
    ],
    tags: ['compliance', 'pharmaceutical', 'cold-chain', 'regulatory'],
  },
  {
    id: 'food-quality-inspection',
    name: 'Food Safety Quality Control Inspection',
    description: 'Automated quality control inspection for perishable food shipments',
    industry: 'food-beverage',
    category: 'quality-control',
    priority: 'high',
    estimatedDuration: '5-10 minutes',
    requiredAgents: ['Risk Detection Agent', 'RAG Agent'],
    variables: [
      {
        key: 'shipmentId',
        label: 'Shipment ID',
        type: 'text',
        required: true,
      },
      {
        key: 'productType',
        label: 'Product Type',
        type: 'select',
        options: ['Dairy', 'Meat', 'Seafood', 'Fresh Produce', 'Frozen Foods'],
        required: true,
      },
      {
        key: 'shelfLifeDays',
        label: 'Shelf Life (days)',
        type: 'number',
        required: true,
      },
    ],
    promptTemplate: `Execute quality control inspection for {{productType}} shipment {{shipmentId}} with {{shelfLifeDays}} days shelf life:

QUALITY PARAMETERS:
1. Temperature compliance throughout transit
2. Time in transit vs. shelf life remaining
3. Packaging integrity assessment
4. Contamination risk evaluation
5. HACCP compliance verification

FRESHNESS ANALYSIS:
1. Remaining shelf life calculation
2. Quality degradation prediction
3. Consumer safety assessment
4. Recall risk evaluation

Provide pass/fail recommendation with supporting evidence.`,
    expectedOutcomes: [
      'Quality assessment report',
      'Remaining shelf life calculation',
      'Safety compliance verification',
      'Accept/reject recommendation',
    ],
    tags: ['food-safety', 'quality-control', 'perishables', 'HACCP'],
  },
  {
    id: 'manufacturing-inventory-reorder',
    name: 'Predictive Inventory Reorder Analysis',
    description: 'AI-driven inventory level analysis with automated reorder recommendations',
    industry: 'manufacturing',
    category: 'inventory',
    priority: 'medium',
    estimatedDuration: '6-12 minutes',
    requiredAgents: ['Supply Chain Optimization Agent', 'RAG Agent', 'Planner Agent'],
    variables: [
      {
        key: 'materialId',
        label: 'Material/SKU ID',
        type: 'text',
        required: true,
      },
      {
        key: 'currentStock',
        label: 'Current Stock Level',
        type: 'number',
        required: true,
      },
      {
        key: 'forecastPeriod',
        label: 'Forecast Period (days)',
        type: 'number',
        defaultValue: 30,
        required: true,
      },
    ],
    promptTemplate: `Analyze inventory for material {{materialId}} with current stock of {{currentStock}} units over {{forecastPeriod}} days:

DEMAND FORECASTING:
1. Historical consumption pattern analysis
2. Seasonal trend identification
3. Production schedule alignment
4. Market demand signals
5. Lead time variability assessment

REORDER OPTIMIZATION:
1. Economic Order Quantity (EOQ) calculation
2. Safety stock recommendations
3. Reorder point determination
4. Supplier lead time considerations
5. Cost optimization (holding vs. ordering costs)

Provide actionable reorder recommendations with confidence intervals.`,
    expectedOutcomes: [
      'Demand forecast with confidence levels',
      'Optimal reorder quantity',
      'Reorder timing recommendation',
      'Cost analysis and savings potential',
    ],
    tags: ['inventory', 'forecasting', 'optimization', 'manufacturing'],
  },
  {
    id: 'retail-seasonal-planning',
    name: 'Seasonal Demand Planning & Allocation',
    description: 'Strategic planning for seasonal inventory allocation across retail network',
    industry: 'retail',
    category: 'optimization',
    priority: 'high',
    estimatedDuration: '8-15 minutes',
    requiredAgents: ['Supply Chain Optimization Agent', 'RAG Agent', 'Planner Agent'],
    variables: [
      {
        key: 'season',
        label: 'Season/Event',
        type: 'select',
        options: ['Holiday', 'Back to School', 'Summer', 'Black Friday', 'Spring'],
        required: true,
      },
      {
        key: 'productCategory',
        label: 'Product Category',
        type: 'text',
        required: true,
      },
      {
        key: 'storeCount',
        label: 'Number of Stores',
        type: 'number',
        required: true,
      },
    ],
    promptTemplate: `Develop seasonal allocation strategy for {{productCategory}} across {{storeCount}} stores for {{season}}:

DEMAND ANALYSIS:
1. Historical seasonal patterns (3-year trend)
2. Regional demand variations
3. Demographic factors per location
4. Competitor analysis and market share
5. Promotional calendar impact

ALLOCATION STRATEGY:
1. Store-level demand forecasting
2. Inventory distribution optimization
3. Replenishment schedule planning
4. Safety stock requirements
5. Transfer and redistribution protocols

PERFORMANCE METRICS:
1. Sell-through rate projections
2. Stock-out risk assessment
3. Markdown risk evaluation
4. Working capital requirements

Generate detailed allocation plan with contingency options.`,
    expectedOutcomes: [
      'Store-by-store allocation plan',
      'Demand forecast by location',
      'Replenishment schedule',
      'Risk mitigation strategies',
    ],
    tags: ['retail', 'seasonal', 'allocation', 'demand-planning'],
  },
  {
    id: 'automotive-recall-management',
    name: 'Product Recall Coordination & Tracking',
    description: 'Comprehensive recall management across supply chain with traceability',
    industry: 'automotive',
    category: 'crisis-response',
    priority: 'critical',
    estimatedDuration: '10-20 minutes',
    requiredAgents: ['Crisis Response Agent', 'Communication Agent', 'Blockchain Agent', 'RAG Agent'],
    variables: [
      {
        key: 'partNumber',
        label: 'Part Number',
        type: 'text',
        required: true,
      },
      {
        key: 'recallScope',
        label: 'Recall Scope',
        type: 'select',
        options: ['Supplier Level', 'Manufacturing Level', 'Distribution Level', 'Consumer Level'],
        required: true,
      },
      {
        key: 'safetyRating',
        label: 'Safety Risk Rating',
        type: 'select',
        options: ['Low', 'Moderate', 'High', 'Critical'],
        required: true,
      },
    ],
    promptTemplate: `Execute product recall protocol for part {{partNumber}} at {{recallScope}} with {{safetyRating}} safety risk:

TRACEABILITY & IDENTIFICATION:
1. Batch/lot number tracking across supply chain
2. Affected vehicle identification (VIN lookup)
3. Current location mapping (warehouse, dealer, customer)
4. Quantity assessment at each stage
5. Blockchain verification of product movement

STAKEHOLDER COORDINATION:
1. Supplier notification and response
2. Manufacturing halt/modification procedures
3. Dealer network communication
4. Consumer outreach strategy
5. Regulatory body reporting

LOGISTICS EXECUTION:
1. Return logistics planning
2. Inspection and sorting procedures
3. Replacement part distribution
4. Disposal/rework protocols
5. Financial impact assessment

Document all actions on blockchain for regulatory compliance and audit trail.`,
    expectedOutcomes: [
      'Complete traceability report',
      'Affected units inventory',
      'Stakeholder communication log',
      'Return logistics plan',
      'Blockchain-verified audit trail',
    ],
    tags: ['recall', 'automotive', 'traceability', 'crisis-management'],
  },
  {
    id: 'electronics-warranty-analysis',
    name: 'Warranty Claims Pattern Analysis',
    description: 'Identify defect patterns and supply chain quality issues from warranty data',
    industry: 'electronics',
    category: 'quality-control',
    priority: 'medium',
    estimatedDuration: '7-12 minutes',
    requiredAgents: ['Risk Detection Agent', 'RAG Agent', 'Planner Agent'],
    variables: [
      {
        key: 'productLine',
        label: 'Product Line',
        type: 'text',
        required: true,
      },
      {
        key: 'timeframe',
        label: 'Analysis Timeframe',
        type: 'select',
        options: ['Last 30 days', 'Last 90 days', 'Last 6 months', 'Last Year'],
        required: true,
      },
      {
        key: 'claimThreshold',
        label: 'Claim Rate Threshold (%)',
        type: 'number',
        defaultValue: 5,
        required: true,
      },
    ],
    promptTemplate: `Analyze warranty claims for {{productLine}} over {{timeframe}} with {{claimThreshold}}% threshold:

PATTERN IDENTIFICATION:
1. Defect categorization and frequency analysis
2. Time-to-failure distribution
3. Geographic concentration patterns
4. Batch/lot correlation analysis
5. Component-level failure mapping

SUPPLY CHAIN CORRELATION:
1. Supplier quality performance tracking
2. Manufacturing facility defect rates
3. Transportation damage patterns
4. Storage condition impact
5. Installation/handling issues

ROOT CAUSE ANALYSIS:
1. Design vs. manufacturing defects
2. Material quality issues
3. Process control failures
4. Environmental factors
5. User error vs. product defect

RECOMMENDATIONS:
1. Supplier corrective action requests
2. Process improvement opportunities
3. Design modification suggestions
4. Quality control enhancements
5. Preventive measures for future production`,
    expectedOutcomes: [
      'Defect pattern analysis report',
      'Supply chain quality scorecard',
      'Root cause identification',
      'Corrective action recommendations',
    ],
    tags: ['warranty', 'quality', 'defect-analysis', 'electronics'],
  },
  {
    id: 'healthcare-medical-device-tracking',
    name: 'Medical Device Lot Tracking & Compliance',
    description: 'End-to-end tracking and compliance verification for medical device shipments',
    industry: 'healthcare',
    category: 'compliance',
    priority: 'critical',
    estimatedDuration: '5-10 minutes',
    requiredAgents: ['Risk Detection Agent', 'Blockchain Agent', 'RAG Agent'],
    variables: [
      {
        key: 'deviceId',
        label: 'Device/Lot ID',
        type: 'text',
        required: true,
      },
      {
        key: 'regulatoryClass',
        label: 'FDA Device Class',
        type: 'select',
        options: ['Class I', 'Class II', 'Class III'],
        required: true,
      },
      {
        key: 'trackingType',
        label: 'Tracking Type',
        type: 'select',
        options: ['UDI Verification', 'Chain of Custody', 'Full Audit Trail'],
        required: true,
      },
    ],
    promptTemplate: `Execute {{trackingType}} for medical device {{deviceId}} ({{regulatoryClass}}):

REGULATORY COMPLIANCE:
1. UDI (Unique Device Identifier) verification
2. FDA registration and listing validation
3. Quality system compliance (ISO 13485)
4. Labeling requirements verification
5. Import/export documentation review

CHAIN OF CUSTODY:
1. Manufacturing origin verification
2. Sterilization certification (if applicable)
3. Distribution channel tracking
4. Storage condition monitoring
5. End-user delivery confirmation

BLOCKCHAIN VERIFICATION:
1. Immutable tracking record creation
2. Authenticity verification
3. Anti-counterfeiting measures
4. Recall readiness assessment
5. Audit trail generation

SAFETY & MONITORING:
1. Adverse event correlation
2. Performance tracking
3. Post-market surveillance readiness
4. Patient safety verification`,
    expectedOutcomes: [
      'UDI verification report',
      'Chain of custody documentation',
      'Blockchain-verified tracking record',
      'Compliance certification',
    ],
    tags: ['medical-devices', 'compliance', 'tracking', 'healthcare'],
  },
  {
    id: 'multi-modal-coordination',
    name: 'Multi-Modal Transportation Coordination',
    description: 'Coordinate complex shipments across multiple transportation modes',
    industry: 'logistics',
    category: 'optimization',
    priority: 'high',
    estimatedDuration: '8-15 minutes',
    requiredAgents: ['Supply Chain Optimization Agent', 'Communication Agent', 'RAG Agent'],
    variables: [
      {
        key: 'shipmentId',
        label: 'Shipment ID',
        type: 'text',
        required: true,
      },
      {
        key: 'modes',
        label: 'Transport Modes',
        type: 'text',
        placeholder: 'Air, Ocean, Rail, Truck',
        required: true,
      },
      {
        key: 'urgency',
        label: 'Urgency Level',
        type: 'select',
        options: ['Standard', 'Expedited', 'Rush', 'Emergency'],
        required: true,
      },
    ],
    promptTemplate: `Coordinate multi-modal shipment {{shipmentId}} using {{modes}} with {{urgency}} priority:

MODAL OPTIMIZATION:
1. Mode selection for each leg (cost vs. speed trade-offs)
2. Transfer point optimization
3. Carrier selection per mode
4. Equipment compatibility verification
5. Documentation requirements per mode

SYNCHRONIZATION:
1. Transfer timing coordination
2. Customs clearance alignment
3. Warehouse staging requirements
4. Last-mile delivery planning
5. Buffer time allocation for transfers

RISK MANAGEMENT:
1. Weather impact across all modes
2. Port/terminal congestion monitoring
3. Carrier reliability assessment
4. Transfer point vulnerability analysis
5. Contingency planning for each leg

COMMUNICATION:
1. Carrier coordination protocol
2. Customs broker alignment
3. Customer visibility updates
4. Exception handling procedures
5. Real-time status tracking`,
    expectedOutcomes: [
      'Optimized multi-modal route plan',
      'Transfer coordination schedule',
      'Risk mitigation strategies',
      'Cost and time estimates per mode',
    ],
    tags: ['multi-modal', 'coordination', 'logistics', 'optimization'],
  },
]

export function getTemplatesByIndustry(industry: IndustryType): TaskTemplate[] {
  return TASK_TEMPLATES.filter(template => template.industry === industry)
}

export function getTemplatesByCategory(category: TaskCategory): TaskTemplate[] {
  return TASK_TEMPLATES.filter(template => template.category === category)
}

export function getTemplateById(id: string): TaskTemplate | undefined {
  return TASK_TEMPLATES.find(template => template.id === id)
}

export function searchTemplates(query: string): TaskTemplate[] {
  const lowerQuery = query.toLowerCase()
  return TASK_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

export function interpolateTemplate(template: TaskTemplate, variables: Record<string, string | number>): string {
  let prompt = template.promptTemplate
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    prompt = prompt.replace(regex, String(value))
  })
  
  return prompt
}

export const INDUSTRY_LABELS: Record<IndustryType, string> = {
  'logistics': 'Logistics & Transportation',
  'manufacturing': 'Manufacturing',
  'retail': 'Retail & E-commerce',
  'healthcare': 'Healthcare',
  'food-beverage': 'Food & Beverage',
  'pharma': 'Pharmaceutical',
  'automotive': 'Automotive',
  'electronics': 'Electronics',
}

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  'risk-management': 'Risk Management',
  'optimization': 'Optimization',
  'compliance': 'Compliance & Regulatory',
  'crisis-response': 'Crisis Response',
  'quality-control': 'Quality Control',
  'inventory': 'Inventory Management',
  'communication': 'Communication & Coordination',
}
