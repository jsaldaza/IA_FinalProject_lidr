export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface User {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
}

export interface Analysis {
    id: string;
    title: string; // Cambio de 'name' a 'title' para coincidir con el backend
    name?: string; // Mantener 'name' por compatibilidad temporal
    description?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    projectId?: string; // Opcional porque ConversationalAnalysis no tiene projectId
    hasTestCases?: boolean;
    results?: {
        totalTests: number;
        passedTests: number;
        failedTests: number;
        duration: number;
    };
    requirement?: string;
    summary?: string;
    redFlags?: string[];
    questions?: Question[];
    testStrategies?: TestStrategy[];
}

export interface TestCase {
    id: string;
    title: string;  // Cambio: name -> title
    description?: string;
    steps: string[]; // Nuevo: array de pasos
    expectedResult: string; // Nuevo: resultado esperado
    status: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED'; // Cambio: enum específico
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';  // Nuevo: priority
    projectId: string; // Cambio: relación directa con Project
    createdAt: string;
    updatedAt: string;
}

export interface Metrics {
    totalProjects: number;
    totalTests: number;
    successRate: number;
}



export interface TestExecution {
    id: string;
    testCaseId: string;
    status: 'PASSED' | 'FAILED';
    duration: number;
    errorMessage?: string;
    createdAt: string;
}

export interface ProjectMetrics {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    averageExecutionTime: number;
    lastExecutionDate: string | null;
}

export interface ProjectTrend {
    date: string;
    value: number;
}

export interface ProjectTrends {
    passRateTrend: ProjectTrend[];
    executionTimeTrend: ProjectTrend[];
}

export interface ProjectReport {
    id: string;
    executionDate: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    executionTime: number;
}

export interface Question {
    id: string;
    content: string;
    type: string;
    priority: string;
    analysisId: string;
    createdAt: string;
    updatedAt: string;
}

export interface TestStrategy {
    id: string;
    title: string;
    description: string;
    steps: string[];
    coverage: string[];
    priority: string;
    analysisId: string;
    createdAt: string;
    updatedAt: string;
}

export type AnalysisInput = {
    name: string;
    description?: string;
    projectId: string;
};

export type ProjectInput = {
    name: string;
    description?: string;
}; 