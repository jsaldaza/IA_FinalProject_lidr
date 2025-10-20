import { ProjectData } from './project.service';
import { ConversationalAnalysisEntity } from '../types/conversational.types';

export interface FrontendProjectData {
  id: string;
  title: string;
  name?: string; // For compatibility with frontend
  description?: string;
  requirement?: string; // Maps to epicContent or description
  status: string;
  phase?: string; // Maps to currentPhase
  progress: number; // Maps to completeness
  createdAt: Date;
  updatedAt: Date;
}

export interface FrontendProjectsResponse {
  success: boolean;
  data: {
    inProgress: FrontendProjectData[];
    completed: FrontendProjectData[];
  };
}

export interface FrontendProjectStatus {
  id: string;
  title: string;
  description?: string;
  status: string;
  phase?: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  messages?: any[]; // Include if available
}

export class ProjectMapper {

  /**
   * Map ProjectData to FrontendProjectData
   */
  static toFrontendProject(project: ProjectData): FrontendProjectData {
    return {
      id: project.id,
      title: project.title,
      name: project.title, // For frontend compatibility
      description: project.description,
      requirement: project.epicContent || project.description || '',
      status: project.status,
      phase: project.currentPhase,
      progress: project.completeness,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }

  /**
   * Map array of ProjectData to FrontendProjectData array
   */
  static toFrontendProjects(projects: ProjectData[]): FrontendProjectData[] {
    return projects.map(project => this.toFrontendProject(project));
  }

  /**
   * Map ProjectData to FrontendProjectStatus
   */
  static toFrontendProjectStatus(project: ProjectData, messages: any[] = []): FrontendProjectStatus {
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      phase: project.currentPhase,
      progress: project.completeness,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      messages: messages
    };
  }

  /**
   * Map ConversationalAnalysisEntity to ProjectData
   */
  static fromConversationalEntity(entity: ConversationalAnalysisEntity): ProjectData {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      epicContent: entity.epicContent,
      status: entity.status,
      currentPhase: entity.currentPhase,
      completeness: typeof entity.completeness === 'number' ? entity.completeness : entity.completeness.overallScore,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  /**
   * Create frontend response for all projects
   */
  static createFrontendProjectsResponse(
    inProgress: ProjectData[],
    completed: ProjectData[]
  ): FrontendProjectsResponse {
    return {
      success: true,
      data: {
        inProgress: this.toFrontendProjects(inProgress),
        completed: this.toFrontendProjects(completed)
      }
    };
  }

  /**
   * Create frontend response for completed projects
   */
  static createFrontendCompletedResponse(projects: ProjectData[]): { success: boolean; data: { items: FrontendProjectData[] } } {
    return {
      success: true,
      data: {
        items: this.toFrontendProjects(projects)
      }
    };
  }

  /**
   * Create frontend response for project status
   */
  static createFrontendStatusResponse(project: ProjectData, messages: any[] = []): { status: string; data: FrontendProjectStatus } {
    return {
      status: 'success',
      data: this.toFrontendProjectStatus(project, messages)
    };
  }

  /**
   * Create frontend response for single project creation
   */
  static createFrontendCreateResponse(project: ProjectData): { status: string; data: { project: FrontendProjectData } } {
    return {
      status: 'success',
      data: {
        project: this.toFrontendProject(project)
      }
    };
  }

  /**
   * Create frontend response for project update
   */
  static createFrontendUpdateResponse(project: ProjectData): { success: boolean; data: FrontendProjectData } {
    return {
      success: true,
      data: this.toFrontendProject(project)
    };
  }

  /**
   * Create frontend response for project completion
   */
  static createFrontendCompleteResponse(project: ProjectData): { status: string; data: FrontendProjectData } {
    return {
      status: 'success',
      data: this.toFrontendProject(project)
    };
  }

  /**
   * Create error response
   */
  static createErrorResponse(error: string, details?: any): { success: boolean; error: string; details?: any } {
    return {
      success: false,
      error,
      details
    };
  }

  /**
   * Create error response for status endpoints
   */
  static createStatusErrorResponse(error: string, details?: any): { error: string; details?: any } {
    return {
      error,
      details
    };
  }
}

// Export singleton instance
export const projectMapper = new ProjectMapper();