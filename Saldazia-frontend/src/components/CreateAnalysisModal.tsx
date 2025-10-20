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
    Box,
    Text
} from '@chakra-ui/react';
import { useState } from 'react';
import { useApiQuery } from '../hooks/useApi';
import api from '../lib/api';
import type { Project, PaginatedResponse } from '../types/api';

interface CreateAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (analysisData: {
        name: string;
        description: string;
        projectId?: string;
    }) => void;
}

export default function CreateAnalysisModal({ isOpen, onClose, onSuccess }: CreateAnalysisModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [projectId, setProjectId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    const { data: projectsResponse } = useApiQuery<PaginatedResponse<Project>>(['projects'], '/projects');
    const projects = projectsResponse?.data?.items || [];

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            console.log('📊 MODAL: Iniciando creación de análisis:', { name, description, projectId });
            
            const analysisData = {
                name: name,
                description: description || name,
                projectId: projectId || undefined
            };

            // Si hay función onSuccess, ejecutarla (para análisis conversacional)
            if (onSuccess) {
                onSuccess(analysisData);
            } else {
                // Crear análisis tradicional usando api directamente
                await api.post('/analysis', analysisData);
                
                toast({
                    title: 'Requerimientos creados',
                    description: 'Requerimientos creados exitosamente',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            }
            
            console.log('✅ MODAL: Análisis procesado exitosamente');
            
            // Limpiar formulario y cerrar modal
            setName('');
            setDescription('');
            setProjectId('');
            onClose();
            
        } catch (error) {
            console.error('❌ MODAL: Error processing analysis:', error);
            toast({
                title: 'Error',
                description: 'Error procesando el levantamiento. Intenta de nuevo.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <ModalOverlay />
            <ModalContent maxW="800px">
                <ModalHeader bg="blue.50" borderTopRadius="md">Crear Nuevos Requerimientos</ModalHeader>
                <ModalCloseButton />
                <ModalBody py={6}>
                    <FormControl isRequired mb={5}>
                        <FormLabel fontWeight="bold" color="blue.700">Nombre</FormLabel>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ingresa el nombre del levantamiento"
                            size="lg"
                            borderWidth="2px"
                            focusBorderColor="blue.400"
                            _hover={{ borderColor: "blue.300" }}
                        />
                    </FormControl>
                    <FormControl mb={5}>
                        <FormLabel fontWeight="bold" color="blue.700">Descripción</FormLabel>
                        <Box position="relative" width="100%">
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe el propósito de los requerimientos"
                                rows={6}
                                resize="both"
                                minH="120px"
                                maxH="400px"
                                borderWidth="2px"
                                focusBorderColor="blue.400"
                                _hover={{ borderColor: "blue.300" }}
                                sx={{
                                    '&::-webkit-scrollbar': {
                                        width: '8px',
                                        borderRadius: '8px',
                                        backgroundColor: `rgba(0, 0, 0, 0.05)`,
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        backgroundColor: `rgba(0, 0, 0, 0.2)`,
                                        borderRadius: '8px',
                                    },
                                }}
                            />
                            <Box 
                                position="absolute"
                                bottom="4px"
                                right="4px"
                                width="14px"
                                height="14px"
                                borderRight="2px solid"
                                borderBottom="2px solid"
                                borderColor="blue.500"
                                cursor="nwse-resize"
                                pointerEvents="none"
                                zIndex="2"
                            />
                            <Text 
                                position="absolute" 
                                bottom="6px" 
                                left="6px" 
                                fontSize="xs" 
                                color="gray.500"
                                pointerEvents="none"
                            >
                                Redimensiona desde la esquina ↘️
                            </Text>
                        </Box>
                    </FormControl>
                    <FormControl isRequired>
                        <FormLabel fontWeight="bold" color="blue.700">Proyecto</FormLabel>
                        <Select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            placeholder="Selecciona un proyecto"
                            size="lg"
                            borderWidth="2px"
                            focusBorderColor="blue.400"
                            _hover={{ borderColor: "blue.300" }}
                            cursor="pointer"
                        >
                            {projects.map((project: Project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </Select>
                    </FormControl>
                </ModalBody>
                <ModalFooter bg="gray.50" borderBottomRadius="md">
                    <Button variant="outline" mr={3} onClick={onClose} size="lg">
                        Cancelar
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleSubmit}
                        isLoading={isLoading}
                        size="lg"
                        _hover={{
                            transform: 'translateY(-2px)',
                            boxShadow: 'lg',
                        }}
                    >
                        Crear Requerimientos
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
} 