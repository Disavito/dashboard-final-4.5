import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/context/UserContext';

/**
 * Hook para obtener el número de solicitudes pendientes con manejo de errores de Realtime.
 */
const usePendingRequestsCount = () => {
    const { roles, loading } = useUser();
    const isAdmin = roles?.includes('admin');
    const [pendingCount, setPendingCount] = useState(0);
    const [isFetching, setIsFetching] = useState(true);

    const fetchCount = useCallback(async () => {
        if (!isAdmin) {
            setPendingCount(0);
            setIsFetching(false);
            return;
        }

        setIsFetching(true);
        try {
            const { count, error } = await supabase
                .from('document_deletion_requests')
                .select('*', { count: 'exact', head: true })
                .eq('request_status', 'Pending');

            if (error) throw error;
            setPendingCount(count || 0);
        } catch (error) {
            console.error('Error fetching pending requests count:', error);
            setPendingCount(0);
        } finally {
            setIsFetching(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (loading) return;

        fetchCount();

        if (isAdmin) {
            // Prefijamos _err para evitar el error TS6133
            const channel = supabase
                .channel('pending-requests-count-channel')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'document_deletion_requests' },
                    () => fetchCount()
                )
                .subscribe((status, _err) => {
                    if (status === 'CHANNEL_ERROR') {
                        console.warn('Realtime connection failed. Falling back to manual refresh.');
                    }
                });

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isAdmin, loading, fetchCount]);

    return { pendingCount, isFetching, isAdmin };
};

export default usePendingRequestsCount;
