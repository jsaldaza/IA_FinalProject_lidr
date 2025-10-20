import {
    Box,
    Heading,
    Text,
    Button,
    VStack,
    HStack,
    Badge,
    useColorModeValue,
    useDisclosure
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useApiQuery, useApiMutation } from '../hooks/useApi';
import type { Project } from '../types/api';
import Loading from '../components/Loading';
import Error from '../components/Error';

export default function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { onOpen } = useDisclosure();

    const safeId = id || '';
    const { data, isLoading, error, refetch } = useApiQuery<Project>(
        ['project', safeId],
        `/projects/${safeId}`
    );

    const deleteMutation = useApiMutation<Project, void>(
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
                        <Heading size="lg">{project.name}</Heading>
                        <HStack>
                            <Button
                                leftIcon={<FiEdit2 />}
                                onClick={onOpen}
                                variant="outline"
                            >
                                Edit
                            </Button>
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
                        {project.description}
                    </Text>

                    <HStack spacing={4}>
                        <Badge colorScheme="blue">
                            Status: {project.status}
                        </Badge>
                        <Badge colorScheme="green">
                            Created: {new Date(project.createdAt).toLocaleDateString()}
                        </Badge>
                    </HStack>
                </Box>

                {/* Add more sections here for test cases, metrics, etc. */}
            </VStack>
        </Box>
    );
} 