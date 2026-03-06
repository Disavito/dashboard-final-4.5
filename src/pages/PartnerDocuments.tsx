import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui-custom/DataTable';
import { 
  Loader2, 
  FileWarning, 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  LayoutGrid,
  MapPin,
  Ticket,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UploadDocumentModal, ManualDocumentType } from '@/components/custom/UploadDocumentModal';
import DocumentLinkPill from '@/components/custom/DocumentLinkPill';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { useUser } from '@/context/UserContext';
import DocumentCardView from '@/components/ui-custom/DocumentCardView';
import DeletionRequestsTable from '@/components/documents/DeletionRequestsTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import SearchInputWithDebounce from '@/components/custom/SearchInputWithDebounce';

// Interfaces
interface SocioDocumento {
  id: number;
  tipo_documento: string;
  link_documento: string | null;
  transaction_type?: string;
}

interface IngresoInfo {
  status: 'Pagado' | 'No Pagado';
  receipt_number: string | null;
}

interface SocioConDocumentos {
  id: string;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto?: string; // Hecho opcional para evitar errores de tipo con componentes externos
  localidad: string;
  mz: string | null;
  lote: string | null;
  is_lote_medido: boolean | null;
  socio_documentos: SocioDocumento[];
  paymentInfo: IngresoInfo;
}

type DocumentoRequerido = 'Planos de ubicación' | 'Memoria descriptiva';

const getBucketNameForDocumentType = (docType: string): string => {
  switch (docType) {
    case 'Planos de ubicación': return 'planos';
    case 'Memoria descriptiva': return 'memoria-descriptiva';
    default: return 'documents';
  }
};

function PartnerDocuments() {
  const [sociosConDocumentos, setSociosConDocumentos] = useState<SocioConDocumentos[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedLocalidad, setSelectedLocalidad] = useState('all');
  const [localidades, setLocalidades] = useState<string[]>([]);
  const [rowSelection, setRowSelection] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState('documents');

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    socioId: string | null;
    socioName: string;
    documentType: DocumentoRequerido | null;
  }>({ isOpen: false, socioId: null, socioName: '', documentType: null });

  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    documentId: number | null;
    documentLink: string | null;
    documentType: string | null;
    socioName: string | null;
  }>({ isOpen: false, documentId: null, documentLink: null, documentType: null, socioName: null });
  
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { roles, loading: userLoading } = useUser();
  const isAdmin = useMemo(() => roles?.includes('admin') ?? false, [roles]);
  const isEngineer = useMemo(() => roles?.includes('engineer') ?? false, [roles]);
  const canManageEngineering = useMemo(() => isAdmin || isEngineer, [isAdmin, isEngineer]);

  const allowedDocumentTypes = useMemo(() => [
    "Planos de ubicación", "Memoria descriptiva", "Ficha", "Contrato", "Comprobante de Pago"
  ], []);

  const requiredDocumentTypes: DocumentoRequerido[] = useMemo(() => [
    "Planos de ubicación", "Memoria descriptiva"
  ], []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [sociosRes, localidadesRes, ingresosRes] = await Promise.all([
        supabase.from('socio_titulares').select(`id, dni, nombres, apellidoPaterno, apellidoMaterno, localidad, mz, lote, is_lote_medido, socio_documentos (id, tipo_documento, link_documento)`).order('apellidoPaterno', { ascending: true }),
        supabase.from('socio_titulares').select('localidad').neq('localidad', null),
        supabase.from('ingresos').select('dni, receipt_number, transaction_type').neq('dni', null)
      ]);

      if (sociosRes.error) throw sociosRes.error;
      
      const uniqueLocalidades = [...new Set(localidadesRes.data?.map(item => item.localidad).filter(Boolean) as string[])];
      setLocalidades(uniqueLocalidades.sort());

      const ingresosByDni = new Map<string, Array<{ receipt_number: string | null; transaction_type: string | null }>>();
      ingresosRes.data?.forEach(ingreso => {
        if (ingreso.dni) {
          if (!ingresosByDni.has(ingreso.dni)) ingresosByDni.set(ingreso.dni, []);
          ingresosByDni.get(ingreso.dni)?.push({ receipt_number: ingreso.receipt_number, transaction_type: ingreso.transaction_type });
        }
      });

      const processedData = sociosRes.data.map(socio => {
        let validReceiptNumber: string | null = null;
        let paymentStatus: 'Pagado' | 'No Pagado' = 'No Pagado';
        const socioIngresos = ingresosByDni.get(socio.dni) || [];
        const validTransactionTypes = ['Venta', 'Ingreso', 'Recibo de Pago'];

        for (const ingreso of socioIngresos) {
          if (ingreso.receipt_number && ingreso.transaction_type && validTransactionTypes.includes(ingreso.transaction_type)) {
            validReceiptNumber = ingreso.receipt_number;
            paymentStatus = 'Pagado';
            break;
          }
        }

        const filteredSocioDocuments = (socio.socio_documentos as any[]).filter(doc => {
          if (!allowedDocumentTypes.includes(doc.tipo_documento) || !doc.link_documento) return false;
          return true;
        });

        const hasPlanos = filteredSocioDocuments.some(d => d.tipo_documento === 'Planos de ubicación');
        const hasMemoria = filteredSocioDocuments.some(d => d.tipo_documento === 'Memoria descriptiva');
        const finalIsLoteMedido = hasPlanos || hasMemoria || (socio.is_lote_medido ?? false);

        return {
          ...socio,
          nombreCompleto: `${socio.apellidoPaterno} ${socio.apellidoMaterno} ${socio.nombres}`,
          is_lote_medido: finalIsLoteMedido,
          socio_documentos: filteredSocioDocuments,
          paymentInfo: { status: paymentStatus, receipt_number: validReceiptNumber },
        };
      });

      setSociosConDocumentos(processedData as SocioConDocumentos[]);
    } catch (error: any) {
      toast.error('Error al sincronizar expedientes');
    } finally {
      setLoading(false);
    }
  }, [allowedDocumentTypes]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const filteredData = useMemo(() => {
    const normalize = (text: string) => 
      text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const searchLower = normalize(debouncedSearchQuery.trim());
    if (!searchLower) {
      return selectedLocalidad === 'all' 
        ? sociosConDocumentos 
        : sociosConDocumentos.filter(s => s.localidad === selectedLocalidad);
    }

    const tokens = searchLower.split(/\s+/).filter(t => t.length > 0);

    return sociosConDocumentos.filter(socio => {
      const matchesLocalidad = selectedLocalidad === 'all' || socio.localidad === selectedLocalidad;
      if (!matchesLocalidad) return false;

      const searchableContent = normalize(`
        ${socio.nombres} 
        ${socio.apellidoPaterno} 
        ${socio.apellidoMaterno} 
        ${socio.dni} 
        ${socio.mz || ''} 
        ${socio.lote || ''} 
        ${socio.paymentInfo.receipt_number || ''}
      `);

      return tokens.every(token => searchableContent.includes(token));
    });
  }, [sociosConDocumentos, debouncedSearchQuery, selectedLocalidad]);

  const handleUpdateLoteMedido = useCallback(async (socioId: string, newValue: boolean, currentSocio: SocioConDocumentos) => {
    if (!canManageEngineering) return toast.error('Acceso restringido');
    
    const hasRequiredDocs = currentSocio.socio_documentos.some(d => requiredDocumentTypes.includes(d.tipo_documento as any));
    if (!newValue && hasRequiredDocs) {
      return toast.warning('Acción bloqueada', { description: 'No se puede desmarcar un lote con planos subidos.' });
    }

    setSociosConDocumentos(prev => prev.map(s => s.id === socioId ? { ...s, is_lote_medido: newValue } : s));
    
    try {
      const { error } = await supabase.from('socio_titulares').update({ is_lote_medido: newValue }).eq('id', socioId);
      if (error) throw error;
      toast.success('Estado actualizado');
    } catch (error: any) {
      fetchAllData();
      toast.error('Error al actualizar');
    }
  }, [canManageEngineering, requiredDocumentTypes, fetchAllData]);

  const handleBulkUpdateLoteMedido = useCallback(async (newValue: boolean, selectedData: SocioConDocumentos[]) => {
    if (!canManageEngineering) return toast.error('Acceso restringido');
    
    const selectedIds = selectedData
      .filter(item => {
        if (newValue) return true;
        const hasDocs = item.socio_documentos.some(d => requiredDocumentTypes.includes(d.tipo_documento as any));
        return !hasDocs;
      })
      .map(item => item.id);

    if (selectedIds.length === 0) return toast.warning('Ninguna fila cumple los requisitos');

    try {
      const { error } = await supabase.from('socio_titulares').update({ is_lote_medido: newValue }).in('id', selectedIds);
      if (error) throw error;
      toast.success(`Actualizados ${selectedIds.length} expedientes`);
      setRowSelection({});
      fetchAllData();
    } catch (error: any) {
      toast.error('Error en actualización masiva');
    }
  }, [canManageEngineering, fetchAllData, requiredDocumentTypes]);

  const handleDeleteDocument = useCallback(async () => {
    if (!deleteConfirmState.documentId || !deleteConfirmState.documentLink) return;
    setIsDeleting(true);
    try {
      const bucketName = getBucketNameForDocumentType(deleteConfirmState.documentType!);
      const url = new URL(deleteConfirmState.documentLink);
      const filePath = url.pathname.split('/').slice(-2).join('/');

      await supabase.storage.from(bucketName).remove([filePath]);
      await supabase.from('socio_documentos').delete().eq('id', deleteConfirmState.documentId);

      toast.success('Documento eliminado');
      setDeleteConfirmState({ isOpen: false, documentId: null, documentLink: null, documentType: null, socioName: null });
      fetchAllData();
    } catch (error: any) {
      toast.error('Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirmState, fetchAllData]);

  // Helper para renderizar headers ordenables
  const SortableHeader = ({ column, title }: { column: any, title: string }) => {
    const isSorted = column.getIsSorted();
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(isSorted === "asc")}
        className="-ml-4 h-8 hover:bg-transparent font-bold text-gray-600"
      >
        {title}
        {isSorted === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4 text-[#9E7FFF]" />
        ) : isSorted === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4 text-[#9E7FFF]" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 text-gray-300" />
        )}
      </Button>
    );
  };

  const columns: ColumnDef<SocioConDocumentos>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          className="translate-y-[2px] rounded-md border-gray-300"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          className="translate-y-[2px] rounded-md border-gray-300"
        />
      ),
    },
    {
      accessorKey: 'nombreCompleto',
      header: ({ column }) => <SortableHeader column={column} title="Socio / Titular" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900 uppercase tracking-tight leading-tight">
            {`${row.original.nombres} ${row.original.apellidoPaterno} ${row.original.apellidoMaterno}`}
          </span>
          <span className="text-[10px] font-mono text-gray-400">{row.original.dni}</span>
        </div>
      ),
    },
    {
      accessorKey: 'mz',
      header: ({ column }) => <SortableHeader column={column} title="Mz" />,
      cell: ({ row }) => (
        <div className="bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 w-fit">
          <span className="text-xs font-black text-gray-700">{row.original.mz || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'lote',
      header: ({ column }) => <SortableHeader column={column} title="Lt" />,
      cell: ({ row }) => (
        <div className="bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 w-fit">
          <span className="text-xs font-black text-gray-700">{row.original.lote || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'is_lote_medido',
      header: ({ column }) => <SortableHeader column={column} title="Ingeniería" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Checkbox
            checked={row.original.is_lote_medido ?? false}
            onCheckedChange={(v) => handleUpdateLoteMedido(row.original.id, !!v, row.original)}
            disabled={!canManageEngineering}
            className="w-5 h-5 rounded-md data-[state=checked]:bg-[#9E7FFF] data-[state=checked]:border-[#9E7FFF]"
          />
          <span className={cn(
            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
            row.original.is_lote_medido ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          )}>
            {row.original.is_lote_medido ? 'Medido' : 'Pendiente'}
          </span>
        </div>
      ),
    },
    {
      id: 'finanzas',
      accessorFn: (row) => row.paymentInfo.status,
      header: ({ column }) => <SortableHeader column={column} title="Finanzas" />,
      cell: ({ row }) => {
        const isPaid = row.original.paymentInfo.status === 'Pagado';
        return (
          <div className="flex flex-col gap-1">
            <Badge className={cn(
              "w-fit text-[10px] font-black px-2 py-0.5 border-none shadow-sm",
              isPaid 
                ? "bg-emerald-500 text-white" 
                : "bg-red-500/10 text-red-600"
            )}>
              {isPaid && <Ticket className="w-3 h-3 mr-1 inline" />}
              {row.original.paymentInfo.status.toUpperCase()}
            </Badge>
            {row.original.paymentInfo.receipt_number && (
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 w-fit">
                REC: {row.original.paymentInfo.receipt_number}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'documentos',
      header: 'Expediente Digital',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
          {row.original.socio_documentos.map((doc) => (
            <DocumentLinkPill
              key={doc.id}
              type={doc.tipo_documento}
              link={doc.link_documento}
              isAdmin={isAdmin}
              socioId={row.original.id}
              documentId={doc.id}
              canRequestDeletion={isEngineer}
              onDelete={() => setDeleteConfirmState({
                isOpen: true,
                documentId: doc.id,
                documentLink: doc.link_documento!,
                documentType: doc.tipo_documento,
                socioName: `${row.original.nombres} ${row.original.apellidoPaterno}`
              })}
            />
          ))}
        </div>
      ),
    },
    {
      id: 'acciones',
      header: 'Gestión',
      cell: ({ row }) => {
        const missing = requiredDocumentTypes.filter(t => !row.original.socio_documentos.find(d => d.tipo_documento === t));
        if (missing.length === 0) return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
        return (
          <div className="flex gap-1">
            {missing.map(t => (
              <Button 
                key={t} 
                variant="outline" 
                size="sm" 
                className="h-7 px-2 text-[9px] font-bold border-[#9E7FFF]/20 text-[#9E7FFF] hover:bg-[#F0EEFF]"
                onClick={() => setModalState({ 
                  isOpen: true, 
                  socioId: row.original.id, 
                  socioName: `${row.original.nombres} ${row.original.apellidoPaterno} ${row.original.apellidoMaterno}`, 
                  documentType: t 
                })}
              >
                + {t.split(' ')[0]}
              </Button>
            ))}
          </div>
        );
      },
    },
  ], [isAdmin, isEngineer, canManageEngineering, handleUpdateLoteMedido, requiredDocumentTypes]);

  if (loading || userLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="h-12 w-12 animate-spin text-[#9E7FFF]" />
      <p className="mt-4 text-gray-400 font-medium">Cargando expedientes técnicos...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20">
      <header className="relative h-64 md:h-80 flex items-center overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-r from-[#9E7FFF]/10 to-transparent z-0"></div>
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <LayoutGrid className="w-full h-full text-[#9E7FFF]" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-[#F0EEFF] text-[#9E7FFF] border-none font-bold px-4 py-1 rounded-full">
              MÓDULO DE INGENIERÍA v2.0
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter mb-4">
              Expedientes <span className="text-[#9E7FFF]">Digitales</span>
            </h1>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              Gestión centralizada de planimetría, memorias descriptivas y control de medición de lotes.
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 -mt-12 relative z-20">
        <div className="bg-white p-4 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <SearchInputWithDebounce
              placeholder="Buscar por socio, DNI, manzana, lote o recibo..."
              onDebouncedChange={setDebouncedSearchQuery}
              inputClassName="pl-12 h-14 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#9E7FFF]/20 text-gray-700 font-bold"
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <Select value={selectedLocalidad} onValueChange={setSelectedLocalidad}>
              <SelectTrigger className="h-14 w-full md:w-[240px] bg-gray-50 border-none rounded-2xl font-bold text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#9E7FFF]" />
                  <SelectValue placeholder="Localidad" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                <SelectItem value="all" className="font-bold">Todas las localidades</SelectItem>
                {localidades.map(loc => (
                  <SelectItem key={loc} value={loc} className="font-medium">{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canManageEngineering && Object.keys(rowSelection).length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-14 px-6 bg-[#9E7FFF] hover:bg-[#8B6EEF] rounded-2xl font-bold shadow-lg shadow-[#9E7FFF]/20">
                    Acciones ({Object.keys(rowSelection).length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl p-2 border-gray-100 shadow-2xl">
                  <DropdownMenuItem 
                    onClick={() => handleBulkUpdateLoteMedido(true, filteredData.filter((_, i) => rowSelection[i]))} 
                    className="rounded-xl font-bold text-emerald-600"
                  >
                    <CheckSquare className="w-4 h-4 mr-2" /> Marcar como Medido
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleBulkUpdateLoteMedido(false, filteredData.filter((_, i) => rowSelection[i]))} 
                    className="rounded-xl font-bold text-amber-600"
                  >
                    <Square className="w-4 h-4 mr-2" /> Marcar como Pendiente
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100/50 p-1 rounded-2xl mb-6">
            <TabsTrigger 
              value="documents" 
              className="rounded-xl data-[state=active]:bg-[#9E7FFF] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-bold"
            >
              Expedientes Digitales
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="deletion-requests" 
                className="rounded-xl data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-bold"
              >
                Solicitudes de Eliminación
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="documents" className="mt-0">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              {filteredData.length === 0 ? (
                <div className="py-32 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6">
                    <FileWarning className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">No se encontraron expedientes</h3>
                  <p className="text-gray-400 mt-2">Intenta ajustar los filtros o términos de búsqueda.</p>
                </div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <DataTable 
                      columns={columns} 
                      data={filteredData} 
                      rowSelection={rowSelection}
                      onRowSelectionChange={setRowSelection}
                    />
                  </div>
                  <div className="md:hidden p-4">
                    <DocumentCardView
                      data={filteredData}
                      requiredDocumentTypes={requiredDocumentTypes}
                      canManageLoteMedido={canManageEngineering}
                      canDeleteDocuments={isAdmin}
                      onOpenUploadModal={(socio, type) => setModalState({ 
                        isOpen: true, 
                        socioId: socio.id, 
                        socioName: `${socio.nombres} ${socio.apellidoPaterno} ${socio.apellidoMaterno}`, 
                        documentType: type as any 
                      })}
                      onDeleteDocument={(id, link, type, name) => setDeleteConfirmState({ isOpen: true, documentId: id, documentLink: link, documentType: type, socioName: name })}
                      onUpdateLoteMedido={(socioId, newValue, socio) => handleUpdateLoteMedido(socioId, newValue, socio as SocioConDocumentos)}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="deletion-requests" className="mt-0">
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                <DeletionRequestsTable />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <UploadDocumentModal
        isOpen={modalState.isOpen}
        onOpenChange={(open) => !open && setModalState({ isOpen: false, socioId: null, socioName: '', documentType: null })}
        socioId={modalState.socioId}
        socioName={modalState.socioName}
        documentType={modalState.documentType as ManualDocumentType}
        onUploadSuccess={fetchAllData}
      />

      <ConfirmationDialog
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState({ isOpen: false, documentId: null, documentLink: null, documentType: null, socioName: null })}
        onConfirm={handleDeleteDocument}
        title="Eliminar Documento"
        description={`¿Estás seguro de eliminar "${deleteConfirmState.documentType}"? Esta acción es permanente.`}
        confirmText="Eliminar permanentemente"
        variant="destructive"
        isConfirming={isDeleting}
      />
    </div>
  );
}

export default PartnerDocuments;
