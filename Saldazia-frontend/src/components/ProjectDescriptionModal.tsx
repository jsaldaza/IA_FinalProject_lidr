import React, { useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    Textarea,
    useToast,
    VStack,
    FormControl,
    FormLabel,
    Spinner,
} from '@chakra-ui/react';
import api, { projects } from '../lib/api';
type Props = {
    isOpen: boolean;
    onClose: () => void;
    project: { id: string; title?: string; description?: string } | null;
    onStarted?: (result?: unknown) => void;
};

export default function ProjectDescriptionModal({ isOpen, onClose, project, onStarted }: Props) {
    const [description, setDescription] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    React.useEffect(() => {
        if (project) setDescription(project.description || '');
    }, [project, isOpen]);

    const handleCreateAndStart = async () => {
        if (!project) return;
        setLoading(true);
        try {
            // First update description
            await api.patch(`/projects/${project.id}`, { description });

            // Then start IA on the existing analysis using helper
            const data = await projects.startExisting(project.id, { description });

            // Normalizar distintas formas de respuesta: { success:true, data:{ project, alreadyStarted } } or { project, alreadyStarted }
            const body = (data as any)?.data ? (data as any).data : data;
            const already = (body && (body.alreadyStarted !== undefined)) ? !!body.alreadyStarted : false;

            toast({
                title: already ? 'La IA ya estaba iniciada' : 'Chat iniciado',
                description: already ? 'La IA ya generó un mensaje inicial para este proyecto.' : 'La IA ha sido iniciada para este proyecto',
                status: 'success',
                duration: 3000,
                isClosable: true
            });

            onClose();
            if (onStarted) onStarted(data);
        } catch (err) {
            console.error('Error starting IA on project', err);
            let message = 'No se pudo iniciar la IA';
            if (err && typeof err === 'object') {
                const e = err as { message?: unknown };
                if (typeof e.message === 'string') message = e.message;
            }
            toast({ title: 'Error', description: message, status: 'error', duration: 5000, isClosable: true });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Información del proyecto</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <FormControl>
                            <FormLabel>Descripción</FormLabel>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe el proyecto, objetivos y contexto..."
                                minH="160px"
                            />
                        </FormControl>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button colorScheme="blue" onClick={handleCreateAndStart} disabled={loading}>
                        {loading ? <><Spinner size="xs" mr={2} />Crear y abrir chat</> : 'Crear y abrir chat'}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
