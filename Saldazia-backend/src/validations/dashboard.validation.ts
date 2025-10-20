import { z } from 'zod';

// Common validation schemas
export const CommonSchemas = {
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID debe ser un ObjectId válido'),

  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'User ID debe ser un ObjectId válido'),
};

// Dashboard specific schemas
export const DashboardSchemas = {
  getStats: z.object({
    query: z.object({
      period: z.enum(['day', 'week', 'month']).default('week'),
      includeInactive: z.string().optional(),
    }).optional(),
  }),

  getActivity: z.object({
    query: z.object({
      limit: z.number().min(1).max(50).default(10),
      type: z.enum(['all', 'analysis', 'project', 'testcase']).default('all'),
    }).optional(),
  }),

  getRecentProjects: z.object({
    query: z.object({
      limit: z.number().min(1).max(20).default(5),
      status: z.enum(['all', 'in_progress', 'completed', 'archived']).default('all'),
    }).optional(),
  }),
};

// Response schemas for documentation
export const DashboardResponseSchemas = {
  stats: z.object({
    totalProjects: z.number(),
    totalTestCases: z.number(),
    completedAnalyses: z.number(),
    inProgressAnalyses: z.number(),
    activeProjects: z.number(),
    passRate: z.number(),
  }),

  activity: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string(),
    timestamp: z.string(),
    status: z.string(),
  })),

  recentProjects: z.array(z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
    currentPhase: z.string().optional(),
    completeness: z.number().optional(),
    updatedAt: z.string(),
  })),
};