import {
    Box,
    Button,
    Heading,
    Badge,
    useDisclosure,
    useColorModeValue,
    VStack,
    HStack,
    Text,
    Card,
    CardBody,
    Progress,
    Icon,
    IconButton,
    useToast,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay
} from '@chakra-ui/react';
import { FiPlus, FiFolder, FiCalendar, FiPlay, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useApiQuery } from '../hooks/useApi';
import type { Analysis } from '../types/api';
import CreateProjectModal from '../components/CreateProjectModal';
import ProjectChatModal from '../components/ProjectChatModal';
import ProjectDescriptionModal from '../components/ProjectDescriptionModal';
import Loading from '../components/Loading';
import AnalysisViewerModal from '../components/AnalysisViewerModal';
import EditAnalysisModal from '../components/EditAnalysisModal';

export default function Projects() {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const [selectedProject, setSelectedProject] = useState<{id: string, title: string, description: string} | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [skipAutoSend, setSkipAutoSend] = useState(false);
    // const [recentlyStarted, setRecentlyStarted] = useState(false);
    const [isAnalysisViewerOpen, setIsAnalysisViewerOpen] = useState(false);
    const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
    const [isEditAnalysisOpen, setIsEditAnalysisOpen] = useState(false);
    const [chatKey, setChatKey] = useState(0); // Para forzar remount del chat
    const [attachedRequirement, setAttachedRequirement] = useState<string | undefined>(undefined);
    const [initialAssistantMessage, setInitialAssistantMessage] = useState<string | undefined>(undefined);
    const [projectToDelete, setProjectToDelete] = useState<{id: string, title: string} | null>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const toast = useToast();
    const queryClient = useQueryClient();

    // Fetch proyectos en progreso  
    const { data: inProgressResponse, isLoading: inProgressLoading } = useApiQuery<{status: string, data: Analysis[]}>(
        ['in-progress-projects'], 
        '/projects/in-progress'
    );
    
    // Fetch proyectos completados
    const { data: completedResponse, isLoading: completedLoading } = useApiQuery<{status: string, data: Analysis[]}>(
        ['completed-projects'], 
        '/projects/completed'
    );

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const isDev = import.meta.env.DEV === true;

    const extractItems = (resp: any) => {
        const payload = resp?.data ?? resp;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.items)) return payload.items;
        return [] as Analysis[];
    };

    const normalizeAnalysis = (proj: any): Analysis & { progress?: number } => {
        const completeness = proj?.progress ?? proj?.completeness;
        const progress = typeof completeness === 'number'
            ? completeness
            : typeof completeness?.overallScore === 'number'
                ? completeness.overallScore
                : 0;

        return {
            id: proj?.id ?? '',
            title: proj?.title ?? proj?.name ?? 'Proyecto',
            name: proj?.name ?? proj?.title ?? 'Proyecto',
            description: proj?.description ?? proj?.requirement ?? '',
            status: (proj?.status ?? 'IN_PROGRESS').toString(),
            createdAt: proj?.createdAt ?? new Date().toISOString(),
            updatedAt: proj?.updatedAt ?? proj?.createdAt ?? new Date().toISOString(),
            projectId: proj?.projectId,
            hasTestCases: !!proj?.hasTestCases,
            requirement: proj?.requirement,
            summary: proj?.summary,
            redFlags: proj?.redFlags,
            questions: proj?.questions,
            testStrategies: proj?.testStrategies,
            results: proj?.results,
            progress
        };
    };

    const getAnalysisProgress = (analysis: Analysis & { progress?: number }) => {
        const candidate = analysis.progress ?? (analysis as any).completeness;
        if (typeof candidate === 'number') return candidate;
        if (candidate && typeof candidate.overallScore === 'number') return candidate.overallScore;
        return 0;
    };

    if (inProgressLoading || completedLoading) {
        return <Loading message="Cargando proyectos..." />;
    }

    const inProgressProjects = extractItems(inProgressResponse).map(normalizeAnalysis);
    const completedProjects = extractItems(completedResponse).map(normalizeAnalysis);

    // Debug logs to help diagnose why lists are empty
    console.debug('Projects page - inProgressResponse:', inProgressResponse);
    console.debug('Projects page - completedResponse:', completedResponse);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'green';
            case 'in_progress':
                return 'orange'; // Cambiado de 'blue' a 'orange'
            case 'ready_to_advance':
                return 'orange';
            case 'paused':
                return 'yellow';
            case 'archived':
                return 'gray';
            default:
                return 'orange'; // Cambiado de 'blue' a 'orange'
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
            case 'paused':
                return 'PAUSADO';
            case 'archived':
                return 'ARCHIVADO';
            default:
                return 'EN PROGRESO';
        }
    };

    const getProgressValue = (status: string, completeness: number = 0) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 100;
            case 'in_progress':
                return Math.max(10, completeness); // Mínimo 10% para proyectos en progreso
            case 'ready_to_advance':
                return Math.max(75, completeness); // Proyectos listos para avanzar
            default:
                return completeness;
        }
    };

    const handleProjectClick = (analysis: Analysis) => {
        // Si está en progreso, abrir el chat modal
        if (analysis.status?.toLowerCase() === 'in_progress' || analysis.status?.toLowerCase() === 'ready_to_advance') {
            setSelectedProject({
                id: analysis.id,
                title: analysis.title || analysis.name || 'Proyecto',
                description: analysis.description || 'Proyecto en análisis'
            });
            setInitialAssistantMessage(undefined);
            setIsChatOpen(true);
        } else {
            // Si está completado, podríamos mostrar los resultados o abrir en modo solo lectura
            // Abrir el viewer de análisis para permitir editar/revisar levantamiento antes de enviarlo al chat
            setSelectedProject({
                id: analysis.id,
                title: analysis.title || analysis.name || 'Proyecto',
                description: analysis.description || 'Proyecto completado'
            });
            setInitialAssistantMessage(undefined);
            // Open both viewer and chat so the user can edit the levantamiento and immediately use the chat
            setIsAnalysisViewerOpen(true);
            setIsChatOpen(true);
        }
    };

    const handleDeleteProject = (project: Analysis) => {
        setProjectToDelete({
            id: project.id,
            title: project.title || project.name || 'Proyecto'
        });
        onDeleteOpen();
    };

    const confirmDeleteProject = () => {
        if (projectToDelete) {
            // Usar la instancia del hook pero con URL dinámica
            const deleteUrl = `/projects/${projectToDelete.id}`;
            
            // Crear una nueva mutation con la URL específica
        // Obtener token usando la misma clave que la instancia `api` (fallback a 'token' para compatibilidad)
        (async () => {
            try {
                await api.delete(deleteUrl);
                toast({ title: 'Proyecto eliminado', description: 'El proyecto se ha eliminado exitosamente', status: 'success', duration: 3000, isClosable: true });
                onDeleteClose();
                setProjectToDelete(null);
                // Invalidate react-query caches so UI refreshes without full reload
                queryClient.invalidateQueries({ queryKey: ['in-progress-projects'] });
                queryClient.invalidateQueries({ queryKey: ['completed-projects'] });
            } catch (error) {
                toast({ title: 'Error eliminando proyecto', description: error instanceof Error ? error.message : 'Por favor intenta de nuevo', status: 'error', duration: 5000, isClosable: true });
            }
        })();
        }
    };

    const getActionButton = (analysis: Analysis) => {
        const isInProgress = analysis.status?.toLowerCase() === 'in_progress' ||
            analysis.status?.toLowerCase() === 'ready_to_advance';

        if (isInProgress) {
            return (
                <HStack spacing={2}>
                    <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<FiPlay />}
                        onClick={(e) => {
                            e.stopPropagation();
                            // If the draft has no description, open the description modal
                            setSelectedProject({
                                id: analysis.id,
                                title: analysis.title || analysis.name || 'Proyecto',
                                description: analysis.description || ''
                            });
                            if (!analysis.description) {
                                setIsDescriptionOpen(true);
                            } else {
                                setIsChatOpen(true);
                            }
                        }}
                    >
                        Continuar
                    </Button>
                    <IconButton
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        aria-label="Eliminar proyecto"
                        icon={<FiTrash2 />}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(analysis);
                        }}
                    />
                </HStack>
            );
        } else {
            return (
                <HStack spacing={2}>
            <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<FiCheckCircle />}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProject({
                                id: analysis.id,
                                title: analysis.title || analysis.name || 'Proyecto',
                                description: analysis.description || 'Proyecto completado'
                            });
                            // Abrir el nuevo modal de edición de análisis
                            setIsEditAnalysisOpen(true);
                        }}
                    >
                        Ver Análisis
                    </Button>
                    <IconButton
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        aria-label="Eliminar proyecto"
                        icon={<FiTrash2 />}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(analysis);
                        }}
                    />
                </HStack>
            );
        }
    };

    const handleChatClose = () => {
        setIsChatOpen(false);
        setSelectedProject(null);
        setSkipAutoSend(false);
        setInitialAssistantMessage(undefined);
        setAttachedRequirement(undefined);
        // Refresh lists via react-query (preferred to full reload)
        queryClient.invalidateQueries({ queryKey: ['in-progress-projects'] });
        queryClient.invalidateQueries({ queryKey: ['completed-projects'] });
    };

    return (
        <Box maxWidth="1200px" mx="auto" px={6} py={8}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={8}>
                <Heading>Proyectos</Heading>
                <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    onClick={onOpen}
                    size="md"
                >
                    Nuevo Proyecto
                </Button>
            </Box>

            {/* Mostrar proyectos en progreso primero */}
            {inProgressProjects.length > 0 && (
                <Box mb={8}>
                    <Heading size="md" mb={6} color="orange.600">
                        En Progreso ({inProgressProjects.length})
                    </Heading>
                    <Box 
                        display="grid" 
                        gridTemplateColumns="repeat(auto-fit, minmax(400px, 1fr))" 
                        gap={6}
                    >
                        {inProgressProjects.map((analysis: Analysis & { progress?: number }) => {
                            const progress = getProgressValue(analysis.status, getAnalysisProgress(analysis));
                            const statusColorScheme = getStatusColor(analysis.status);
                            const statusText = getStatusText(analysis.status);
                            return (
                                <Card
                                    key={analysis.id}
                                    bg={bgColor}
                                    borderColor={borderColor}
                                    borderWidth="1px"
                                    cursor="pointer"
                                    _hover={{
                                        borderColor: `${statusColorScheme}.300`,
                                        transform: 'translateY(-2px)',
                                        boxShadow: 'lg'
                                    }}
                                    transition="all 0.2s"
                                    onClick={() => handleProjectClick(analysis)}
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
                                                            {analysis.title || analysis.name}
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
                                                    {analysis.hasTestCases && (
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
                                                        <Text>
                                                            Iniciado: {new Date(analysis.createdAt).toLocaleDateString('es-ES')}
                                                        </Text>
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
                                                    {getActionButton(analysis)}
                                                    <Text fontSize="xs" color="gray.500">
                                                        {new Date(analysis.updatedAt || analysis.createdAt).toLocaleDateString('es-ES')}
                                                    </Text>
                                                </HStack>
                                            </VStack>
                                        </HStack>
                                    </CardBody>
                                </Card>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {/* Mostrar proyectos completados */}
            {completedProjects.length > 0 && (
                <Box mb={8}>
                    <Heading size="md" mb={6} color="green.600">
                        Completados ({completedProjects.length})
                    </Heading>
                    <Box 
                        display="grid" 
                        gridTemplateColumns="repeat(auto-fit, minmax(400px, 1fr))" 
                        gap={6}
                    >
                        {completedProjects.map((analysis: Analysis & { progress?: number }) => {
                            const progress = Math.max(90, getAnalysisProgress(analysis) || 0);
                            // Forzar esquema verde para proyectos completados
                            const statusColorScheme = 'green';
                            const statusText = getStatusText(analysis.status || 'completed');
                            return (
                                <Card
                                    key={analysis.id}
                                    bg={bgColor}
                                    borderColor={borderColor}
                                    borderWidth="1px"
                                    cursor="pointer"
                                    _hover={{
                                        borderColor: `${statusColorScheme}.300`,
                                        transform: 'translateY(-2px)',
                                        boxShadow: 'lg'
                                    }}
                                    transition="all 0.2s"
                                    onClick={() => handleProjectClick(analysis)}
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
                                                            {analysis.title || analysis.name}
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
                                                    {analysis.hasTestCases && (
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
                                                <HStack spacing={4} fontSize="xs" color="gray.500" align="start">
                                                    <VStack align="start" spacing={0}>
                                                        <Text fontSize="sm" fontWeight="semibold">Análisis Completo</Text>
                                                        <Text fontSize="xs" color="gray.500">
                                                            Completado: {new Date(analysis.updatedAt || analysis.createdAt).toLocaleDateString('es-ES')}
                                                        </Text>
                                                    </VStack>
                                                    {/* Show requirement / epic excerpt if available */}
                                                    {analysis.requirement && (
                                                        <Text fontSize="sm" color="gray.600" noOfLines={2} flex="1">
                                                            {analysis.requirement}
                                                        </Text>
                                                    )}
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
                                                        {progress}%
                                                    </Text>
                                                </HStack>
                                                <HStack spacing={2}>
                                                    {getActionButton(analysis)}
                                                    <Text fontSize="xs" color="gray.500">
                                                        {new Date(analysis.updatedAt || analysis.createdAt).toLocaleDateString('es-ES')}
                                                    </Text>
                                                </HStack>
                                            </VStack>
                                        </HStack>
                                    </CardBody>
                                </Card>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {/* Mensaje cuando no hay proyectos */}
            {inProgressProjects.length === 0 && completedProjects.length === 0 && (
                <VStack spacing={4} py={8}>
                    <Icon as={FiFolder} w={12} h={12} color="gray.400" />
                    <Text fontSize="lg" color="gray.500">
                        No hay proyectos creados
                    </Text>
                    <Text fontSize="sm" color="gray.400" textAlign="center">
                        Comienza creando tu primer proyecto para organizar tus análisis y pruebas.
                    </Text>
                    <Button
                        leftIcon={<FiPlus />}
                        colorScheme="blue"
                        onClick={onOpen}
                        size="sm"
                    >
                        Crear Primer Proyecto
                    </Button>
                    {/* DEBUG PANEL: show raw API responses when empty to diagnose issues (DEV only) */}
                    {isDev && (
                        <Box width="full" mt={4} p={4} bg={bgColor} borderRadius="md" borderColor={borderColor} borderWidth={1}>
                            <Heading size="sm" mb={2}>Debug API Responses</Heading>
                            <Text fontSize="xs" color="gray.500">inProgressResponse</Text>
                            <Box as="pre" fontSize="xs" bg="gray.50" p={2} borderRadius="md" maxH="160px" overflowY="auto">
                                {JSON.stringify(inProgressResponse, null, 2)}
                            </Box>
                            <Text fontSize="xs" color="gray.500" mt={2}>completedResponse</Text>
                            <Box as="pre" fontSize="xs" bg="gray.50" p={2} borderRadius="md" maxH="160px" overflowY="auto">
                                {JSON.stringify(completedResponse, null, 2)}
                            </Box>
                        </Box>
                    )}
                </VStack>
            )}

            <CreateProjectModal 
                isOpen={isOpen} 
                onClose={onClose} 
                onCreated={(project) => {
                    // Optimistic insert into in-progress projects cache
                    try {
                        type ApiResp = { status: string; data: Analysis[] };
                        const existing = queryClient.getQueryData<ApiResp>(['in-progress-projects']);
                        if (existing && Array.isArray(existing.data)) {
                            const newItem: Analysis = {
                                id: project.id,
                                title: project.title,
                                description: project.description,
                                status: 'IN_PROGRESS',
                                createdAt: project.createdAt || new Date().toISOString(),
                                updatedAt: project.createdAt || new Date().toISOString(),
                                hasTestCases: false,
                                requirement: undefined,
                                results: undefined,
                            } as Analysis;
                            queryClient.setQueryData(['in-progress-projects'], { ...existing, data: [newItem, ...existing.data] });
                        } else {
                            // If not cached yet, just invalidate so it will fetch next
                            queryClient.invalidateQueries({ queryKey: ['in-progress-projects'] });
                        }
                    } catch {
                        queryClient.invalidateQueries({ queryKey: ['in-progress-projects'] });
                    }
                }}
                onProjectStarted={(project) => {
                    // Automatically open chat when project is created and started
                    setSelectedProject({
                        id: project.id,
                        title: project.title,
                        description: project.description
                    });
                    setInitialAssistantMessage(undefined);
                    setSkipAutoSend(false); // Allow auto-send since this is a new project
                    setIsChatOpen(true);
                }}
            />

            {/* Modal de Chat para proyectos existentes */}
            {selectedProject && (
                <ProjectChatModal
                    key={`chat-${selectedProject.id}-${chatKey}`} // Forzar remount cuando cambie chatKey
                    isOpen={isChatOpen}
                    onClose={handleChatClose}
                    project={selectedProject}
                    initialMessage={selectedProject?.description || ''}
                    initialAssistantMessage={initialAssistantMessage}
                    skipAutoSend={skipAutoSend}
                    attachedRequirement={attachedRequirement}
                    // No ocultar historial para poder ver la conversación nueva
                    hideHistory={false}
                    onCompleted={() => {
                        // Called when the modal successfully marks the project as completed
                        queryClient.invalidateQueries({ queryKey: ['in-progress-projects'] });
                        queryClient.invalidateQueries({ queryKey: ['completed-projects'] });
                        setIsChatOpen(false);
                        setSelectedProject(null);
                    }}
                />
            )}

            {/* Modal para editar/añadir la descripción antes de iniciar la IA */}
            <ProjectDescriptionModal
                isOpen={isDescriptionOpen}
                onClose={() => { setIsDescriptionOpen(false); setSelectedProject(null); }}
                project={selectedProject}
                onStarted={(resp) => {
                    // resp is expected to be the API response containing the project/analysis
                    setIsDescriptionOpen(false);
                    // Normalize response body safely with a minimal type
                    type RespBody = { project?: unknown; alreadyStarted?: boolean } | unknown;
                    const body = (resp && typeof resp === 'object' && 'data' in resp) ? (resp as unknown as { data: RespBody }).data : (resp as unknown);

                    // Extract project and assistant message if present
                    try {
                        const project = (body as any)?.project || body;
                        if (project && typeof project === 'object') {
                            setSelectedProject({ id: project.id, title: project.title || project.name || 'Proyecto', description: project.description || '' });
                            if (Array.isArray(project.messages)) {
                                const firstAssistant = project.messages.find((m: { role?: string; content?: string }) => (m.role || '').toLowerCase() === 'assistant');
                                if (firstAssistant?.content) setInitialAssistantMessage(firstAssistant.content);
                                else setInitialAssistantMessage(undefined);
                            } else {
                                setInitialAssistantMessage(undefined);
                            }
                        }
                    } catch {
                        setInitialAssistantMessage(undefined);
                    }

                    // If backend indicates the analysis was already started, skip client auto-send
                    const already = !!((body as any) && ((body as any).alreadyStarted !== undefined) ? (body as any).alreadyStarted : false);
                    setSkipAutoSend(already);
                    // Delay opening the chat a tick so the skipAutoSend and initialAssistantMessage
                    // state updates propagate to the modal before it mounts. This prevents a
                    // race where the modal mounts with stale props and auto-sends the initial
                    // message, causing a duplicate AI call.
                    setTimeout(() => setIsChatOpen(true), 50);

                    // Refresh lists so UI updates
                    queryClient.invalidateQueries({ queryKey: ['in-progress-projects'] });
                    queryClient.invalidateQueries({ queryKey: ['completed-projects'] });
                }}
            />

            {/* Modal para ver/editar el resumen IA */}
            {selectedProject && (
                <AnalysisViewerModal
                    isOpen={isAnalysisViewerOpen}
                    onClose={() => { setIsAnalysisViewerOpen(false); setSelectedProject(null); }}
                    workflowId={selectedProject.id}
                    onLoadSummary={(content: string) => {
                        // Store the latest summary so ProjectChatModal can attach it to outgoing messages
                        setAttachedRequirement(content);
                    }}
                />
            )}

            {/* Modal para editar análisis de proyectos completados */}
            {selectedProject && (
                <EditAnalysisModal
                    isOpen={isEditAnalysisOpen}
                    onClose={(clearProject = true) => {
                        setIsEditAnalysisOpen(false);
                        if (clearProject) {
                            setSelectedProject(null);
                        }
                    }}
                    projectId={selectedProject.id}
                    projectTitle={selectedProject.title}
                    onAnalysisUpdated={(analysis) => {
                        // Actualizar cualquier estado local si es necesario
                        console.log('Analysis updated:', analysis);
                    }}
                    onRestartChat={(projectId) => {
                        // Configurar proyecto para chat inmediato
                        setSelectedProject(prev => prev ? {...prev, id: projectId} : null);
                        setSkipAutoSend(false); // Permitir interacción normal con la IA
                        setInitialAssistantMessage(undefined); // No mostrar mensaje asistente previo
                        setAttachedRequirement(undefined); // Limpiar requisito adjunto
                        
                        // Forzar remount del chat para cargar mensajes nuevos
                        setChatKey(prev => prev + 1);
                        
                        // Abrir chat inmediatamente
                        setIsChatOpen(true);
                        
                        // Invalidar caches para actualizar la UI
                        queryClient.invalidateQueries({ queryKey: ['in-progress-projects'] });
                        queryClient.invalidateQueries({ queryKey: ['completed-projects'] });
                    }}
                />
            )}

            {/* AlertDialog para confirmar eliminación */}
            <AlertDialog
                isOpen={isDeleteOpen}
                leastDestructiveRef={cancelRef}
                onClose={onDeleteClose}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Eliminar Proyecto
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            ¿Estás seguro de que quieres eliminar el proyecto "{projectToDelete?.title}"?
                            Esta acción no se puede deshacer.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={onDeleteClose}>
                                Cancelar
                            </Button>
                            <Button 
                                colorScheme="red" 
                                onClick={confirmDeleteProject} 
                                ml={3}
                            >
                                Eliminar
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
} 