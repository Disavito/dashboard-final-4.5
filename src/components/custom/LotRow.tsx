import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DocumentLinkPill from './DocumentLinkPill';
import { Lot } from '@/lib/types';

interface LotRowProps {
  lot: Lot;
  isSelected: boolean;
  isAutoChecked?: boolean;
  handleSelectLot: (id: string, checked: boolean) => void;
  getPaymentStatusBadge: (status: Lot['paymentStatus']) => React.ReactNode;
  onDeleteRequest?: (docType: string, link: string) => void;
}

const LotRow: React.FC<LotRowProps> = ({
  lot,
  isSelected,
  isAutoChecked,
  handleSelectLot,
  getPaymentStatusBadge,
  onDeleteRequest
}) => {
  return (
    <TableRow className="hover:bg-primary/5 transition-colors border-border">
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleSelectLot(lot.id, !!checked)}
                  disabled={isAutoChecked}
                  className="h-5 w-5 border-secondary data-[state=checked]:bg-secondary"
                />
              </div>
            </TooltipTrigger>
            {isAutoChecked && (
              <TooltipContent>
                <p>Marcado automáticamente por documentos subidos</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-bold text-text">{lot.fullName}</span>
          <span className="text-xs text-textSecondary font-mono">{lot.dni}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className="bg-background font-bold text-primary border-primary/20">
          {lot.mz} - {lot.lote}
        </Badge>
      </TableCell>
      <TableCell>
        {getPaymentStatusBadge(lot.paymentStatus)}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2 justify-center">
          {/* Asegurarse de que link sea string o null */}
          <DocumentLinkPill 
            type="Plano" 
            link={lot.documentLink || null} // Pasar null si no existe
            isAdmin={false} // Asumiendo que LotRow no es para admins
            socioId={lot.id} // Necesario para DocumentLinkPill
            documentId={0} // Placeholder, LotRow no tiene documentId directo
            onDelete={() => onDeleteRequest?.('Plano', lot.documentLink!)}
          />
          {/* Nota: Aquí se debería pasar el link de memoria si existiera en el objeto Lot */}
          <DocumentLinkPill 
            type="Memoria" 
            link={null} 
            isAdmin={false} // Asumiendo que LotRow no es para admins
            socioId={lot.id} // Necesario para DocumentLinkPill
            documentId={0} // Placeholder
          />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" className="text-accent hover:bg-accent/10">
          <Upload className="h-4 w-4 mr-1" />
          Subir
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default LotRow;
