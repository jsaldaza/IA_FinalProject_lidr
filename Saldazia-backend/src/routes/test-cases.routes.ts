import express, { Request } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { StructuredLogger } from '../utils/structured-logger';
import { TestCaseGenerationService } from '../services/generateTestCases.service';
import { TestController } from '../controllers/test.controller';

const router = express.Router();

// Validation schemas: aceptar projectId o analysisId (al menos uno requerido)
const generateTestCasesSchema = z.object({
  projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID del proyecto debe ser un ObjectId válido').optional(),
  analysisId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID del análisis debe ser un ObjectId válido').optional(),
  conversationalAnalysisId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID del análisis conversacional debe ser un ObjectId válido').optional()
}).refine((data) => !!data.projectId || !!data.analysisId || !!data.conversationalAnalysisId, {
  message: 'Se requiere projectId, analysisId o conversationalAnalysisId'
});

/**
 * @route POST /api/test-cases/generate
 * @desc Generar casos de prueba desde un análisis completado
 * @access Private
 */
router.post('/generate', authenticate, async (req: Request, res: express.Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
  res.status(401).json({ success: false, error: 'Usuario no autenticado' });
  return;
    }

    const validationResult = generateTestCasesSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({ success: false, error: 'Datos de entrada inválidos', details: validationResult.error.errors });
      return;
    }

    const { projectId, analysisId, conversationalAnalysisId } = validationResult.data;

    console.log('🧪 DEBUG: Generating test cases with params:', { projectId, analysisId, conversationalAnalysisId, userId });

    let generatedTestCases;
    if (conversationalAnalysisId) {
      console.log('🧪 DEBUG: Using conversationalAnalysisId path');
      generatedTestCases = await TestCaseGenerationService.generateTestCasesFromConversationalAnalysis({ conversationalAnalysisId, userId });
    } else if (projectId) {
      console.log('🧪 DEBUG: Using projectId path');
      generatedTestCases = await TestCaseGenerationService.generateTestCasesFromProject({ projectId, userId });
    } else {
      console.log('🧪 DEBUG: Using analysisId path');
      generatedTestCases = await TestCaseGenerationService.generateTestCasesFromAnalysis({ analysisId: analysisId as string, userId });
    }

    console.log('🧪 DEBUG: Generated test cases result:', { 
      success: generatedTestCases.success, 
      testCasesCount: generatedTestCases.testCases.length,
      errors: generatedTestCases.errors 
    });

    res.status(200).json({ success: true, data: generatedTestCases.testCases, message: `Se generaron ${generatedTestCases.testCases.length} casos de prueba exitosamente` });
    return;
  } catch (error) {
    StructuredLogger.error('GENERATE TEST CASES Error', error as Error, { method: 'generateTestCases' } as any);
    if (error instanceof Error && error.message.includes('no encontrado')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Error interno del servidor al generar casos de prueba' });
    return;
  }
});

// CRUD routes for TestCase using TestController
// Public endpoints used by the frontend:
router.get('/', authenticate, async (req: Request, res: express.Response) => { await TestController.list(req as any, res); });

// NOTE: The explicit CRUD endpoints for creating/updating/deleting individual TestCase
// resources were removed because the frontend currently only consumes the listing and
// generation endpoints. If in the future a UI needs create/update/delete, reintroduce
// the corresponding routes and controller methods.

export default router;
