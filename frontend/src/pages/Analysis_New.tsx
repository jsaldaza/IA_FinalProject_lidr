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
    HStack,
    Icon,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    VStack,
    Text,
    Progress
} from '@chakra-ui/react';
import { FiPlus, FiMessageSquare } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useApiQuery } from '../hooks/useApi';
import type { ConversationalWorkflowResponse } from '../services/conversationalWorkflow.service';
import CreateAnalysisModal from '../components/CreateAnalysisModal';
import Loading from '../components/Loading';
import api from '../lib/api';
import { conversationalWorkflowService } from '../services/conversationalWorkflow.service';

// Helper functions for status colors and icons
const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
        'IN_PROGRESS': 'blue',
        'READY_TO_ADVANCE': 'yellow',
        'COMPLETED': 'green',
    };
    return statusMap[status] || 'gray';
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'COMPLETED': return '✅';
        case 'IN_PROGRESS': return '🔄';
        case 'READY_TO_ADVANCE': return '⏳';
        default: return '📋';
    }
};

const getPhaseColor = (phase: string) => {
    const phaseMap: Record<string, string> = {
        'ANALYSIS': 'blue',
        'STRATEGY': 'purple',
        'TEST_PLANNING': 'orange',
        'COMPLETED': 'green',
    };
    return phaseMap[phase] || 'gray';
};

export default function Analysis() {
    const navigate = useNavigate();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    // Fetch conversational analyses
    const { 
        data: analysisData, 
        isLoading,
        error,
        refetch
    } = useApiQuery<ConversationalWorkflowResponse[]>(['conversational-workflows'], '/conversational-workflow/user/workflows');

    const analyses = analysisData?.data || [];

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

            // Crear el análisis conversacional con toda la información
            const conversationalData = {
                title: analysisData.name,
                description: analysisData.description,
                epicContent: projectInfo ? 
                    `Proyecto: ${projectInfo.name}\n\nDescripción del proyecto: ${projectInfo.description}\n\nDescripción del análisis: ${analysisData.description}` :
                    `Descripción del análisis: ${analysisData.description}`,
                projectId: analysisData.projectId
            };

            const createdWorkflow = await conversationalWorkflowService.createWorkflow(conversationalData);
            
            // Redirigir al chat automáticamente
            navigate(`/conversational-analysis/${createdWorkflow.id}/chat`);
            
        } catch (error) {
            console.error('Error creating conversational analysis:', error);
        }
    };

    if (isLoading) {
        return <Loading message="Cargando análisis..." />;
    }

    if (error) {
        return (
            <VStack spacing={4} py={8}>
                <Text color="red.500">Error al cargar los análisis</Text>
                <Button onClick={() => refetch()}>Reintentar</Button>
            </VStack>
        );
    }

    return (
        <VStack spacing={6} align="stretch">
            <HStack justify="space-between" align="center">
                <VStack align="start" spacing={1}>
                    <Heading size="lg">Análisis</Heading>
                    <Text color="gray.600">
                        Gestiona y crea análisis de testing para tus proyectos
                    </Text>
                </VStack>
                <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    onClick={onOpen}
                    size="lg"
                >
                    Nuevo Análisis
                </Button>
            </HStack>

            <Tabs>
                <TabList>
                    <Tab>Todos los Análisis</Tab>
                </TabList>

                <TabPanels>
                    <TabPanel>
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
                                        <Th>Título</Th>
                                        <Th>Descripción</Th>
                                        <Th>Fase</Th>
                                        <Th>Estado</Th>
                                        <Th>Progreso</Th>
                                        <Th>Fecha</Th>
                                        <Th>Acciones</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {analyses.length === 0 ? (
                                        <Tr>
                                            <Td colSpan={6}>
                                                <VStack spacing={4} py={8}>
                                                    <Icon as={FiMessageSquare} boxSize={12} color="gray.400" />
                                                    <VStack spacing={2}>
                                                        <Text fontSize="lg" fontWeight="medium" color="gray.600">
                                                            No hay análisis creados
                                                        </Text>
                                                        <Text fontSize="sm" color="gray.500" textAlign="center">
                                                            Comienza creando tu primer análisis
                                                        </Text>
                                                    </VStack>
                                                </VStack>
                                            </Td>
                                        </Tr>
                                    ) : (
                                        analyses.map((analysis: ConversationalWorkflowResponse) => (
                                            <Tr key={analysis.id}>
                                                <Td>
                                                    <VStack align="start" spacing={1}>
                                                        <Text fontWeight="medium">{analysis.title}</Text>
                                                        <Text fontSize="xs" color="gray.500">
                                                            ID: {analysis.id}
                                                        </Text>
                                                    </VStack>
                                                </Td>
                                                <Td>
                                                    <Text fontSize="sm" noOfLines={2} maxW="300px">
                                                        {analysis.description || 'Sin descripción'}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <Badge 
                                                        colorScheme={getPhaseColor(analysis.currentPhase)}
                                                        fontSize="xs"
                                                    >
                                                        {analysis.currentPhase}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    <Badge 
                                                        colorScheme={getStatusColor(analysis.status)}
                                                        fontSize="xs"
                                                    >
                                                        {getStatusIcon(analysis.status)} {analysis.status}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    <VStack align="start" spacing={1}>
                                                        <Progress
                                                            value={analysis.completeness.overallScore}
                                                            size="sm"
                                                            colorScheme="blue"
                                                            w="100px"
                                                        />
                                                        <Text fontSize="xs" color="gray.500">
                                                            {Math.round(analysis.completeness.overallScore)}%
                                                        </Text>
                                                    </VStack>
                                                </Td>
                                                <Td>
                                                    <Text fontSize="sm" color="gray.600">
                                                        {new Date(analysis.createdAt).toLocaleDateString()}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => navigate(`/conversational-analysis/${analysis.id}/chat`)}
                                                    >
                                                        Ver
                                                    </Button>
                                                </Td>
                                            </Tr>
                                        ))
                                    )}
                                </Tbody>
                            </Table>
                        </Box>
                    </TabPanel>
                </TabPanels>
            </Tabs>

            <CreateAnalysisModal 
                isOpen={isOpen} 
                onClose={onClose}
                onSuccess={handleCreateConversationalAnalysis}
            />
        </VStack>
    );
}
