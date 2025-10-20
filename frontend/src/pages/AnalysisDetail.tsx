
import {
    Box,
    Heading,
    Text,
    VStack,
    HStack,
    Badge,
    Button,
    Icon,
    useColorModeValue,
    Divider,
    useToast,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    FormControl,
    FormLabel,
    Textarea
} from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useMemo, useRef } from 'react';
import { FiArrowLeft, FiFlag, FiCheckCircle, FiList, FiCalendar, FiEdit2 } from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';
import { useApiQuery } from '../hooks/useApi';
import { formatAnalysisText } from '../utils/formatAnalysisText';
import type { Analysis } from '../types/api';
import Loading from '../components/Loading';
import Error from '../components/Error';
import api from '../lib/api';


export default function AnalysisDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editRequirement, setEditRequirement] = useState('');
    const [editSummary, setEditSummary] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();
    // Referencia para el control de requisitos para poder hacer focus
    const requirementRef = useRef<HTMLTextAreaElement>(null);

    const { data, isLoading, error, refetch } = useApiQuery<Analysis>(
        ['analysis', id || ''],
        `/analysis/${id}`
    );

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    
    // Formatear el texto del análisis para mejorar la legibilidad
    const formattedSummary = useMemo(() => {
        if (!data?.data?.summary) return '';
        return formatAnalysisText(data.data.summary);
    }, [data?.data?.summary]);

    if (isLoading) return <Loading message="Cargando requerimientos..." />;
    if (error) return <Error title="Error cargando requisitos" message="No se pudieron cargar los requerimientos" onRetry={refetch} />;
    if (!data?.data) return <Error title="Requisitos no encontrados" message="No se encontraron los requerimientos solicitados" />;

    const analysis = data.data;
    
    const openEdit = (focusRequirements = false) => {
        if (!analysis) return;
        setEditRequirement(analysis.requirement || '');
        setEditSummary(analysis.summary || '');
        setIsEditOpen(true);
        
        // Si se solicita enfocar los requisitos, hacerlo después de que el modal se abra
        if (focusRequirements) {
            setTimeout(() => {
                requirementRef.current?.focus();
                requirementRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    const saveEdit = async () => {
        if (!id) return;
        setIsSaving(true);
        try {
            // Use centralized axios instance so interceptors and auth are applied
            await api.patch(`/analysis/${id}`, {
                requirement: editRequirement,
                summary: editSummary
            });
            await refetch();
            toast({ title: 'Guardado', description: 'Requerimientos actualizados', status: 'success' });
            setIsEditOpen(false);
        } catch (e) {
            toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error al guardar', status: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Box maxW="3xl" mx="auto" mt={8} bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg" boxShadow="lg" p={8}>
            <Button leftIcon={<FiArrowLeft />} mb={4} variant="ghost" onClick={() => navigate(-1)}>
                Volver a Requerimientos
            </Button>
            <HStack spacing={4} align="center" mb={2}>
                <Heading size="lg" color="blue.800">{analysis.requirement?.split(':')[0] || analysis.name || 'Proyecto'}</Heading>
                <Badge colorScheme="green" variant="solid" px={3} py={1} borderRadius="full" fontSize="sm">COMPLETED</Badge>
            </HStack>
            <Box 
                className="markdown-body" 
                bg="gray.50" 
                p={5} 
                borderRadius="md" 
                borderLeft="4px solid" 
                borderLeftColor="blue.400"
                mb={4}
                boxShadow="sm"
            >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {formattedSummary || ''}
                </ReactMarkdown>
            </Box>
            <HStack spacing={6} fontSize="sm" color="gray.500" mb={4}>
                <HStack><Icon as={FiCalendar} /> <Text>Creado: {new Date(analysis.createdAt).toLocaleDateString('es-ES')}</Text></HStack>
                <HStack><Icon as={FiCheckCircle} /> <Text>Completado: {new Date(analysis.updatedAt).toLocaleDateString('es-ES')}</Text></HStack>
            </HStack>
            <Divider my={4} />
            <VStack align="start" spacing={4} divider={<Divider borderColor={borderColor} />}>
                <Box width="100%">
                    <HStack justify="space-between" align="center" mb={1} width="100%">
                        <Heading size="sm" color="blue.700">Requisitos</Heading>
                        <Button 
                            size="sm" 
                            colorScheme="blue" 
                            leftIcon={<Icon as={FiEdit2} />}
                            onClick={() => openEdit(true)}
                        >
                            Editar Documento Completo
                        </Button>
                    </HStack>
                    <Box className="markdown-body" fontSize="sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {analysis.requirement || ''}
                        </ReactMarkdown>
                    </Box>
                </Box>
                {analysis.redFlags && analysis.redFlags.length > 0 && (
                    <Box>
                        <Heading size="sm" mb={1} color="red.600"><Icon as={FiFlag} mr={1}/> Red Flags</Heading>
                        <VStack align="start" spacing={1}>
                            {analysis.redFlags.map((flag: string, idx: number) => (
                                <Text key={idx} color="red.500">- {flag}</Text>
                            ))}
                        </VStack>
                    </Box>
                )}
                {analysis.testStrategies && analysis.testStrategies.length > 0 && (
                    <Box>
                        <Heading size="sm" mb={1} color="purple.700"><Icon as={FiList} mr={1}/> Estrategias de Prueba</Heading>
                        <VStack align="start" spacing={1}>
                            {analysis.testStrategies.map((ts: { title: string; description: string; steps?: { description?: string }[] }, idx: number) => (
                                <Box key={idx}>
                                    <Text fontWeight="bold">{ts.title}</Text>
                                    <Text fontSize="sm" color="gray.600">{ts.description}</Text>
                                    {ts.steps && ts.steps.length > 0 && (
                                        <VStack align="start" pl={4} spacing={0}>
                                            {ts.steps.map((step: { description?: string }, i: number) => (
                                                <Text key={i} fontSize="xs">• {step.description}</Text>
                                            ))}
                                        </VStack>
                                    )}
                                </Box>
                            ))}
                        </VStack>
                    </Box>
                )}
                {analysis.questions && analysis.questions.length > 0 && (
                    <Box>
                        <Heading size="sm" mb={1} color="teal.700">Preguntas</Heading>
                        <VStack align="start" spacing={1}>
                            {analysis.questions.map((q: { content: string }, idx: number) => (
                                <Text key={idx} color="teal.700">- {q.content}</Text>
                            ))}
                        </VStack>
                    </Box>
                )}
            </VStack>
            <Divider my={6} />


            <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} size="5xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent maxH="90vh">
                    <ModalHeader>Editar Requerimientos</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack align="stretch" spacing={6}>
                            <FormControl id="requisitos-form" mb={4}>
                                <HStack justify="space-between">
                                    <FormLabel fontWeight="bold" color="blue.700" fontSize="lg">Requisitos (Markdown soportado)</FormLabel>
                                    <Text fontSize="xs" color="gray.500">
                                        ↘️ Ajusta el tamaño desde la esquina
                                    </Text>
                                </HStack>
                                <Box position="relative" width="100%">
                                    <Textarea
                                        ref={requirementRef}
                                        value={editRequirement}
                                        onChange={(e) => setEditRequirement(e.target.value)}
                                        rows={12}
                                        placeholder="Escribe los requisitos en Markdown..."
                                        fontSize="md"
                                        borderWidth="2px"
                                        borderColor="blue.200"
                                        minH="200px"
                                        resize="both"
                                        maxH="800px"
                                        overflowY="auto"
                                        _focus={{
                                            borderColor: "blue.500",
                                            boxShadow: "0 0 0 1px blue.500"
                                        }}
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
                                </Box>
                            </FormControl>
                            <FormControl>
                                <HStack justify="space-between">
                                    <FormLabel fontWeight="bold" color="blue.700" fontSize="lg">Resumen de los Requerimientos</FormLabel>
                                    <Text fontSize="xs" color="gray.500">
                                        ↘️ Ajusta el tamaño desde la esquina
                                    </Text>
                                </HStack>
                                <Box position="relative" width="100%">
                                    <Textarea
                                        value={editSummary}
                                        onChange={(e) => setEditSummary(e.target.value)}
                                        placeholder="Resumen de los requerimientos (opcional)"
                                        rows={8}
                                        minH="150px"
                                        resize="both"
                                        maxH="600px"
                                        borderWidth="2px"
                                        borderColor="blue.200"
                                        _focus={{
                                            borderColor: "blue.500",
                                            boxShadow: "0 0 0 1px blue.500"
                                        }}
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
                                </Box>
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <HStack>
                            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                            <Button colorScheme="blue" isLoading={isSaving} onClick={saveEdit}>Guardar</Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}