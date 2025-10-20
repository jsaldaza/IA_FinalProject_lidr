import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Container,
    Heading,
    Text,
    VStack,
    HStack,
    Card,
    CardBody,
    Badge,
    Button,
    Input,
    InputGroup,
    InputRightElement,
    IconButton,
    useColorModeValue,
    useToast,
    Progress,
    Divider,
    Icon,
    Avatar,
    Flex,
    Tooltip,
    Spinner,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    ModalFooter
} from '@chakra-ui/react';
import {
    FiSend,
    FiArrowLeft,
    FiMoreVertical,
    FiDownload,
    FiShare2,
    FiArchive,
    FiClock,
    FiCheckCircle,
    FiUser,
    FiZap,
    FiFileText,
    FiTarget,
    FiSettings
} from 'react-icons/fi';
import api from '../../lib/api';
import { conversationalWorkflowService } from '../../services/conversationalWorkflow.service';
import Loading from '../../components/Loading';

// Types
interface ConversationalMessage {
    id: string;
    content: string;
    role: 'USER' | 'ASSISTANT';
    type: 'GREETING' | 'QUESTION' | 'ANSWER' | 'CLARIFICATION' | 'ANALYSIS_RESULT' | 'STRATEGY_RESULT' | 'TESTPLAN_RESULT';
    timestamp: Date;
    metadata?: {
        category?: string;
        phase?: string;
    };
}

interface ConversationalAnalysis {
    id: string;
    title: string;
    description: string;
    epicContent: string;
    currentPhase: 'ANALYSIS' | 'STRATEGY' | 'TEST_PLANNING' | 'COMPLETED';
    status: 'IN_PROGRESS' | 'READY_TO_ADVANCE' | 'COMPLETED';
    completeness: {
        functionalCoverage: number;
        nonFunctionalCoverage: number;
        businessRulesCoverage: number;
        acceptanceCriteriaCoverage: number;
        overallScore: number;
    };
    messages: ConversationalMessage[];
    createdAt: string;
    updatedAt: string;
    project?: {
        id: string;
        name: string;
    };
}

const ConversationalChatPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const toast = useToast();
    const { isOpen: isArtifactOpen, onOpen: onArtifactOpen, onClose: onArtifactClose } = useDisclosure();
    
    const [analysis, setAnalysis] = useState<ConversationalAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [advancing, setAdvancing] = useState(false);
    const [message, setMessage] = useState('');
    const [artifactContent, setArtifactContent] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const userMsgBg = useColorModeValue('brand.500', 'brand.600');
    const aiMsgBg = useColorModeValue('gray.100', 'gray.700');
    const chatBg = useColorModeValue('gray.50', 'gray.900');

    useEffect(() => {
        if (id) {
            loadAnalysis();
        }
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [analysis?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadAnalysis = async () => {
        if (!id) return;
        
        try {
            setLoading(true);
            const response = await api.get(`/conversational-workflow/${id}/status`);
            
            if (response.data.success) {
                setAnalysis(response.data.data);
            } else {
                throw new Error('Analysis not found');
            }
        } catch (error: any) {
            console.error('Error loading analysis:', error);
            toast({
                title: 'Error',
                description: 'No se pudo cargar el análisis conversacional',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            navigate('/analysis');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim() || !id || sending) return;

        const userMessage = message.trim();
        setMessage('');
        setSending(true);

        try {
            const response = await api.post(`/conversational-workflow/${id}/chat`, {
                content: userMessage
            });

            if (response.data.success) {
                // Reload analysis to get updated messages
                await loadAnalysis();
                
                if (response.data.data.phaseComplete) {
                    toast({
                        title: '🎯 Fase Completada',
                        description: 'Esta fase está completa. Puedes avanzar a la siguiente etapa.',
                        status: 'success',
                        duration: 5000,
                        isClosable: true,
                    });
                }
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.error || 'Error al enviar el mensaje',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleAdvancePhase = async () => {
        if (!id || advancing) return;

        setAdvancing(true);

        try {
            const response = await api.post(`/conversational-workflow/${id}/advance`);
            
            if (response.data.success) {
                await loadAnalysis();
                toast({
                    title: '⏭️ Fase Avanzada',
                    description: `Has avanzado a la fase: ${response.data.data.currentPhase}`,
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (error: any) {
            console.error('Error advancing phase:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.error || 'Error al avanzar de fase',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setAdvancing(false);
        }
    };

    const getPhaseColor = (phase: string) => {
        switch (phase) {
            case 'ANALYSIS': return 'blue';
            case 'STRATEGY': return 'purple';
            case 'TEST_PLANNING': return 'orange';
            case 'COMPLETED': return 'green';
            default: return 'gray';
        }
    };

    const getPhaseText = (phase: string) => {
        switch (phase) {
            case 'ANALYSIS': return 'Análisis';
            case 'STRATEGY': return 'Estrategia';
            case 'TEST_PLANNING': return 'Plan de Testing';
            case 'COMPLETED': return 'Completado';
            default: return phase;
        }
    };

    const getPhaseIcon = (phase: string) => {
        switch (phase) {
            case 'ANALYSIS': return FiFileText;
            case 'STRATEGY': return FiTarget;
            case 'TEST_PLANNING': return FiSettings;
            case 'COMPLETED': return FiCheckCircle;
            default: return FiClock;
        }
    };

    const formatTime = (timestamp: Date | string) => {
        const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const showArtifact = (content: string) => {
        setArtifactContent(content);
        onArtifactOpen();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleMarkAsCompleted = async () => {
        if (!id) return;

        try {
            setAdvancing(true);
            
            // Llamar al endpoint para marcar como completado
            await conversationalWorkflowService.submitPhase(id);
            
            toast({
                title: 'Análisis Completado',
                description: 'El análisis ha sido marcado como completado exitosamente',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            // Recargar el análisis para reflejar el nuevo estado
            await loadAnalysis();
            
        } catch (error: any) {
            console.error('Error marking analysis as completed:', error);
            toast({
                title: 'Error',
                description: 'No se pudo completar el análisis. Intenta de nuevo.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setAdvancing(false);
        }
    };

    if (loading) {
        return <Loading />;
    }

    if (!analysis) {
        return (
            <Container maxW="4xl" py={8}>
                <Alert status="error">
                    <AlertIcon />
                    <AlertTitle>Análisis no encontrado</AlertTitle>
                    <AlertDescription>
                        El análisis conversacional no existe o no tienes permisos para verlo.
                    </AlertDescription>
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxW="6xl" py={4} h="100vh">
            <VStack spacing={4} h="full">
                {/* Header */}
                <Card w="full" bg={bgColor} borderColor={borderColor}>
                    <CardBody>
                        <HStack justify="space-between" align="start">
                            <HStack spacing={4}>
                                <IconButton
                                    aria-label="Volver"
                                    icon={<Icon as={FiArrowLeft} />}
                                    variant="ghost"
                                    onClick={() => navigate('/analysis')}
                                />
                                <VStack align="start" spacing={1}>
                                    <HStack>
                                        <Heading size="md" noOfLines={1}>
                                            {analysis.title}
                                        </Heading>
                                        <Badge
                                            colorScheme={getPhaseColor(analysis.currentPhase)}
                                            variant="solid"
                                        >
                                            <HStack spacing={1}>
                                                <Icon as={getPhaseIcon(analysis.currentPhase)} boxSize={3} />
                                                <Text fontSize="xs">
                                                    {getPhaseText(analysis.currentPhase)}
                                                </Text>
                                            </HStack>
                                        </Badge>
                                    </HStack>
                                    <Text fontSize="sm" color="gray.600" noOfLines={1}>
                                        {analysis.description}
                                    </Text>
                                </VStack>
                            </HStack>

                            <HStack>
                                {analysis.status === 'READY_TO_ADVANCE' && analysis.currentPhase !== 'COMPLETED' && (
                                    <Button
                                        colorScheme="green"
                                        size="sm"
                                        leftIcon={<Icon as={FiCheckCircle} />}
                                        onClick={handleAdvancePhase}
                                        isLoading={advancing}
                                        loadingText="Avanzando..."
                                    >
                                        Enviar Fase
                                    </Button>
                                )}
                                
                                <Menu>
                                    <MenuButton
                                        as={IconButton}
                                        aria-label="Opciones"
                                        icon={<Icon as={FiMoreVertical} />}
                                        variant="ghost"
                                        size="sm"
                                    />
                                    <MenuList>
                                        <MenuItem icon={<Icon as={FiDownload} />}>
                                            Exportar Conversación
                                        </MenuItem>
                                        <MenuItem icon={<Icon as={FiShare2} />}>
                                            Compartir
                                        </MenuItem>
                                        <MenuItem icon={<Icon as={FiArchive} />}>
                                            Archivar
                                        </MenuItem>
                                    </MenuList>
                                </Menu>
                            </HStack>
                        </HStack>

                        {/* Progress */}
                        <Box mt={4}>
                            <HStack justify="space-between" mb={2}>
                                <Text fontSize="sm" color="gray.600">
                                    Progreso General
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                    {Math.round(analysis.completeness.overallScore)}%
                                </Text>
                            </HStack>
                            <Progress
                                value={analysis.completeness.overallScore}
                                colorScheme={getPhaseColor(analysis.currentPhase)}
                                size="sm"
                                borderRadius="md"
                            />
                        </Box>
                    </CardBody>
                </Card>

                {/* Chat Area */}
                <Card w="full" flex={1} bg={bgColor} borderColor={borderColor}>
                    <CardBody p={0} h="full">
                        <VStack h="full" spacing={0}>
                            {/* Messages */}
                            <Box
                                flex={1}
                                w="full"
                                overflowY="auto"
                                bg={chatBg}
                                p={4}
                            >
                                <VStack spacing={4} align="stretch">
                                    {(analysis.messages || []).map((msg) => (
                                        <Flex
                                            key={msg.id}
                                            justify={msg.role === 'USER' ? 'flex-end' : 'flex-start'}
                                        >
                                            <HStack
                                                maxW="70%"
                                                align="start"
                                                spacing={3}
                                                flexDirection={msg.role === 'USER' ? 'row-reverse' : 'row'}
                                            >
                                                <Avatar
                                                    size="sm"
                                                    icon={<Icon as={msg.role === 'USER' ? FiUser : FiZap} />}
                                                    bg={msg.role === 'USER' ? 'brand.500' : 'purple.500'}
                                                />
                                                
                                                <VStack align={msg.role === 'USER' ? 'end' : 'start'} spacing={1}>
                                                    <Card
                                                        bg={msg.role === 'USER' ? userMsgBg : aiMsgBg}
                                                        color={msg.role === 'USER' ? 'white' : undefined}
                                                        size="sm"
                                                        borderRadius="2xl"
                                                        borderWidth={1}
                                                        borderColor={msg.role === 'USER' ? 'transparent' : borderColor}
                                                    >
                                                        <CardBody>
                                                            <Text fontSize="sm" whiteSpace="pre-wrap">
                                                                {msg.content}
                                                            </Text>
                                                            
                                                            {(msg.type === 'ANALYSIS_RESULT' || 
                                                              msg.type === 'STRATEGY_RESULT' || 
                                                              msg.type === 'TESTPLAN_RESULT') && (
                                                                <Button
                                                                    size="xs"
                                                                    mt={2}
                                                                    leftIcon={<Icon as={FiFileText} />}
                                                                    variant="outline"
                                                                    colorScheme="blue"
                                                                    onClick={() => showArtifact(msg.content)}
                                                                >
                                                                    Ver Artefacto
                                                                </Button>
                                                            )}
                                                        </CardBody>
                                                    </Card>
                                                    
                                                    <HStack spacing={1}>
                                                        <Text fontSize="xs" color="gray.500">
                                                            {formatTime(msg.timestamp)}
                                                        </Text>
                                                        {msg.metadata?.category && (
                                                            <Badge size="xs" variant="outline">
                                                                {msg.metadata.category}
                                                            </Badge>
                                                        )}
                                                    </HStack>
                                                </VStack>
                                            </HStack>
                                        </Flex>
                                    ))}
                                    
                                    {sending && (
                                        <Flex justify="flex-start">
                                            <HStack align="start" spacing={3}>
                                                <Avatar
                                                    size="sm"
                                                    icon={<Icon as={FiZap} />}
                                                    bg="purple.500"
                                                />
                                                <Card bg={aiMsgBg} size="sm" borderRadius="2xl">
                                                    <CardBody>
                                                        <HStack spacing={2}>
                                                            <Spinner size="sm" />
                                                            <Text fontSize="sm" color="gray.600">
                                                                La IA está analizando tu respuesta...
                                                            </Text>
                                                        </HStack>
                                                    </CardBody>
                                                </Card>
                                            </HStack>
                                        </Flex>
                                    )}
                                    
                                    <div ref={messagesEndRef} />
                                </VStack>
                            </Box>

                            <Divider />

                            {/* Completion Button */}
                            {analysis.currentPhase !== 'COMPLETED' && (analysis.messages || []).length > 2 && (
                                <Box w="full" px={4} pt={3}>
                                    <Button
                                        colorScheme="green"
                                        variant="outline"
                                        size="sm"
                                        width="full"
                                        leftIcon={<Icon as={FiCheckCircle} />}
                                        onClick={() => handleMarkAsCompleted()}
                                        isDisabled={sending || advancing}
                                    >
                                        Marcar Análisis como Completado
                                    </Button>
                                </Box>
                            )}

                            {/* Input Area */}
                            <Box w="full" p={4} bg={bgColor}>
                                <InputGroup size="lg">
                                    <Input
                                        ref={inputRef}
                                        placeholder="Escribe tu respuesta..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        isDisabled={sending || analysis.currentPhase === 'COMPLETED'}
                                        bg={chatBg}
                                        border="2px"
                                        borderColor={borderColor}
                                        _focus={{
                                            borderColor: 'brand.500',
                                            bg: bgColor
                                        }}
                                        pr="4.5rem"
                                    />
                                    <InputRightElement width="4rem">
                                        <Tooltip label="Enviar mensaje">
                                            <IconButton
                                                aria-label="Enviar mensaje"
                                                icon={<Icon as={FiSend} />}
                                                colorScheme="brand"
                                                size="sm"
                                                isDisabled={!message.trim() || sending || analysis.currentPhase === 'COMPLETED'}
                                                onClick={handleSendMessage}
                                                isLoading={sending}
                                            />
                                        </Tooltip>
                                    </InputRightElement>
                                </InputGroup>
                                
                                {analysis.currentPhase === 'COMPLETED' && (
                                    <Text fontSize="sm" color="gray.500" mt={2} textAlign="center">
                                        🎉 ¡Análisis completado! Ya no puedes enviar más mensajes.
                                    </Text>
                                )}
                            </Box>
                        </VStack>
                    </CardBody>
                </Card>
            </VStack>

            {/* Artifact Modal */}
            <Modal isOpen={isArtifactOpen} onClose={onArtifactClose} size="6xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>📄 Artefacto Generado por IA</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Box
                            bg={chatBg}
                            p={6}
                            borderRadius="md"
                            border="1px"
                            borderColor={borderColor}
                            maxH="60vh"
                            overflowY="auto"
                        >
                            <Text whiteSpace="pre-wrap" fontFamily="mono" fontSize="sm">
                                {artifactContent}
                            </Text>
                        </Box>
                    </ModalBody>
                    <ModalFooter>
                        <Button mr={3} onClick={onArtifactClose}>
                            Cerrar
                        </Button>
                        <Button colorScheme="brand" leftIcon={<Icon as={FiDownload} />}>
                            Descargar
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Container>
    );
};

export default ConversationalChatPage;
