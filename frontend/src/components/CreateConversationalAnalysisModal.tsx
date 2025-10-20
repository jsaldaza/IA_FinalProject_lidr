import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    Textarea,
    Select,
    useToast,
    VStack,
    HStack,
    Text,
    Icon
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import { useApiQuery } from '../hooks/useApi';
import { conversationalWorkflowService } from '../services/conversationalWorkflow.service';
import type { Project, PaginatedResponse } from '../types/api';

interface CreateConversationalAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (id: string) => void;
}

export default function CreateConversationalAnalysisModal({ 
    isOpen, 
    onClose, 
    onSuccess 
}: CreateConversationalAnalysisModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [epicContent, setEpicContent] = useState('');
    const [projectId, setProjectId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    const { data: projectsResponse } = useApiQuery<PaginatedResponse<Project>>(['projects'], '/projects');
    const projects = projectsResponse?.data?.items || [];

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setEpicContent('');
        setProjectId('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (!title || !description || !epicContent) {
            toast({
                title: 'Error',
                description: 'Todos los campos son requeridos',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setIsLoading(true);
        try {
            console.log('🚀 MODAL: Iniciando creación de análisis conversacional:', { 
                title, 
                description, 
                epicContent, 
                projectId 
            });
            
            const createdWorkflow = await conversationalWorkflowService.createWorkflow({
                title,
                description,
                epicContent,
                projectId: projectId || undefined
            });
            
            console.log('✅ MODAL: Análisis conversacional creado exitosamente:', createdWorkflow.id);
            
            toast({
                title: 'Éxito',
                description: 'Análisis conversacional creado exitosamente',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            
            resetForm();
            onSuccess(createdWorkflow.id);
            
        } catch (error: any) {
            console.error('❌ MODAL: Error creando análisis conversacional:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.error || 'Error al crear el análisis conversacional',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <HStack spacing={3}>
                        <Icon as={FiMessageSquare} color="blue.500" />
                        <Text>Nuevo Análisis Conversacional con IA</Text>
                    </HStack>
                </ModalHeader>
                <ModalCloseButton />
                
                <ModalBody>
                    <VStack spacing={4}>
                        <Text fontSize="sm" color="gray.600" textAlign="center">
                            Crea un análisis conversacional donde la IA te ayudará a refinar épicos e historias de usuario 
                            mediante preguntas inteligentes y sugerencias personalizadas.
                        </Text>
                        
                        <FormControl isRequired>
                            <FormLabel>Título del Análisis</FormLabel>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="ej. Análisis de Sistema de Pagos"
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>Descripción</FormLabel>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Breve descripción del análisis que vas a realizar..."
                                rows={3}
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>Contenido del Épico/Historia de Usuario</FormLabel>
                            <Textarea
                                value={epicContent}
                                onChange={(e) => setEpicContent(e.target.value)}
                                placeholder="Como [tipo de usuario], quiero [funcionalidad] para [beneficio]..."
                                rows={4}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Proyecto (Opcional)</FormLabel>
                            <Select
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                placeholder="Selecciona un proyecto"
                            >
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleSubmit}
                        isLoading={isLoading}
                        loadingText="Creando..."
                        leftIcon={<FiMessageSquare />}
                    >
                        Iniciar Análisis Conversacional
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
