import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/context/UserContext';

export interface PendingRequest {
    id: string;
    document_id: string;
    document_type: string;
    document_link: string;
    request_status: string;
    created_at: string;
    socio_id: string;
    socio_details?: {
        nombres: string;
        apellidoPaterno: string;
    };
}

const usePendingRequests = () => {
    const { roles, loading } = useUser();
    const canManageRequests = roles?.some(role => ['admin', 'engineer'].includes(role));
    
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    const fetchRequests = useCallback(async () => {
        if (!canManageRequests) {
            setPendingRequests([]);
            setIsFetching(false);
            return;
        }

        const { data, error } = await supabase
            .from('document_deletion_requests')
            .select(`
                *,
                socio_details:socio_titulares(nombres, apellidoPaterno)
            `)
            .eq('request_status', 'Pending')
            .order('created_at', { ascending: false });

        if (!error) {
            setPendingRequests(data || []);
        }
        setIsFetching(false);
    }, [canManageRequests]);

    useEffect(() => {
        if (loading) return;

        fetchRequests();

        if (canManageRequests) {
            const channel = supabase
                .channel('deletion-requests-sync')
                .on(
                    'postgres_changes',
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'document_deletion_requests' 
                    },
                    () => {
                        fetchRequests();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [canManageRequests, loading, fetchRequests]);

    return { 
        pendingRequests, 
        pendingCount: pendingRequests.length, 
        isFetching, 
        canManageRequests 
    };
};

export default usePendingRequests;
