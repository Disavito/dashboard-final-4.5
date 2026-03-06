import React, { useState, useMemo, useCallback } from 'react';
import {
  ColumnDef,
  Row,
  RowSelectionState,
} from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Ruler, Search, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { SocioTitular } from '@/lib/types';
import { DataTable } from '@/components/ui-custom/DataTable';
import { DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDebounce } from 'use-debounce';

interface BatchLotMeasurementDialogProps {
  socios: SocioTitular[];
  onSuccess: () => void;
}

// --- Definición de Columnas para la Selección Masiva ---
const columns: ColumnDef<SocioTitular>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todo"
        className="border-border data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
        className="border-border data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'dni',
    header: 'DNI',
    cell: ({ row }) => <div className="font-medium">{row.getValue('dni')}</div>,
  },
  {
    accessorKey: 'fullName',
    header: 'Socio',
    cell: ({ row }) => (
      <div>
        {row.original.nombres} {row.original.apellidoPaterno} {row.original.apellidoMaterno}
      </div>
    ),
  },
  {
    accessorKey: 'localidad',
    header: 'Localidad',
  },
  {
    accessorKey: 'mz',
    header: 'Mz',
  },
  {
    accessorKey: 'lote',
    header: 'Lote',
  },
  {
    accessorKey: 'is_lote_medido',
    header: 'Estado Medición',
    cell: ({ row }) => {
      const isMeasured = row.getValue('is_lote_medido');
      return (
        <div className={cn("flex items-center gap-2 font-semibold", isMeasured ? "text-success" : "text-warning")}>
          {isMeasured ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {isMeasured ? 'Medido' : 'Pendiente'}
        </div>
      );
    },
  },
];

const BatchLotMeasurementDialog: React.FC<BatchLotMeasurementDialogProps> = ({ socios, onSuccess }) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');
  const [debouncedSearchInput] = useDebounce(searchInput, 300);

  // Effect to update the actual global filter state only after debounce
  React.useEffect(() => {
    setGlobalFilter(debouncedSearchInput);
  }, [debouncedSearchInput]);

  // Custom filter function for the internal table (reusing the logic from People.tsx)
  const customGlobalFilterFn = useCallback((row: Row<SocioTitular>, _columnId: string, filterValue: any) => {
    const search = String(filterValue).toLowerCase().trim();
    if (!search) return true;

    const socio = row.original;

    const dni = socio.dni?.toLowerCase() || '';
    const nombres = socio.nombres?.toLowerCase() || '';
    const apellidoPaterno = socio.apellidoPaterno?.toLowerCase() || '';
    const apellidoMaterno = socio.apellidoMaterno?.toLowerCase() || '';
    const localidad = socio.localidad?.toLowerCase() || '';
    const mz = socio.mz?.toLowerCase() || '';
    const lote = socio.lote?.toLowerCase() || '';

    // Combined search: "nombre y apellido paterno y materno"
    const fullName = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.toLowerCase().trim();
    const fullLastName = `${apellidoPaterno} ${apellidoMaterno}`.toLowerCase().trim();

    return (
      dni.includes(search) ||
      nombres.includes(search) ||
      apellidoPaterno.includes(search) ||
      apellidoMaterno.includes(search) ||
      localidad.includes(search) ||
      mz.includes(search) ||
      lote.includes(search) ||
      fullName.includes(search) ||
      fullLastName.includes(search)
    );
  }, []);

  const selectedSocioIds = useMemo(() => {
    return Object.keys(rowSelection).filter(key => rowSelection[key]).map(id => socios[parseInt(id)].id);
  }, [rowSelection, socios]);

  const handleBatchUpdate = async () => {
    if (selectedSocioIds.length === 0) {
      toast.warning('Selecciona al menos un socio para actualizar.');
      return;
    }

    setIsUpdating(true);

    try {
      // 1. Get the IDs of the socios whose lot is currently NOT measured, but are selected.
      const idsToUpdate = socios
        .filter(socio => selectedSocioIds.includes(socio.id) && !socio.is_lote_medido)
        .map(socio => socio.id);

      if (idsToUpdate.length === 0) {
        toast.info('Todos los socios seleccionados ya tienen su lote marcado como medido.');
        setIsUpdating(false);
        onSuccess();
        return;
      }

      // 2. Perform the batch update
      const { error } = await supabase
        .from('socio_titulares')
        .update({ is_lote_medido: true })
        .in('id', idsToUpdate);

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Actualización Masiva Exitosa', {
        description: `Se marcaron ${idsToUpdate.length} lotes como medidos.`,
      });
      onSuccess();
    } catch (e: any) {
      console.error('Error during batch update:', e);
      toast.error('Error al actualizar lotes', { description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3 h-5 w-5 text-textSecondary" />
        <Input
          placeholder="Buscar por DNI, nombres, apellidos o lote..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="pl-10 pr-4 py-2 rounded-lg border-border bg-background text-foreground focus:ring-accent focus:border-accent transition-all duration-300 w-full"
        />
      </div>

      <DataTable
        columns={columns}
        data={socios}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        customGlobalFilterFn={customGlobalFilterFn}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <DialogFooter className="pt-4">
        <Button variant="outline" onClick={() => onSuccess()} className="rounded-lg border-border hover:bg-muted/50">
          Cancelar
        </Button>
        <Button
          onClick={handleBatchUpdate}
          disabled={selectedSocioIds.length === 0 || isUpdating}
          className="rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 flex items-center gap-2"
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Actualizando...
            </>
          ) : (
            <>
              <Ruler className="h-5 w-5" />
              Confirmar Medición ({selectedSocioIds.length})
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default BatchLotMeasurementDialog;
