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

export interface ConversationalWorkflowResponse {
    id: string;
    title: string;
    description: string;
    epicContent: string;
    currentPhase: 'ANALYSIS' | 'STRATEGY' | 'TEST_PLANNING' | 'COMPLETED';
    status: 'IN_PROGRESS' | 'READY_TO_ADVANCE' | 'COMPLETED';
    completeness: {
        functionalCoverage: number;
        nonFunctionalCoverage: number;
        businessRulesCoverage: number;
        acceptanceCriteriaCoverage: number;
        overallScore: number;
    };
    messages: Array<{
        id: string;
        content: string;
        role: 'USER' | 'ASSISTANT';
        type: string;
        timestamp: Date;
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
    /**
     * Crear nuevo flujo conversacional
     */
    async createWorkflow(data: ConversationalWorkflowRequest): Promise<ConversationalWorkflowResponse> {
        const response = await api.post('/conversational-workflow', data);
        return response.data.data;
    },

    /**
     * Obtener estado del flujo conversacional
     */
    async getWorkflowStatus(workflowId: string): Promise<ConversationalWorkflowResponse> {
        const response = await api.get(`/conversational-workflow/${workflowId}/status`);
        return response.data.data;
    },

    /**
     * Enviar mensaje en la conversación
     */
    async sendMessage(workflowId: string, data: ConversationalMessageRequest): Promise<ConversationalMessageResponse> {
        const response = await api.post(`/conversational-workflow/${workflowId}/chat`, data);
        return response.data.data;
    },

    /**
     * Avanzar a la siguiente fase
     */
    async advancePhase(workflowId: string): Promise<ConversationalWorkflowResponse> {
        const response = await api.post(`/conversational-workflow/${workflowId}/advance`);
        return response.data.data;
    },

    /**
     * Enviar fase para revisión
     */
    async submitPhase(workflowId: string): Promise<ConversationalWorkflowResponse> {
        const response = await api.post(`/conversational-workflow/${workflowId}/submit`);
        return response.data.data;
    },

    /**
     * Reabrir levantamiento de requisitos
     */
    async reopenAnalysis(workflowId: string, reason?: string): Promise<ConversationalWorkflowResponse> {
        const response = await api.post(`/conversational-workflow/${workflowId}/reopen`, { reason });
        return response.data.data;
    },

    /**
     * Obtener todos los flujos del usuario
     */
    async getUserWorkflows(): Promise<ConversationalWorkflowResponse[]> {
        const response = await api.get('/conversational-workflow/user/workflows');
        return response.data.data;
    }
    ,
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
