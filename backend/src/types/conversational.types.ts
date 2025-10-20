// Types for Conversational Analysis System

export enum ConversationalPhase {
  ANALYSIS = 'ANALYSIS',           // Refinando requisitos
  STRATEGY = 'STRATEGY',           // Creando estrategia de pruebas
  TEST_PLANNING = 'TEST_PLANNING', // Generando plan de pruebas profesional
  COMPLETED = 'COMPLETED'          // Flujo completado
}

export enum ConversationalStatus {
  IN_PROGRESS = 'IN_PROGRESS',     // Fase activa
  READY_TO_ADVANCE = 'READY_TO_ADVANCE', // Listo para siguiente fase
  SUBMITTED = 'SUBMITTED',         // Usuario confirmó finalización
  REOPENED = 'REOPENED',          // Reabierto para edición
  COMPLETED = 'COMPLETED'         // Todo el flujo terminado
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT'
}

export enum MessageType {
  QUESTION = 'QUESTION',           // IA pregunta algo
  ANSWER = 'ANSWER',              // Usuario responde
  CLARIFICATION = 'CLARIFICATION', // IA pide aclaración
  ANALYSIS_RESULT = 'ANALYSIS_RESULT', // IA presenta análisis generado
  STRATEGY_RESULT = 'STRATEGY_RESULT', // IA presenta estrategia
  TESTPLAN_RESULT = 'TESTPLAN_RESULT'  // IA presenta plan de pruebas
}

export enum QuestionCategory {
  FUNCTIONAL_REQUIREMENTS = 'FUNCTIONAL_REQUIREMENTS',
  NON_FUNCTIONAL_REQUIREMENTS = 'NON_FUNCTIONAL_REQUIREMENTS',
  BUSINESS_RULES = 'BUSINESS_RULES',
  USER_INTERFACE = 'USER_INTERFACE',
  DATA_HANDLING = 'DATA_HANDLING',
  INTEGRATION = 'INTEGRATION',
  SECURITY = 'SECURITY',
  PERFORMANCE = 'PERFORMANCE',
  ERROR_HANDLING = 'ERROR_HANDLING',
  ACCEPTANCE_CRITERIA = 'ACCEPTANCE_CRITERIA'
}

// Score tracking for phase completion
export interface PhaseCompleteness {
  functionalCoverage: number;      // 0-100%
  nonFunctionalCoverage: number;   // 0-100%
  businessRulesCoverage: number;   // 0-100%
  acceptanceCriteriaCoverage: number; // 0-100%
  overallScore: number;            // Promedio ponderado
}

// Generated artifacts by phase
export interface AnalysisArtifact {
  refinedRequirements: string[];
  functionalAspects: string[];
  nonFunctionalAspects: string[];
  businessRules: string[];
  acceptanceCriteria: string[];
  identifiedRisks: string[];
  assumptions: string[];
  completenessScore: number;
}

export interface StrategyArtifact {
  testingScope: string[];
  testingApproach: string;
  testTypes: string[];
  testLevels: string[];
  riskAssessment: string[];
  testEnvironments: string[];
  timeline: string;
  resources: string[];
}

export interface TestPlanArtifact {
  executiveSummary: string;
  scope: {
    inScope: string[];
    outOfScope: string[];
  };
  testApproach: string;
  testScenarios: Array<{
    id: string;
    name: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    testType: string;
    preconditions: string[];
    steps: string[];
    expectedResults: string[];
  }>;
  riskAnalysis: Array<{
    risk: string;
    probability: 'HIGH' | 'MEDIUM' | 'LOW';
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    mitigation: string;
  }>;
  assumptions: string[];
  deliverables: string[];
  timeline: string;
  resources: string[];
}

// Main conversational analysis entity
export interface ConversationalAnalysisEntity {
  id: string;
  title: string;
  description: string;
  epicContent: string;
  projectId: string | null;
  userId: string;
  currentPhase: ConversationalPhase;
  status: ConversationalStatus;
  completeness: PhaseCompleteness;
  
  // Generated artifacts
  analysisArtifact?: AnalysisArtifact;
  strategyArtifact?: StrategyArtifact;
  testPlanArtifact?: TestPlanArtifact;
  
  // Conversation history
  messages: ConversationalMessageEntity[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  reopenedAt?: Date;
}

export interface ConversationalMessageEntity {
  id: string;
  content: string;
  role: MessageRole;
  messageType: MessageType;
  category?: QuestionCategory;
  analysisId: string;
  metadata?: {
    questionId?: string;
    relatedRequirement?: string;
    confidenceScore?: number;
  };
  createdAt: Date;
}

// Request/Response DTOs - legacy types removed
// These interfaces were not being used according to ts-prune analysis
