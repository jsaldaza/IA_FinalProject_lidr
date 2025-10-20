import { http, HttpResponse } from 'msw'
import type { Analysis, User, Project, ProjectMetrics } from '../../types/api'

// Mock data
const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
}

const mockProjects: Analysis[] = [
    {
        id: '1',
        title: 'Test Project 1',
        description: 'A test project for e-commerce',
        status: 'IN_PROGRESS',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        hasTestCases: true
    },
    {
        id: '2', 
        title: 'Test Project 2',
        description: 'Another test project',
        status: 'COMPLETED',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        hasTestCases: false
    }
]

const mockMetrics: ProjectMetrics = {
    totalTests: 45,
    passedTests: 38,
    failedTests: 7,
    passRate: 84.4,
    averageExecutionTime: 245,
    lastExecutionDate: '2025-01-01T00:00:00Z'
}

const BASE_URL = 'http://localhost:3000'

export const handlers = [
    // Auth endpoints
    http.post(`${BASE_URL}/api/auth/login`, async ({ request }) => {
        const body = await request.json() as { email: string; password: string }
        
        if (body.email === 'test@example.com' && body.password === 'password123') {
            return HttpResponse.json({
                user: mockUser,
                token: 'mock-jwt-token'
            })
        }
        
        return new HttpResponse(
            JSON.stringify({ error: 'Invalid credentials' }),
            { status: 401 }
        )
    }),

    http.post(`${BASE_URL}/api/auth/register`, async ({ request }) => {
        const body = await request.json() as { email: string; password: string }
        
        return HttpResponse.json({
            user: { ...mockUser, email: body.email },
            token: 'mock-jwt-token'
        })
    }),

        http.get(`${BASE_URL}/api/auth/profile`, async ({ request }) => {
        return HttpResponse.json({ user: mockUser })
    }),

    // Project endpoints
    http.get(`${BASE_URL}/api/projects/in-progress`, () => {
        const inProgressProjects = mockProjects.filter(p => p.status === 'IN_PROGRESS')
        return HttpResponse.json({
            status: 'success',
            data: inProgressProjects
        })
    }),

    http.get(`${BASE_URL}/api/projects/completed`, () => {
        const completedProjects = mockProjects.filter(p => p.status === 'COMPLETED')
        return HttpResponse.json({
            status: 'success', 
            data: { items: completedProjects }
        })
    }),

        http.post(`${BASE_URL}/api/projects`, async ({ request }) => {
        const body = await request.json() as { title: string }
        
        const newProject = {
            id: String(Date.now()),
            title: body.title,
            createdAt: new Date().toISOString()
        }
        
        return HttpResponse.json({
            data: { project: newProject }
        })
    }),

    http.delete(`${BASE_URL}/api/projects/:id`, ({ params }) => {
        return HttpResponse.json({
            status: 'success',
            message: `Project ${params.id} deleted successfully`
        })
    }),

    // Dashboard endpoints
    http.get(`${BASE_URL}/api/dashboard/stats`, () => {
        return HttpResponse.json({
            data: {
                totalProjects: mockProjects.length,
                totalTests: mockMetrics.totalTests,
                successRate: mockMetrics.passRate
            }
        })
    }),

    // Conversational workflow endpoints
    http.get(`${BASE_URL}/api/conversational-workflow/:id/status`, ({ params }) => {
        return HttpResponse.json({
            data: {
                id: params.id,
                title: 'Mock Workflow',
                status: 'IN_PROGRESS',
                messages: []
            }
        })
    }),

    http.post(`${BASE_URL}/api/conversational-workflow/:id/chat`, async ({ request }) => {
        const body = await request.json() as { content: string }
        
        return HttpResponse.json({
            data: {
                aiResponse: `AI response to: ${body.content}`,
                messageType: 'analysis',
                timestamp: new Date().toISOString()
            }
        })
    })
]