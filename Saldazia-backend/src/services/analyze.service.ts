import { openAIService } from './openai.service';
import { PrismaClient, AnalysisStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function analyzeRequirement(requirement: string, userId: string, projectId?: string) {
  if (!requirement || typeof requirement !== 'string') {
    throw new Error('El campo "requirement" es obligatorio y debe ser un texto válido.');
  }

  if (!userId) {
    throw new Error('El campo "userId" es obligatorio.');
  }

  const result = await openAIService.analyzeRequirement(requirement, userId);

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Error al analizar el requerimiento');
  }

  // Guardar en la base de datos con Prisma
  const analysis = await prisma.analysis.create({
    data: {
      requirement,
      summary: result.data,
      redFlags: [], // Se pueden extraer del análisis posteriormente
      status: AnalysisStatus.COMPLETED,
      userId,
      projectId,
    },
  });

  return {
    message: '✅ Análisis realizado y almacenado con éxito',
    analysis,
    usage: result.usage
  };
}
