import { conversationalDatabaseService } from './conversational/database.service';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../utils/error-handler';

export interface ProjectData {
  id: string;
  title: string;
  description?: string;
  epicContent?: string;
  status: string;
  currentPhase?: string;
  completeness: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectData {
  title: string;
  description?: string;
  epicContent?: string;
}

export interface UpdateProjectData {
  title?: string;
  description?: string;
  epicContent?: string;
}

export class ProjectService {

  /**
   * Create a new project (draft)
   */
  async createProject(userId: string, data: CreateProjectData): Promise<ProjectData> {
    // Create analysis as draft with empty description
    const analysis = await conversationalDatabaseService.createAnalysis({
      title: data.title,
      description: data.description || '',
      epicContent: data.epicContent || '',
      userId
    });

    return {
      id: analysis.id,
      title: analysis.title,
      description: analysis.description,
      epicContent: analysis.epicContent,
      status: analysis.status,
      currentPhase: analysis.currentPhase,
      completeness: typeof analysis.completeness === 'number' ? analysis.completeness : analysis.completeness.overallScore,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt
    };
  }

  /**
   * Get project by ID and user ID
   */
  async getProjectById(id: string, userId: string): Promise<ProjectData | null> {
    const project = await prisma.conversationalAnalysis.findFirst({
      where: {
        id,
        userId
      },
      select: {
        id: true,
        title: true,
        description: true,
        epicContent: true,
        currentPhase: true,
        status: true,
        completeness: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return project ? {
      id: project.id,
      title: project.title,
      description: project.description,
      epicContent: project.epicContent,
      status: project.status,
      currentPhase: project.currentPhase,
      completeness: project.completeness,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    } : null;
  }

  /**
   * Update project fields
   */
  async updateProject(id: string, userId: string, updates: UpdateProjectData): Promise<ProjectData> {
    // Verify project exists and belongs to user
    const existing = await this.getProjectById(id, userId);
    if (!existing) {
      throw new NotFoundError('Project');
    }

    // Build update data
    const updateData: Partial<UpdateProjectData> = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.epicContent !== undefined) updateData.epicContent = updates.epicContent;

    // Update via Prisma
    const result = await prisma.conversationalAnalysis.update({
      where: { id },
      data: updateData
    });

    return {
      id: result.id,
      title: result.title,
      description: result.description,
      epicContent: result.epicContent,
      status: result.status,
      currentPhase: result.currentPhase,
      completeness: result.completeness,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    };
  }

  /**
   * Delete project
   */
  async deleteProject(id: string, userId: string): Promise<void> {
    // Verify project exists and belongs to user
    const existing = await this.getProjectById(id, userId);
    if (!existing) {
      throw new NotFoundError('Project');
    }

    // Delete the project
    await prisma.conversationalAnalysis.delete({
      where: { id }
    });
  }

  /**
   * Get projects in progress for user
   */
  async getProjectsInProgress(userId: string, limit: number = 20): Promise<ProjectData[]> {
    const projects = await prisma.conversationalAnalysis.findMany({
      where: {
        userId,
        status: {
          in: ['IN_PROGRESS']
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        epicContent: true,
        currentPhase: true,
        status: true,
        completeness: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit
    });

    return projects.map(project => ({
      id: project.id,
      title: project.title,
      description: project.description,
      epicContent: project.epicContent,
      status: project.status,
      currentPhase: project.currentPhase,
      completeness: project.completeness,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }));
  }

  /**
   * Get completed projects for user
   */
  async getCompletedProjects(userId: string, limit: number = 20): Promise<ProjectData[]> {
    const projects = await prisma.conversationalAnalysis.findMany({
      where: {
        userId,
        status: 'COMPLETED'
      },
      select: {
        id: true,
        title: true,
        description: true,
        epicContent: true,
        currentPhase: true,
        status: true,
        completeness: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit
    });

    return projects.map(project => ({
      id: project.id,
      title: project.title,
      description: project.description,
      epicContent: project.epicContent,
      status: project.status,
      currentPhase: project.currentPhase,
      completeness: project.completeness,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }));
  }

  /**
   * Complete a project
   */
  async completeProject(id: string, userId: string): Promise<ProjectData> {
    const updatedProject = await prisma.conversationalAnalysis.update({
      where: {
        id,
        userId
      },
      data: {
        status: 'COMPLETED',
        completeness: 100,
        currentPhase: 'COMPLETED'
      }
    });

    return {
      id: updatedProject.id,
      title: updatedProject.title,
      description: updatedProject.description,
      epicContent: updatedProject.epicContent,
      status: updatedProject.status,
      currentPhase: updatedProject.currentPhase,
      completeness: updatedProject.completeness,
      createdAt: updatedProject.createdAt,
      updatedAt: updatedProject.updatedAt
    };
  }
}

// Export singleton instance
export const projectService = new ProjectService();