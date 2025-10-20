import { conversationalDatabaseService } from './conversational/database.service';
import { ConversationalWorkflowService } from './conversational/workflow.service';
import { ConversationalAnalysisEntity } from '../types/conversational.types';

export interface StartConversationData {
  title: string;
  description?: string;
  epicContent?: string;
}

export interface SendMessageData {
  content: string;
  instruction?: string;
  requirement?: string;
}

export interface ConversationResult {
  analysis: ConversationalAnalysisEntity;
  alreadyStarted?: boolean;
}

export class ConversationalService {
  private workflowService: ConversationalWorkflowService;

  constructor() {
    this.workflowService = new ConversationalWorkflowService();
  }

  /**
   * Start a new conversation for a project
   */
  async startConversation(userId: string, data: StartConversationData): Promise<ConversationalAnalysisEntity> {
    const title = data.title;
    const description = data.description || '';
    const epicContent = data.epicContent || description;

    return await this.workflowService.startConversation(userId, title, description, epicContent);
  }

  /**
   * Start conversation on an existing project
   */
  async startConversationOnExisting(projectId: string, userId: string): Promise<ConversationResult> {
    // Check if project exists and belongs to user
    const existing = await conversationalDatabaseService.getAnalysisById(projectId);
    if (!existing) {
      throw new Error('Project not found');
    }

    if (existing.userId !== userId) {
      throw new Error('Access denied');
    }

    // Try to start conversation on existing analysis
    if ((this.workflowService as any).startConversationOnExisting) {
      const result = await (this.workflowService as any).startConversationOnExisting(projectId, userId);
      if ((result as any).analysis) {
        const { analysis, alreadyStarted } = result as any;
        return { analysis, alreadyStarted: !!alreadyStarted };
      }
      // fallback to old behaviour if service returned plain entity
      return { analysis: result };
    }

    // Fallback: restart conversation with existing data
    const analysis = await this.workflowService.startConversation(
      userId,
      existing.title,
      existing.description || '',
      existing.epicContent || existing.description || ''
    );

    return { analysis };
  }

  /**
   * Process a user message in a conversation
   */
  async processMessage(projectId: string, userId: string, data: SendMessageData): Promise<any> {
    // Verify project exists and belongs to user
    const existing = await conversationalDatabaseService.getAnalysisById(projectId);
    if (!existing) {
      throw new Error('Project not found');
    }

    if (existing.userId !== userId) {
      throw new Error('Access denied');
    }

    // Normalize payload: support legacy { content } and new { instruction, requirement }
    let content: string;
    if (data.content) {
      content = data.content;
    } else {
      // Build a concatenated content so existing processing logic continues to work
      content = data.instruction || '';
      if (data.requirement) {
        content += `\n\n---\nRequerimiento editado:\n${data.requirement}`;
      }
    }

    // Process message with conversational workflow
    const response = await this.workflowService.processUserMessage(projectId, content);
    return response;
  }

  /**
   * Get project status with conversation details
   */
  async getProjectStatus(projectId: string, userId: string): Promise<ConversationalAnalysisEntity> {
    // Verify project exists and belongs to user
    const project = await conversationalDatabaseService.getAnalysisById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.userId !== userId) {
      throw new Error('Access denied');
    }

    return project;
  }

  /**
   * Complete a project/conversation
   */
  async completeProject(projectId: string, userId: string): Promise<ConversationalAnalysisEntity> {
    // Verify project exists and belongs to user
    const existing = await conversationalDatabaseService.getAnalysisById(projectId);
    if (!existing) {
      throw new Error('Project not found');
    }

    if (existing.userId !== userId) {
      throw new Error('Access denied');
    }

    // Mark as completed
    return await conversationalDatabaseService.completeAnalysis(projectId);
  }
}

// Export singleton instance
export const conversationalService = new ConversationalService();