import {
    Box,
    Heading,
    Text,
    Button,
    VStack,
    HStack,
    Badge,
    useColorModeValue
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';
import { useApiQuery, useApiMutation } from '../hooks/useApi';
import Loading from '../components/Loading';
import Error from '../components/Error';

export default function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const safeId = id || '';
    const { data, isLoading, error, refetch } = useApiQuery<{ id: string; title: string; description?: string; status: string; phase?: string; progress?: number; createdAt: string; updatedAt: string; messages?: unknown[] }>(
        ['project', safeId],
        `/projects/${safeId}/status`
    );

    const deleteMutation = useApiMutation<{ message?: string }, void>(
        `/projects/${safeId}`,
        'DELETE'
    );

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this project?')) {
            try {
                await deleteMutation.mutateAsync();
                navigate('/projects');
            } catch (error) {
                console.error('Error deleting project:', error);
            }
        }
    };

    if (isLoading) {
        return <Loading message="Loading project details..." />;
    }

    if (error) {
        return (
            <Error
                title="Error Loading Project"
                message="Failed to load project details"
                onRetry={refetch}
            />
        );
    }

    if (!data?.data) {
        return (
            <Error
                title="Project Not Found"
                message="The requested project could not be found"
            />
        );
    }

    const project = data.data;
    const progress = typeof project.progress === 'number' ? project.progress : 0;

    return (
        <Box>
            <VStack spacing={6} align="stretch">
                <Box
                    p={6}
                    bg={bgColor}
                    borderWidth="1px"
                    borderColor={borderColor}
                    rounded="lg"
                >
                    <HStack justify="space-between" mb={4}>
                        <Heading size="lg">{(project as any).title || (project as any).name || 'Proyecto'}</Heading>
                        <HStack>
                            <Button
                                leftIcon={<FiTrash2 />}
                                colorScheme="red"
                                variant="outline"
                                onClick={handleDelete}
                            >
                                Delete
                            </Button>
                        </HStack>
                    </HStack>

                    <Text color="gray.500" mb={4}>
                        {project.description || 'Sin descripción'}
                    </Text>

                    <HStack spacing={4}>
                        <Badge colorScheme="blue">
                            Status: {project.status}
                        </Badge>
                        {project.phase && (
                            <Badge colorScheme="purple">Fase: {project.phase}</Badge>
                        )}
                        <Badge colorScheme="green">
                            Progreso: {Math.round(progress)}%
                        </Badge>
                        <Badge colorScheme="green">
                            Creado: {new Date(project.createdAt).toLocaleDateString()}
                        </Badge>
                    </HStack>
                </Box>

                {/* Add more sections here for test cases, metrics, etc. */}
            </VStack>
        </Box>
    );
} 