import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { fetchSocioDocuments, SocioDocument } from '@/lib/supabase/documents';
import { createDeletionRequest } from '@/lib/supabase/documentRequests';
import { UploadDocumentModal, ManualDocumentType } from '@/components/custom/UploadDocumentModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { 
  Search, 
  FileText, 
  Map as MapIcon, 
  Upload, 
  Trash2, 
  Eye, 
  Loader2, 
  FileSignature,
  FileCheck,
  Receipt,
  Lock,
  Sparkles,
  FilterX,
  UserCheck,
  Ticket,
  MapPin,
  ChevronRight
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDebounce } from 'use-debounce';
import { cn } from '@/lib/utils';

interface DocumentManagerProps {
  isAdmin: boolean;
}

export default function DocumentManager({ isAdmin }: DocumentManagerProps) {
  const { user } = useUser();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebounce(searchInput, 300);
  const [rawSearchResults, setRawSearchResults] = useState<any[]>([]);
  const [selectedSocio, setSelectedSocio] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [documents, setDocuments] = useState<SocioDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<ManualDocumentType | null>(null);
  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<SocioDocument | null>(null);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);

  // OPTIMIZACIÓN: Búsqueda ultra-rápida con selección limitada de columnas
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setRawSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const normalize = (text: any) => 
          String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
        const searchWords = normalize(debouncedSearch).split(/\s+/).filter(word => word.length > 0);
        const firstWord = searchWords[0];

        // Buscamos solo lo necesario para la lista de resultados
        const { data, error } = await supabase
          .from('socio_titulares')
          .select(`
            id, nombres, apellidoPaterno, apellidoMaterno, dni, localidad, mz, lote,
            ingresos(nro_recibo)
          `)
          .or(`nombres.ilike.%${firstWord}%,apellidoPaterno.ilike.%${firstWord}%,dni.ilike.%${firstWord}%`)
          .limit(15);

        if (error) throw error;

        const filtered = (data || []).filter(socio => {
          const searchableContent = normalize(`
            ${socio.nombres} 
            ${socio.apellidoPaterno} 
            ${socio.apellidoMaterno} 
            ${socio.dni} 
            ${socio.ingresos?.[0]?.nro_recibo || ''}
          `);
          return searchWords.every(word => searchableContent.includes(word));
        });

        setRawSearchResults(filtered);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearch]);

  // OPTIMIZACIÓN: Carga de documentos solo cuando se selecciona un socio
  const loadDocuments = useCallback(async (socioId: string) => {
    setLoadingDocs(true);
    try {
      const docs = await fetchSocioDocuments(socioId);
      setDocuments(docs || []);
    } catch (error) {
      toast.error('Error al cargar documentos');
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSocio) loadDocuments(selectedSocio.id);
  }, [selectedSocio, loadDocuments]);

  const handleUploadClick = (type: ManualDocumentType) => {
    if (!selectedSocio) return;
    setUploadDocType(type);
    setIsUploadModalOpen(true);
  };

  const renderDocumentCard = (
    type: string, 
    icon: React.ReactNode,
    allowManualUpload: boolean = false
  ) => {
    const doc = documents.find(d => d.tipo_documento === type);
    const exists = !!doc;
    const isReceipt = type === 'Comprobante de pago';

    return (
      <Card className={cn(
        "relative overflow-hidden border transition-all duration-300 group",
        exists 
          ? (isReceipt ? 'border-amber-500/40 bg-amber-50/50 shadow-md shadow-amber-100/20' : 'border-emerald-500/30 bg-emerald-500/5') 
          : 'border-border bg-surface/50',
        isReceipt && !exists && "border-dashed border-amber-300 bg-amber-50/10"
      )}>
        <div className="absolute top-3 right-3">
          {isReceipt ? (
            <Badge className={cn(
              "text-[10px] flex items-center gap-1 px-2 py-0.5 border-none",
              exists ? "bg-amber-500 text-white shadow-sm" : "bg-amber-100 text-amber-600"
            )}>
              <Ticket className="w-3 h-3" /> {exists ? 'VERIFICADO' : 'PENDIENTE'}
            </Badge>
          ) : !allowManualUpload && !exists && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Sistema
            </Badge>
          )}
        </div>
        
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className={cn(
            "p-4 rounded-2xl transition-all duration-300 group-hover:scale-110",
            exists 
              ? (isReceipt ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-emerald-500/20 text-emerald-600') 
              : 'bg-background text-textSecondary'
          )}>
            {icon}
          </div>
          
          <div className="space-y-1">
            <h3 className={cn(
              "font-bold text-lg",
              isReceipt ? "text-amber-800" : "text-white"
            )}>{type}</h3>
            <p className="text-xs text-textSecondary">
              {exists 
                ? 'Documento verificado' 
                : allowManualUpload 
                  ? 'Pendiente de carga' 
                  : 'Generación automática'}
            </p>
          </div>

          <div className="pt-2 w-full">
            {exists ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className={cn(
                    "flex-1 border-border hover:bg-primary/10",
                    isReceipt && "border-amber-300 bg-white hover:bg-amber-100 text-amber-700"
                  )} 
                  asChild
                >
                  <a href={doc.link_documento} target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4 mr-2" /> Ver
                  </a>
                </Button>
                <Button 
                  variant="ghost" 
                  className="px-3 text-error hover:bg-error/10 hover:text-error"
                  onClick={() => { setDocToDelete(doc); setIsDeleteAlertOpen(true); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              allowManualUpload ? (
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 font-bold" 
                  onClick={() => handleUploadClick(type as ManualDocumentType)}
                  disabled={!selectedSocio}
                >
                  <Upload className="w-4 h-4 mr-2" /> Subir Archivo
                </Button>
              ) : (
                <div className={cn(
                  "w-full py-2.5 px-3 rounded-lg border flex items-center justify-center text-[11px] font-medium select-none",
                  isReceipt ? "bg-amber-100/50 border-amber-200 text-amber-600" : "bg-background/50 border-border/50 text-textSecondary"
                )}>
                  <Lock className="w-3.5 h-3.5 mr-2 opacity-50" />
                  {isReceipt ? 'Esperando Pago' : 'Automático'}
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="bg-white border-gray-200 shadow-sm overflow-visible">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-gray-900">Gestión de Expedientes Digitales</CardTitle>
            <CardDescription>Busca un socio por nombre, DNI o recibo para administrar su documentación.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Ej: 'Juan 456' o 'Mz A Lote 2'..."
                className="pl-10 bg-gray-50 border-gray-200 focus:ring-2 focus:ring-primary/20 transition-all h-12"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button 
                  onClick={() => setSearchInput('')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FilterX className="h-4 w-4" />
                </button>
              )}
              {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>}
              
              {rawSearchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-auto p-2 animate-in fade-in zoom-in-95 duration-200">
                  {rawSearchResults.map((socio) => (
                    <div
                      key={socio.id}
                      className="group px-4 py-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-all flex items-center justify-between"
                      onClick={() => { setSelectedSocio(socio); setSearchInput(''); setRawSearchResults([]); }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 uppercase text-sm">{socio.nombres} {socio.apellidoPaterno}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>DNI: {socio.dni}</span>
                            {socio.localidad && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {socio.localidad}</span>}
                          </div>
                        </div>
                      </div>
                      {socio.ingresos?.[0]?.nro_recibo && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-mono text-[10px] px-2 py-1">
                          <Ticket className="w-3 h-3 mr-1 inline" /> {socio.ingresos[0].nro_recibo}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSocio ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-6 gap-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-none">
                {selectedSocio.nombres} {selectedSocio.apellidoPaterno}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 px-3 py-1">
                  DNI: {selectedSocio.dni}
                </Badge>
                {selectedSocio.ingresos?.[0]?.nro_recibo && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-none shadow-lg px-4 py-2 text-sm font-bold flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    RECIBO: {selectedSocio.ingresos[0].nro_recibo}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedSocio(null)} className="text-gray-400 hover:text-gray-600">
              Cambiar Socio <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {loadingDocs ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderDocumentCard('Comprobante de pago', <Receipt className="h-8 w-8" />, false)}
              {renderDocumentCard('Contrato', <FileSignature className="h-8 w-8" />, false)}
              {renderDocumentCard('Ficha', <FileCheck className="h-8 w-8" />, false)}
              {renderDocumentCard('Planos de ubicación', <MapIcon className="h-8 w-8" />, true)}
              {renderDocumentCard('Memoria descriptiva', <FileText className="h-8 w-8" />, true)}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="bg-white p-6 rounded-full shadow-sm mb-6 border border-gray-100">
            <Search className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Selecciona un socio para ver su expediente</h3>
          <p className="text-gray-500 max-w-xs mt-2">Utiliza el buscador de arriba para encontrar al socio por nombre, DNI o número de recibo.</p>
        </div>
      )}

      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        socioId={selectedSocio?.id}
        socioName={selectedSocio ? `${selectedSocio.nombres} ${selectedSocio.apellidoPaterno}` : ''}
        documentType={uploadDocType}
        onUploadSuccess={() => selectedSocio && loadDocuments(selectedSocio.id)}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-white border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">¿Solicitar eliminación?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              Esta acción enviará una solicitud para eliminar el documento <span className="text-gray-900 font-bold">{docToDelete?.tipo_documento}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 border-none text-gray-600">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (!docToDelete || !selectedSocio || !user) return;
                setIsRequestingDeletion(true);
                try {
                  await createDeletionRequest({
                    document_id: docToDelete.id.toString(),
                    document_type: docToDelete.tipo_documento,
                    document_link: docToDelete.link_documento,
                    socio_id: selectedSocio.id,
                    requested_by: user.id,
                  });
                  toast.success('Solicitud enviada');
                  setIsDeleteAlertOpen(false);
                } catch (e) { toast.error('Error al solicitar'); }
                finally { setIsRequestingDeletion(false); }
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              disabled={isRequestingDeletion}
            >
              {isRequestingDeletion ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
