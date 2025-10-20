/**
 * Simple Performance Hooks for State Management
 */

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';

// Project type simplified
export interface SimpleProject {
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

// Custom hooks for performance optimization
export const useProjectFiltering = (
  projects: SimpleProject[],
  filters: { status?: SimpleProject['status']; search?: string }
) => {
  return useMemo(() => {
    let filtered = projects;
    
    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    
    // Apply search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [projects, filters.status, filters.search]);
};

export const useProjectStats = (projects: SimpleProject[]) => {
  return useMemo(() => {
    const stats = {
      total: projects.length,
      DRAFT: 0,
      ACTIVE: 0,
      COMPLETED: 0,
      ARCHIVED: 0
    };
    
    projects.forEach(project => {
      stats[project.status]++;
    });
    
    return stats;
  }, [projects]);
};

export const useProjectActions = (
  onEditProject?: (id: string) => void,
  onDeleteProject?: (id: string) => void,
  onStartChat?: (id: string) => void,
  onViewProject?: (id: string) => void
) => {
  const handleEdit = useCallback((id: string) => {
    onEditProject?.(id);
  }, [onEditProject]);

  const handleDelete = useCallback((id: string) => {
    onDeleteProject?.(id);
  }, [onDeleteProject]);

  const handleStartChat = useCallback((id: string) => {
    onStartChat?.(id);
  }, [onStartChat]);

  const handleView = useCallback((id: string) => {
    onViewProject?.(id);
  }, [onViewProject]);

  return {
    handleEdit,
    handleDelete,
    handleStartChat,
    handleView
  };
};

// Debounce hook for search
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Optimized project list rendering
export const useVirtualizedList = (
  projects: SimpleProject[],
  itemHeight: number = 160,
  containerHeight: number = 600
) => {
  const visibleItemCount = Math.ceil(containerHeight / itemHeight);
  const overscan = 5;
  
  return useMemo(() => ({
    itemCount: projects.length,
    itemHeight,
    visibleItemCount,
    overscan,
    containerHeight
  }), [projects.length, itemHeight, visibleItemCount, containerHeight]);
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;
    
    if (renderTime > 16) { // 60fps threshold
      console.warn(`⚠️ Slow render in ${componentName}: ${renderTime}ms (render #${renderCount.current})`);
    }
    
    startTime.current = endTime;
  });

  return {
    renderCount: renderCount.current,
    logRender: () => console.log(`🔄 ${componentName} rendered ${renderCount.current} times`)
  };
};