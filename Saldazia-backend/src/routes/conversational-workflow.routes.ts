import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { conversationalWorkflowController } from '../controllers/conversational-workflow.controller';
const { StructuredLogger } = require('../utils/structured-logger');

StructuredLogger.info('Loading conversational-workflow.routes');

const router = Router();

StructuredLogger.debug('conversational-workflow.routes initialized');

// All routes require authentication
router.use(authenticate);

// User workflows - nuevas rutas para separar por estado
router.get('/user/in-progress', conversationalWorkflowController.getUserInProgressWorkflows.bind(conversationalWorkflowController));
router.get('/user/completed', conversationalWorkflowController.getUserCompletedWorkflows.bind(conversationalWorkflowController));

// Workflow management
router.post('/', conversationalWorkflowController.createWorkflow.bind(conversationalWorkflowController));
router.post('/create-and-start', conversationalWorkflowController.createAndStartWorkflow.bind(conversationalWorkflowController));
router.get('/:id/status', conversationalWorkflowController.getAnalysisStatus.bind(conversationalWorkflowController));

// Chat interaction
router.post('/:id/chat', conversationalWorkflowController.sendMessage.bind(conversationalWorkflowController));

// Analysis summit endpoints (get/create/update final IA summary)
router.get('/:id/summit', conversationalWorkflowController.getAnalysisSummit.bind(conversationalWorkflowController));
router.post('/:id/summit', conversationalWorkflowController.createAnalysisSummit.bind(conversationalWorkflowController));
router.patch('/:id/summit', conversationalWorkflowController.updateAnalysisSummit.bind(conversationalWorkflowController));

// Phase management
// Removed unused phase management endpoints: submit, advance, reopen

StructuredLogger.info('conversational-workflow routes configured');

export { router };

