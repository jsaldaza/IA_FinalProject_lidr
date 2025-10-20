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
    VStack,
    HStack,
    Text,
    useToast
} from '@chakra-ui/react';
import { useState } from 'react';
import { useApiMutation } from '../hooks/useApi';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (project: { id: string; title: string; description: string; createdAt?: string }) => void;
    onProjectStarted?: (project: { id: string; title: string; description: string }) => void;
}

interface CreateAndStartResponseData {
    project: { id: string; title: string; description: string; status: string; createdAt?: string };
}

interface CreateAndStartInput {
    title: string;
    description: string;
}

export default function CreateProjectModal({ isOpen, onClose, onCreated, onProjectStarted }: CreateProjectModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const toast = useToast();

    const createAndStartMutation = useApiMutation<CreateAndStartResponseData, CreateAndStartInput>(
        '/projects/create-and-start',
        'POST',
        {
            invalidateQueries: ['projects', 'in-progress-projects', 'completed-projects'],
            onSuccess: (response) => {
                const project = response.data?.project;
                toast({ 
                    title: 'Proyecto creado', 
                    description: 'El proyecto se ha creado y está listo para el análisis conversacional.', 
                    status: 'success', 
                    duration: 3000, 
                    isClosable: true 
                });
                
                if (project) {
                    // Clear form
                    setTitle('');
                    setDescription('');
                    
                    // Notify parent component
                    onCreated?.({ 
                        id: project.id, 
                        title: project.title, 
                        description: project.description,
                        createdAt: project.createdAt 
                    });
                    
                    // Start the chat immediately
                    onProjectStarted?.({
                        id: project.id,
                        title: project.title,
                        description: project.description
                    });
                    
                    onClose();
                }
            },
            onError: (error: unknown) => {
                let message = 'Por favor intenta de nuevo';
                const errorObj = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
                const backend = errorObj?.response?.data;
                if (errorObj?.message) message = errorObj.message;
                if (backend?.error) message = backend.error;
                else if (backend?.message) message = backend.message;
                toast({ 
                    title: 'Error creando proyecto', 
                    description: message, 
                    status: 'error', 
                    duration: 5000, 
                    isClosable: true 
                });
            }
        }
    );

    const handleSubmit = () => {
        if (!title.trim()) {
            toast({ 
                title: 'Nombre requerido', 
                description: 'Por favor ingresa el nombre del proyecto', 
                status: 'warning', 
                duration: 2500, 
                isClosable: true 
            });
            return;
        }

        if (title.trim().length > 200) {
            toast({ 
                title: 'Nombre muy largo', 
                description: 'El nombre del proyecto no puede exceder 200 caracteres', 
                status: 'warning', 
                duration: 3000, 
                isClosable: true 
            });
            return;
        }
        
        if (!description.trim()) {
            toast({ 
                title: 'Descripción requerida', 
                description: 'Por favor ingresa una descripción del proyecto para iniciar el análisis', 
                status: 'warning', 
                duration: 2500, 
                isClosable: true 
            });
            return;
        }

        if (description.trim().length < 20) {
            toast({ 
                title: 'Descripción muy corta', 
                description: 'La descripción debe tener al menos 20 caracteres para un mejor análisis', 
                status: 'warning', 
                duration: 3000, 
                isClosable: true 
            });
            return;
        }

        if (description.trim().length > 5000) {
            toast({ 
                title: 'Descripción muy larga', 
                description: 'La descripción no puede exceder 5000 caracteres', 
                status: 'warning', 
                duration: 3000, 
                isClosable: true 
            });
            return;
        }
        
        createAndStartMutation.mutate({ 
            title: title.trim(), 
            description: description.trim() 
        });
    };

    const handleClose = () => {
        setTitle('');
        setDescription('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Crear Nuevo Proyecto</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <FormControl isRequired>
                            <FormLabel>Nombre del proyecto</FormLabel>
                            <Input 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)} 
                                placeholder="Ej: Sistema de Gestión de Inventario"
                                maxLength={200}
                            />
                            <Text fontSize="xs" color="gray.500" mt={1} textAlign="right">
                                {title.length}/200 caracteres
                            </Text>
                        </FormControl>
                        
                        <FormControl isRequired>
                            <FormLabel>Descripción del proyecto</FormLabel>
                            <Text fontSize="sm" color="gray.600" mb={2}>
                                Describe qué quieres desarrollar o analizar. Esta será la base para iniciar la conversación con la IA.
                            </Text>
                            <Textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ej: Necesito crear un sistema de gestión de inventario para una tienda que permita controlar stock, generar reportes y manejar proveedores. El sistema debe tener diferentes roles de usuario..."
                                rows={6}
                                resize="vertical"
                                maxLength={5000}
                            />
                            <HStack justifyContent="space-between" mt={1}>
                                <Text fontSize="xs" color="gray.500">
                                    Mínimo 20 caracteres. Mientras más detallada sea la descripción, mejor será el análisis.
                                </Text>
                                <Text fontSize="xs" color={description.length > 4500 ? "orange.500" : "gray.500"}>
                                    {description.length}/5000 caracteres
                                </Text>
                            </HStack>
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button 
                        variant="ghost" 
                        mr={3} 
                        onClick={handleClose}
                        isDisabled={createAndStartMutation.isPending}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        colorScheme="blue" 
                        onClick={handleSubmit} 
                        isLoading={createAndStartMutation.isPending}
                        loadingText="Creando proyecto..."
                        isDisabled={!title.trim() || !description.trim()}
                    >
                        Crear y Comenzar Análisis
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}