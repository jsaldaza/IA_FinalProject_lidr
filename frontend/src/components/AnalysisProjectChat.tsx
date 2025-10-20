import {
    Box,
    VStack,
    HStack,
    Button,
    Text,
    Heading,
    Card,
    CardBody,
    IconButton,
    useToast,
    Spinner,
    Badge,
    Textarea
} from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiSend, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { useApiMutation, useApiQuery } from '../hooks/useApi';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface Project {
    id: string;
    title: string;
    description: string;
    status: string;
    phase?: string;
    progress?: number;
    createdAt: string;
    updatedAt: string;
}

interface ChatResponse {
    status: string;
    data: {
        message: Message;
        timestamp: string;
    };
}

export default function AnalysisProjectChat() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [project, setProject] = useState<Project | null>(null);

interface ProjectStatusResponse {
    id: string;
    title: string;
    description: string;
    status: string;
    phase: string;
    progress: number;
    createdAt: string;
    updatedAt: string;
}

// Obtener información del proyecto
const { data: projectData, isLoading: projectLoading } = useApiQuery<ProjectStatusResponse>(
    ['project-status', projectId || ''],
    `/projects/${projectId}/status`,
    { enabled: !!projectId }
);

    // Mutation para enviar mensajes
    const sendMessageMutation = useApiMutation<ChatResponse, {content: string}>(
        `/projects/${projectId}/chat`,
        'POST',
        {
            onSuccess: (response) => {
                // Agregar respuesta del asistente
                setMessages(prev => [...prev, response.data.data.message]);
                scrollToBottom();
            },
            onError: (error: Error) => {
                toast({
                    title: 'Error enviando mensaje',
                    description: error.message || 'Por favor intenta de nuevo',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    );

    // Mutation para completar proyecto
    const completeProjectMutation = useApiMutation<{status: string}, Record<string, never>>(
        `/projects/${projectId}/complete`,
        'POST',
        {
            onSuccess: () => {
                toast({
                    title: 'Proyecto completado',
                    description: 'El análisis se ha completado exitosamente',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                // Actualizar el estado del proyecto
                if (project) {
                    setProject({...project, status: 'COMPLETED'});
                }
            },
            onError: (error: Error) => {
                toast({
                    title: 'Error completando proyecto',
                    description: error.message || 'Por favor intenta de nuevo',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    );

    useEffect(() => {
        if (projectData?.data) {
            // Mapear la respuesta del backend a nuestro objeto Project
            const responseData = projectData.data;
            const projectInfo: Project = {
                id: responseData.id,
                title: responseData.title,
                description: responseData.description,
                status: responseData.status,
                phase: responseData.phase,
                progress: responseData.progress,
                createdAt: responseData.createdAt,
                updatedAt: responseData.updatedAt
            };
            setProject(projectInfo);
        }
    }, [projectData]);

    useEffect(() => {
        // Si viene del modal con datos del proyecto
        if (location.state?.project) {
            setProject(location.state.project);
        }
    }, [location.state]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        const userMessage: Message = {
            role: 'user',
            content: message.trim(),
            timestamp: new Date().toISOString()
        };

        // Agregar mensaje del usuario inmediatamente
        setMessages(prev => [...prev, userMessage]);
        setMessage('');
        scrollToBottom();

        // Enviar al backend
        sendMessageMutation.mutate({ content: userMessage.content });
    };

    const handleCompleteProject = () => {
        completeProjectMutation.mutate({} as Record<string, never>);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'green';
            case 'in_progress':
                return 'blue';
            default:
                return 'gray';
        }
    };

    const getStatusText = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'COMPLETADO';
            case 'in_progress':
                return 'EN PROGRESO';
            default:
                return 'INICIANDO';
        }
    };

    if (projectLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                <VStack spacing={4}>
                    <Spinner size="lg" />
                    <Text>Cargando proyecto...</Text>
                </VStack>
            </Box>
        );
    }

    return (
        <Box height="100vh" display="flex" flexDirection="column">
            {/* Header */}
            <Box bg="white" borderBottom="1px solid" borderColor="gray.200" p={4}>
                <HStack spacing={4} justify="space-between">
                    <HStack spacing={4}>
                        <IconButton
                            aria-label="Volver"
                            icon={<FiArrowLeft />}
                            variant="ghost"
                            onClick={() => navigate('/projects')}
                        />
                        <VStack align="start" spacing={1}>
                            <Heading size="md">{project?.title || 'Cargando...'}</Heading>
                            <HStack spacing={2}>
                                <Badge colorScheme={getStatusColor(project?.status || '')}>
                                    {getStatusText(project?.status || '')}
                                </Badge>
                                <Text fontSize="sm" color="gray.500">
                                    Proyecto: {projectId}
                                </Text>
                            </HStack>
                        </VStack>
                    </HStack>

                    {project?.status?.toLowerCase() === 'in_progress' && (
                        <Button
                            leftIcon={<FiCheckCircle />}
                            colorScheme="green"
                            onClick={handleCompleteProject}
                            isLoading={completeProjectMutation.isPending}
                        >
                            Completar Proyecto
                        </Button>
                    )}
                </HStack>
            </Box>

            {/* Messages Area */}
            <Box flex="1" overflow="hidden" bg="gray.50">
                <VStack 
                    spacing={4} 
                    align="stretch" 
                    p={4} 
                    height="100%" 
                    overflowY="auto"
                >
                    {messages.length === 0 && (
                        <Card>
                            <CardBody>
                                <VStack spacing={3} textAlign="center">
                                    <Text fontSize="lg" fontWeight="bold">
                                        ¡Bienvenido al Chat de Análisis!
                                    </Text>
                                    <Text color="gray.600">
                                        Aquí puedes conversar con la IA para analizar tu proyecto "{project?.title}".
                                        Puedes hacer preguntas sobre requisitos, casos de prueba, estrategias de testing y más.
                                    </Text>
                                    <Text fontSize="sm" color="gray.500">
                                        Comienza escribiendo un mensaje abajo...
                                    </Text>
                                </VStack>
                            </CardBody>
                        </Card>
                    )}

                    {messages.map((msg, index) => (
                        <Card key={index} variant={msg.role === 'user' ? 'elevated' : 'outline'}>
                            <CardBody>
                                <VStack align="start" spacing={2}>
                                    <HStack justify="space-between" width="100%">
                                        <Badge colorScheme={msg.role === 'user' ? 'blue' : 'purple'}>
                                            {msg.role === 'user' ? 'Usuario' : 'IA Assistant'}
                                        </Badge>
                                        <Text fontSize="xs" color="gray.500">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </Text>
                                    </HStack>
                                    <Text whiteSpace="pre-wrap">{msg.content}</Text>
                                </VStack>
                            </CardBody>
                        </Card>
                    ))}

                    {sendMessageMutation.isPending && (
                        <Card variant="outline">
                            <CardBody>
                                <HStack spacing={3}>
                                    <Spinner size="sm" />
                                    <Text color="gray.500">La IA está escribiendo...</Text>
                                </HStack>
                            </CardBody>
                        </Card>
                    )}

                    <div ref={messagesEndRef} />
                </VStack>
            </Box>

            {/* Input Area */}
            <Box bg="white" borderTop="1px solid" borderColor="gray.200" p={4}>
                <HStack spacing={3}>
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Escribe tu mensaje aquí..."
                        resize="none"
                        rows={2}
                        isDisabled={sendMessageMutation.isPending || project?.status?.toLowerCase() === 'completed'}
                    />
                    <Button
                        leftIcon={<FiSend />}
                        colorScheme="blue"
                        onClick={handleSendMessage}
                        isLoading={sendMessageMutation.isPending}
                        isDisabled={!message.trim() || sendMessageMutation.isPending || project?.status?.toLowerCase() === 'completed'}
                    >
                        Enviar
                    </Button>
                </HStack>
                {project?.status?.toLowerCase() === 'completed' && (
                    <Text fontSize="sm" color="gray.500" mt={2}>
                        Este proyecto ha sido completado. No se pueden enviar más mensajes.
                    </Text>
                )}
            </Box>
        </Box>
    );
}
