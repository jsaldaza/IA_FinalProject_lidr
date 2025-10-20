import { memo, useState } from 'react';
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
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    IconButton,
    useToast,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    FormControl,
    FormLabel,
    ModalFooter
} from '@chakra-ui/react';
import { 
    FiCheckCircle, 
    FiMoreVertical,
    FiEdit,
    FiZap,
    FiCpu,
    FiRefreshCw,
    FiChevronDown,
    FiChevronRight,
    FiFolder
} from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import Loading from '../components/Loading';
import { projects as projectsApi, testCases as testCasesApi } from '../lib/api';
import api from '../lib/api';

// Types
interface TestCaseData {
    id: string;
    title: string;
    description?: string;
    generatedByAI: boolean;
    createdAt: string;
    analysis?: {
        id: string;
        requirement: string;
        project?: {
            id: string;
            name?: string;
            title?: string;
        };
    };
    conversationalAnalysis?: {
        id: string;
        title: string;
        description: string;
        status: string;
    };
}

interface AnalysisData {
    id: string;
    name?: string;
    title?: string;
    projectId?: string | null;
}

interface ProjectData {
    id: string;
    name?: string;
    title?: string;
}

type SelectItem = { id: string; name: string; type: 'analysis' | 'project' };

interface ProjectGroup {
    id: string;
    name: string;
    items: TestCaseData[];
}

const TestCases = memo(() => {
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    // Inicialmente todos los proyectos están expandidos para mostrar los casos
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const {
        isOpen: isGenerateOpen,
        onOpen: onGenerateOpen,
        onClose: onGenerateClose
    } = useDisclosure();
    const toast = useToast();
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    // Fetch all completed analyses for selection (con nombre amigable)
    const { data: analyses, isLoading: analysesLoading } = useQuery({
        queryKey: ['analyses-completed'],
        queryFn: async () => {
            try {
                const result = await projectsApi.getCompleted();
                // Backend responde con { success, data: { items: [...] } }
                return result.data?.items || [];
            } catch (error) {
                console.error('Error fetching completed projects:', error);
                return [];
            }
        }
    });

    // Fetch generated test cases
    const { data: testCasesList, isLoading: casesLoading, refetch: refetchCases } = useQuery({
        queryKey: ['testCases'],
        queryFn: async () => {
            try {
                const result = await testCasesApi.getAll();
                console.log('🧪 Frontend: Raw API result:', {
                    type: typeof result,
                    isArray: Array.isArray(result),
                    length: Array.isArray(result) ? result.length : 'N/A',
                    firstItem: Array.isArray(result) && result.length > 0 ? {
                        id: result[0]?.id,
                        title: result[0]?.title,
                        description: result[0]?.description
                    } : 'No items'
                });
                return result || [];
            } catch (error) {
                console.error('Error fetching test cases:', error);
                return [];
            }
        }
    });

    // Fetch projects as fallback when there are no completed analyses
    const { data: projects, isLoading: projectsLoading } = useQuery({
        queryKey: ['projects-list'],
        queryFn: async () => {
            try {
                // Use the projects API wrapper which knows the backend shape
                const result = await projectsApi.getInProgress();
                // Backend returns { status: 'success', data: [...] } for in-progress
                return (result && result.data) ? result.data : (Array.isArray(result) ? result : []);
            } catch (err) {
                console.error('Error fetching projects fallback:', err);
                return [];
            }
        }
    });

    // Build select items preferring analyses, else projects
    const selectItems: SelectItem[] = (analyses && analyses.length > 0)
        ? (analyses as AnalysisData[]).map(a => ({ id: a.id, name: a.name || a.title, type: 'analysis' }))
        : ((projects as ProjectData[] | undefined) || []).map(p => ({ id: p.id, name: p.name || p.title, type: 'project' }));

    // Generate test cases mutation
    const generateTestCases = async (selectedId: string) => {
        setIsGenerating(true);
        try {
            // selectedId comes as "type:id"
            const [type, id] = selectedId.includes(':') ? selectedId.split(':', 2) as ['analysis' | 'project', string] : ['analysis', selectedId];

            const result = await api.post('/test-cases/generate',
                type === 'analysis' ? { conversationalAnalysisId: id } : { projectId: id }
            );
            toast({ title: 'Casos de prueba generados', description: `Se generaron ${result.data.length} casos de prueba exitosamente`, status: 'success', duration: 5000, isClosable: true });
            refetchCases();
            onGenerateClose();
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Error al generar casos de prueba',
                status: 'error',
                duration: 5000,
                isClosable: true
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Función para manejar la expansión y colapso de los grupos de proyectos
    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(projectId)) {
                newSet.delete(projectId);
            } else {
                newSet.add(projectId);
            }
            return newSet;
        });
    };

    // Agrupar casos de prueba por proyecto - versión mejorada
    // Defensive: ensure we have an array before reducing (server may return HTML or object on error)
    console.log('🧪 Frontend: testCasesList received:', {
        type: typeof testCasesList,
        isArray: Array.isArray(testCasesList),
        length: Array.isArray(testCasesList) ? testCasesList.length : 'N/A',
        content: testCasesList
    });

    const _casesArray: TestCaseData[] = Array.isArray(testCasesList)
        ? testCasesList as TestCaseData[]
        : ((): TestCaseData[] => {
            const possible = testCasesList as unknown;
            if (possible && typeof possible === 'object' && 'data' in possible) {
                const inner = (possible as Record<string, unknown>).data;
                if (Array.isArray(inner)) return inner as TestCaseData[];
            }
            return [];
        })();

    console.log('🧪 Frontend: _casesArray after processing:', {
        length: _casesArray.length,
        firstItem: _casesArray.length > 0 ? {
            id: _casesArray[0]?.id,
            title: _casesArray[0]?.title,
            conversationalAnalysisId: _casesArray[0]?.conversationalAnalysis?.id
        } : 'No items'
    });

    const groupedTestCases = _casesArray.reduce((groups: Record<string, ProjectGroup>, testCase: TestCaseData) => {
        // DEBUG: Log para entender la estructura de datos
        console.log('🔍 TestCase structure:', {
            id: testCase.id?.substring(0, 8),
            title: testCase.title,
            hasAnalysis: !!testCase.analysis,
            hasConversationalAnalysis: !!testCase.conversationalAnalysis,
            conversationalTitle: testCase.conversationalAnalysis?.title,
            analysisProject: testCase.analysis?.project?.title || testCase.analysis?.project?.name
        });

        // Primero verificamos explícitamente si el caso de prueba está asociado a un análisis con un proyecto
        let projectId = 'no-project';
        let projectName = 'Sin Proyecto';
        
        if (testCase.analysis?.project?.id) {
            // Si el análisis tiene un proyecto, usamos su ID
            projectId = testCase.analysis.project.id;
            projectName = testCase.analysis.project.name || testCase.analysis.project.title || 'Proyecto Sin Nombre';
        } else if (testCase.conversationalAnalysis?.id) {
            // Si está asociado a un análisis conversacional, usamos ese como proyecto
            projectId = testCase.conversationalAnalysis.id;
            projectName = testCase.conversationalAnalysis.title || 'Análisis Sin Título';
        } else if (testCase.analysis?.requirement) {
            // Si no hay proyecto pero hay requerimiento, podemos intentar extraer un nombre
            // del requerimiento para usarlo como identificador alternativo
            const reqParts = testCase.analysis.requirement.split(':');
            if (reqParts.length > 0 && reqParts[0].trim()) {
                projectName = reqParts[0].trim();
                // Usar el hash del nombre como ID para agrupar casos del mismo "proyecto virtual"
                projectId = `req-${projectName.replace(/\s+/g, '-').toLowerCase()}`;
            }
        }
        
        console.log('🎯 Selected project:', { projectId: projectId.substring(0, 8), projectName });
        
        // Creamos el grupo si no existe
        if (!groups[projectId]) {
            groups[projectId] = {
                id: projectId,
                name: projectName,
                items: []
            };
        }
        
        // Añadimos el caso de prueba al grupo
        groups[projectId].items.push(testCase);
        return groups;
    }, {});

    console.log('🧪 Frontend: groupedTestCases result:', {
        groupCount: Object.keys(groupedTestCases).length,
        groups: Object.entries(groupedTestCases).map(([id, group]) => ({
            id: id.substring(0, 8),
            name: group.name,
            itemCount: group.items.length
        }))
    });

    // Auto-expandir todos los grupos cuando hay datos
    if (_casesArray.length > 0 && expandedProjects.size === 0) {
        const allProjectIds = Object.keys(groupedTestCases);
        console.log('🧪 Frontend: Auto-expanding projects:', allProjectIds);
        setExpandedProjects(new Set(allProjectIds));
    }

    const isLoading = analysesLoading || projectsLoading || casesLoading;

    if (isLoading) {
        return <Loading message="Cargando datos..." />;
    }

    return (
        <Container maxW="7xl" py={8}>
            <VStack spacing={8} align="stretch">
                {/* Header */}
                <Box>
                    <HStack justify="space-between" align="center" mb={4}>
                        <VStack align="start" spacing={2}>
                            <Heading size="lg">Casos de Prueba Generados por IA</Heading>
                            <Text color="gray.600">
                                Genera casos de prueba automáticamente basados en levantamientos de requisitos completados
                            </Text>
                        </VStack>
                        <HStack>
                            <Button
                                colorScheme="purple"
                                leftIcon={<Icon as={FiCpu} />}
                                onClick={onGenerateOpen}
                            >
                                Generar con IA
                            </Button>
                        </HStack>
                    </HStack>

                    {/* Analytics Summary */}
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
                        <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
                            <CardBody>
                                <VStack>
                                    <Icon as={FiCheckCircle} size="24px" color="green.500" />
                                    <Text fontSize="2xl" fontWeight="bold">
                                        {testCasesList?.length || 0}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">Total Cases</Text>
                                </VStack>
                            </CardBody>
                        </Card>
                        <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
                            <CardBody>
                                <VStack>
                                    <Icon as={FiCpu} size="24px" color="purple.500" />
                                    <Text fontSize="2xl" fontWeight="bold">
                                        {testCasesList?.length || 0}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">Casos Generados</Text>
                                </VStack>
                            </CardBody>
                        </Card>

                        <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
                            <CardBody>
                                <VStack>
                                    <Icon as={FiZap} size="24px" color="orange.500" />
                                    <Text fontSize="2xl" fontWeight="bold">
                                        {(analyses?.length && analyses.length > 0) ? analyses.length : (projects?.length || 0)}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                        {(analyses?.length && analyses.length > 0) ? 'Levantamientos Disponibles' : 'Proyectos Disponibles'}
                                    </Text>
                                </VStack>
                            </CardBody>
                        </Card>
                    </SimpleGrid>
                </Box>

                {/* Test Cases Content */}
                {testCasesList && testCasesList.length > 0 ? (
                    <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between">
                            <Text fontSize="lg" fontWeight="semibold">
                                Casos de Prueba ({testCasesList.length})
                            </Text>
                            <Button
                                size="sm"
                                leftIcon={<Icon as={FiRefreshCw} />}
                                onClick={() => refetchCases()}
                            >
                                Actualizar
                            </Button>
                        </HStack>

                        {/* Grouped by Project */}
                        {Object.entries(groupedTestCases).map(([projectId, group]) => {
                            const isExpanded = expandedProjects.has(projectId);
                            
                            return (
                                <Card key={projectId} bg={bgColor} borderColor={borderColor} borderWidth={1}>
                                    <CardHeader pb={2}>
                                        <HStack justify="space-between" w="full">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                leftIcon={<Icon as={isExpanded ? FiChevronDown : FiChevronRight} />}
                                                onClick={() => toggleProject(projectId)}
                                                justifyContent="flex-start"
                                                fontWeight="semibold"
                                                color="blue.700"
                                                _hover={{ bg: 'blue.50' }}
                                            >
                                                <Icon as={FiFolder} mr={2} />
                                                <Text as="span" fontWeight="bold" color="blue.600">
                                                    {group.name}
                                                </Text>
                                            </Button>
                                            <Badge colorScheme="purple" variant="subtle">
                                                {group.items.length} caso{group.items.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </HStack>
                                    </CardHeader>
                                    
                                    {isExpanded && (
                                        <CardBody pt={0}>
                                            <Box
                                                maxH="400px"
                                                overflowY="auto"
                                                sx={{
                                                    '&::-webkit-scrollbar': { width: '8px' },
                                                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                                                    '&::-webkit-scrollbar-thumb': { 
                                                        background: 'rgba(0,0,0,0.2)', 
                                                        borderRadius: '8px',
                                                        '&:hover': { background: 'rgba(0,0,0,0.3)' }
                                                    }
                                                }}
                                            >
                                                <Table variant="simple" size="sm">
                                                    <Thead position="sticky" top={0} bg={bgColor} zIndex={1}>
                                                        <Tr>
                                                            <Th>Origen</Th>
                                                            <Th>Descripción</Th>
                                                            <Th>Creado</Th>
                                                            <Th width="50px">Acciones</Th>
                                                        </Tr>
                                                    </Thead>
                                                    <Tbody>
                                                        {group.items.map((testCase: TestCaseData) => (
                                                            <Tr key={testCase.id} _hover={{ bg: 'gray.50' }}>
                                                                <Td>
                                                                    <HStack>
                                                                        <Icon 
                                                                            as={FiCpu} 
                                                                            color="purple.500" 
                                                                        />
                                                                        <Badge 
                                                                            colorScheme="purple"
                                                                            variant="subtle"
                                                                            size="sm"
                                                                        >
                                                                            IA
                                                                        </Badge>
                                                                    </HStack>
                                                                </Td>
                                                                <Td>
                                                                    <Text fontWeight="medium" noOfLines={2}>
                                                                        {testCase.title || testCase.description || 'Caso de prueba'}
                                                                    </Text>
                                                                </Td>
                                                                <Td>
                                                                    <Text fontSize="sm" color="gray.500">
                                                                        {new Date(testCase.createdAt).toLocaleDateString()}
                                                                    </Text>
                                                                </Td>
                                                                <Td>
                                                                    <Menu>
                                                                        <MenuButton
                                                                            as={IconButton}
                                                                            icon={<FiMoreVertical />}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                        />
                                                                        <MenuList>
                                                                            <MenuItem icon={<FiEdit />}>
                                                                                Ver Detalles
                                                                            </MenuItem>
                                                                        </MenuList>
                                                                    </Menu>
                                                                </Td>
                                                            </Tr>
                                                        ))}
                                                    </Tbody>
                                                </Table>
                                            </Box>
                                        </CardBody>
                                    )}
                                </Card>
                            );
                        })}
                    </VStack>
                ) : (
                    <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
                        <CardBody>
                            <VStack spacing={4} py={8}>
                                <Icon as={FiCpu} size="48px" color="gray.400" />
                                <VStack spacing={2}>
                                    <Text fontSize="lg" fontWeight="semibold" color="gray.600">
                                        No hay casos de prueba
                                    </Text>
                                    <Text color="gray.500" textAlign="center">
                                        Genera casos de prueba automáticamente con IA basados en levantamientos de requisitos completados
                                    </Text>
                                </VStack>
                                <HStack>
                                    <Button
                                        colorScheme="purple"
                                        leftIcon={<Icon as={FiCpu} />}
                                        onClick={onGenerateOpen}
                                    >
                                        Generar con IA
                                    </Button>
                                </HStack>
                            </VStack>
                        </CardBody>
                    </Card>
                )}
            </VStack>

            {/* Modal para generar casos de prueba con IA */}
            <Modal isOpen={isGenerateOpen} onClose={onGenerateClose} size="lg">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        <HStack>
                            <Icon as={FiCpu} color="purple.500" />
                            <Text>Generar Casos de Prueba con IA</Text>
                        </HStack>
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            <Alert status="info" borderRadius="md">
                                <AlertIcon />
                                <Box>
                                    <AlertTitle>Sistema Experto de IA</AlertTitle>
                                    <AlertDescription>
                                        Selecciona un levantamiento de requisitos/proyecto para generar casos de prueba automáticamente.
                                        La IA creará casos descriptivos basados en el requerimiento del levantamiento más reciente.
                                    </AlertDescription>
                                </Box>
                            </Alert>

                            <FormControl>
                                <FormLabel>Seleccionar Proyecto</FormLabel>
                                <Select
                                    placeholder="Selecciona un proyecto..."
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                >
                                    {selectItems.map((item) => (
                                        <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>
                                            {item.name}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>

                            {selectedProjectId && (
                                <Alert status="success" borderRadius="md">
                                    <AlertIcon />
                                    <Text fontSize="sm">
                                        La IA generará casos de prueba descriptivos basados en el requerimiento del levantamiento seleccionado.
                                    </Text>
                                </Alert>
                            )}
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <HStack>
                            <Button variant="ghost" onClick={onGenerateClose}>
                                Cancelar
                            </Button>
                            <Button
                                colorScheme="purple"
                                onClick={() => generateTestCases(selectedProjectId)}
                                isDisabled={!selectedProjectId}
                                isLoading={isGenerating}
                                loadingText="Generando..."
                                leftIcon={<Icon as={FiCpu} />}
                            >
                                Generar Casos de Prueba
                            </Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Modal de creación manual eliminado */}
        </Container>
    );
});

// Componente de creación manual eliminado

TestCases.displayName = 'TestCases';

export default TestCases;
