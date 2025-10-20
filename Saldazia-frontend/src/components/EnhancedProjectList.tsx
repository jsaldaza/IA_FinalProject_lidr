/**
 * Enhanced Project List Component with Performance Optimizations
 * Integrates SimpleOptimizedProjectCard with performance hooks
 */

import React, { useState, useMemo } from 'react';
import {
  VStack,
  HStack,
  Input,
  Select,
  Box,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  InputGroup,
  InputLeftElement,
  Button,
  Badge,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon } from '@chakra-ui/icons';
// Import our components and hooks
import { SimpleOptimizedProjectCard } from './SimpleOptimizedProjectCard';
import { 
  useProjectFiltering, 
  useProjectStats, 
  useProjectActions,
  useDebounce,
  usePerformanceMonitor 
} from '../hooks/usePerformanceHooks';
import type { SimpleProject } from '../hooks/usePerformanceHooks';

interface EnhancedProjectListProps {
  projects: SimpleProject[];
  loading?: boolean;
  error?: string;
  onEditProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onStartChat?: (id: string) => void;
  onViewProject?: (id: string) => void;
  onCreateProject?: () => void;
}

// Removed unused constants for now (can be added back when virtualization is needed)

export const EnhancedProjectList: React.FC<EnhancedProjectListProps> = ({
  projects,
  loading = false,
  error,
  onEditProject,
  onDeleteProject,
  onStartChat,
  onViewProject,
  onCreateProject,
}) => {
  // Performance monitoring
  usePerformanceMonitor('EnhancedProjectList');

  // Local state for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SimpleProject['status'] | ''>('');
  
  // Debounced search for better performance
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Memoized filters object
  const filters = useMemo(() => ({
    search: debouncedSearch,
    status: statusFilter || undefined,
  }), [debouncedSearch, statusFilter]);

  // Use our custom hooks
  const filteredProjects = useProjectFiltering(projects, filters);
  const projectStats = useProjectStats(projects);
  const projectActions = useProjectActions(
    onEditProject,
    onDeleteProject,
    onStartChat,
    onViewProject
  );

  // Color mode values (moved before early returns)
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const inputBgColor = useColorModeValue('white', 'gray.700');

  // VirtualizedRow removed for now - can be added back when react-window is properly configured

  // Loading state
  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4} fontSize="lg" color="gray.600">
          Cargando proyectos...
        </Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Text>{error}</Text>
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch" bg={bgColor} borderRadius="lg" p={6} border="1px" borderColor={borderColor}>
      {/* Header with stats */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
        <VStack align="start" spacing={1}>
          <Text fontSize="2xl" fontWeight="bold">
            Mis Proyectos
          </Text>
          <HStack spacing={4}>
            <Badge colorScheme="blue" variant="subtle">
              Total: {projectStats.total}
            </Badge>
            <Badge colorScheme="green" variant="subtle">
              Activos: {projectStats.ACTIVE}
            </Badge>
            <Badge colorScheme="orange" variant="subtle">
              Borradores: {projectStats.DRAFT}
            </Badge>
            <Badge colorScheme="purple" variant="subtle">
              Completados: {projectStats.COMPLETED}
            </Badge>
          </HStack>
        </VStack>
        
        {onCreateProject && (
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={onCreateProject}
            size="md"
          >
            Nuevo Proyecto
          </Button>
        )}
      </Flex>

      {/* Filters */}
      <HStack spacing={4} wrap="wrap">
        <InputGroup flex="1" minW="200px">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Buscar proyectos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            bg={inputBgColor}
          />
        </InputGroup>
        
        <Select
          placeholder="Todos los estados"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SimpleProject['status'] | '')}
          maxW="200px"
          bg={inputBgColor}
        >
          <option value="DRAFT">Borrador</option>
          <option value="ACTIVE">Activo</option>
          <option value="COMPLETED">Completado</option>
          <option value="ARCHIVED">Archivado</option>
        </Select>
      </HStack>

      {/* Results info */}
      <Text fontSize="sm" color="gray.600">
        {filteredProjects.length > 0 
          ? `Mostrando ${filteredProjects.length} de ${projects.length} proyectos`
          : 'No se encontraron proyectos'
        }
      </Text>

      {/* Project list */}
      {filteredProjects.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Text fontSize="lg" color="gray.500">
            {projects.length === 0 
              ? '¡Crea tu primer proyecto para comenzar!' 
              : 'No hay proyectos que coincidan con tu búsqueda'
            }
          </Text>
        </Box>
      ) : (
        // Regular list for smaller datasets
        <VStack spacing={4} align="stretch">
          {filteredProjects.map((project) => (
            <SimpleOptimizedProjectCard
              key={project.id}
              project={project}
              onEdit={projectActions.handleEdit}
              onDelete={projectActions.handleDelete}
              onStartChat={projectActions.handleStartChat}
              onView={projectActions.handleView}
            />
          ))}
        </VStack>
      )}
    </VStack>
  );
};

export default EnhancedProjectList;