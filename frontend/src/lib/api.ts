import axios, { type AxiosError, type AxiosResponse } from 'axios';
import { getToken, removeToken } from './auth';

// Constants
// NOTE: backend server in your environment runs on port 3001; allow override via VITE_API_URL.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// API Configuration
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000, // 15 segundos para endpoints con IA
});

// Request interceptor - Add authentication token with validation
api.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            // Basic token validation - non-blocking; rely on backend for final validation
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const currentTime = Date.now() / 1000;

                if (payload.exp && payload.exp < currentTime) {
                    console.warn('🚫 Token expired, removing from storage');
                    removeToken();
                    // Emit auth event for the app to react (avoid direct navigation here)
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('testforge:auth:expired'));
                    }
                    return config;
                }

                config.headers = config.headers || {};
                (config.headers as any).Authorization = `Bearer ${token}`;
            } catch {
                console.warn('🚫 Invalid token format, removing from storage');
                removeToken();
            }
        }
        // Remove hardcoded user-id header for security
        // config.headers['user-id'] = 'user1'; // REMOVED for security
        return config;
    },
    (error: AxiosError) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor - Handle authentication, rate limiting and errors
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error: AxiosError) => {
        // Add debug logging - SECURE VERSION (no sensitive data)
        console.error('🚨 API RESPONSE ERROR:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            method: error.config?.method,
            url: error.config?.url?.replace(/\/api\/.*/, '/api/[PROTECTED]'), // Hide endpoint details
        });

        // Handle rate limiting errors (429)
    if (error.response?.status === 429) {
            const errorData = error.response?.data as { 
                message?: string; 
                retryAfter?: number;
                code?: string;
            };
            
            const retryAfter = errorData?.retryAfter || 900; // Default 15 minutes
            const message = errorData?.message || 'Demasiados intentos. Intenta de nuevo más tarde.';
            
            console.warn('🚫 Rate limit exceeded:', {
                retryAfter,
                message,
                code: errorData?.code
            });

            // Show user-friendly rate limit notification
            if (typeof window !== 'undefined') {
                // Emit event so UI can show a toast instead of alert
                window.dispatchEvent(new CustomEvent('testforge:api:rate_limited', { detail: { retryAfter, message } }));
            }
            
            return Promise.reject(error);
        }

        // Handle authentication errors - but be more specific
        if (error.response?.status === 401) {
            const errorData = error.response?.data as { message?: string };
            const isTokenExpired = errorData?.message?.toLowerCase()?.includes('token') || 
                                 errorData?.message?.toLowerCase()?.includes('expired') ||
                                 errorData?.message?.toLowerCase()?.includes('unauthorized');

            console.log('🔒 401 Unauthorized detected:', {
                isTokenExpired,
                errorMessage: errorData?.message,
                currentPath: typeof window !== 'undefined' ? window.location.pathname : undefined
            });

            // Remove local token and emit event so App can handle redirect with router
            removeToken();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('testforge:auth:unauthorized', { detail: { isTokenExpired, message: errorData?.message } }));
            }
        }
        
        // Log errors in development
        if (import.meta.env.DEV) {
            console.error('API Error:', error.response?.data || error.message);
        }
        
        return Promise.reject(error);
    }
);

// Helper to normalize API response envelope
function unwrapResponse<T>(response: AxiosResponse): T {
    // Common shapes: { data: { items: [...] } } or { data: ... }
    const d: any = response.data;
    if (d && typeof d === 'object' && 'data' in d) return d.data as T;
    return d as T;
}

// Auth API endpoints
export const auth = {
    login: async (credentials: { email: string; password: string }) => {
        const response = await api.post('/auth/login', credentials);
        return unwrapResponse<{ user: unknown; token: string }>(response);
    },
    
    register: async (userData: { email: string; password: string; name: string }) => {
        const response = await api.post('/auth/register', userData);
        return unwrapResponse<{ user: unknown; token: string }>(response);
    },
    
    logout: async () => {
        await api.post('/auth/logout');
        removeToken();
    },
    
    getProfile: async () => {
        const response = await api.get('/auth/profile');
        return unwrapResponse<unknown>(response);
    },
};

// Projects API endpoints - UNIFICADOS CON BACKEND
export const projects = {
    // Lista proyectos en progreso (endpoint principal)
    getInProgress: async () => {
        const response = await api.get('/projects/in-progress');
        return response.data;
    },
    
    // Lista proyectos completados
    getCompleted: async () => {
        const response = await api.get('/projects/completed');
        return response.data;
    },
    
    // Obtener estado del proyecto
    getStatus: async (id: string) => {
        const response = await api.get(`/projects/${id}/status`);
        return response.data;
    },
    
    // Crear proyecto básico
    create: async (data: { title: string; description?: string }) => {
        const response = await api.post('/projects', data);
        return response.data;
    },
    
    // Crear proyecto y automáticamente iniciar chat (ENDPOINT PRINCIPAL)
    createAndStart: async (data: { title: string; description?: string }) => {
        const response = await api.post('/projects/create-and-start', data);
        return response.data;
    },
    
    // Enviar mensaje al chat del proyecto (IA)
    sendMessage: async (id: string, data: { content: string; messageType?: string }) => {
        const response = await api.post(`/projects/${id}/chat`, data);
        return response.data;
    },
    
    // Obtener historial de mensajes del chat
    getMessages: async (id: string) => {
        const response = await api.get(`/projects/${id}/messages`);
        return response.data;
    },
    
    // Crear proyecto rápido con solo título
    quickCreate: async (data: { title: string }) => {
        const response = await api.post('/projects/quick-create', data);
        return response.data;
    },
    
    // Completar proyecto
    complete: async (id: string) => {
        const response = await api.post(`/projects/${id}/complete`);
        return response.data;
    },
    // Iniciar IA en un proyecto existente
    startExisting: async (id: string, body?: Record<string, unknown>) => {
        const response = await api.post(`/projects/${id}/start`, body || {});
        return response.data;
    },
    
    // Eliminar proyecto
    delete: async (id: string) => {
        await api.delete(`/projects/${id}`);
    },
};

// Dashboard API endpoints
export const dashboard = {
    getStats: async () => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },
    
    getActivity: async () => {
        const response = await api.get('/dashboard/activity');
        return response.data;
    },
};

// Test Cases API endpoints - normalizados para coincidir con backend
const normalizeTestCasePayload = (raw: any): unknown[] => {
    if (!raw) return [];

    const data = raw.data ?? raw;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.testCases)) return data.testCases;
    if (Array.isArray(raw?.testCases)) return raw.testCases;
    return [];
};

export const testCases = {
    // Obtener casos de prueba del usuario autenticado
    getAll: async (): Promise<unknown[]> => {
        const response = await api.get('/test-cases');
        return normalizeTestCasePayload(response.data);
    },
    
    // Generar casos de prueba con IA (acepta conversationalAnalysisId o projectId)
    generate: async (payload: { conversationalAnalysisId?: string; projectId?: string }) => {
        const response = await api.post('/test-cases/generate', payload);
        return {
            testCases: normalizeTestCasePayload(response.data),
            message: response.data?.message as string | undefined,
        };
    },
    
    // NOTE: create/update/delete helpers were removed because the backend does not
    // expose those CRUD endpoints for test cases in the running API. If you need
    // to re-enable client-side creation/updating/deletion, re-introduce these
    // functions and restore the corresponding server routes.
};

// Export the axios instance for custom use
export default api; 