import React from 'react';
import { MapPin, FileText, CheckSquare, Square, DollarSign, Upload, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import DocumentLinkPill from '@/components/custom/DocumentLinkPill';

// Interfaces (Mantenemos igual)
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
  localidad: string;
  mz: string | null;
  lote: string | null;
  is_lote_medido: boolean | null;
  socio_documentos: SocioDocumento[];
  paymentInfo: IngresoInfo;
}

interface DocumentCardViewProps {
  data: SocioConDocumentos[];
  requiredDocumentTypes: string[];
  // Renombrado para claridad: Permiso para gestionar el estado de Lote Medido (Admin/Engineer)
  canManageLoteMedido: boolean; 
  // Nuevo prop: Permiso para eliminar o solicitar eliminación de documentos (Admin/Engineer)
  canDeleteDocuments: boolean;
  onOpenUploadModal: (socio: SocioConDocumentos, documentType: string) => void;
  onDeleteDocument: (documentId: number, documentLink: string, documentType: string, socioName: string) => void;
  onUpdateLoteMedido: (socioId: string, newValue: boolean, socio: SocioConDocumentos) => void; // Añadir socio para consistencia
}

const DocumentCardView: React.FC<DocumentCardViewProps> = ({
  data,
  requiredDocumentTypes,
  canManageLoteMedido, // Usamos el nuevo nombre
  canDeleteDocuments, // Usamos el nuevo nombre
  onOpenUploadModal,
  onDeleteDocument,
  onUpdateLoteMedido,
}) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-textSecondary">
        No hay socios que coincidan con los filtros o la búsqueda.
      </div>
    );
  }

  return (
    <div className="grid gap-4 w-full max-w-xl mx-auto">
      {data.map((socio) => {
        const fullName = `${socio.nombres || ''} ${socio.apellidoPaterno || ''}`.trim();
        const isMedido = socio.is_lote_medido ?? false;
        const missingDocs = requiredDocumentTypes.filter(docType => {
          const doc = socio.socio_documentos.find(d => d.tipo_documento === docType);
          return !doc || !doc.link_documento;
        });

        return (
          <Card key={socio.id} className="w-full bg-card border-border shadow-lg transition-all duration-300 hover:shadow-xl hover:border-accent/50 overflow-hidden">
            <CardHeader className="p-4 border-b border-border/50 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg font-bold truncate text-primary flex-1">
                {fullName}
              </CardTitle>
              <Badge 
                className={cn(
                  "text-xs font-semibold shrink-0",
                  socio.paymentInfo.status === 'Pagado' ? "bg-success/20 text-success hover:bg-success/30" : "bg-error/20 text-error hover:bg-error/30"
                )}
              >
                <DollarSign className="h-3 w-3 mr-1" /> 
                <span className="hidden xs:inline">{socio.paymentInfo.status}</span>
                <span className="xs:hidden">{socio.paymentInfo.status === 'Pagado' ? 'Si' : 'No'}</span>
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-textSecondary">DNI:</span>
                <span className="font-medium text-foreground">{socio.dni || 'N/A'}</span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start text-sm gap-1">
                <span className="text-textSecondary flex items-center gap-1 shrink-0">
                    <MapPin className="h-4 w-4" /> Ubicación:
                </span>
                <span className="font-medium text-foreground text-left sm:text-right break-words w-full">
                  {socio.localidad || 'N/A'} ({socio.mz || 'N/A'}/{socio.lote || 'N/A'})
                </span>
              </div>
              
              {/* Lote Medido */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-t border-border/50 pt-3 gap-2">
                <span className="text-textSecondary flex items-center gap-1 font-semibold">
                  {isMedido ? <CheckSquare className="h-4 w-4 text-success" /> : <Square className="h-4 w-4 text-warning" />} Lote Medido:
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-auto py-1 px-2 text-xs w-full sm:w-auto", isMedido ? "text-success hover:bg-success/10" : "text-warning hover:bg-warning/10")}
                  onClick={() => onUpdateLoteMedido(socio.id, !isMedido, socio)} // Pasar socio
                  disabled={!canManageLoteMedido} // Usar canManageLoteMedido
                >
                  {isMedido ? 'Marcar como No Medido' : 'Marcar como Medido'}
                </Button>
              </div>

              {/* Document Links */}
              <div className="space-y-2 pt-3 border-t border-border/50">
                <p className="text-sm font-semibold text-textSecondary flex items-center gap-1"><FileText className="h-4 w-4" /> Documentos Subidos:</p>
                <div className="flex flex-wrap gap-2">
                  {socio.socio_documentos.length > 0 ? (
                    socio.socio_documentos.map((doc) => (
                      <DocumentLinkPill
                        key={doc.id}
                        type={doc.tipo_documento}
                        link={doc.link_documento}
                        isAdmin={canDeleteDocuments} // Usar canDeleteDocuments para isAdmin
                        socioId={socio.id} // Necesario para DocumentLinkPill
                        documentId={doc.id} // Necesario para DocumentLinkPill
                        onDelete={() => onDeleteDocument(doc.id, doc.link_documento!, doc.tipo_documento, fullName)}
                      />
                    ))
                  ) : (
                    <span className="text-xs italic text-textSecondary/70">Ningún documento subido.</span>
                  )}
                </div>
              </div>

              {/* Missing Documents Actions */}
              {missingDocs.length > 0 && (
                <div className="pt-3 border-t border-border/50 space-y-2">
                  <p className="text-sm font-semibold text-error flex items-center gap-1"><Trash2 className="h-4 w-4" /> Documentos Faltantes:</p>
                  <div className="flex flex-wrap gap-2">
                    {missingDocs.map(docType => (
                      <Button
                        key={docType}
                        variant="secondary"
                        size="sm"
                        className="text-xs h-auto py-1.5 px-2 bg-accent/10 text-accent hover:bg-accent/20 whitespace-normal text-left"
                        onClick={() => onOpenUploadModal(socio, docType)}
                      >
                        <Upload className="mr-2 h-3 w-3 shrink-0" />
                        <span>Subir {docType === 'Planos de ubicación' ? 'Planos' : 'Memoria'}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DocumentCardView;
