import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui-custom/DataTable';
import { fetchDeletionRequests, updateDeletionRequestStatus } from '@/lib/supabase/documentRequests';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/context/UserContext';

type RequestRow = Awaited<ReturnType<typeof fetchDeletionRequests>>[number];

const DeletionRequestsTable = () => {
    const { user } = useUser();
    const [data, setData] = React.useState<RequestRow[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

    const loadRequests = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const requests = await fetchDeletionRequests();
            setData(requests);
        } catch (error) {
            toast.error('No se pudieron cargar las solicitudes');
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const handleAction = async (request: RequestRow, status: 'Approved' | 'Rejected') => {
        if (!user?.id) return;

        setIsProcessing(request.id);
        try {
            await updateDeletionRequestStatus(
                request.id, 
                status, 
                user.id, 
                request.document_id
            );
            
            toast.success(
                status === 'Approved' 
                ? 'Documento eliminado definitivamente' 
                : 'Solicitud rechazada'
            );
            loadRequests();
        } catch (error) {
            toast.error('Error al procesar la solicitud');
        } finally {
            setIsProcessing(null);
        }
    };

    const columns: ColumnDef<RequestRow>[] = [
        {
            accessorKey: 'created_at',
            header: 'Fecha',
            cell: ({ row }) => <span className="text-xs font-mono text-gray-500">{new Date(row.original.created_at).toLocaleDateString()}</span>,
        },
        {
            accessorKey: 'socio_details',
            header: 'Socio / Expediente',
            cell: ({ row }) => {
                const socio = row.original.socio_details;
                return (
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 uppercase text-[11px]">
                            {socio?.nombres} {socio?.apellidoPaterno}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">DNI: {socio?.dni}</span>
                    </div>
                );
            }
        },
        {
            accessorKey: 'document_type',
            header: 'Documento a Eliminar',
            cell: ({ row }) => (
                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 font-bold text-[10px] uppercase">
                    <Trash2 className="w-3 h-3 mr-1" /> {row.original.document_type}
                </Badge>
            ),
        },
        {
            accessorKey: 'request_status',
            header: 'Estado',
            cell: ({ row }) => {
                const status = row.original.request_status;
                if (status === 'Pending') return <Badge className="bg-amber-100 text-amber-700 border-none text-[10px] font-black uppercase">Pendiente</Badge>;
                if (status === 'Approved') return <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-black uppercase">Aprobado & Borrado</Badge>;
                return <Badge className="bg-gray-100 text-gray-500 border-none text-[10px] font-black uppercase">Rechazado</Badge>;
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Acciones de Admin</div>,
            cell: ({ row }) => {
                const request = row.original;
                const isPending = request.request_status === 'Pending';
                const isCurrentProcessing = isProcessing === request.id;

                return (
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" asChild>
                            <a href={request.document_link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </Button>
                        
                        {isPending && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAction(request, 'Approved')}
                                    disabled={isCurrentProcessing}
                                    className="h-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 font-bold text-[10px]"
                                >
                                    {isCurrentProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                                    APROBAR
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAction(request, 'Rejected')}
                                    disabled={isCurrentProcessing}
                                    className="h-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold text-[10px]"
                                >
                                    {isCurrentProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                                    RECHAZAR
                                </Button>
                            </>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-100 rounded-2xl">
                    <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Bandeja de Eliminación</h2>
                    <p className="text-sm text-gray-500 font-medium">Solo los administradores pueden confirmar el borrado definitivo.</p>
                </div>
            </div>
            
            <DataTable
                columns={columns}
                data={data}
                isLoading={isLoading}
                className="border-none shadow-none"
            />
        </div>
    );
};

export default DeletionRequestsTable;
