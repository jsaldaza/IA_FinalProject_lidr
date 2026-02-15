/**
 * Componente Complete Chat Interface para TestForge
 * Integra toda la funcionalidad del chat interactivo
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Progress,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FiSend, FiCheck, FiClock } from 'react-icons/fi';
import { useApiMutation, useApiQuery } from '../hooks/useApi';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  messageType?: string;
}

interface ProjectData {
  id: string;
  title: string;
  status: string;
  completeness: number;
  currentPhase: string;
  description?: string;
}

interface ChatInterfaceProps {
  project: ProjectData;
  onProjectCompleted?: (projectId: string) => void;
  onClose?: () => void;
}

export const CompleteChatInterface: React.FC<ChatInterfaceProps> = ({
  project,
  onProjectCompleted,
  onClose
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { isOpen: isCompleteModalOpen, onOpen: onCompleteModalOpen, onClose: onCompleteModalClose } = useDisclosure();

  // Obtener mensajes existentes
  const { data: chatData, isLoading: messagesLoading } = useApiQuery(
    ['project-messages', project.id],
    `/projects/${project.id}/messages`
  );

  // Mutation para enviar mensajes
  const sendMessageMutation = useApiMutation<
    { status: string; data: { message: string; timestamp: string; projectId: string } },
    { content: string }
  >(
    `/projects/${project.id}/chat`,
    'POST',
    {
      onSuccess: (response) => {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          content: response.data.message,
          role: 'assistant',
          timestamp: response.data.timestamp
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        scrollToBottom();

        // Verificar si el proyecto está listo para completar
        checkProjectReadiness();
      },
      onError: () => {
        setIsLoading(false);
        toast({
          title: 'Error',
          description: 'No se pudo enviar el mensaje',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      }
    }
  );

  // Mutation para completar proyecto
  const completeProjectMutation = useApiMutation(
    `/projects/${project.id}/complete`,
    'POST',
    {
      onSuccess: () => {
        toast({
          title: '¡Proyecto Completado!',
          description: 'El análisis ha sido generado exitosamente',
          status: 'success',
          duration: 5000,
          isClosable: true
        });
        onProjectCompleted?.(project.id);
      }
    }
  );

  // Cargar mensajes iniciales
  useEffect(() => {
    if (chatData?.data?.messages) {
      const formattedMessages: Message[] = chatData.data.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: msg.createdAt,
        messageType: msg.messageType
      }));
      setMessages(formattedMessages);
      
      // Si no hay mensajes, enviar mensaje de bienvenida
      if (formattedMessages.length === 0) {
        sendWelcomeMessage();
      }
    }
  }, [chatData, sendWelcomeMessage]);

  // Scroll automático
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendWelcomeMessage = useCallback(() => {
    const welcomeMessage = `¡Hola! 👋 Soy tu asistente de análisis para "${project.title}".

Vamos a trabajar juntos para definir completamente los requisitos de tu proyecto. Te haré preguntas específicas para entender:

📋 **Funcionalidades principales**
👥 **Usuarios y roles del sistema**  
🔧 **Aspectos técnicos importantes**
📊 **Reglas de negocio**

**Para comenzar, cuéntame:**
¿Cuál es el objetivo principal de "${project.title}" y qué problema busca resolver?`;

    const assistantMessage: Message = {
      id: `welcome-${Date.now()}`,
      content: welcomeMessage,
      role: 'assistant',
      timestamp: new Date().toISOString()
    };
    
    setMessages([assistantMessage]);
  }, [project.title]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: message.trim(),
      role: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    // Enviar al backend
    sendMessageMutation.mutate({ content: userMessage.content });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const checkProjectReadiness = () => {
    const userMessages = messages.filter(m => m.role === 'user');
    const totalWords = userMessages.reduce((acc, msg) => acc + msg.content.split(/\s+/).length, 0);
    
    // Lógica simple para determinar si está listo
    const hasEnoughContent = totalWords > 150;
    const hasMultipleInteractions = userMessages.length >= 3;
    
    if (hasEnoughContent && hasMultipleInteractions && project.completeness > 70) {
      // Sugerir completar proyecto
      setTimeout(() => {
        onCompleteModalOpen();
      }, 2000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'green';
      case 'IN_PROGRESS': return 'blue';
      case 'DRAFT': return 'gray';
      default: return 'gray';
    }
  };

  if (messagesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Spinner size="xl" />
        <Text ml={4}>Cargando conversación...</Text>
      </Box>
    );
  }

  return (
    <Box height="100%" display="flex" flexDirection="column">
      {/* Header del Chat */}
      <Card mb={4}>
        <CardBody>
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Heading size="md">{project.title}</Heading>
              <HStack>
                <Badge colorScheme={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
                <Badge variant="outline">
                  <FiClock style={{ marginRight: '4px' }} />
                  {project.currentPhase}
                </Badge>
              </HStack>
            </VStack>
            <VStack align="end" spacing={1}>
              <Text fontSize="sm" color="gray.600">
                Progreso: {project.completeness}%
              </Text>
              <Progress 
                value={project.completeness} 
                width="120px" 
                colorScheme="blue"
                size="sm"
              />
            </VStack>
          </HStack>
        </CardBody>
      </Card>

      {/* Área de Mensajes */}
      <Box 
        flex="1" 
        overflowY="auto" 
        border="1px solid" 
        borderColor="gray.200" 
        borderRadius="md" 
        p={4}
        mb={4}
        maxHeight="500px"
      >
        <VStack spacing={4} align="stretch">
          {messages.map((msg) => (
            <Box
              key={msg.id}
              alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
              maxWidth="80%"
            >
              <Card 
                bg={msg.role === 'user' ? 'blue.500' : 'gray.100'}
                color={msg.role === 'user' ? 'white' : 'black'}
              >
                <CardBody p={3}>
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {msg.content}
                  </Text>
                  <Text 
                    fontSize="xs" 
                    color={msg.role === 'user' ? 'blue.100' : 'gray.500'}
                    mt={1}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </Text>
                </CardBody>
              </Card>
            </Box>
          ))}
          
          {isLoading && (
            <Box alignSelf="flex-start">
              <Card bg="gray.100">
                <CardBody p={3}>
                  <HStack>
                    <Spinner size="sm" />
                    <Text fontSize="sm">Analizando respuesta...</Text>
                  </HStack>
                </CardBody>
              </Card>
            </Box>
          )}
        </VStack>
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <HStack>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Escribe tu mensaje... (Shift + Enter para nueva línea)"
          resize="none"
          rows={2}
          disabled={isLoading || project.status === 'COMPLETED'}
        />
        <VStack>
          <IconButton
            aria-label="Enviar mensaje"
            icon={<FiSend />}
            onClick={handleSendMessage}
            isLoading={isLoading}
            isDisabled={!message.trim() || project.status === 'COMPLETED'}
            colorScheme="blue"
          />
        </VStack>
      </HStack>

      {/* Modal de Completar Proyecto */}
      <Modal isOpen={isCompleteModalOpen} onClose={onCompleteModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>¡Proyecto Listo para Completar! 🎉</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Alert status="success" mb={4}>
              <AlertIcon />
              <Text>
                Has proporcionado suficiente información para generar un análisis completo.
              </Text>
            </Alert>
            
            <Text mb={4}>
              Al completar el proyecto se generará:
            </Text>
            
            <VStack align="start" spacing={2} mb={4}>
              <Text>✅ Análisis detallado de requerimientos</Text>
              <Text>✅ Casos de uso documentados</Text>
              <Text>✅ Casos de prueba sugeridos</Text>
              <Text>✅ Recomendaciones técnicas</Text>
            </VStack>

            <HStack spacing={3}>
              <Button 
                colorScheme="green" 
                onClick={() => {
                  completeProjectMutation.mutate({});
                  onCompleteModalClose();
                }}
                isLoading={completeProjectMutation.isLoading}
                leftIcon={<FiCheck />}
              >
                Completar Proyecto
              </Button>
              <Button variant="outline" onClick={onCompleteModalClose}>
                Continuar Conversación
              </Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CompleteChatInterface;