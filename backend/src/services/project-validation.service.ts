/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export const createProjectSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200, 'El título no puede exceder 200 caracteres'),
  description: z.string().max(2000, 'La descripción no puede exceder 2000 caracteres').optional(),
  epicContent: z.string().max(5000, 'El contenido épico no puede exceder 5000 caracteres').optional()
});

export const updateProjectSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200, 'El título no puede exceder 200 caracteres').optional(),
  description: z.string().max(2000, 'La descripción no puede exceder 2000 caracteres').optional(),
  epicContent: z.string().max(5000, 'El contenido épico no puede exceder 5000 caracteres').optional()
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'El contenido del mensaje no puede estar vacío').max(10000, 'El mensaje no puede exceder 10000 caracteres').optional(),
  instruction: z.string().min(1, 'La instrucción no puede estar vacía').max(5000, 'La instrucción no puede exceder 5000 caracteres').optional(),
  requirement: z.string().max(5000, 'El requerimiento no puede exceder 5000 caracteres').optional()
}).refine(data => data.content || data.instruction, {
  message: 'Debe proporcionar contenido o instrucción'
});

export class ProjectValidationService {

  /**
   * Validate create project data
   */
  validateCreateProject(data: any): ValidationResult<z.infer<typeof createProjectSchema>> {
    try {
      const validatedData = createProjectSchema.parse(data);
      return {
        success: true,
        data: validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors
        };
      }
      return {
        success: false,
        error: 'Error de validación desconocido',
        details: error
      };
    }
  }

  /**
   * Validate update project data
   */
  validateUpdateProject(data: any): ValidationResult<z.infer<typeof updateProjectSchema>> {
    try {
      const validatedData = updateProjectSchema.parse(data);
      return {
        success: true,
        data: validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors
        };
      }
      return {
        success: false,
        error: 'Error de validación desconocido',
        details: error
      };
    }
  }

  /**
   * Validate send message data
   */
  validateSendMessage(data: any): ValidationResult<z.infer<typeof sendMessageSchema>> {
    try {
      const validatedData = sendMessageSchema.parse(data);
      return {
        success: true,
        data: validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors
        };
      }
      return {
        success: false,
        error: 'Error de validación desconocido',
        details: error
      };
    }
  }

  /**
   * Validate project title
   */
  validateProjectTitle(title: string): ValidationResult<string> {
    if (!title || title.trim().length < 3) {
      return {
        success: false,
        error: 'El título debe tener al menos 3 caracteres'
      };
    }

    if (title.length > 200) {
      return {
        success: false,
        error: 'El título no puede exceder 200 caracteres'
      };
    }

    return {
      success: true,
      data: title.trim()
    };
  }

  /**
   * Validate project ID format
   */
  validateProjectId(id: string): ValidationResult<string> {
    if (!id || typeof id !== 'string') {
      return {
        success: false,
        error: 'ID de proyecto inválido'
      };
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return {
        success: false,
        error: 'Formato de ID de proyecto inválido'
      };
    }

    return {
      success: true,
      data: id
    };
  }

  /**
   * Validate user ID
   */
  validateUserId(userId: any): ValidationResult<string> {
    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        error: 'Usuario no autenticado'
      };
    }

    return {
      success: true,
      data: userId
    };
  }
}

// Export singleton instance
export const projectValidationService = new ProjectValidationService();