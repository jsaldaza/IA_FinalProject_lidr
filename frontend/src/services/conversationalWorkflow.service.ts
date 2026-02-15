// Frontend service para conectar con el backend conversational-workflow
import api from '../lib/api';

export interface ConversationalWorkflowRequest {
    title: string;
    description: string;
    epicContent: string;
    projectId?: string;
}

export interface ConversationalMessageRequest {
    content: string;
}

export type ConversationalCompleteness =
    | number
    | {
          functionalCoverage?: number;
          nonFunctionalCoverage?: number;
          businessRulesCoverage?: number;
          acceptanceCriteriaCoverage?: number;
          overallScore?: number;
      };

export interface ConversationalWorkflowResponse {
    id: string;
    title: string;
    description: string;
    epicContent: string;
    currentPhase: 'ANALYSIS' | 'STRATEGY' | 'TEST_PLANNING' | 'COMPLETED';
    status: 'IN_PROGRESS' | 'READY_TO_ADVANCE' | 'COMPLETED' | 'SUBMITTED' | 'REOPENED';
    completeness: ConversationalCompleteness;
    messages: Array<{
        id: string;
        content: string;
        role: 'USER' | 'ASSISTANT';
        type: string;
        timestamp: Date | string;
        metadata?: {
            category?: string;
            phase?: string;
        };
    }>;
    createdAt: string;
    updatedAt: string;
    project?: {
        id: string;
        name: string;
    };
}

export interface ConversationalMessageResponse {
    aiResponse: string;
    messageType: string;
    category?: string;
    phaseComplete?: boolean;
}

export const conversationalWorkflowService = {
    normalizeCompleteness(raw: ConversationalCompleteness) {
        const overallScore =
            typeof raw === 'number'
                ? raw
                : typeof raw?.overallScore === 'number'
                ? raw.overallScore
                : 0;

        const base = {
            overallScore,
            functionalCoverage: 0,
            nonFunctionalCoverage: 0,
            businessRulesCoverage: 0,
            acceptanceCriteriaCoverage: 0
        };

        if (typeof raw === 'number') return base;
        return { ...base, ...raw, overallScore };
    },

    normalizeWorkflow(raw: any): ConversationalWorkflowResponse {
        const completeness = raw?.completeness ?? 0;
        const messages = Array.isArray(raw?.messages)
            ? raw.messages.map((m: any, idx: number) => ({
                  id: m.id ?? `msg-${idx}`,
                  content: m.content ?? '',
                  role: (m.role as 'USER' | 'ASSISTANT') ?? 'ASSISTANT',
                  type: m.type ?? m.messageType ?? 'unknown',
                  timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
                  metadata: m.metadata ?? (m.category ? { category: m.category } : undefined)
              }))
            : [];

        const projectId = raw?.projectId ?? raw?.project?.id;
        const projectName = raw?.project?.name ?? raw?.projectName;

        return {
            id: raw?.id ?? raw?._id ?? `workflow-${Date.now()}`,
            title: raw?.title ?? raw?.name ?? 'Análisis sin título',
            description: raw?.description ?? '',
            epicContent: raw?.epicContent ?? '',
            currentPhase: raw?.currentPhase ?? 'ANALYSIS',
            status: raw?.status ?? 'IN_PROGRESS',
            completeness: this.normalizeCompleteness(completeness),
            messages,
            createdAt: raw?.createdAt ?? new Date().toISOString(),
            updatedAt: raw?.updatedAt ?? raw?.createdAt ?? new Date().toISOString(),
            project: projectId
                ? {
                      id: projectId,
                      name: projectName ?? 'Proyecto'
                  }
                : undefined
        };
    },

    extractItems(response: any) {
        const data = response?.data?.data ?? response?.data;

        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.items)) return data.items;
        return [];
    },

    /**
     * Crear nuevo flujo conversacional
     */
    async createWorkflow(data: ConversationalWorkflowRequest): Promise<ConversationalWorkflowResponse> {
        const response = await api.post('/conversational-workflow', data);
        return this.normalizeWorkflow(response.data?.data ?? response.data);
    },

    /**
     * Obtener estado del flujo conversacional
     */
    async getWorkflowStatus(workflowId: string): Promise<ConversationalWorkflowResponse> {
        const response = await api.get(`/conversational-workflow/${workflowId}/status`);
        return this.normalizeWorkflow(response.data?.data ?? response.data);
    },

    /**
     * Enviar mensaje en la conversación
     */
    async sendMessage(workflowId: string, data: ConversationalMessageRequest): Promise<ConversationalMessageResponse> {
        const response = await api.post(`/conversational-workflow/${workflowId}/chat`, data);
        return response.data.data;
    },

    /**
     * Obtener flujos en progreso y completados, fusionados para UI
     */
    async getUserWorkflows(): Promise<ConversationalWorkflowResponse[]> {
        const [inProgressRes, completedRes] = await Promise.all([
            api.get('/conversational-workflow/user/in-progress'),
            api.get('/conversational-workflow/user/completed')
        ]);

        const inProgressRaw = this.extractItems(inProgressRes);
        const completedRaw = this.extractItems(completedRes);

        return [...inProgressRaw, ...completedRaw].map((workflow) => this.normalizeWorkflow(workflow));
    },

    /**
     * Obtener solo los workflows completados del usuario (para generación de casos)
     */
    async getCompletedWorkflows(): Promise<ConversationalWorkflowResponse[]> {
        const response = await api.get('/conversational-workflow/user/completed');
        const items = this.extractItems(response);
        return items.map((workflow) => this.normalizeWorkflow(workflow));
    },
    /**
     * Obtener el summary final (summit) de un análisis
     */
    async getAnalysisSummit(workflowId: string): Promise<unknown> {
        const response = await api.get(`/conversational-workflow/${workflowId}/summit`);
        return response.data.data as unknown;
    },

    /**
     * Crear/Guardar el summary final
     */
    async createAnalysisSummit(workflowId: string, summitPayload: unknown): Promise<unknown> {
        const response = await api.post(`/conversational-workflow/${workflowId}/summit`, summitPayload);
        return response.data as unknown;
    },

    /**
     * Actualizar el summary final existente
     */
    async updateAnalysisSummit(workflowId: string, updates: unknown): Promise<unknown> {
        const response = await api.patch(`/conversational-workflow/${workflowId}/summit`, updates);
        return response.data as unknown;
    }
};
