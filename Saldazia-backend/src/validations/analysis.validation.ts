import { z } from 'zod';

export const analysisValidation = {
    getProjectMetrics: {
        params: z.object({
            projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ProjectId debe ser un ObjectId válido')
        })
    },

    getProjectTrends: {
        params: z.object({
            projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ProjectId debe ser un ObjectId válido')
        }),
        query: z.object({
            period: z.enum(['day', 'week', 'month', 'year']).optional()
        })
    },

    getProjectReports: {
        params: z.object({
            projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ProjectId debe ser un ObjectId válido')
        }),
        query: z.object({
            page: z.string().regex(/^\d+$/).transform(Number).optional(),
            limit: z.string().regex(/^\d+$/).transform(Number).optional()
        })
    }
}; 