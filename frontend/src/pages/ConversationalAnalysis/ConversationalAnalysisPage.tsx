import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Heading,
    Text,
    SimpleGrid,
    Card,
    CardHeader,
    CardBody,
    Badge,
    Button,
    VStack,
    HStack,
    Icon,
    useColorModeValue,
    Select,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    ModalFooter,
    FormControl,
    FormLabel,
    Input,
    Textarea,
    useToast,
    Progress,
    Divider
} from '@chakra-ui/react';
import { 
    FiPlus, 
    FiMessageCircle, 
    FiCheckCircle, 
    FiClock, 
    FiEye,
    FiArchive
} from 'react-icons/fi';
import { conversationalWorkflowService } from '../../services/conversationalWorkflow.service';
import Loading from '../../components/Loading';

interface ConversationalAnalysis {
    id: string;
    title: string;
    description: string;
    epicContent: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'ARCHIVED';
    completeness: number;
    createdAt: string;
    updatedAt: string;
    project?: {
        id: string;
        name: string;
    };
    messages?: Array<{
        id: string;
        content: string;
        role: 'USER' | 'ASSISTANT';
        messageType: string;
        category: string;
        createdAt: string;
    }>;
}

interface Project {
    id: string;
    name: string;
    description?: string;
}

const ConversationalAnalysisPage: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    
    const [analyses, setAnalyses] = useState<ConversationalAnalysis[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    
    const [newAnalysis, setNewAnalysis] = useState({
        title: '',
        description: '',
        epicContent: '',
        projectId: ''
    });

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const emptyBgColor = useColorModeValue('gray.50', 'gray.900');

    const loadData = useCallback(async () => {
        try {
            await Promise.all([loadAnalyses(), loadProjects()]);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [loadAnalyses, loadProjects]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const loadAnalyses = useCallback(async () => {
        try {
            const analyses = await conversationalWorkflowService.getUserWorkflows();
            setAnalyses(analyses.map(analysis => ({
                ...analysis,
                completeness: (() => {
                    const raw = analysis.completeness as any;
                    const overallScore = typeof raw === 'number' ? raw : raw?.overallScore ?? 0;
                    return overallScore / 100;
                })()
            })));
        } catch (error) {
            console.error('Error loading analyses:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los análisis conversacionales',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [toast]);

    const loadProjects = useCallback(async () => {
        try {
            // Use the projects API wrapper which normalizes backend response shapes
            const result = await (await import('../../lib/api')).projects.getInProgress();
            // result may be { status: 'success', data: [...] } or directly an array
            if (Array.isArray(result)) {
                setProjects(result as Project[]);
            } else if (result && typeof result === 'object' && 'data' in result) {
                setProjects((result as any).data || []);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }, []);

    const handleCreateAnalysis = async () => {
        if (!newAnalysis.title || !newAnalysis.description || !newAnalysis.epicContent) {
            toast({
                title: 'Error',
                description: 'Todos los campos son requeridos',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setCreating(true);

        try {
            const createdWorkflow = await conversationalWorkflowService.createWorkflow({
                title: newAnalysis.title,
                description: newAnalysis.description,
                epicContent: newAnalysis.epicContent,
                projectId: newAnalysis.projectId || undefined
            });

            toast({
                title: 'Éxito',
                description: 'Análisis conversacional creado exitosamente',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            
            onClose();
            setNewAnalysis({ title: '', description: '', epicContent: '', projectId: '' });
            await loadAnalyses();
            
            // Navegar al chat conversacional
            navigate(`/conversational-analysis/${createdWorkflow.id}/chat`);
            
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.error || 'Error al crear el análisis conversacional',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setCreating(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'green';
            case 'IN_PROGRESS': return 'blue';
            case 'PAUSED': return 'yellow';
            case 'ARCHIVED': return 'gray';
            default: return 'gray';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'Completado';
            case 'IN_PROGRESS': return 'En Progreso';
            case 'PAUSED': return 'Pausado';
            case 'ARCHIVED': return 'Archivado';
            default: return status;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return FiCheckCircle;
            case 'IN_PROGRESS': return FiClock;
            case 'PAUSED': return FiClock;
            case 'ARCHIVED': return FiArchive;
            default: return FiClock;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <Container maxW="7xl" py={8}>
            {/* Header */}
            <HStack justify="space-between" mb={8}>
                <VStack align="start" spacing={2}>
                    <Heading size="lg" color="brand.500">
                        Análisis Conversacional
                    </Heading>
                    <Text color="gray.600">
                        Refina épicos e historias de usuario mediante conversaciones guiadas por IA
                    </Text>
                </VStack>
                <Button
                    leftIcon={<Icon as={FiPlus} />}
                    colorScheme="brand"
                    onClick={onOpen}
                >
                    Nuevo Análisis
                </Button>
            </HStack>

            {/* Content */}
            {analyses.length === 0 ? (
                /* Empty State */
                <Card bg={emptyBgColor} borderColor={borderColor} textAlign="center" py={12}>
                    <CardBody>
                        <VStack spacing={4}>
                            <Icon as={FiMessageCircle} boxSize={16} color="gray.400" />
                            <VStack spacing={2}>
                                <Heading size="md" color="gray.600">
                                    No hay análisis conversacionales
                                </Heading>
                                <Text color="gray.500" maxW="md">
                                    Crea tu primer análisis conversacional para comenzar a refinar épicos e historias de usuario con ayuda de IA.
                                </Text>
                            </VStack>
                            <Button
                                leftIcon={<Icon as={FiPlus} />}
                                colorScheme="brand"
                                onClick={onOpen}
                            >
                                Crear Primer Análisis
                            </Button>
                        </VStack>
                    </CardBody>
                </Card>
            ) : (
                /* Analyses Grid */
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                    {analyses.map((analysis) => (
                        <Card
                            key={analysis.id}
                            bg={bgColor}
                            borderColor={borderColor}
                            _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                            transition="all 0.2s"
                        >
                            <CardHeader pb={2}>
                                <HStack justify="space-between" align="start">
                                    <VStack align="start" spacing={1} flex={1}>
                                        <Heading size="sm" noOfLines={2}>
                                            {analysis.title}
                                        </Heading>
                                        <HStack>
                                            <Badge
                                                colorScheme={getStatusColor(analysis.status)}
                                                variant="solid"
                                            >
                                                <HStack spacing={1}>
                                                    <Icon as={getStatusIcon(analysis.status)} boxSize={3} />
                                                    <Text fontSize="xs">
                                                        {getStatusText(analysis.status)}
                                                    </Text>
                                                </HStack>
                                            </Badge>
                                        </HStack>
                                    </VStack>
                                </HStack>
                            </CardHeader>
                            
                            <CardBody pt={0}>
                                <VStack align="start" spacing={3}>
                                    <Text fontSize="sm" color="gray.600" noOfLines={2}>
                                        {analysis.description}
                                    </Text>

                                    {analysis.project && (
                                        <Badge variant="outline" colorScheme="blue">
                                            {analysis.project.name}
                                        </Badge>
                                    )}

                                    {/* Progress */}
                                    <Box w="full">
                                        <HStack justify="space-between" mb={1}>
                                            <Text fontSize="sm" color="gray.600">
                                                Progreso
                                            </Text>
                                            <Text fontSize="sm" color="gray.600">
                                                {Math.round(analysis.completeness * 100)}%
                                            </Text>
                                        </HStack>
                                        <Progress
                                            value={analysis.completeness * 100}
                                            colorScheme={getStatusColor(analysis.status)}
                                            size="sm"
                                            borderRadius="md"
                                        />
                                    </Box>

                                    <Divider />

                                    {/* Metadata */}
                                    <VStack align="start" spacing={1} w="full">
                                        <Text fontSize="xs" color="gray.500">
                                            Creado: {formatDate(analysis.createdAt)}
                                        </Text>
                                        <Text fontSize="xs" color="gray.500">
                                            Actualizado: {formatDate(analysis.updatedAt)}
                                        </Text>
                                    </VStack>

                                    {/* Actions */}
                                    <HStack w="full" justify="space-between" pt={2}>
                                        <Button
                                            size="sm"
                                            leftIcon={<Icon as={FiEye} />}
                                            colorScheme="brand"
                                            variant="outline"
                                            onClick={() => navigate(`/conversational-analysis/${analysis.id}/chat`)}
                                        >
                                            Abrir Chat
                                        </Button>
                                    </HStack>
                                </VStack>
                            </CardBody>
                        </Card>
                    ))}
                </SimpleGrid>
            )}

            {/* Create Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Crear Nuevo Análisis Conversacional</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>Título</FormLabel>
                                <Input
                                    placeholder="ej. Sistema de Autenticación OAuth"
                                    value={newAnalysis.title}
                                    onChange={(e) => setNewAnalysis({ ...newAnalysis, title: e.target.value })}
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Descripción</FormLabel>
                                <Textarea
                                    placeholder="Breve descripción del épico o historia que quieres analizar"
                                    value={newAnalysis.description}
                                    onChange={(e) => setNewAnalysis({ ...newAnalysis, description: e.target.value })}
                                    rows={2}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>Proyecto (Opcional)</FormLabel>
                                <Select
                                    placeholder="Seleccionar proyecto"
                                    value={newAnalysis.projectId}
                                    onChange={(e) => setNewAnalysis({ ...newAnalysis, projectId: e.target.value })}
                                >
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Contenido del Épico/Historia</FormLabel>
                                <Textarea
                                    placeholder="Describe aquí el épico, historia de usuario o requerimiento que quieres analizar en detalle..."
                                    value={newAnalysis.epicContent}
                                    onChange={(e) => setNewAnalysis({ ...newAnalysis, epicContent: e.target.value })}
                                    rows={6}
                                />
                                <Text fontSize="sm" color="gray.500" mt={1}>
                                    Proporciona toda la información disponible. La IA hará preguntas para ayudarte a refinar y completar los requerimientos.
                                </Text>
                            </FormControl>
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <Button mr={3} onClick={onClose} variant="ghost">
                            Cancelar
                        </Button>
                        <Button
                            colorScheme="brand"
                            onClick={handleCreateAnalysis}
                            isLoading={creating}
                            loadingText="Creando..."
                            isDisabled={!newAnalysis.title || !newAnalysis.description || !newAnalysis.epicContent}
                        >
                            Crear Análisis
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

        </Container>
    );
};

export default ConversationalAnalysisPage;
