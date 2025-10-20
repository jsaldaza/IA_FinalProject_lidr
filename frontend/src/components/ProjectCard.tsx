import { memo, useMemo, useCallback } from 'react';
import {
    Card,
    CardBody,
    Badge,
    HStack,
    VStack,
    Text,
    Heading,
    Icon,
    Progress,
    IconButton,
    Button
} from '@chakra-ui/react';
import { FiFolder, FiCalendar, FiPlay, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import type { Analysis } from '../types/api';

interface ProjectCardProps {
    project: Analysis;
    onProjectClick: (analysis: Analysis) => void;
    onDeleteProject: (analysis: Analysis) => void;
    getStatusColor: (status: string) => string;
    getStatusText: (status: string) => string;
    getProgressValue: (status: string, completeness?: number) => number;
}

const ProjectCard = memo(({
    project,
    onProjectClick,
    onDeleteProject,
    getStatusColor,
    getStatusText,
    getProgressValue
}: ProjectCardProps) => {
    const statusColorScheme = useMemo(() => getStatusColor(project.status), [project.status, getStatusColor]);
    const statusText = useMemo(() => getStatusText(project.status), [project.status, getStatusText]);
    const progress = useMemo(() => getProgressValue(project.status, 50), [project.status, getProgressValue]);
    
    const handleClick = useCallback(() => {
        onProjectClick(project);
    }, [onProjectClick, project]);
    
    const handleDeleteClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onDeleteProject(project);
    }, [onDeleteProject, project]);
    
    const handleActionClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onProjectClick(project);
    }, [onProjectClick, project]);

    const isInProgress = useMemo(() => 
        project.status?.toLowerCase() === 'in_progress' ||
        project.status?.toLowerCase() === 'ready_to_advance'
    , [project.status]);

    const formattedCreatedDate = useMemo(() => 
        new Date(project.createdAt).toLocaleDateString('es-ES')
    , [project.createdAt]);

    const formattedUpdatedDate = useMemo(() => 
        new Date(project.updatedAt || project.createdAt).toLocaleDateString('es-ES')
    , [project.updatedAt, project.createdAt]);

    const actionButton = useMemo(() => {
        if (isInProgress) {
            return (
                <Button
                    size="sm"
                    colorScheme="blue"
                    leftIcon={<FiPlay />}
                    onClick={handleActionClick}
                >
                    Continuar
                </Button>
            );
        } else {
            return (
                <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<FiCheckCircle />}
                    onClick={handleActionClick}
                >
                    Ver Análisis
                </Button>
            );
        }
    }, [isInProgress, handleActionClick]);

    return (
        <Card
            bg="white"
            borderColor="gray.200"
            borderWidth="1px"
            cursor="pointer"
            _hover={{
                borderColor: `${statusColorScheme}.300`,
                transform: 'translateY(-2px)',
                boxShadow: 'lg'
            }}
            transition="all 0.2s"
            onClick={handleClick}
            borderRadius="xl"
            overflow="hidden"
            borderTop="4px solid"
            borderTopColor={`${statusColorScheme}.400`}
            height="200px"
        >
            <CardBody p={6}>
                <HStack spacing={6} align="center">
                    <VStack align="start" spacing={2} flex="1">
                        <HStack spacing={3} align="center" w="full">
                            <HStack spacing={2}>
                                <Icon as={FiFolder} color={`${statusColorScheme}.500`} boxSize={4} />
                                <Heading size="sm" color="gray.800">
                                    {project.title || project.name}
                                </Heading>
                            </HStack>
                            <Badge
                                colorScheme={statusColorScheme}
                                variant="solid"
                                px={3}
                                py={1}
                                borderRadius="full"
                                fontSize="xs"
                                fontWeight="bold"
                            >
                                {statusText}
                            </Badge>
                            {project.hasTestCases && (
                                <Badge
                                    colorScheme="purple"
                                    variant="subtle"
                                    px={3}
                                    py={1}
                                    borderRadius="full"
                                    fontSize="xs"
                                    fontWeight="bold"
                                >
                                    Con Casos IA
                                </Badge>
                            )}
                        </HStack>
                        <HStack spacing={4} fontSize="xs" color="gray.500">
                            <Text>Progreso: {Math.round(progress)}%</Text>
                            <HStack spacing={2}>
                                <Icon as={FiCalendar} />
                                <Text>Iniciado: {formattedCreatedDate}</Text>
                            </HStack>
                        </HStack>
                    </VStack>
                    
                    <VStack spacing={2} minW="250px" align="end">
                        <HStack spacing={2} w="full">
                            <Progress
                                value={progress}
                                colorScheme={statusColorScheme}
                                size="md"
                                borderRadius="full"
                                bg="gray.100"
                                flex="1"
                            />
                            <Text fontSize="sm" fontWeight="bold" color="gray.700" minW="35px">
                                {Math.round(progress)}%
                            </Text>
                        </HStack>
                        <HStack spacing={2}>
                            {actionButton}
                            <IconButton
                                size="sm"
                                colorScheme="red"
                                variant="outline"
                                aria-label="Eliminar proyecto"
                                icon={<FiTrash2 />}
                                onClick={handleDeleteClick}
                            />
                            <Text fontSize="xs" color="gray.500">
                                {formattedUpdatedDate}
                            </Text>
                        </HStack>
                    </VStack>
                </HStack>
            </CardBody>
        </Card>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
        prevProps.project.id === nextProps.project.id &&
        prevProps.project.updatedAt === nextProps.project.updatedAt &&
        prevProps.project.status === nextProps.project.status &&
        prevProps.project.hasTestCases === nextProps.project.hasTestCases
    );
});

ProjectCard.displayName = 'ProjectCard';

export default ProjectCard;