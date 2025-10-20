/**
 * Optimized State Management with Normalized Data and Performance Hooks
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types for normalized state
export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  userId: string;
  analysisEnabled?: boolean;
  _count?: {
    analyses: number;
    testCases?: number;
  };
}

export interface AsyncState {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface ProjectsState {
  // Normalized data structure
  entities: Record<string, Project>;
  ids: string[];
  
  // UI state
  selectedId: string | null;
  filters: {
    status?: Project['status'];
    search?: string;
  };
  
  // Async states
  fetchState: AsyncState;
  createState: AsyncState;
  updateState: AsyncState;
  deleteState: AsyncState;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setFilters: (filters: Partial<ProjectsState['filters']>) => void;
  
  // Async action states
  setFetchState: (state: Partial<AsyncState>) => void;
  setCreateState: (state: Partial<AsyncState>) => void;
  setUpdateState: (state: Partial<AsyncState>) => void;
  setDeleteState: (state: Partial<AsyncState>) => void;
  
  // Optimistic updates
  optimisticAdd: (tempProject: Omit<Project, 'id'> & { tempId: string }) => void;
  confirmOptimisticAdd: (tempId: string, realProject: Project) => void;
  revertOptimisticAdd: (tempId: string) => void;
  
  // Cache management
  invalidateCache: () => void;
  isStale: (maxAge?: number) => boolean;
}

// Default async state
const createAsyncState = (): AsyncState => ({
  loading: false,
  error: null,
  lastUpdated: null
});

// Create the optimized projects store
export const useProjectsStore = create<ProjectsState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        entities: {},
        ids: [],
        selectedId: null,
        filters: {},
        
        // Async states
        fetchState: createAsyncState(),
        createState: createAsyncState(),
        updateState: createAsyncState(),
        deleteState: createAsyncState(),
        
        // Basic CRUD actions
        setProjects: (projects) =>
          set((state) => {
            // Normalize the projects data
            state.entities = {};
            state.ids = [];
            
            projects.forEach((project) => {
              state.entities[project.id] = project;
              state.ids.push(project.id);
            });
            
            state.fetchState.loading = false;
            state.fetchState.error = null;
            state.fetchState.lastUpdated = new Date();
          }),

        addProject: (project) =>
          set((state) => {
            if (!state.entities[project.id]) {
              state.entities[project.id] = project;
              state.ids.unshift(project.id); // Add to beginning for newest first
            }
          }),

        updateProject: (id, updates) =>
          set((state) => {
            if (state.entities[id]) {
              Object.assign(state.entities[id], updates);
            }
          }),

        removeProject: (id) =>
          set((state) => {
            delete state.entities[id];
            state.ids = state.ids.filter((projectId) => projectId !== id);
            
            // Clear selection if deleted project was selected
            if (state.selectedId === id) {
              state.selectedId = null;
            }
          }),

        setSelectedId: (id) =>
          set((state) => {
            state.selectedId = id;
          }),

        setFilters: (filters) =>
          set((state) => {
            Object.assign(state.filters, filters);
          }),

        // Async state management
        setFetchState: (newState) =>
          set((state) => {
            Object.assign(state.fetchState, newState);
          }),

        setCreateState: (newState) =>
          set((state) => {
            Object.assign(state.createState, newState);
          }),

        setUpdateState: (newState) =>
          set((state) => {
            Object.assign(state.updateState, newState);
          }),

        setDeleteState: (newState) =>
          set((state) => {
            Object.assign(state.deleteState, newState);
          }),

        // Optimistic updates
        optimisticAdd: (tempProject) =>
          set((state) => {
            const project = {
              ...tempProject,
              id: tempProject.tempId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            state.entities[project.id] = project;
            state.ids.unshift(project.id);
          }),

        confirmOptimisticAdd: (tempId, realProject) =>
          set((state) => {
            // Remove temp project and add real one
            delete state.entities[tempId];
            state.ids = state.ids.filter(id => id !== tempId);
            
            // Add real project
            state.entities[realProject.id] = realProject;
            state.ids.unshift(realProject.id);
          }),

        revertOptimisticAdd: (tempId) =>
          set((state) => {
            delete state.entities[tempId];
            state.ids = state.ids.filter(id => id !== tempId);
          }),

        // Cache management
        invalidateCache: () =>
          set((state) => {
            state.fetchState.lastUpdated = null;
          }),

        isStale: (maxAge = 5 * 60 * 1000) => { // 5 minutes default
          const { lastUpdated } = get().fetchState;
          if (!lastUpdated) return true;
          return Date.now() - lastUpdated.getTime() > maxAge;
        },
      })),
      {
        name: 'projects-store',
        // Only persist essential data, not loading states
        partialize: (state) => ({
          entities: state.entities,
          ids: state.ids,
          selectedId: state.selectedId,
          fetchState: {
            lastUpdated: state.fetchState.lastUpdated,
            loading: false,
            error: null
          }
        }),
      }
    ),
    {
      name: 'projects-store',
    }
  )
);

// Optimized selectors to prevent unnecessary re-renders
export const projectSelectors = {
  // All projects as array (memoized)
  allProjects: () => {
    const { entities, ids } = useProjectsStore.getState();
    return ids.map(id => entities[id]).filter(Boolean);
  },

  // Project by ID
  projectById: (id: string) => {
    const { entities } = useProjectsStore.getState();
    return entities[id] || null;
  },

  // Filtered projects
  filteredProjects: () => {
    const { entities, ids, filters } = useProjectsStore.getState();
    let projects = ids.map(id => entities[id]).filter(Boolean);
    
    // Apply status filter
    if (filters.status) {
      projects = projects.filter(p => p.status === filters.status);
    }
    
    // Apply search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      projects = projects.filter(p => 
        p.title.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
      );
    }
    
    return projects;
  },

  // Projects by status
  projectsByStatus: (status: Project['status']) => {
    const { entities, ids } = useProjectsStore.getState();
    return ids
      .map(id => entities[id])
      .filter(project => project && project.status === status);
  },

  // Project counts
  projectCounts: () => {
    const { entities, ids } = useProjectsStore.getState();
    const counts = {
      total: ids.length,
      DRAFT: 0,
      ACTIVE: 0,
      COMPLETED: 0,
      ARCHIVED: 0
    };
    
    ids.forEach(id => {
      const project = entities[id];
      if (project) {
        counts[project.status]++;
      }
    });
    
    return counts;
  }
};

// Performance hooks for components
export const useOptimizedProjects = () => {
  const projects = useProjectsStore((state) => 
    projectSelectors.filteredProjects()
  );
  const loading = useProjectsStore((state) => state.fetchState.loading);
  const error = useProjectsStore((state) => state.fetchState.error);
  
  return { projects, loading, error };
};

export const useProjectById = (id: string | null) => {
  return useProjectsStore((state) => 
    id ? state.entities[id] || null : null
  );
};

export const useProjectCounts = () => {
  return useProjectsStore(() => projectSelectors.projectCounts());
};

// Custom hook for optimistic updates
export const useOptimisticProjects = () => {
  const store = useProjectsStore();
  
  const optimisticCreate = async (
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
    createFn: (data: any) => Promise<Project>
  ) => {
    const tempId = `temp-${Date.now()}`;
    
    try {
      // Optimistic update
      store.optimisticAdd({
        ...projectData,
        tempId,
        userId: 'current-user' // Should come from auth context
      });
      
      // Actual API call
      const realProject = await createFn(projectData);
      
      // Confirm optimistic update
      store.confirmOptimisticAdd(tempId, realProject);
      
      return realProject;
    } catch (error) {
      // Revert optimistic update
      store.revertOptimisticAdd(tempId);
      throw error;
    }
  };
  
  return { optimisticCreate };
};