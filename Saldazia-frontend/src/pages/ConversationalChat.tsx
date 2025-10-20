import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    VStack,
    HStack,
    Text,
    Button,
    Heading,
    Badge,
    useColorModeValue,
    Spinner,
    Alert,
    AlertIcon
} from '@chakra-ui/react';
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { useApiQuery } from '../hooks/useApi';
import Loading from '../components/Loading';

export default function ConversationalChat() {
    const { id } = useParams();
    const navigate = useNavigate();

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    // Obtener estado del proyecto
    const { data: projectStatus, isLoading, error } = useApiQuery(
        ['project-status', id || ''],
        `/projects/${id}/status`
    );

    if (isLoading) {
        return <Loading message="Cargando proyecto..." />;
    }

    if (error) {
        return (
            <Box p={6}>
                <Alert status="error" mb={4}>
                    <AlertIcon />
                    Error al cargar el proyecto. Verifica que el proyecto existe.
                </Alert>
                <Button leftIcon={<FiArrowLeft />} onClick={() => navigate('/projects')}>
                    Volver a Proyectos
                </Button>
            </Box>
        );
    }

    const project = projectStatus?.data || {};

    if (!project || Object.keys(project).length === 0) {
        return (
            <Box p={6}>
                <Alert status="warning" mb={4}>
                    <AlertIcon />
                    Proyecto no encontrado.
                </Alert>
                <Button leftIcon={<FiArrowLeft />} onClick={() => navigate('/projects')}>
                    Volver a Proyectos
                </Button>
            </Box>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'green';
            case 'in_progress':
                return 'blue';
            case 'ready_to_advance':
                return 'orange';
            default:
                return 'blue';
        }
    };

    const getStatusText = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'COMPLETADO';
            case 'in_progress':
                return 'EN PROGRESO';
            case 'ready_to_advance':
                return 'LISTO PARA AVANZAR';
            default:
                return 'EN PROGRESO';
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box
                bg={bgColor}
                borderBottom="1px solid"
                borderColor={borderColor}
                p={4}
                mb={6}
                position="sticky"
                top="0"
                zIndex={10}
            >
                <HStack spacing={4} align="center">
                    <Button
                        leftIcon={<FiArrowLeft />}
                        variant="ghost"
                        onClick={() => navigate('/projects')}
                    >
                        Proyectos
                    </Button>
                    <VStack align="start" spacing={1} flex={1}>
                        <Heading size="md">{(project as any).title || 'Proyecto sin título'}</Heading>
                        <HStack spacing={2}>
                            <Badge
                                colorScheme={getStatusColor((project as any).status)}
                                variant="solid"
                                px={2}
                                py={1}
                                borderRadius="md"
                                fontSize="xs"
                            >
                                {getStatusText((project as any).status)}
                            </Badge>
                            {(project as any).messageCount && (
                                <Text fontSize="sm" color="gray.500">
                                    {(project as any).messageCount} mensajes
                                </Text>
                            )}
                        </HStack>
                    </VStack>
                    {(project as any).status?.toLowerCase() === 'completed' && (
                        <Button
                            leftIcon={<FiCheckCircle />}
                            colorScheme="green"
                            variant="outline"
                            onClick={() => navigate(`/analysis/${(project as any).id}`)}
                        >
                            Ver Análisis
                        </Button>
                    )}
                </HStack>
            </Box>

            {/* Chat Content */}
            <Box p={6}>
                <VStack spacing={6} align="stretch">
                    <Box
                        bg={bgColor}
                        border="1px solid"
                        borderColor={borderColor}
                        borderRadius="lg"
                        p={6}
                        minH="500px"
                        position="relative"
                    >
                        {/* Chat Interface Placeholder */}
                        <VStack spacing={4} align="center" justify="center" h="400px">
                            <Spinner size="lg" color="blue.500" />
                            <Text fontSize="lg" fontWeight="bold">
                                Cargando Chat Conversacional
                            </Text>
                            <Text fontSize="sm" color="gray.500" textAlign="center">
                                El chat conversacional con IA se está cargando.<br />
                                Esta funcionalidad permitirá continuar el análisis donde lo dejaste.
                            </Text>
                        </VStack>
                    </Box>

                    {/* Project Info */}
                    <Box
                        bg={bgColor}
                        border="1px solid"
                        borderColor={borderColor}
                        borderRadius="lg"
                        p={4}
                    >
                        <Heading size="sm" mb={2}>Información del Proyecto</Heading>
                        <VStack align="start" spacing={2}>
                            <Text><strong>Descripción:</strong> {(project as Record<string, any>).description || 'Sin descripción'}</Text>
                            <Text><strong>Creado:</strong> {new Date((project as Record<string, any>).createdAt).toLocaleDateString('es-ES')}</Text>
                            <Text><strong>Última actualización:</strong> {new Date((project as Record<string, any>).updatedAt || (project as Record<string, any>).createdAt).toLocaleDateString('es-ES')}</Text>
                        </VStack>
                    </Box>
                </VStack>
            </Box>
        </Box>
    );
}
