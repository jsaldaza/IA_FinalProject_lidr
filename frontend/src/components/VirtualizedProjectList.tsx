/**
 * Virtualized Project List Component for handling large datasets efficiently
 */

import React, { useMemo, useCallback, useState, useRef } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import {
  Box,
  VStack,
  HStack,
  Input,
  Select,
  Button,
  Text,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Badge,
  InputGroup,
  InputLeftElement,
  useColorModeValue,
  Flex,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { FiSearch, FiFilter, FiRefreshCw, FiGrid, FiList } from 'react-icons/fi';
import { OptimizedProjectCard } from './OptimizedProjectCard';
import { useOptimizedProjects, useProjectsStore, Project } from '../stores/optimizedProjectsStore';
import { debounce } from 'lodash-es';

interface VirtualizedProjectListProps {
  onEditProject?: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onStartChat?: (projectId: string) => void;
  onViewProject?: (projectId: string) => void;
  onRefresh?: () => void;
  height?: number;
  itemHeight?: number;
  compact?: boolean;
}

// Individual row component for virtualization
const ProjectRow = React.memo<ListChildComponentProps<Project[]>>(({ 
  index, 
  style, 
  data 
}) => {
  const project = data[index];
  
  if (!project) return null;

  return (
    <div style={style}>
      <Box px={4} py={2}>
        <OptimizedProjectCard
          project={project}
          onEdit={window.projectListCallbacks?.onEdit}
          onDelete={window.projectListCallbacks?.onDelete}
          onStartChat={window.projectListCallbacks?.onStartChat}
          onView={window.projectListCallbacks?.onView}
          compact={window.projectListCallbacks?.compact}
        />
      </Box>
    </div>
  );
});
ProjectRow.displayName = 'ProjectRow';

// Grid item component for grid layout
const ProjectGridItem = React.memo<{
  project: Project;
  callbacks: {
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onStartChat?: (id: string) => void;
    onView?: (id: string) => void;
  };
  compact?: boolean;
}>(({ project, callbacks, compact }) => (
  <OptimizedProjectCard
    project={project}
    onEdit={callbacks.onEdit}
    onDelete={callbacks.onDelete}
    onStartChat={callbacks.onStartChat}
    onView={callbacks.onView}
    compact={compact}
  />
));
ProjectGridItem.displayName = 'ProjectGridItem';

// Status filter options
const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borradores' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'COMPLETED', label: 'Completados' },
  { value: 'ARCHIVED', label: 'Archivados' }
];

// Extend window type for callbacks (temporary solution)
declare global {
  interface Window {
    projectListCallbacks?: {
      onEdit?: (id: string) => void;
      onDelete?: (id: string) => void;
      onStartChat?: (id: string) => void;
      onView?: (id: string) => void;
      compact?: boolean;
    };
  }
}

export const VirtualizedProjectList: React.FC<VirtualizedProjectListProps> = ({
  onEditProject,
  onDeleteProject,
  onStartChat,
  onViewProject,
  onRefresh,
  height = 600,
  itemHeight = 160,
  compact = false
}) => {
  // Store state and actions
  const { projects, loading, error } = useOptimizedProjects();
  const { setFilters, filters } = useProjectsStore();
  
  // Local state
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const listRef = useRef<List>(null);
  
  // Theme colors
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Set callbacks on window for virtualized components
  React.useEffect(() => {
    window.projectListCallbacks = {
      onEdit: onEditProject,
      onDelete: onDeleteProject,
      onStartChat,
      onView: onViewProject,
      compact
    };
    
    return () => {
      delete window.projectListCallbacks;
    };
  }, [onEditProject, onDeleteProject, onStartChat, onViewProject, compact]);

  // Debounced search to prevent too many filter updates
  const debouncedSetSearch = useMemo(
    () => debounce((search: string) => {
      setFilters({ search: search.trim() || undefined });
    }, 300),
    [setFilters]
  );

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSetSearch(value);
  }, [debouncedSetSearch]);

  // Handle status filter change
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as Project['status'] | '';
    setFilters({ status: status || undefined });
  }, [setFilters]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    onRefresh?.();
    // Scroll to top after refresh
    listRef.current?.scrollToItem(0, 'start');
  }, [onRefresh]);

  // Project statistics
  const stats = useMemo(() => {
    const total = projects.length;
    const byStatus = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<Project['status'], number>);
    
    return { total, byStatus };
  }, [projects]);

  // Render loading state
  if (loading && projects.length === 0) {
    return (
      <Center h={height}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Cargando proyectos...</Text>
        </VStack>
      </Center>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Error al cargar proyectos</Text>
          <Text>{error}</Text>
        </Box>
      </Alert>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <Center h={height}>
        <VStack spacing={4}>
          <Text fontSize="lg" color="gray.500">
            {filters.search || filters.status ? 'No hay proyectos que coincidan con los filtros' : 'No hay proyectos aún'}
          </Text>
          {(filters.search || filters.status) && (
            <Button onClick={() => setFilters({})}>
              Limpiar filtros
            </Button>
          )}
        </VStack>
      </Center>
    );
  }

  return (
    <Box bg={bg} borderRadius="md" borderWidth={1} borderColor={borderColor}>
      {/* Header with filters and controls */}
      <VStack spacing={4} p={4} borderBottomWidth={1} borderColor={borderColor}>
        {/* Stats bar */}
        <HStack w="100%" justify="space-between">
          <HStack spacing={4}>
            <Text fontWeight="medium">
              {stats.total} proyecto{stats.total !== 1 ? 's' : ''}
            </Text>
            <HStack spacing={2}>
              {Object.entries(STATUS_OPTIONS.slice(1)).map(([, { value, label }]) => {
                const count = stats.byStatus[value as Project['status']] || 0;
                if (count === 0) return null;
                return (
                  <Badge key={value} variant="outline">
                    {label}: {count}
                  </Badge>
                );
              })}
            </HStack>
          </HStack>
          
          <HStack spacing={2}>
            <Tooltip label="Vista de lista">
              <IconButton
                icon={<FiList />}
                size="sm"
                variant={viewMode === 'list' ? 'solid' : 'outline'}
                onClick={() => setViewMode('list')}
                aria-label="Vista de lista"
              />
            </Tooltip>
            <Tooltip label="Vista de cuadrícula">
              <IconButton
                icon={<FiGrid />}
                size="sm"
                variant={viewMode === 'grid' ? 'solid' : 'outline'}
                onClick={() => setViewMode('grid')}
                aria-label="Vista de cuadrícula"
              />
            </Tooltip>
            <Tooltip label="Actualizar">
              <IconButton
                icon={<FiRefreshCw />}
                size="sm"
                onClick={handleRefresh}
                isLoading={loading}
                aria-label="Actualizar proyectos"
              />
            </Tooltip>
          </HStack>
        </HStack>

        {/* Filters */}
        <HStack w="100%" spacing={4}>
          <InputGroup flex={1}>
            <InputLeftElement>
              <FiSearch />
            </InputLeftElement>
            <Input
              placeholder="Buscar proyectos..."
              value={searchInput}
              onChange={handleSearchChange}
            />
          </InputGroup>
          
          <Select
            icon={<FiFilter />}
            maxW="200px"
            value={filters.status || ''}
            onChange={handleStatusChange}
          >
            {STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </HStack>
      </VStack>

      {/* Project list/grid */}
      <Box h={height - 140}> {/* Subtract header height */}
        {viewMode === 'list' ? (
          // Virtualized list view for large datasets
          <List
            ref={listRef}
            height={height - 140}
            itemCount={projects.length}
            itemSize={itemHeight}
            itemData={projects}
            overscanCount={5}
          >
            {ProjectRow}
          </List>
        ) : (
          // Grid view with responsive columns
          <Box
            p={4}
            h="100%"
            overflowY="auto"
            css={{
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
              },
            }}
          >
            <Flex
              wrap="wrap"
              gap={4}
              justify="flex-start"
            >
              {projects.map((project) => (
                <Box
                  key={project.id}
                  minW={{ base: '100%', md: '300px', lg: '350px' }}
                  maxW={{ base: '100%', md: '350px', lg: '400px' }}
                  flex={{ base: '1 1 100%', md: '1 1 300px', lg: '1 1 350px' }}
                >
                  <ProjectGridItem
                    project={project}
                    callbacks={{
                      onEdit: onEditProject,
                      onDelete: onDeleteProject,
                      onStartChat,
                      onView: onViewProject
                    }}
                    compact={compact}
                  />
                </Box>
              ))}
            </Flex>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default VirtualizedProjectList;