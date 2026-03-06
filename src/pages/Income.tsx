import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { PlusCircle, Edit, Loader2, Search, FilterX, Trash2, Calendar, Hash, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Ingreso as IngresoType } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatCurrency } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { useDebounce } from 'use-debounce';
import TransactionForm from '@/components/custom/TransactionForm';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

function Income() {
  const { data: incomeData, loading, refreshData } = useSupabaseData<IngresoType>({
    tableName: 'ingresos',
    selectQuery: '*, socio_titulares!dni(localidad)', 
  });
  
  const { loading: userLoading } = useUser();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<IngresoType | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebounce(searchInput, 300);
  const [selectedLocalidadFilter, setSelectedLocalidadFilter] = useState<string>('all');
  const [uniqueLocalities, setUniqueLocalities] = useState<string[]>([]);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<IngresoType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchLocs = async () => {
      const { data } = await supabase.from('socio_titulares').select('localidad').neq('localidad', '');
      if (data) {
        const unique = Array.from(new Set(data.map(i => i.localidad))).filter(Boolean).sort() as string[];
        setUniqueLocalities(unique);
      }
    };
    fetchLocs();
  }, []);

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setSelectedIncome(null);
    refreshData();
  };

  const handleEdit = (income: IngresoType) => {
    setSelectedIncome(income);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedIncome(null);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (income: IngresoType) => {
    setIncomeToDelete(income);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!incomeToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('ingresos').delete().eq('id', incomeToDelete.id);
      if (error) throw error;
      toast.success('Registro eliminado correctamente');
      refreshData();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setIncomeToDelete(null);
    }
  };

  const filteredData = useMemo(() => {
    let result = [...incomeData];

    if (selectedLocalidadFilter !== 'all') {
      result = result.filter(i => i.socio_titulares?.localidad === selectedLocalidadFilter);
    }

    const searchTerm = debouncedSearch.toLowerCase().trim();
    if (searchTerm) {
      const normalize = (text: any) => 
        String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      const searchWords = normalize(searchTerm).split(/\s+/).filter(word => word.length > 0);

      result = result.filter(item => {
        const searchableContent = normalize(`
          ${item.full_name} 
          ${item.dni} 
          ${item.receipt_number} 
          ${item.numeroOperacion || ''} 
          ${item.socio_titulares?.localidad || ''}
        `);
        return searchWords.every(word => searchableContent.includes(word));
      });
    }

    return result;
  }, [incomeData, debouncedSearch, selectedLocalidadFilter]);

  const incomeColumns: ColumnDef<IngresoType>[] = useMemo(() => [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }) => format(parseISO(row.getValue('date')), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'receipt_number',
      header: 'Nº Recibo',
      cell: ({ row }) => <span className="font-mono font-bold text-slate-700">{row.getValue('receipt_number')}</span>,
    },
    {
      accessorKey: 'full_name',
      header: 'Socio',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold uppercase text-xs text-slate-900">{row.getValue('full_name')}</span>
          <span className="text-[10px] text-slate-500 font-medium">{row.original.socio_titulares?.localidad || 'Sin localidad'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'dni',
      header: 'DNI',
      cell: ({ row }) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{row.getValue('dni')}</span>,
    },
    {
      accessorKey: 'numeroOperacion',
      header: 'Operación',
      cell: ({ row }) => <span className="text-xs font-medium text-slate-500">{row.getValue('numeroOperacion') || '-'}</span>,
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Monto</div>,
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number;
        return (
          <div className={cn("text-right font-bold", amount >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            {formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-pink-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
            onClick={() => handleEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => handleDeleteClick(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], []);

  if (loading || userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
          <p className="text-slate-500 font-medium animate-pulse">Cargando registros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Ingresos</h1>
            <p className="text-slate-500 font-medium">Gestión y búsqueda avanzada de pagos</p>
          </div>
          <Button 
            onClick={handleNew}
            className="bg-[#9E7FFF] hover:bg-[#8B66FF] text-white h-12 px-6 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
          >
            <PlusCircle className="h-5 w-5" /> Nuevo Registro
          </Button>
        </header>

        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Busca por nombre, DNI, recibo u operación..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium placeholder:text-slate-400"
                />
                {searchInput && (
                  <button 
                    onClick={() => setSearchInput('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FilterX className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <Select value={selectedLocalidadFilter} onValueChange={setSelectedLocalidadFilter}>
                <SelectTrigger className="w-full lg:w-[280px] h-14 bg-slate-50 border-none rounded-2xl font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20">
                  <SelectValue placeholder="Todas las Comunidades" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                  <SelectItem value="all" className="font-medium">Todas las Comunidades</SelectItem>
                  {uniqueLocalities.map(loc => (
                    <SelectItem key={loc} value={loc} className="font-medium">{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden md:block rounded-xl border border-slate-100 overflow-hidden">
              <DataTable
                columns={incomeColumns}
                data={filteredData}
                isLoading={loading}
              />
            </div>

            <div className="grid gap-4 md:hidden">
              {filteredData.length > 0 ? (
                filteredData.map((income) => (
                  <Card key={income.id} className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        <span className="text-xs font-bold text-slate-600">
                          {format(parseISO(income.date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-white font-mono text-indigo-600 border-indigo-100">
                        <Hash className="h-3 w-3 mr-1" /> {income.receipt_number}
                      </Badge>
                    </div>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400">
                          <User className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Socio Titular</span>
                        </div>
                        <p className="font-black text-slate-900 uppercase leading-tight">{income.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-none">
                            DNI: {income.dni}
                          </Badge>
                          {income.socio_titulares?.localidad && (
                            <div className="flex items-center gap-1 text-slate-500 text-[10px] font-medium">
                              <MapPin className="h-3 w-3" /> {income.socio_titulares.localidad}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Operación</span>
                          <p className="text-xs font-mono font-bold text-slate-600">{income.numeroOperacion || '-'}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Monto</span>
                          <p className={cn(
                            "text-lg font-black",
                            income.amount >= 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {formatCurrency(income.amount)}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 flex gap-2 border-t border-slate-50">
                        <Button 
                          variant="outline" 
                          className="flex-1 h-10 rounded-xl border-pink-100 text-pink-500 hover:bg-pink-50 hover:text-pink-600 font-bold text-xs"
                          onClick={() => handleEdit(income)}
                        >
                          <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 h-10 rounded-xl border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold text-xs"
                          onClick={() => handleDeleteClick(income)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold">No se encontraron ingresos</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setSelectedIncome(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {selectedIncome ? 'Editar Transacción' : 'Registrar Nueva Transacción'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              {selectedIncome ? 'Modifique los datos del registro seleccionado.' : 'Complete los datos para registrar un ingreso, gasto o devolución.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <TransactionForm 
              initialData={selectedIncome || undefined}
              onClose={() => {
                setIsDialogOpen(false);
                setSelectedIncome(null);
              }} 
              onSuccess={handleSuccess} 
            />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Registro"
        description="¿Estás seguro de que deseas eliminar este registro de ingreso? Esta acción no se puede deshacer."
        isConfirming={isDeleting}
      />
    </div>
  );
}

export default Income;
