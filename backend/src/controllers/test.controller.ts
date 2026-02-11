// @ts-nocheck
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';

// Controller simplified to manage TestCase resources aligned with prisma schema.
export class TestController {
    // List test cases for a given conversationalAnalysisId or projectId
    static async list(req: Request, res: Response) {
        const { conversationalAnalysisId, projectId } = req.query as any;

        const userId = (req.user as any)?.id;
        if (!userId) throw new AppError('Unauthorized', 401);

        if (conversationalAnalysisId) {
            const ca = await prisma.conversationalAnalysis.findFirst({ where: { id: conversationalAnalysisId, userId } });
            if (!ca) throw new AppError('Conversational analysis not found', 404);

            const testCases = await prisma.testCase.findMany({ where: { conversationalAnalysisId } });
            return res.json({ status: 'success', data: { testCases } });
        }

        if (projectId) {
            const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
            if (!project) throw new AppError('Project not found', 404);

            // Buscar test cases tanto en analysis legacy como en conversational analysis
            const testCases = await prisma.testCase.findMany({ 
                where: { 
                    OR: [
                        { conversationalAnalysis: { userId } },
                        { userId } // Test cases directos del usuario
                    ]
                },
                include: {
                    conversationalAnalysis: true
                }
            });
            return res.json({ status: 'success', data: { testCases } });
        }

        // Default: return ALL user's test cases (including those from conversational analyses)
        console.log('🧪 DEBUG: Listing test cases for userId:', userId);
        
        const testCases = await prisma.testCase.findMany({ 
            where: { 
                OR: [
                    { userId }, // Test cases directos del usuario
                    { conversationalAnalysis: { userId } } // Test cases de sus análisis conversacionales
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
        
        console.log('🧪 DEBUG: Found test cases:', { count: testCases.length, testCases: testCases.map(tc => ({ id: tc.id, title: tc.title, conversationalAnalysisId: tc.conversationalAnalysisId })) });
        
        return res.json({ status: 'success', data: testCases });
    }

    static async get(req: Request, res: Response) {
        const { id } = req.params;
        const userId = (req.user as any)?.id;
        if (!userId) throw new AppError('Unauthorized', 401);

        const testCase = await prisma.testCase.findUnique({ where: { id } });
        if (!testCase) throw new AppError('Test case not found', 404);
        if (testCase.userId !== userId) throw new AppError('Forbidden', 403);

        return res.json({ status: 'success', data: { testCase } });
    }

    static async create(req: Request, res: Response) {
        const { description, conversationalAnalysisId, title } = req.body;
        const userId = (req.user as any)?.id;
        if (!userId) throw new AppError('Unauthorized', 401);

        if (!conversationalAnalysisId) throw new AppError('conversationalAnalysisId is required', 400);

        // Verificar que el análisis conversacional existe y pertenece al usuario
        const ca = await prisma.conversationalAnalysis.findFirst({ where: { id: conversationalAnalysisId, userId } });
        if (!ca) throw new AppError('Conversational analysis not found', 404);

        const testCase = await prisma.testCase.create({
            data: {
                title: title || description?.slice(0, 200) || 'Test Case',
                description: description || '',
                conversationalAnalysisId,
                userId
            }
        });

        return res.status(201).json({ status: 'success', data: { testCase } });
    }

    static async update(req: Request, res: Response) {
        const { id } = req.params;
        const { description } = req.body;
        const userId = (req.user as any)?.id;
        if (!userId) throw new AppError('Unauthorized', 401);

        const existing = await prisma.testCase.findUnique({ where: { id } });
        if (!existing) throw new AppError('Test case not found', 404);
        if (existing.userId !== userId) throw new AppError('Forbidden', 403);

        const testCase = await prisma.testCase.update({ where: { id }, data: { description } });
        return res.json({ status: 'success', data: { testCase } });
    }

    static async remove(req: Request, res: Response) {
        const { id } = req.params;
        const userId = (req.user as any)?.id;
        if (!userId) throw new AppError('Unauthorized', 401);

        const existing = await prisma.testCase.findUnique({ where: { id } });
        if (!existing) throw new AppError('Test case not found', 404);
        if (existing.userId !== userId) throw new AppError('Forbidden', 403);

        await prisma.testCase.delete({ where: { id } });
        return res.json({ status: 'success', message: 'Test case deleted successfully' });
    }
}