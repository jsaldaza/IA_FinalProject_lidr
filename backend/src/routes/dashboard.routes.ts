import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { DashboardController } from '../controllers/dashboard.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { DashboardSchemas } from '../validations/dashboard.validation';

const router = express.Router();

/**
 * Rutas del Dashboard - REFACTORIZADAS CON CONTROLADORES
 * Todos los endpoints requieren autenticación
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Obtener estadísticas del dashboard
 *     description: Retorna estadísticas generales del usuario como número de proyectos, tests, etc.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *         description: Período de tiempo para las estadísticas
 *     responses:
 *       200:
 *         description: Estadísticas del dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     projectsCount:
 *                       type: number
 *                       description: Número total de proyectos
 *                     completedProjects:
 *                       type: number
 *                       description: Proyectos completados
 *                     inProgressProjects:
 *                       type: number
 *                       description: Proyectos en progreso
 *                     testCasesCount:
 *                       type: number
 *                       description: Número total de casos de prueba
 *                     aiUsage:
 *                       type: object
 *                       properties:
 *                         totalTokens:
 *                           type: number
 *                         estimatedCost:
 *                           type: number
 *       401:
 *         description: No autenticado
 */
router.get(
  '/stats',
  authenticate,
  validateRequest({ query: DashboardSchemas.getStats.shape.query }),
  DashboardController.getStats
);

/**
 * @swagger
 * /api/dashboard/activity:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Obtener actividad reciente del usuario
 *     description: Retorna la actividad reciente del usuario en la plataforma
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Número máximo de actividades a retornar
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [project_created, analysis_completed, test_generated]
 *         description: Filtrar por tipo de actividad
 *     responses:
 *       200:
 *         description: Lista de actividades recientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       type:
 *                         type: string
 *                         description: Tipo de actividad
 *                       description:
 *                         type: string
 *                         description: Descripción de la actividad
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       metadata:
 *                         type: object
 *                         description: Datos adicionales de la actividad
 *       401:
 *         description: No autenticado
 */
router.get(
  '/activity',
  authenticate,
  validateRequest({ query: DashboardSchemas.getActivity.shape.query }),
  DashboardController.getActivity
);

export { router };
