import React, { useState } from 'react';
import { FileText, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { createDeletionRequest } from '@/lib/supabase/documentRequests';
import { toast } from 'sonner';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';

interface DocumentLinkPillProps {
  type: string;
  link: string | null; // Aceptar null para el link
  isAdmin: boolean;
  socioId: string; // Added for deletion request
  documentId: number; // Added for deletion request
  onDelete?: () => void; // Existing prop for admin direct delete
  canRequestDeletion?: boolean; // New prop for engineer request
}

const DocumentLinkPill: React.FC<DocumentLinkPillProps> = ({
  type,
  link,
  isAdmin,
  socioId,
  documentId,
  onDelete,
  canRequestDeletion,
}) => {
  const { user, roles } = useUser();
  const isEngineer = roles?.includes('engineer') ?? false;
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [showRequestConfirm, setShowRequestConfirm] = useState(false);

  const handleRequestDeletion = async () => {
    if (!user || !user.id) { // Removed user.email check as it's not inserted into DB
      toast.error('Error de autenticación', { description: 'No se pudo identificar al usuario para la solicitud.' });
      return;
    }
    if (!socioId || !documentId) {
      toast.error('Error de datos', { description: 'Faltan datos del documento o socio para la solicitud.' });
      return;
    }
    if (!link) { // Asegurarse de que el link no sea null para la solicitud
      toast.error('Error de documento', { description: 'El documento no tiene un enlace válido para la solicitud.' });
      return;
    }

    setIsRequestingDeletion(true);
    try {
      await createDeletionRequest({
        document_id: documentId.toString(), // Ensure it's string/uuid as per DB schema
        document_type: type,
        document_link: link,
        socio_id: socioId,
        requested_by: user.id,
        // requested_by_email: user.email, // Removed as it does not exist in the DB schema
      });
      toast.success('Solicitud de eliminación enviada', { description: 'Un administrador revisará tu petición.' });
      setShowRequestConfirm(false);
    } catch (error: any) {
      console.error('Error creating deletion request:', error);
      toast.error('Error al enviar solicitud', { description: error.message || 'Inténtalo de nuevo.' });
    } finally {
      setIsRequestingDeletion(false);
    }
  };

  // Engineers can only request deletion for specific document types
  const showEngineerRequestButton = canRequestDeletion && isEngineer && (type === 'Planos de ubicación' || type === 'Memoria descriptiva');

  if (!link) { // No renderizar si no hay link
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border-gray-200 bg-gray-50 text-gray-400 italic"
      >
        <FileText className="h-3.5 w-3.5 text-gray-300" />
        {type.split(' ')[0]} (N/A)
      </Badge>
    );
  }

  return (
    <>
      <Badge
        variant="outline"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border-gray-200 bg-gray-50 text-gray-700",
          (isAdmin || showEngineerRequestButton) && "pr-1" // Adjust padding if delete/request button is present
        )}
      >
        <FileText className="h-3.5 w-3.5 text-gray-400" />
        <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {type.split(' ')[0]}
        </a>
        {isAdmin && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:bg-gray-100 hover:text-red-500"
            onClick={onDelete}
            aria-label={`Eliminar ${type}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {showEngineerRequestButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:bg-gray-100 hover:text-amber-500"
            onClick={() => setShowRequestConfirm(true)}
            disabled={isRequestingDeletion}
            aria-label={`Solicitar eliminación de ${type}`}
          >
            {isRequestingDeletion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        )}
      </Badge>

      <ConfirmationDialog
        isOpen={showRequestConfirm}
        onClose={() => setShowRequestConfirm(false)}
        onConfirm={handleRequestDeletion}
        title="Solicitar Eliminación de Documento"
        description={`¿Estás seguro de que quieres solicitar la eliminación de "${type}"? Un administrador revisará tu petición.`}
        confirmText="Enviar Solicitud"
        variant="default" // Cambiado a 'default'
        isConfirming={isRequestingDeletion}
      />
    </>
  );
};

export default DocumentLinkPill;
