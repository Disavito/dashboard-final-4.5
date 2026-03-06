import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/context/UserContext';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

/**
 * Hook para notificaciones emergentes (Toasts) solo para NUEVAS solicitudes.
 */
const useRealtimeNotifications = () => {
    const { roles, loading } = useUser();
    const canManageRequests = roles?.some(role => ['admin', 'engineer'].includes(role));

    useEffect(() => {
        if (loading || !canManageRequests) return;

        const channel = supabase
            .channel('deletion-requests-toast')
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'document_deletion_requests' 
                },
                (payload) => {
                    const newRequest = payload.new;
                    
                    toast({
                        title: '🚨 Nueva Solicitud Pendiente',
                        description: `Se requiere revisión para un documento de tipo: ${newRequest.document_type}.`,
                        action: (
                            <Link 
                                to="/partner-documents?tab=requests" 
                                className="text-accent hover:underline font-semibold p-2"
                            >
                                Revisar
                            </Link>
                        ),
                        duration: 8000, 
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [canManageRequests, loading]);
};

export default useRealtimeNotifications;
