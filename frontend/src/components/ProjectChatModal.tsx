import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    VStack,
    HStack,
    Text,
    Card,
    CardBody,
    useToast,
    Spinner,
    Badge,
    Textarea,
    Box,
    Heading
} from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'react';
import { conversationalWorkflowService } from '../services/conversationalWorkflow.service';
import { FiSend, FiCheckCircle } from 'react-icons/fi';
import { useApiMutation } from '../hooks/useApi';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

type MessageLike = { role?: string; content?: unknown };

interface ProjectChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: {
        id: string;
        title: string;
        description: string;
    };
    initialMessage: string; // El contenido de "Información del proyecto"
    initialAssistantMessage?: string; // Optional seed: assistant message (IA) to resume conversation from
    attachedRequirement?: string; // Optional: requirement/summary to attach to outgoing messages
    skipAutoSend?: boolean; // When true, do not auto-send the initialMessage as a user message (used after start API)
    onCompleted?: () => void; // callback to notify parent that project was completed
    hideHistory?: boolean; // when true, do not render message history; only show assistant seed / last assistant
}

interface ChatResponse {
    status: string;
    data: {
        message: unknown; // El servicio conversacional puede devolver diferentes estructuras
        timestamp: string;
    };
}

// Partial typing for backend workflow status response used when loading history
interface WorkflowStatusResponse {
    id: string;
    title?: string;
    description?: string;
    messages?: Array<{ content?: string; role?: string; timestamp?: string }>;
    initialAssistantMessage?: string;
}

export default function ProjectChatModal({ isOpen, onClose, project, initialMessage, initialAssistantMessage, attachedRequirement, skipAutoSend = false, onCompleted, hideHistory = false }: ProjectChatModalProps) {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [assistantSeedContent, setAssistantSeedContent] = useState<string | undefined>(undefined);
    // no longer tracking initialAssistantSeeded separately
    const [isCompleted, setIsCompleted] = useState(false);
    const [hasSentInitialMessage, setHasSentInitialMessage] = useState(false);
    const toast = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Mutation para enviar mensajes (acepta formato legacy y nuevo)
    type SendMessagePayload = 
        | { content: string; messageType?: string }
        | { instruction: string; requirement?: string; messageType?: string };
    
    const sendMessageMutation = useApiMutation<ChatResponse, SendMessagePayload>(
        `/projects/${project.id}/chat`,
        'POST',
        {
            onSuccess: (response) => {
                console.log('✅ Chat response completa:', response);
                console.log('✅ Chat response.data:', response?.data);
                console.log('✅ Chat response.data.data:', response?.data?.data);
                
                // Manejar diferentes estructuras de respuesta
                let assistantMessage: Message;
                try {
                    // Intentar ambas estructuras: response.data.data.message
                    const messageData = (response?.data?.data as unknown as { message?: unknown })?.message ?? (response?.data as unknown as { message?: unknown })?.message;
                    console.log('✅ messageData:', messageData);
                    
                    if (messageData && typeof messageData === 'object') {
                        // El servicio processUserMessage devuelve: { aiResponse, messageType, category?, phaseComplete? }
                        if ('aiResponse' in messageData && messageData.aiResponse) {
                            assistantMessage = {
                                role: 'assistant',
                                content: String(messageData.aiResponse),
                                timestamp: new Date().toISOString()
                            };
                            console.log('✅ Usando aiResponse:', messageData.aiResponse);
                        } else if ((messageData as MessageLike).role && (messageData as MessageLike).content) {
                            // Si ya es un objeto Message
                            assistantMessage = messageData as Message;
                            console.log('✅ Usando mensaje formateado:', messageData);
                        } else if ('content' in messageData) {
                            // Si solo tiene content
                            assistantMessage = {
                                role: 'assistant',
                                content: String(messageData.content),
                                timestamp: new Date().toISOString()
                            };
                            console.log('✅ Usando content:', messageData.content);
                        } else {
                            // Convertir objeto completo a string para debug
                            assistantMessage = {
                                role: 'assistant',
                                content: JSON.stringify(messageData, null, 2),
                                timestamp: new Date().toISOString()
                            };
                            console.log('✅ Usando objeto completo como string');
                        }
                    } else if (typeof messageData === 'string') {
                        // Si es string directo
                        assistantMessage = {
                            role: 'assistant',
                            content: messageData,
                            timestamp: new Date().toISOString()
                        };
                        console.log('✅ Usando string directo:', messageData);
                    } else {
                        // Fallback con información de debug
                        assistantMessage = {
                            role: 'assistant',
                            content: `Respuesta recibida pero estructura inesperada. Tipo: ${typeof messageData}. Revisa la consola para más detalles.`,
                            timestamp: new Date().toISOString()
                        };
                        console.log('❌ Estructura inesperada, messageData:', messageData);
                    }
                    
                    console.log('✅ assistantMessage final:', assistantMessage);
                    setMessages(prev => {
                        const already = prev.some(m => m.role === 'assistant' && m.content.trim() === assistantMessage.content.trim());
                        if (already) return prev;
                        return [...prev, assistantMessage];
                    });
                    scrollToBottom();
                    
                } catch (error) {
                    console.error('❌ Error procesando respuesta del chat:', error);
                    toast({
                        title: 'Error procesando respuesta',
                        description: 'La respuesta se recibió pero no se pudo mostrar correctamente',
                        status: 'warning',
                        duration: 5000,
                        isClosable: true,
                    });
                }
            },
            onError: (error: Error) => {
                console.error('❌ Error en chat:', error);
                
                // Analizar tipo de error para mensaje más específico
                let errorMessage = 'Por favor intenta de nuevo';
                if (error.message?.includes('400')) {
                    errorMessage = 'El mensaje es muy largo o tiene formato inválido. Intenta con un mensaje más corto.';
                } else if (error.message?.includes('401')) {
                    errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
                } else if (error.message?.includes('429')) {
                    errorMessage = 'Demasiadas solicitudes. Espera unos momentos antes de enviar otro mensaje.';
                } else if (error.message?.includes('500')) {
                    errorMessage = 'Error interno del servidor. Por favor intenta más tarde.';
                }
                
                toast({
                    title: 'Error enviando mensaje',
                    description: errorMessage,
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    );

    // Mutation para completar proyecto
    const completeProjectMutation = useApiMutation<{status: string}, Record<string, never>>(
        `/projects/${project.id}/complete`,
        'POST',
        {
            onSuccess: () => {
                setIsCompleted(true);
                toast({
                    title: 'Proyecto completado',
                    description: 'El análisis se ha completado exitosamente',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                // Notify parent so it can move the project to completed list
                if (typeof onCompleted === 'function') {
                    try {
                        onCompleted();
                    } catch {
                        // ignore callback errors
                    }
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

    // Seed initial messages when modal opens
    useEffect(() => {
        if (!isOpen || hasSentInitialMessage) return;

            // On open, try to load the persisted conversation for this project
            // from the backend so the modal shows the full history that led it
            // to be 'EN PROGRESO'. This keeps the conversation trace visible
            // until the user clicks "Completar Proyecto".
            (async () => {
                try {
                    const ws = await conversationalWorkflowService.getWorkflowStatus(project.id) as unknown as WorkflowStatusResponse;
                    // ws.messages expected to be an array of { content, role, timestamp }
                    if (hideHistory) {
                        // When hiding history, prefer an explicit initialAssistantMessage from backend.
                        // If not present, fall back to the last assistant message from the persisted list.
                        if (ws?.initialAssistantMessage) {
                            setAssistantSeedContent(String(ws.initialAssistantMessage));
                        } else if (ws && Array.isArray(ws.messages) && ws.messages.length > 0) {
                            // Find last assistant message
                            const reversed = [...ws.messages].reverse();
                            const lastAssistant = reversed.find(m => (String(m.role || '').toLowerCase() === 'assistant'));
                            if (lastAssistant && lastAssistant.content) {
                                setAssistantSeedContent(String(lastAssistant.content));
                            } else {
                                setAssistantSeedContent(undefined);
                            }
                        } else {
                            setAssistantSeedContent(undefined);
                        }
                        // Keep messages empty to avoid showing the burned chat
                        setMessages([]);
                    } else {
                        if (ws && Array.isArray(ws.messages)) {
                            const srvMsgs = ws.messages.map((m) => ({
                                role: (String(m.role || '').toLowerCase() === 'user') ? 'user' : 'assistant',
                                content: String(m.content || ''),
                                timestamp: m.timestamp || new Date().toISOString()
                            } as Message));
                            setMessages(srvMsgs);

                            // If backend included an assistant seed as a separate prop, only show it
                            // when it's not already represented in the persisted messages. This
                            // prevents showing the same assistant response twice (as seed + message).
                            if (ws?.initialAssistantMessage) {
                                const seed = String(ws.initialAssistantMessage).trim();
                                const exists = srvMsgs.some(m => m.role === 'assistant' && m.content.trim() === seed);
                                if (!exists) {
                                    setAssistantSeedContent(seed);
                                } else {
                                    setAssistantSeedContent(undefined);
                                }
                            }
                        } else {
                            // Fallback: if no messages list returned but there's an assistant seed,
                            // use it as top readonly seed.
                            if (ws?.initialAssistantMessage) {
                                setAssistantSeedContent(String(ws.initialAssistantMessage));
                            }
                        }
                    }

                    // Mark handled so we don't try to re-seed or auto-send from client
                    setHasSentInitialMessage(true);
                } catch (err) {
                    // If fetching history fails, fallback to previous behavior: show seed if provided
                    if (initialAssistantMessage) setAssistantSeedContent(initialAssistantMessage);
                    setHasSentInitialMessage(true);
                    console.warn('Error loading workflow status/messages:', err);
                }
            })();
    }, [isOpen, initialMessage, initialAssistantMessage, hasSentInitialMessage, sendMessageMutation, attachedRequirement, skipAutoSend, project.id, hideHistory]);

    // Reset when modal closes
    useEffect(() => {
        if (!isOpen) {
            setMessages([]);
            setMessage('');
            setIsCompleted(false);
            setHasSentInitialMessage(false);
            setAssistantSeedContent(undefined);
        }
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!message.trim() || isCompleted) return;

        // Validar longitud del mensaje
        if (message.trim().length > 1800) {
            toast({
                title: 'Mensaje muy largo',
                description: 'El mensaje no puede exceder 1800 caracteres. Por favor, divídelo en mensajes más cortos.',
                status: 'warning',
                duration: 4000,
                isClosable: true
            });
            return;
        }

        const userMessage: Message = {
            role: 'user',
            content: message.trim(),
            timestamp: new Date().toISOString()
        };

        // Agregar mensaje del usuario inmediatamente
        setMessages(prev => [...prev, userMessage]);
        setMessage('');
        scrollToBottom();

        // Enviar al backend - usando formato legacy más simple
        const messagePayload = {
            content: userMessage.content,
            messageType: 'USER_RESPONSE'
        };
        
        // Si hay un requerimiento adjunto, incluirlo en el contenido (con límite total)
        if (attachedRequirement && attachedRequirement.trim()) {
            const contextPreview = attachedRequirement.substring(0, 200);
            const totalContent = `${userMessage.content}\n\n[Contexto: ${contextPreview}...]`;
            
            if (totalContent.length <= 1900) {
                messagePayload.content = totalContent;
            }
            // Si excede el límite, enviar solo el mensaje del usuario
        }
        
        sendMessageMutation.mutate(messagePayload);
    };

    // no more seed-send helper: assistantSeedContent is read-only and user composes replies below

    const handleCompleteProject = () => {
        completeProjectMutation.mutate({} as Record<string, never>);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleClose = () => {
        // Cerrar modal y refrescar la lista de proyectos
        onClose();
        // Aquí podrías agregar lógica para refrescar la lista de proyectos
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="4xl" closeOnOverlayClick={false}>
            <ModalOverlay />
            <ModalContent height="80vh" display="flex" flexDirection="column">
                <ModalHeader>
                    <VStack align="start" spacing={2}>
                        <HStack spacing={3}>
                            <Heading size="md">{project.title}</Heading>
                            <Badge colorScheme={isCompleted ? 'green' : 'blue'}>
                                {isCompleted ? 'COMPLETADO' : 'EN PROGRESO'}
                            </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                            Chat de Análisis con IA - Proyecto: {project.id}
                        </Text>
                    </VStack>
                </ModalHeader>
                <ModalCloseButton />

                {/* Messages Area */}
                <ModalBody flex="1" overflow="hidden" p={0}>
                    <Box 
                        height="100%" 
                        overflowY="auto" 
                        px={6} 
                        py={4}
                        bg="gray.50"
                    >
                        <VStack spacing={4} align="stretch">
                            {messages.length === 0 && !sendMessageMutation.isPending && (
                                <Card>
                                    <CardBody>
                                        <VStack spacing={3} textAlign="center">
                                            <Text fontSize="lg" fontWeight="bold">
                                                {initialMessage ? '¡Iniciando Análisis!' : '¡Continuando Análisis!'}
                                            </Text>
                                            <Text color="gray.600">
                                                {initialMessage 
                                                    ? `Tu proyecto "${project.title}" está siendo analizado por la IA. El mensaje inicial se está enviando...`
                                                    : `Continúa tu conversación con la IA sobre el proyecto "${project.title}".`
                                                }
                                            </Text>
                                            {!initialMessage && (
                                                <Text fontSize="sm" color="gray.500">
                                                    Puedes hacer preguntas, solicitar análisis adicionales o completar el proyecto.
                                                </Text>
                                            )}
                                        </VStack>
                                    </CardBody>
                                </Card>
                            )}

                            {/* Top readonly assistant seed (if present) */}
                            {assistantSeedContent && (
                                <Card key="assistant-seed" variant="outline">
                                    <CardBody>
                                        <VStack align="start" spacing={2}>
                                            <HStack justify="space-between" width="100%">
                                                <Badge colorScheme={'purple'}>
                                                    IA Assistant
                                                </Badge>
                                                <Text fontSize="xs" color="gray.500">
                                                    {/* no timestamp available for seed */}
                                                </Text>
                                            </HStack>
                                            <Text whiteSpace="pre-wrap">{assistantSeedContent}</Text>
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

                            {/* If there's an assistant-seed editable, show it in-place before messages list (editable textarea handled in footer) */}

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
                </ModalBody>

                {/* Input Area */}
                <ModalFooter flexDirection="column" gap={3}>
                    {!isCompleted && (
                        <VStack spacing={2} width="100%">
                            <HStack spacing={3} width="100%">
                                <VStack spacing={1} flex="1">
                                    <Textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Escribe tu mensaje aquí..."
                                        resize="none"
                                        rows={2}
                                        maxLength={1800}
                                        isDisabled={sendMessageMutation.isPending || isCompleted}
                                    />
                                    <Text 
                                        fontSize="xs" 
                                        color={message.length > 1500 ? "orange.500" : "gray.500"}
                                        alignSelf="flex-end"
                                    >
                                        {message.length}/1800 caracteres
                                    </Text>
                                </VStack>
                                <Button
                                    leftIcon={<FiSend />}
                                    colorScheme="blue"
                                    onClick={handleSendMessage}
                                    isLoading={sendMessageMutation.isPending}
                                    isDisabled={!message.trim() || sendMessageMutation.isPending || isCompleted || message.length > 1800}
                                >
                                    Enviar
                                </Button>
                            </HStack>
                        </VStack>
                    )}
                    
                    <HStack spacing={3} width="100%" justify="space-between">
                        <Button 
                            variant="ghost" 
                            onClick={handleClose}
                        >
                            {isCompleted ? 'Cerrar' : 'Guardar y Cerrar'}
                        </Button>
                        
                        <Button
                            leftIcon={<FiCheckCircle />}
                            colorScheme={isCompleted ? "gray" : "green"}
                            onClick={handleCompleteProject}
                            isLoading={completeProjectMutation.isPending}
                            isDisabled={isCompleted}
                        >
                            {isCompleted ? 'Ya Completado' : 'Completar Proyecto'}
                        </Button>
                    </HStack>

                    {isCompleted && (
                        <Text fontSize="sm" color="green.600" textAlign="center">
                            ✅ Proyecto completado exitosamente
                        </Text>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
