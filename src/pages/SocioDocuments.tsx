import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/context/UserContext';
import { 
  Loader2, 
  Search, 
  FileText, 
  Upload, 
  CheckCircle2, 
  Trash2,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadDocumentModal, ManualDocumentType } from '@/components/custom/UploadDocumentModal';
import DeletionRequestsTable from '@/components/documents/DeletionRequestsTable';
import DocumentLinkPill from '@/components/custom/DocumentLinkPill';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';

interface SocioDocumento {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  localidad: string;
  mz: string;
  lote: string;
  is_lote_medido: boolean;
  paymentStatus: 'Pagado' | 'No Pagado';
  nroRecibo: string;
  documentos: any[];
}

type SortConfig = {
  key: keyof SocioDocumento | 'nombreCompleto';
  direction: 'asc' | 'desc' | null;
};

function SocioDocuments() {
  const { roles } = useUser();
  const isAdmin = !!roles?.includes('admin');
  
  const [socios, setSocios] = useState<SocioDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [localidadFilter, setLocalidadFilter] = useState('all');
  const [localidades, setLocalidades] = useState<string[]>([]);
  
  // Estado para el ordenamiento
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'nombreCompleto', direction: 'asc' });

  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    socioId: string;
    socioName: string;
    type: ManualDocumentType | null;
  }>({ isOpen: false, socioId: '', socioName: '', type: null });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    docId: string;
    docType: string;
    socioName: string;
  }>({ isOpen: false, docId: '', docType: '', socioName: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sociosData, error: sociosError } = await supabase
        .from('socio_titulares')
        .select(`
          *,
          socio_documentos(id, tipo_documento, link_documento),
          ingresos(nro_recibo)
        `);

      if (sociosError) throw sociosError;

      const uniqueLocs = Array.from(new Set((sociosData || []).map(s => s.localidad).filter(Boolean)));
      setLocalidades(uniqueLocs);

      const enriched = (sociosData || []).map(socio => {
        const socioDocs = socio.socio_documentos || [];
        const socioIncome = socio.ingresos?.[0];
        
        const hasPlano = socioDocs.some((d: any) => d.tipo_documento === 'Planos de ubicación');
        const hasMemoria = socioDocs.some((d: any) => d.tipo_documento === 'Memoria descriptiva');

        return {
          ...socio,
          paymentStatus: socioIncome ? 'Pagado' : 'No Pagado',
          nroRecibo: socioIncome?.nro_recibo || 'N/A',
          is_lote_medido: hasPlano && hasMemoria,
          documentos: socioDocs
        };
      });

      setSocios(enriched);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar los expedientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Función para manejar el cambio de orden
  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Lógica de filtrado y ORDENAMIENTO combinada
  const filteredSocios = useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    // 1. Filtrar
    let result = socios.filter(s => {
      const matchesSearch = !term || 
        `${s.nombres} ${s.apellidoPaterno} ${s.dni} ${s.mz} ${s.lote}`.toLowerCase().includes(term);
      const matchesLocalidad = localidadFilter === 'all' || s.localidad === localidadFilter;
      return matchesSearch && matchesLocalidad;
    });

    // 2. Ordenar
    if (sortConfig.direction) {
      result.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortConfig.key === 'nombreCompleto') {
          valA = `${a.nombres} ${a.apellidoPaterno}`.toLowerCase();
          valB = `${b.nombres} ${b.apellidoPaterno}`.toLowerCase();
        } else {
          valA = a[sortConfig.key as keyof SocioDocumento];
          valB = b[sortConfig.key as keyof SocioDocumento];
        }

        if (valA === valB) return 0;
        
        const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [socios, searchTerm, localidadFilter, sortConfig]);

  const handleDeleteRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('solicitudes_eliminacion_documentos')
        .insert({
          documento_id: deleteConfirm.docId,
          solicitado_por: user.id,
          motivo: 'Solicitud desde panel de expedientes',
          estado: 'pendiente'
        });

      if (error) throw error;

      toast.success('Solicitud de eliminación enviada');
      setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error(error);
      toast.error('Error al enviar la solicitud');
    }
  };

  // Componente para el header de la tabla con ordenamiento
  const SortableHeader = ({ label, sortKey, className }: { label: string, sortKey: SortConfig['key'], className?: string }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th className={cn("p-4 cursor-pointer hover:bg-gray-100/80 transition-colors group", className)} onClick={() => handleSort(sortKey)}>
        <div className="flex items-center gap-2">
          {label}
          <div className="flex flex-col">
            {isActive ? (
              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#9E7FFF]" /> : <ArrowDown className="w-3 h-3 text-[#9E7FFF]" />
            ) : (
              <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-400" />
            )}
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-[#F8F9FC] min-h-screen">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#9E7FFF]">
          <FileText className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Socio y Documentos</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Tabla de socios con enlaces directos a sus documentos, estado de pago y filtros de búsqueda.
        </p>
      </div>

      <Tabs defaultValue="expedientes" className="w-full">
        <TabsList className="bg-white border border-gray-200 p-1 mb-4">
          <TabsTrigger value="expedientes" className="data-[state=active]:bg-[#9E7FFF] data-[state=active]:text-white font-semibold px-6">
            EXPEDIENTES
          </TabsTrigger>
          <TabsTrigger value="solicitudes" className="data-[state=active]:bg-red-500 data-[state=active]:text-white font-semibold px-6 flex gap-2">
            <Trash2 className="w-4 h-4" />
            SOLICITUDES DE ELIMINACIÓN
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expedientes" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar por DNI, nombre, apellidos, Mz o Lote..." 
                className="pl-10 bg-white border-gray-200 focus:ring-[#9E7FFF]/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={localidadFilter} onValueChange={setLocalidadFilter}>
              <SelectTrigger className="w-full md:w-[250px] bg-white border-gray-200">
                <Filter className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Todas las localidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las localidades</SelectItem>
                {localidades.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-600 text-xs font-bold">
                    <th className="p-4 w-10"><Checkbox disabled /></th>
                    <SortableHeader label="Nombre Completo" sortKey="nombreCompleto" />
                    <SortableHeader label="DNI" sortKey="dni" />
                    <SortableHeader label="Mz" sortKey="mz" className="text-center" />
                    <SortableHeader label="Lote" sortKey="lote" className="text-center" />
                    <th className="p-4 text-center">Lote Medido</th>
                    <SortableHeader label="Estado de Pago" sortKey="paymentStatus" className="text-center" />
                    <SortableHeader label="N° Recibo" sortKey="nroRecibo" className="text-center" />
                    <th className="p-4">Documentos</th>
                    <th className="p-4 text-right">Subir Faltantes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center">
                        <Loader2 className="animate-spin h-8 w-8 text-[#9E7FFF] mx-auto" />
                      </td>
                    </tr>
                  ) : filteredSocios.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-gray-400 italic">
                        No se encontraron resultados.
                      </td>
                    </tr>
                  ) : filteredSocios.map((socio) => (
                    <tr key={socio.id} className="hover:bg-gray-50/50 transition-colors group text-sm">
                      <td className="p-4"><Checkbox /></td>
                      <td className="p-4 font-medium text-gray-700 uppercase">
                        {socio.nombres} {socio.apellidoPaterno} {socio.apellidoMaterno}
                      </td>
                      <td className="p-4 text-gray-500 font-mono">{socio.dni || 'N/A'}</td>
                      <td className="p-4 text-center font-bold text-gray-700">{socio.mz || 'N/A'}</td>
                      <td className="p-4 text-center font-bold text-gray-700">{socio.lote || 'N/A'}</td>
                      <td className="p-4 text-center">
                        <Checkbox checked={socio.is_lote_medido} disabled className="data-[state=checked]:bg-[#9E7FFF] data-[state=checked]:border-[#9E7FFF]" />
                      </td>
                      <td className="p-4 text-center">
                        <Badge 
                          className={cn(
                            "font-bold px-3 py-0.5 rounded-md border-none",
                            socio.paymentStatus === 'Pagado' 
                              ? "bg-[#10b981] text-white" 
                              : "bg-[#ef4444] text-white"
                          )}
                        >
                          {socio.paymentStatus}
                        </Badge>
                      </td>
                      <td className="p-4 text-center text-gray-500">{socio.nroRecibo}</td>
                      
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {socio.documentos.length === 0 ? (
                            <span className="text-gray-400 italic text-xs">Sin documentos</span>
                          ) : (
                            socio.documentos.map((doc: any, idx: number) => (
                              <DocumentLinkPill
                                key={idx}
                                type={doc.tipo_documento}
                                link={doc.link_documento}
                                isAdmin={isAdmin}
                                socioId={socio.id}
                                documentId={doc.id}
                              />
                            ))
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex flex-col gap-1 items-end">
                          {socio.is_lote_medido ? (
                            <span className="text-[#10b981] font-bold text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Completo
                            </span>
                          ) : (
                            <>
                              {!socio.documentos.some((d: any) => d.tipo_documento === 'Planos de ubicación') && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-[10px] font-bold border-gray-200 hover:bg-gray-50"
                                  onClick={() => setUploadModal({ 
                                    isOpen: true, 
                                    socioId: socio.id, 
                                    socioName: `${socio.nombres} ${socio.apellidoPaterno}`, 
                                    type: 'Planos de ubicación' 
                                  })}
                                >
                                  <Upload className="w-3 h-3 mr-1" /> Subir Planos
                                </Button>
                              )}
                              {!socio.documentos.some((d: any) => d.tipo_documento === 'Memoria descriptiva') && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-[10px] font-bold border-gray-200 hover:bg-gray-50"
                                  onClick={() => setUploadModal({ 
                                    isOpen: true, 
                                    socioId: socio.id, 
                                    socioName: `${socio.nombres} ${socio.apellidoPaterno}`, 
                                    type: 'Memoria descriptiva' 
                                  })}
                                >
                                  <Upload className="w-3 h-3 mr-1" /> Subir Memoria
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="solicitudes">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <DeletionRequestsTable />
          </div>
        </TabsContent>
      </Tabs>

      <UploadDocumentModal
        isOpen={uploadModal.isOpen}
        onOpenChange={(open) => setUploadModal(prev => ({ ...prev, isOpen: open }))}
        socioId={uploadModal.socioId}
        socioName={uploadModal.socioName}
        documentType={uploadModal.type}
        onUploadSuccess={fetchData}
      />

      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleDeleteRequest}
        title="Solicitar Eliminación"
        description={`¿Estás seguro de que deseas solicitar la eliminación de "${deleteConfirm.docType}" para el socio ${deleteConfirm.socioName}? Esta acción deberá ser aprobada.`}
        confirmText="Enviar Solicitud"
        variant="destructive"
      />
    </div>
  );
}

export default SocioDocuments;
