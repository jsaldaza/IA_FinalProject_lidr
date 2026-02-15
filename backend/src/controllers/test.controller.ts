// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ResponseHandler } from '../utils/response-handler';
import { AppError, UnauthorizedError, NotFoundError, ForbiddenError, ValidationError, InternalServerError } from '../utils/error-handler';

// Controller simplified to manage TestCase resources aligned with prisma schema.
export class TestController {
    // List test cases for a given conversationalAnalysisId or projectId
    static async list(req: Request, res: Response) {
        try {
            const { conversationalAnalysisId, projectId } = req.query as any;

            const userId = (req.user as any)?.id;
            if (!userId) throw new UnauthorizedError('Unauthorized');

            if (conversationalAnalysisId) {
                const ca = await prisma.conversationalAnalysis.findFirst({ where: { id: conversationalAnalysisId, userId } });
                if (!ca) throw new NotFoundError('Conversational analysis');

                const testCases = await prisma.testCase.findMany({ where: { conversationalAnalysisId } });
                return ResponseHandler.success(res, { testCases });
            }

            if (projectId) {
                const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
                if (!project) throw new NotFoundError('Project');

                const testCases = await prisma.testCase.findMany({ 
                    where: { 
                        OR: [
                            { conversationalAnalysis: { userId } },
                            { userId }
                        ]
                    },
                    include: {
                        conversationalAnalysis: true
                    }
                });
                return ResponseHandler.success(res, { testCases });
            }

            const testCases = await prisma.testCase.findMany({ 
                where: { 
                    OR: [
                        { userId },
                        { conversationalAnalysis: { userId } }
                    ]
                },
                include: {
                    conversationalAnalysis: {
                        select: {
                            id: true,
                            title: true,
                            status: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return ResponseHandler.success(res, testCases);
        } catch (error) {
            const appError = error instanceof AppError ? error : new InternalServerError('Failed to list test cases');
            return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
        }
    }

    static async get(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = (req.user as any)?.id;
            if (!userId) throw new UnauthorizedError('Unauthorized');

            const testCase = await prisma.testCase.findUnique({ where: { id } });
            if (!testCase) throw new NotFoundError('Test case');
            if (testCase.userId !== userId) throw new ForbiddenError('Forbidden');

            return ResponseHandler.success(res, { testCase });
        } catch (error) {
            const appError = error instanceof AppError ? error : new InternalServerError('Failed to get test case');
            return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const { description, conversationalAnalysisId, title } = req.body;
            const userId = (req.user as any)?.id;
            if (!userId) throw new UnauthorizedError('Unauthorized');

            if (!conversationalAnalysisId) throw new ValidationError('conversationalAnalysisId is required');

            const ca = await prisma.conversationalAnalysis.findFirst({ where: { id: conversationalAnalysisId, userId } });
            if (!ca) throw new NotFoundError('Conversational analysis');

            const testCase = await prisma.testCase.create({
                data: {
                    title: title || description?.slice(0, 200) || 'Test Case',
                    description: description || '',
                    conversationalAnalysisId,
                    userId
                }
            });

            return ResponseHandler.created(res, { testCase });
        } catch (error) {
            const appError = error instanceof AppError ? error : new InternalServerError('Failed to create test case');
            return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { description } = req.body;
            const userId = (req.user as any)?.id;
            if (!userId) throw new UnauthorizedError('Unauthorized');

            const existing = await prisma.testCase.findUnique({ where: { id } });
            if (!existing) throw new NotFoundError('Test case');
            if (existing.userId !== userId) throw new ForbiddenError('Forbidden');

            const testCase = await prisma.testCase.update({ where: { id }, data: { description } });
            return ResponseHandler.success(res, { testCase });
        } catch (error) {
            const appError = error instanceof AppError ? error : new InternalServerError('Failed to update test case');
            return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
        }
    }

    static async remove(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = (req.user as any)?.id;
            if (!userId) throw new UnauthorizedError('Unauthorized');

            const existing = await prisma.testCase.findUnique({ where: { id } });
            if (!existing) throw new NotFoundError('Test case');
            if (existing.userId !== userId) throw new ForbiddenError('Forbidden');

            await prisma.testCase.delete({ where: { id } });
            return ResponseHandler.success(res, { message: 'Test case deleted successfully' });
        } catch (error) {
            const appError = error instanceof AppError ? error : new InternalServerError('Failed to delete test case');
            return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
        }
    }
}