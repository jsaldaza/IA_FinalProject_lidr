import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  HStack,
  VStack,
  Text,
  useToast,
  ButtonGroup,
  Divider,
  Icon,
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { FiSave, FiMessageSquare, FiX, FiCopy } from 'react-icons/fi';
import api from '../lib/api';

interface Props {
  isOpen: boolean;
  onClose: (clearProject?: boolean) => void;
  projectId: string;
  projectTitle: string;
  onAnalysisUpdated?: (analysis: string) => void;
  onRestartChat?: (projectId: string) => void;
}

interface ProjectAnalysis {
  id: string;
  title: string;
  analysis?: string;
  status?: string;
}

const EditAnalysisModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  projectId, 
  projectTitle,
  onAnalysisUpdated,
  onRestartChat
}) => {
  const [analysis, setAnalysis] = useState('');
  const [originalAnalysis, setOriginalAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const toast = useToast();

  // Cargar análisis cuando se abre el modal
  useEffect(() => {
    if (!isOpen || !projectId) return;

    const loadAnalysis = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/projects/${projectId}/status`);
        const projectData: ProjectAnalysis = response.data?.data;
        
        // El análisis debería estar en epicContent del proyecto completado
        const analysisContent = projectData?.analysis || '';
        setAnalysis(analysisContent);
        setOriginalAnalysis(analysisContent);
        setHasChanges(false);
      } catch (error) {
        console.error('Error loading analysis:', error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar el levantamiento de requisitos del proyecto',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [isOpen, projectId, toast]);

  // Detectar cambios en el texto
  useEffect(() => {
    setHasChanges(analysis.trim() !== originalAnalysis.trim());
  }, [analysis, originalAnalysis]);

  const handleSaveManually = async () => {
    if (!hasChanges || !analysis.trim()) {
      toast({
        title: 'Sin cambios',
        description: 'No hay modificaciones en el levantamiento de requisitos para guardar',
        status: 'warning',
        duration: 2000,
        isClosable: true
      });
      return;
    }

    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/analysis`, {
        analysis: analysis.trim()
      });

      setOriginalAnalysis(analysis.trim());
      setHasChanges(false);

      toast({
        title: 'Levantamiento guardado',
        description: 'El levantamiento de requisitos se ha actualizado exitosamente',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      if (onAnalysisUpdated) {
        onAnalysisUpdated(analysis.trim());
      }
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar el levantamiento de requisitos. Intenta de nuevo.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendToAI = async () => {
    if (!analysis.trim()) {
      toast({
        title: 'Levantamiento vacío',
        description: 'El levantamiento de requisitos no puede estar vacío',
        status: 'warning',
        duration: 2000,
        isClosable: true
      });
      return;
    }

    setRestarting(true);
    try {
      // Crear un prompt más específico para que la IA mejore el levantamiento
      const improvePrompt = `Por favor, analiza y mejora este levantamiento de requisitos que he editado. Identifica posibles mejoras, inconsistencias o elementos faltantes, y genera una versión refinada y más completa:

${analysis.trim()}

Mantén la estructura y el contenido principal, pero mejóralo con tu experiencia como analista senior.`;
      
      await api.post(`/projects/${projectId}/restart-chat`, {
        analysis: improvePrompt
      });

      setOriginalAnalysis(analysis.trim());
      setHasChanges(false);

      // Configurar chat primero, luego cerrar modal sin limpiar el proyecto
      if (onRestartChat) {
        onRestartChat(projectId); // Esto abrirá el chat y configurará el estado
      }
      
      onClose(false); // Cerrar modal sin limpiar selectedProject
    } catch (error) {
      console.error('Error restarting chat:', error);
      toast({
        title: 'Error al reiniciar chat',
        description: 'No se pudo iniciar nueva conversación. Intenta de nuevo.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setRestarting(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('¿Descartar los cambios no guardados?')) {
        setAnalysis(originalAnalysis);
        setHasChanges(false);
        onClose(true); // Limpiar proyecto al cancelar
      }
    } else {
      onClose(true); // Limpiar proyecto al cancelar
    }
  };

  const characterCount = analysis.length;
  const maxCharacters = 50000;
  const isNearLimit = characterCount > maxCharacters * 0.9;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <Text>Levantamiento de Requisitos</Text>
            <Text fontSize="sm" color="gray.600" fontWeight="normal">
              Proyecto: {projectTitle}
            </Text>
          </VStack>
        </ModalHeader>

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Instrucciones */}
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">Levantamiento de Requisitos Final</AlertTitle>
                <AlertDescription fontSize="sm">
                  Este es el <strong>análisis definitivo</strong> generado por la IA. Puedes editarlo y luego:
                  <br />• <strong>Guardar cambios:</strong> Reemplazar directamente el levantamiento actual
                  <br />• <strong>Mejorar con IA:</strong> Pedir a la IA que refine tu versión editada
                </AlertDescription>
              </Box>
            </Alert>

            {/* Editor de texto */}
            <Box>
              <Text fontSize="sm" color="gray.600" mb={2}>
                Levantamiento de Requisitos Final (Markdown soportado)
              </Text>
              <Textarea
                value={analysis}
                onChange={(e) => setAnalysis(e.target.value)}
                placeholder="Aquí aparecerá el levantamiento de requisitos final generado por la IA..."
                rows={20}
                fontSize="sm"
                fontFamily="mono"
                resize="vertical"
                borderColor={isOverLimit ? 'red.300' : undefined}
                focusBorderColor={isOverLimit ? 'red.400' : undefined}
                isDisabled={loading || saving || restarting}
              />
              
              {/* Contador de caracteres y botón copiar */}
              <HStack justify="space-between" mt={2}>
                <HStack spacing={4}>
                  <Text 
                    fontSize="xs" 
                    color={isOverLimit ? 'red.500' : isNearLimit ? 'orange.500' : 'gray.500'}
                  >
                    {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()} caracteres
                  </Text>
                  {hasChanges && (
                    <Text fontSize="xs" color="orange.500" fontWeight="medium">
                      Cambios sin guardar
                    </Text>
                  )}
                </HStack>
                
                <Button
                  size="xs"
                  variant="ghost"
                  leftIcon={<Icon as={FiCopy} />}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(analysis);
                      toast({
                        title: 'Copiado',
                        description: 'Levantamiento copiado al portapapeles',
                        status: 'success',
                        duration: 2000,
                        isClosable: true
                      });
                    } catch {
                      toast({
                        title: 'Error',
                        description: 'No se pudo copiar el texto',
                        status: 'error',
                        duration: 2000,
                        isClosable: true
                      });
                    }
                  }}
                  isDisabled={!analysis.trim() || loading || saving || restarting}
                >
                  Copiar
                </Button>
              </HStack>
            </Box>

            {/* Advertencia si excede límite */}
            {isOverLimit && (
              <Alert status="error" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  El análisis excede el límite de caracteres permitido
                </Text>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <VStack spacing={3} w="full">
            {/* Separador visual */}
            <Divider />

            {/* Botones de acción */}
            <HStack justify="space-between" w="full">
              <Button
                variant="ghost"
                onClick={handleCancel}
                isDisabled={saving || restarting}
              >
                <Icon as={FiX} mr={2} />
                Cancelar
              </Button>

              <ButtonGroup spacing={3}>
                <Button
                  variant="outline"
                  colorScheme="green"
                  onClick={handleSaveManually}
                  isLoading={saving}
                  loadingText="Guardando..."
                  isDisabled={!hasChanges || isOverLimit || loading || restarting}
                >
                  <Icon as={FiSave} mr={2} />
                  Guardar Cambios
                </Button>

                <Button
                  colorScheme="blue"
                  onClick={handleSendToAI}
                  isLoading={restarting}
                  loadingText="Enviando a IA..."
                  isDisabled={!analysis.trim() || isOverLimit || loading || saving}
                >
                  <Icon as={FiMessageSquare} mr={2} />
                  Mejorar con IA
                </Button>
              </ButtonGroup>
            </HStack>

            {/* Texto explicativo */}
            <Text fontSize="xs" color="gray.500" textAlign="center" px={4}>
              <strong>Guardar Cambios:</strong> Reemplaza el levantamiento actual con tus ediciones • 
              <strong> Mejorar con IA:</strong> Pide a la IA que mejore o refine tu versión editada
            </Text>
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditAnalysisModal;