import { memo, useEffect, useMemo, useState } from 'react';
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
import { conversationalWorkflowService } from '../services/conversationalWorkflow.service';

// Types
interface TestCaseData {
    id: string;
    title?: string;
    description?: string;
    generatedByAI?: boolean;
    createdAt?: string;
    priority?: string;
    category?: string;
    reviewStatus?: string;
    conversationalAnalysis?: {
        id: string;
        title?: string;
        description?: string;
        status?: string;
    };
}

interface WorkflowSummary {
    id: string;
    name?: string;
    title?: string;
    status?: string;
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
    const { data: completedWorkflows, isLoading: workflowsLoading } = useQuery({
        queryKey: ['conversational-workflows', 'completed'],
        queryFn: async () => {
            try {
                return await conversationalWorkflowService.getCompletedWorkflows();
            } catch (error) {
                console.error('Error fetching completed workflows:', error);
                return [] as WorkflowSummary[];
            }
        },
        onError: () => {
            toast({
                title: 'No se pudieron cargar los levantamientos',
                description: 'Reintenta en unos segundos o verifica tu conexión.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        },
    });

    // Fetch generated test cases
    const { data: testCasesList = [], isLoading: casesLoading, refetch: refetchCases } = useQuery<TestCaseData[]>({
        queryKey: ['testCases'],
        queryFn: async () => {
            try {
                const result = await testCasesApi.getAll();
                return Array.isArray(result) ? (result as TestCaseData[]) : [];
            } catch (error) {
                console.error('Error fetching test cases:', error);
                return [] as TestCaseData[];
            }
        },
        onError: () => {
            toast({
                title: 'No se pudieron cargar los casos de prueba',
                description: 'Intenta recargar la página o generar nuevamente.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        },
    });

    // Fetch projects as fallback when there are no completed analyses
    const { data: projects, isLoading: projectsLoading } = useQuery({
        queryKey: ['projects-completed'],
        queryFn: async () => {
            try {
                const result = await projectsApi.getCompleted();
                const payload = result?.data ?? result;
                if (Array.isArray(payload?.items)) return payload.items;
                if (Array.isArray(payload)) return payload;
                return [];
            } catch (err) {
                console.error('Error fetching projects fallback:', err);
                return [];
            }
        },
        onError: () => {
            toast({
                title: 'No se pudieron cargar los proyectos',
                description: 'Revisa tu conexión o vuelve a intentar.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        },
    });

    // Build select items preferring analyses, else projects
    const selectItems: SelectItem[] = (completedWorkflows && completedWorkflows.length > 0)
        ? (completedWorkflows as WorkflowSummary[]).map((w) => ({ id: w.id, name: w.name || w.title, type: 'analysis' }))
        : ((projects as ProjectData[] | undefined) || []).map((p) => ({ id: p.id, name: p.name || p.title, type: 'project' }));

    // Generate test cases mutation
    const generateTestCases = async (selectedId: string) => {
        if (!selectedId) return;

        setIsGenerating(true);
        try {
            const [type, id] = selectedId.includes(':')
                ? (selectedId.split(':', 2) as ['analysis' | 'project', string])
                : ['analysis', selectedId];

            const payload = type === 'analysis' ? { conversationalAnalysisId: id } : { projectId: id };
            const result = await testCasesApi.generate(payload);
            const generatedCount = Array.isArray(result.testCases) ? result.testCases.length : 0;

            toast({
                title: 'Casos de prueba generados',
                description: result.message || `Se generaron ${generatedCount} casos de prueba exitosamente`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            refetchCases();
            onGenerateClose();
            setSelectedProjectId('');
        } catch (error) {
            const description = (error as any)?.response?.data?.error || (error instanceof Error ? error.message : 'Error al generar casos de prueba');
            toast({
                title: 'Error',
                description,
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

    const normalizedTestCases = useMemo(() => {
        if (!Array.isArray(testCasesList)) return [] as TestCaseData[];
        return (testCasesList as TestCaseData[]).map((tc) => ({
            ...tc,
            createdAt: tc.createdAt || new Date().toISOString(),
        }));
    }, [testCasesList]);

    const groupedTestCases = useMemo(() => {
        return normalizedTestCases.reduce((groups: Record<string, ProjectGroup>, testCase: TestCaseData) => {
            const projectId = testCase.conversationalAnalysis?.id || 'sin-analisis';
            const projectName = testCase.conversationalAnalysis?.title || 'Análisis sin título';

            if (!groups[projectId]) {
                groups[projectId] = {
                    id: projectId,
                    name: projectName,
                    items: [],
                };
            }

            groups[projectId].items.push(testCase);
            return groups;
        }, {} as Record<string, ProjectGroup>);
    }, [normalizedTestCases]);

    useEffect(() => {
        if (normalizedTestCases.length > 0 && expandedProjects.size === 0) {
            setExpandedProjects(new Set(Object.keys(groupedTestCases)));
        }
    }, [normalizedTestCases, groupedTestCases, expandedProjects.size]);

    const formatPriority = (priority?: string) => {
        const level = (priority || 'MEDIUM').toUpperCase();
        const colorMap: Record<string, string> = {
            LOW: 'green',
            MEDIUM: 'blue',
            HIGH: 'orange',
            CRITICAL: 'red',
        };
        const color = colorMap[level] || 'gray';
        return <Badge colorScheme={color}>{level}</Badge>;
    };

    const formatStatus = (status?: string) => {
        if (!status) return 'PENDING';
        return status.replace(/_/g, ' ');
    };

    const isLoading = workflowsLoading || projectsLoading || casesLoading;

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
                                        {normalizedTestCases.length}
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
                                        {normalizedTestCases.length}
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
                                        {(completedWorkflows?.length && completedWorkflows.length > 0)
                                            ? completedWorkflows.length
                                            : (projects?.length || 0)}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                        {(completedWorkflows?.length && completedWorkflows.length > 0)
                                            ? 'Levantamientos Disponibles'
                                            : 'Proyectos Disponibles'}
                                    </Text>
                                </VStack>
                            </CardBody>
                        </Card>
                    </SimpleGrid>
                </Box>

                {/* Test Cases Content */}
                {normalizedTestCases.length > 0 ? (
                    <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between">
                            <Text fontSize="lg" fontWeight="semibold">
                                Casos de Prueba ({normalizedTestCases.length})
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
                                                            <Th>Análisis</Th>
                                                            <Th>Prioridad</Th>
                                                            <Th>Estado</Th>
                                                            <Th>Descripción</Th>
                                                            <Th>Creado</Th>
                                                            <Th width="50px">Acciones</Th>
                                                        </Tr>
                                                    </Thead>
                                                    <Tbody>
                                                        {group.items.map((testCase: TestCaseData) => (
                                                            <Tr key={testCase.id} _hover={{ bg: 'gray.50' }}>
                                                                <Td>
                                                                    <VStack align="start" spacing={1}>
                                                                        <HStack spacing={2}>
                                                                            <Icon as={FiCpu} color="purple.500" />
                                                                            <Text fontWeight="semibold">
                                                                                {testCase.conversationalAnalysis?.title || 'Análisis conversacional'}
                                                                            </Text>
                                                                        </HStack>
                                                                        {testCase.conversationalAnalysis?.status && (
                                                                            <Badge colorScheme="purple" variant="subtle">
                                                                                {testCase.conversationalAnalysis.status}
                                                                            </Badge>
                                                                        )}
                                                                    </VStack>
                                                                </Td>
                                                                <Td>{formatPriority(testCase.priority)}</Td>
                                                                <Td>
                                                                    <Badge colorScheme="gray" variant="outline">
                                                                        {formatStatus(testCase.reviewStatus)}
                                                                    </Badge>
                                                                </Td>
                                                                <Td>
                                                                    <Text fontWeight="medium" noOfLines={2}>
                                                                        {testCase.title || testCase.description || 'Caso de prueba'}
                                                                    </Text>
                                                                </Td>
                                                                <Td>
                                                                    <Text fontSize="sm" color="gray.500">
                                                                        {testCase.createdAt ? new Date(testCase.createdAt).toLocaleDateString() : '-'}
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
