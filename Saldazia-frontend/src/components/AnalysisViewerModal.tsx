import React, { useEffect, useState } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea, IconButton, useToast } from '@chakra-ui/react';
import { FiCopy } from 'react-icons/fi';
import { conversationalWorkflowService } from '../services/conversationalWorkflow.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  onLoadSummary?: (content: string) => void; // notify parent when summary is loaded
}

type SummitResponse = {
  id?: string;
  refinedRequirements?: unknown;
  functionalAspects?: unknown;
  summaryText?: string;
  nonFunctionalAspects?: unknown;
  businessRules?: unknown;
  acceptanceCriteria?: unknown;
  identifiedRisks?: unknown;
  suggestedTestCases?: unknown;
};

type MessageLike = { role?: string; content?: string };

const AnalysisViewerModal: React.FC<Props> = ({ isOpen, onClose, workflowId, onLoadSummary }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const load = async () => {
      try {
        const resRaw = await conversationalWorkflowService.getAnalysisSummit(workflowId);
        const res = (resRaw as SummitResponse) || {};
        if (res && Object.keys(res).length > 0) {
          setExistingId(res.id || null);

          // Prefer the refinedRequirements field as the single, editable story.
          let initial = '';
          const refined = (res as SummitResponse).refinedRequirements;

          const tryFormat = (v: unknown) => {
            if (v === undefined || v === null) return '';
            if (typeof v === 'string') {
              // If it's a JSON string, pretty-print it, otherwise return as-is
              try {
                const p = JSON.parse(v);
                return JSON.stringify(p, null, 2);
              } catch {
                return v;
              }
            }
            try {
              return JSON.stringify(v, null, 2);
            } catch {
              return String(v);
            }
          };

          if (refined !== undefined && refined !== null) {
            initial = tryFormat(refined);
          } else if (res.summaryText) {
            initial = String(res.summaryText);
          } else if (res.functionalAspects) {
            initial = tryFormat(res.functionalAspects);
          } else {
            // fallback to last assistant message if no summit fields available
            const ws = await conversationalWorkflowService.getWorkflowStatus(workflowId);
            const wsObj = ws as unknown as { messages?: unknown } | undefined;
            const messages = Array.isArray(wsObj?.messages as unknown) ? (wsObj!.messages as MessageLike[]) : [];
            const lastAssistant = messages.slice().reverse().find((m) => (m.role === 'ASSISTANT' || m.role === 'assistant')) as MessageLike | undefined;
            initial = (lastAssistant?.content as string) || '';
          }

          setSummary(initial);
          setIsEditing(false);
          if (typeof onLoadSummary === 'function') onLoadSummary(initial);
          return;
        }
      } catch (err) {
        console.error('Error fetching summit', err);
        toast({ status: 'error', title: 'Error', description: 'No se pudo obtener el análisis.' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, workflowId, onLoadSummary, toast]);

  const handleSave = async () => {
    setLoading(true);
    try {
      let payload: unknown = {};
      try {
        payload = { refinedRequirements: JSON.parse(summary) } as unknown;
      } catch {
        payload = { refinedRequirements: summary } as unknown;
      }

      if (existingId) {
        await conversationalWorkflowService.updateAnalysisSummit(workflowId, payload);
        toast({ status: 'success', title: 'Guardado', description: 'Resumen actualizado correctamente.' });
      } else {
        await conversationalWorkflowService.createAnalysisSummit(workflowId, payload);
        toast({ status: 'success', title: 'Guardado', description: 'Resumen creado correctamente.' });
      }

      const fresh = await conversationalWorkflowService.getAnalysisSummit(workflowId) as SummitResponse;
      if (fresh) {
        setExistingId(fresh.id || existingId);
        if (fresh.refinedRequirements) setSummary(JSON.stringify(fresh.refinedRequirements, null, 2));
        else if (fresh.functionalAspects) setSummary(JSON.stringify(fresh.functionalAspects, null, 2));
        else if (fresh.summaryText) setSummary(fresh.summaryText as string);
      }
      setIsEditing(false);
      if (typeof onLoadSummary === 'function') onLoadSummary(summary);
    } catch (err) {
      console.error('Error saving summit', err);
      toast({ status: 'error', title: 'Error', description: 'No se pudo guardar el análisis.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast({ status: 'success', title: 'Copiado', description: 'Análisis copiado al portapapeles.' });
    } catch {
      toast({ status: 'error', title: 'Error', description: 'No se pudo copiar.' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Resumen IA</ModalHeader>
        <ModalBody>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={18}
            isReadOnly={!isEditing}
          />
        </ModalBody>
        <ModalFooter>
          <IconButton aria-label="copiar" icon={<FiCopy />} mr={3} onClick={handleCopy} isLoading={loading} variant="ghost" />
          {!isEditing && (
            <>
              <Button mr={3} onClick={() => setIsEditing(true)} variant="outline">Editar</Button>
            </>
          )}
          {isEditing && (
            <>
              <Button colorScheme="blue" onClick={handleSave} isLoading={loading}>Guardar</Button>
              <Button mr={3} onClick={async () => { setIsEditing(false); try { const r = await conversationalWorkflowService.getAnalysisSummit(workflowId) as SummitResponse; if (r.refinedRequirements) setSummary(JSON.stringify(r.refinedRequirements, null, 2)); else if (r.functionalAspects) setSummary(JSON.stringify(r.functionalAspects, null, 2)); else if (r.summaryText) setSummary(r.summaryText as string); else setSummary(''); } catch (err) { console.warn('Error reloading summary on cancel', err); } }} >Cancelar</Button>
            </>
          )}
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AnalysisViewerModal;
