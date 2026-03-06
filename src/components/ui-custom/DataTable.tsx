import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  FilterFn,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, LucideIcon, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  className?: string;
  globalFilter?: string;
  setGlobalFilter?: (value: string) => void;
  customGlobalFilterFn?: FilterFn<TData>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (updaterOrValue: any) => void;
  // Propiedades para estados vacíos
  emptyTitle?: string;
  emptyDescription?: string;
  EmptyIcon?: LucideIcon;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  className,
  globalFilter,
  setGlobalFilter,
  customGlobalFilterFn,
  rowSelection,
  onRowSelectionChange,
  emptyTitle = "No hay resultados",
  emptyDescription = "No se encontraron datos para mostrar.",
  EmptyIcon = Database,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: onRowSelectionChange,
    globalFilterFn: customGlobalFilterFn || 'auto',
    state: { 
      sorting,
      globalFilter,
      rowSelection: rowSelection || {},
    },
  });

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div className="rounded-2xl border border-gray-100 bg-white overflow-x-auto scrollbar-hide">
        <Table>
          <TableHeader className="bg-gray-50/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-gray-100">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-12 text-gray-500 font-bold text-xs uppercase tracking-wider whitespace-nowrap px-4">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#9E7FFF]" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargando datos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                      <EmptyIcon className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">{emptyTitle}</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">{emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-gray-200 font-bold text-gray-600 hover:bg-[#F0EEFF] hover:text-[#9E7FFF] transition-all"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-gray-200 font-bold text-gray-600 hover:bg-[#F0EEFF] hover:text-[#9E7FFF] transition-all"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
