export interface TestCase {
    id: string;
    title: string;
    description?: string;
    steps?: string[];
    expectedResult?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'passed' | 'failed' | 'pending' | 'skipped';
    projectId: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTestCaseData {
    title: string;
    description?: string;
    steps?: string[];
    expectedResult?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    projectId: string;
}

export interface UpdateTestCaseData {
    title?: string;
    description?: string;
    steps?: string[];
    expectedResult?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'passed' | 'failed' | 'pending' | 'skipped';
}

export interface TestExecution {
    id: string;
    testCaseId: string;
    status: 'passed' | 'failed' | 'pending' | 'running';
    startedAt: string;
    completedAt?: string;
    results?: Record<string, unknown>;
}
