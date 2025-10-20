import {
    Box,
    Button,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge,
    useDisclosure,
    useColorModeValue,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    VStack,
    HStack,
    Text,
    Card,
    CardBody,
    CardHeader,
    Progress,
    Icon
} from '@chakra-ui/react';
import { FiPlus, FiMessageSquare } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useApiQuery } from '../hooks/useApi';
import type { Analysis, PaginatedResponse } from '../types/api';
import CreateAnalysisModal from '../components/CreateAnalysisModal';
import Loading from '../components/Loading';
import { conversationalWorkflowService } from '../services/conversationalWorkflow.service';
import api from '../lib/api';
import { useEffect, useState } from 'react';

interface ConversationalAnalysis {
    id: string;
    title: string;
    description: string;
    currentPhase: string;
    status: string;
    completeness: {
        overallScore: number;
    };
    createdAt: string;
    project?: {
        name: string;
    };
}



export default function Analysis() {
    const navigate = useNavigate();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { data, isLoading, error } = useApiQuery<PaginatedResponse<Analysis>>(['analysis'], '/analysis');
    const [conversationalAnalyses, setConversationalAnalyses] = useState<ConversationalAnalysis[]>([]);
    const [loadingConversational, setLoadingConversational] = useState(true);

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    // Cargar levantamientos conversacionales
    useEffect(() => {
        loadConversationalAnalyses();
    }, []);

    const loadConversationalAnalyses = async () => {
        try {
            const data = await conversationalWorkflowService.getUserWorkflows();
            setConversationalAnalyses(data);
        } catch (error) {
            console.error('Error loading conversational analyses:', error);
        } finally {
            setLoadingConversational(false);
        }
    };

    const getPhaseColor = (phase: string) => {
        switch (phase) {
            case 'COMPLETED': return 'green';
            case 'TEST_PLANNING': return 'blue';
            case 'STRATEGY': return 'orange';
            case 'ANALYSIS': return 'purple';
            default: return 'gray';
        }
    };

    const getConversationalStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'green';
            case 'READY_TO_ADVANCE': return 'blue';
            case 'IN_PROGRESS': return 'yellow';
            default: return 'gray';
        }
    };

    const handleCreateConversationalAnalysis = async (analysisData: {
        name: string;
        description: string;
        projectId?: string;
    }) => {
        try {
            // Obtener información completa del proyecto si está seleccionado
            let projectInfo = null;
            if (analysisData.projectId) {
                const projectResponse = await api.get(`/projects/${analysisData.projectId}`);
                projectInfo = projectResponse.data.data;
            }

            // Crear el levantamiento conversacional con toda la información
            const conversationalData = {
                title: analysisData.name,
                description: analysisData.description,
                epicContent: projectInfo ? 
                    `Proyecto: ${projectInfo.name}\n\nDescripción del proyecto: ${projectInfo.description}\n\nDescripción del levantamiento de requisitos: ${analysisData.description}` :
                    `Descripción del levantamiento de requisitos: ${analysisData.description}`,
                projectId: analysisData.projectId
            };

            const createdWorkflow = await conversationalWorkflowService.createWorkflow(conversationalData);
            
            // Recargar la lista de levantamientos conversacionales
            await loadConversationalAnalyses();
            
            // Redirigir al chat automáticamente
            navigate(`/conversational-analysis/${createdWorkflow.id}/chat`);
            
        } catch (error) {
            console.error('Error creating conversational analysis:', error);
        }
    };

    if (isLoading || loadingConversational) {
        return <Loading message="Cargando levantamientos de requisitos..." />;
    }

    if (error) {
        console.error('Analysis loading error:', error);
    }

    const analyses: Analysis[] = data?.data?.items || [];

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'green';
            case 'running':
                return 'blue';
            case 'failed':
                return 'red';
            default:
                return 'gray';
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
                <Heading>Levantamiento de Requisitos</Heading>
                <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    onClick={onOpen}
                >
                    Nuevo Levantamiento
                </Button>
            </Box>

            <Tabs>
                <TabList>
                    <Tab>Todos los Levantamientos</Tab>
                </TabList>

                <TabPanels>
                    <TabPanel>
                        <VStack spacing={6} align="stretch">
                            {/* Levantamientos Conversacionales */}
                            {conversationalAnalyses.length > 0 && (
                                <VStack spacing={4} align="stretch">
                                    {conversationalAnalyses.map((analysis) => (
                                        <Card 
                                            key={analysis.id}
                                            bg={bgColor}
                                            borderColor={borderColor}
                                            cursor="pointer"
                                            _hover={{ borderColor: 'blue.300', transform: 'translateY(-2px)' }}
                                            transition="all 0.2s"
                                            onClick={() => navigate(`/conversational-analysis/${analysis.id}/chat`)}
                                        >
                                            <CardHeader pb={3}>
                                                <HStack justify="space-between" align="start">
                                                    <VStack align="start" spacing={1}>
                                                        <Text fontWeight="bold" fontSize="lg">
                                                            {analysis.title}
                                                        </Text>
                                                        <Text fontSize="sm" color="gray.600">
                                                            {analysis.description}
                                                        </Text>
                                                        {analysis.project && (
                                                            <Badge colorScheme="blue" size="sm">
                                                                {analysis.project.name}
                                                            </Badge>
                                                        )}
                                                    </VStack>
                                                    <VStack align="end" spacing={1}>
                                                        <Badge colorScheme={getPhaseColor(analysis.currentPhase)}>
                                                            {analysis.currentPhase}
                                                        </Badge>
                                                        <Badge colorScheme={getConversationalStatusColor(analysis.status)}>
                                                            {analysis.status}
                                                        </Badge>
                                                    </VStack>
                                                </HStack>
                                            </CardHeader>
                                            
                                            <CardBody pt={0}>
                                                <HStack justify="space-between" align="center">
                                                    <VStack align="start" spacing={1}>
                                                        <Text fontSize="xs" color="gray.500">
                                                            Progreso General
                                                        </Text>
                                                        <Text fontSize="sm" fontWeight="medium">
                                                            {Math.round(analysis.completeness.overallScore)}%
                                                        </Text>
                                                    </VStack>
                                                    <Box flex={1} mx={4}>
                                                        <Progress
                                                            value={analysis.completeness.overallScore}
                                                            colorScheme={getPhaseColor(analysis.currentPhase)}
                                                            size="sm"
                                                            borderRadius="md"
                                                        />
                                                    </Box>
                                                    <Text fontSize="xs" color="gray.500">
                                                        {new Date(analysis.createdAt).toLocaleDateString()}
                                                    </Text>
                                                </HStack>
                                            </CardBody>
                                        </Card>
                                    ))}
                                </VStack>
                            )}

                            {/* Levantamientos Tradicionales */}
                            {analyses.length > 0 && (
                                <Box
                                    bg={bgColor}
                                    borderWidth="1px"
                                    borderColor={borderColor}
                                    rounded="lg"
                                    overflow="hidden"
                                >
                                    <Table>
                                        <Thead>
                                            <Tr>
                                                <Th>Nombre</Th>
                                                <Th>Descripción</Th>
                                                <Th>Proyecto</Th>
                                                <Th>Fecha de Creación</Th>
                                                <Th>Estado</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {analyses.map((analysis: Analysis) => (
                                                <Tr key={analysis.id}>
                                                    <Td>{analysis.name}</Td>
                                                    <Td>{analysis.description}</Td>
                                                    <Td>
                                                        <Badge colorScheme="blue">
                                                            {analysis.projectId ? 'Proyecto asignado' : 'Sin proyecto'}
                                                        </Badge>
                                                    </Td>
                                                    <Td>{new Date(analysis.createdAt).toLocaleDateString()}</Td>
                                                    <Td>
                                                        <Badge colorScheme={getStatusColor(analysis.status)}>
                                                            {analysis.status}
                                                        </Badge>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                </Box>
                            )}

                            {/* Estado vacío */}
                            {analyses.length === 0 && conversationalAnalyses.length === 0 && (
                                <VStack spacing={4} py={8}>
                                    <Icon as={FiMessageSquare} w={12} h={12} color="gray.400" />
                                    <Text fontSize="lg" color="gray.500">
                                        No hay levantamientos de requisitos creados
                                    </Text>
                                    <Text fontSize="sm" color="gray.400" textAlign="center">
                                        Comienza creando tu primer levantamiento para refinar épicos e historias de usuario.
                                    </Text>
                                </VStack>
                            )}
                        </VStack>
                    </TabPanel>
                </TabPanels>
            </Tabs>

            <CreateAnalysisModal 
                isOpen={isOpen} 
                onClose={onClose} 
                onSuccess={async (analysisData: any) => {
                    // Crear levantamiento conversacional automáticamente y abrir chat
                    await handleCreateConversationalAnalysis(analysisData);
                    onClose();
                }}
            />
        </Box>
    );
} 