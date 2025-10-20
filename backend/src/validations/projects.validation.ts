import { z } from 'zod';

/**
 * Esquemas de validación para proyectos
 * Centralizados para consistencia y reutilización
 */

// Esquemas base reutilizables
export const CommonSchemas = {
  // MongoDB ObjectId validation instead of UUID
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Debe ser un ObjectId válido'),
  
  pagination: z.object({
    page: z.number().min(1, 'La página debe ser mayor a 0').default(1),
    limit: z.number().min(1, 'El límite debe ser mayor a 0').max(100, 'El límite máximo es 100').default(10),
    offset: z.number().min(0, 'El offset debe ser mayor o igual a 0').optional(),
  }),

  dateRange: z.object({
    startDate: z.string().datetime('Fecha de inicio inválida').optional(),
    endDate: z.string().datetime('Fecha de fin inválida').optional(),
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'La fecha de inicio debe ser anterior a la fecha de fin'
  }),

  projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de proyecto inválido'),
};

// Esquemas para body requests
export const createAndStartBodySchema = z.object({
  title: z.string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(200, 'El título no puede exceder 200 caracteres')
    .trim(),
  
  description: z.string()
    .min(50, 'La descripción debe tener al menos 50 caracteres')
    .max(5000, 'La descripción no puede exceder 5000 caracteres')
    .trim(),
  
  tags: z.array(z.string().trim().min(1)).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

export const createProjectBodySchema = z.object({
  title: z.string()
    .min(1, 'El título es requerido')
    .max(200, 'El título no puede exceder 200 caracteres')
    .trim(),
  
  description: z.string()
    .min(1, 'La descripción es requerida')
    .max(5000, 'La descripción no puede exceder 5000 caracteres')
    .trim(),
  
  // Backward compatibility: aceptar 'name' como alias de 'title'
  name: z.string().optional(),
}).transform(data => {
  // Si se proporciona 'name' pero no 'title', usar 'name' como 'title'
  if (!data.title && data.name) {
    data.title = data.name;
  }
  return data;
});

export const sendMessageBodySchema = z.union([
  // Formato legacy: { content }
  z.object({
    content: z.string()
      .min(1, 'El mensaje no puede estar vacío')
      .max(2000, 'El mensaje no puede exceder 2000 caracteres')
      .trim(),
    messageType: z.string().optional()
  }),
  
  // Formato nuevo: { instruction, requirement }
  z.object({
    instruction: z.string()
      .min(1, 'La instrucción no puede estar vacía')
      .max(1000, 'La instrucción no puede exceder 1000 caracteres')
      .trim(),
    requirement: z.string()
      .max(5000, 'El requerimiento no puede exceder 5000 caracteres')
      .trim()
      .optional(),
    messageType: z.string().optional()
  })
]);

export const projectIdParamsSchema = z.object({
  id: CommonSchemas.projectId
});

export const updateAnalysisBodySchema = z.object({
  analysis: z.string()
    .min(1, 'El análisis no puede estar vacío')
    .max(50000, 'El análisis no puede exceder 50000 caracteres')
    .trim()
});

export const restartChatBodySchema = z.object({
  analysis: z.string()
    .min(1, 'El análisis no puede estar vacío')
    .max(50000, 'El análisis no puede exceder 50000 caracteres')
    .trim()
});

// Esquemas agrupados para uso en middleware
export const ProjectValidation = {
  createAndStart: {
    body: createAndStartBodySchema
  },
  createProject: {
    body: createProjectBodySchema
  },
  sendMessage: {
    body: sendMessageBodySchema,
    params: projectIdParamsSchema
  },
  projectId: {
    params: projectIdParamsSchema
  },
  updateAnalysis: {
    body: updateAnalysisBodySchema,
    params: projectIdParamsSchema
  },
  restartChat: {
    body: restartChatBodySchema,
    params: projectIdParamsSchema
  },
};

// Tipos TypeScript derivados de los esquemas
export type CreateAndStartBody = z.infer<typeof createAndStartBodySchema>;
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;
export type ProjectIdParams = z.infer<typeof projectIdParamsSchema>;
export type UpdateAnalysisBody = z.infer<typeof updateAnalysisBodySchema>;
export type RestartChatBody = z.infer<typeof restartChatBodySchema>;
