/**
 * Simplified Optimized Project Card - Version 2.0
 * Fixed version with better performance and no external dependencies issues
 */

import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Text,
  Badge,
  Button,
  ButtonGroup,
  Skeleton,
  useColorModeValue,
  HStack,
  VStack,
  Tooltip,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { 
  FiEdit2, 
  FiTrash2, 
  FiMessageCircle, 
  FiMoreVertical,
  FiClock,
  FiActivity
} from 'react-icons/fi';

// Simple date formatting without external dependencies
const formatTimeAgo = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'hace un momento';
  } catch {
    return 'fecha inválida';
  }
};

// Types
export interface SimpleProjectCardProps {
  project: {
    id: string;
    title: string;
    description?: string;
    status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
    createdAt: string;
    updatedAt: string;
    userId?: string;
    analysisEnabled?: boolean;
    _count?: {
      analyses: number;
      testCases?: number;
    };
  };
  onEdit?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
  onStartChat?: (projectId: string) => void;
  onView?: (projectId: string) => void;
  isLoading?: boolean;
  compact?: boolean;
}

// Status configuration
const STATUS_CONFIG = {
  DRAFT: { color: 'gray', label: 'Borrador' },
  ACTIVE: { color: 'blue', label: 'Activo' },
  COMPLETED: { color: 'green', label: 'Completado' },
  ARCHIVED: { color: 'orange', label: 'Archivado' }
} as const;

// Memoized status badge
const StatusBadge = React.memo<{ status: SimpleProjectCardProps['project']['status'] }>(({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <Badge colorScheme={config.color} variant="subtle" size="sm">
      {config.label}
    </Badge>
  );
});
StatusBadge.displayName = 'StatusBadge';

// Memoized stats component
const ProjectStats = React.memo<{ 
  analysisCount: number; 
  testCaseCount?: number;
  compact?: boolean;
}>(({ analysisCount, testCaseCount, compact }) => {
  if (compact) return null;
  
  return (
    <HStack spacing={4} fontSize="xs" color="gray.500">
      <HStack spacing={1}>
        <FiActivity size={12} />
        <Text>{analysisCount} análisis</Text>
      </HStack>
      {testCaseCount !== undefined && (
        <HStack spacing={1}>
          <Text>{testCaseCount} casos de prueba</Text>
        </HStack>
      )}
    </HStack>
  );
});
ProjectStats.displayName = 'ProjectStats';

// Action buttons component
const ActionButtons = React.memo<{
  projectId: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onStartChat?: (id: string) => void;
  onView?: (id: string) => void;
  compact?: boolean;
}>(({ projectId, onEdit, onDelete, onStartChat, onView, compact }) => {
  const handleEdit = useCallback(() => onEdit?.(projectId), [onEdit, projectId]);
  const handleDelete = useCallback(() => onDelete?.(projectId), [onDelete, projectId]);
  const handleStartChat = useCallback(() => onStartChat?.(projectId), [onStartChat, projectId]);
  const handleView = useCallback(() => onView?.(projectId), [onView, projectId]);

  if (compact) {
    return (
      <Menu>
        <MenuButton
          as={IconButton}
          icon={<FiMoreVertical />}
          size="sm"
          variant="ghost"
          aria-label="Acciones del proyecto"
        />
        <MenuList fontSize="sm">
          {onView && (
            <MenuItem icon={<FiActivity />} onClick={handleView}>
              Ver detalles
            </MenuItem>
          )}
          {onStartChat && (
            <MenuItem icon={<FiMessageCircle />} onClick={handleStartChat}>
              Iniciar chat
            </MenuItem>
          )}
          {onEdit && (
            <MenuItem icon={<FiEdit2 />} onClick={handleEdit}>
              Editar
            </MenuItem>
          )}
          {onDelete && (
            <MenuItem icon={<FiTrash2 />} onClick={handleDelete} color="red.500">
              Eliminar
            </MenuItem>
          )}
        </MenuList>
      </Menu>
    );
  }

  return (
    <ButtonGroup size="sm" variant="ghost">
      {onView && (
        <Tooltip label="Ver detalles">
          <IconButton
            aria-label="Ver proyecto"
            icon={<FiActivity />}
            onClick={handleView}
          />
        </Tooltip>
      )}
      {onStartChat && (
        <Tooltip label="Iniciar chat de análisis">
          <IconButton
            aria-label="Chat de análisis"
            icon={<FiMessageCircle />}
            onClick={handleStartChat}
            colorScheme="blue"
          />
        </Tooltip>
      )}
      {onEdit && (
        <Tooltip label="Editar proyecto">
          <IconButton
            aria-label="Editar proyecto"
            icon={<FiEdit2 />}
            onClick={handleEdit}
          />
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip label="Eliminar proyecto">
          <IconButton
            aria-label="Eliminar proyecto"
            icon={<FiTrash2 />}
            onClick={handleDelete}
            colorScheme="red"
          />
        </Tooltip>
      )}
    </ButtonGroup>
  );
});
ActionButtons.displayName = 'ActionButtons';

// Loading skeleton
const ProjectCardSkeleton = React.memo<{ compact?: boolean }>(({ compact }) => (
  <Card>
    <CardHeader pb={compact ? 2 : 4}>
      <HStack justify="space-between">
        <VStack align="start" spacing={2} flex={1}>
          <Skeleton height="16px" width="60%" />
          <Skeleton height="12px" width="40%" />
        </VStack>
        <Skeleton height="24px" width="80px" />
      </HStack>
    </CardHeader>
    {!compact && (
      <CardBody pt={0}>
        <VStack spacing={2} align="start">
          <Skeleton height="12px" width="100%" />
          <Skeleton height="12px" width="80%" />
          <Skeleton height="20px" width="150px" />
        </VStack>
      </CardBody>
    )}
  </Card>
));
ProjectCardSkeleton.displayName = 'ProjectCardSkeleton';

// Main optimized project card component
export const SimpleOptimizedProjectCard = React.memo<SimpleProjectCardProps>(({
  project,
  onEdit,
  onDelete,
  onStartChat,
  onView,
  isLoading = false,
  compact = false
}) => {
  // Theme colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Memoized computations
  const formattedDate = useMemo(() => 
    formatTimeAgo(project.updatedAt), 
    [project.updatedAt]
  );

  const analysisCount = useMemo(() => 
    project._count?.analyses || 0, 
    [project._count?.analyses]
  );

  const testCaseCount = useMemo(() => 
    project._count?.testCases, 
    [project._count?.testCases]
  );

  const truncatedDescription = useMemo(() => {
    if (!project.description) return null;
    return project.description.length > 100 
      ? `${project.description.substring(0, 100)}...` 
      : project.description;
  }, [project.description]);

  // Handle click to view project
  const handleCardClick = useCallback(() => {
    if (onView) {
      onView(project.id);
    }
  }, [onView, project.id]);

  // Show loading skeleton
  if (isLoading) {
    return <ProjectCardSkeleton compact={compact} />;
  }

  return (
    <Card
      bg={cardBg}
      borderColor={borderColor}
      borderWidth={1}
      shadow="sm"
      _hover={{ shadow: 'md', transform: 'translateY(-1px)' }}
      transition="all 0.2s ease"
      cursor={onView ? "pointer" : "default"}
      onClick={onView ? handleCardClick : undefined}
    >
      <CardHeader pb={compact ? 2 : 4}>
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={1} flex={1} minW={0}>
            <HStack spacing={2} width="100%">
              <Text 
                fontWeight="semibold" 
                fontSize={compact ? "sm" : "md"}
                noOfLines={1}
                flex={1}
              >
                {project.title}
              </Text>
              <StatusBadge status={project.status} />
            </HStack>
            
            <HStack spacing={2} fontSize="xs" color="gray.500">
              <HStack spacing={1}>
                <FiClock size={12} />
                <Text>{formattedDate}</Text>
              </HStack>
              {project.analysisEnabled && (
                <Badge size="xs" colorScheme="purple" variant="outline">
                  IA
                </Badge>
              )}
            </HStack>
          </VStack>
          
          <Box onClick={(e) => e.stopPropagation()}>
            <ActionButtons
              projectId={project.id}
              onEdit={onEdit}
              onDelete={onDelete}
              onStartChat={onStartChat}
              onView={onView}
              compact={compact}
            />
          </Box>
        </HStack>
      </CardHeader>

      {!compact && (
        <CardBody pt={0}>
          <VStack spacing={3} align="start">
            {truncatedDescription && (
              <Text fontSize="sm" color="gray.600" noOfLines={2}>
                {truncatedDescription}
              </Text>
            )}
            
            <ProjectStats
              analysisCount={analysisCount}
              testCaseCount={testCaseCount}
              compact={compact}
            />
          </VStack>
        </CardBody>
      )}
    </Card>
  );
}, (prevProps, nextProps) => {
  // Optimized comparison function
  return (
    prevProps.project.id === nextProps.project.id &&
    prevProps.project.title === nextProps.project.title &&
    prevProps.project.status === nextProps.project.status &&
    prevProps.project.updatedAt === nextProps.project.updatedAt &&
    prevProps.project.description === nextProps.project.description &&
    prevProps.project._count?.analyses === nextProps.project._count?.analyses &&
    prevProps.project._count?.testCases === nextProps.project._count?.testCases &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.compact === nextProps.compact
  );
});

SimpleOptimizedProjectCard.displayName = 'SimpleOptimizedProjectCard';

export default SimpleOptimizedProjectCard;