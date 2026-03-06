import { supabase } from '@/lib/supabaseClient';

export interface DeletionRequestInput {
    document_id: string;
    document_type: string;
    document_link: string;
    socio_id: string;
    requested_by: string;
}

export const createDeletionRequest = async (input: DeletionRequestInput) => {
    const { data, error } = await supabase
        .from('document_deletion_requests')
        .insert([
            {
                document_id: input.document_id,
                document_type: input.document_type,
                document_link: input.document_link,
                socio_id: input.socio_id,
                requested_by: input.requested_by,
                request_status: 'Pending'
            }
        ])
        .select();

    if (error) throw error;
    return data;
};

export const fetchDeletionRequests = async () => {
    const { data, error } = await supabase
        .from('document_deletion_requests')
        .select(`
            *,
            socio_details:socio_titulares(nombres, apellidoPaterno, dni)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

/**
 * PROCESO DE APROBACIÓN FINAL (Solo Admin)
 * Si se aprueba, se elimina el documento de la tabla principal.
 */
export const updateDeletionRequestStatus = async (
    requestId: string, 
    status: 'Approved' | 'Rejected',
    adminId: string,
    documentId?: string // ID del documento original a borrar
) => {
    // 1. Actualizar el estado de la solicitud
    const { error: updateError } = await supabase
        .from('document_deletion_requests')
        .update({
            request_status: status,
            approved_at: new Date().toISOString(),
            approved_by: adminId
        })
        .eq('id', requestId);

    if (updateError) throw updateError;

    // 2. Si es aprobado, ejecutar el borrado real del documento
    if (status === 'Approved' && documentId) {
        const { error: deleteError } = await supabase
            .from('socio_documentos')
            .delete()
            .eq('id', documentId);
        
        if (deleteError) {
            console.error("Error al borrar documento físico:", deleteError);
            // Opcional: Podrías revertir el estado de la solicitud aquí si el borrado falla
        }
    }
};
