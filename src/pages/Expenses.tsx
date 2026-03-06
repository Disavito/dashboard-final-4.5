import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Edit, CalendarIcon, XCircle, Search, Trash2, Hash, Tag, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Gasto as GastoType, Cuenta } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { formatCurrency } from '@/lib/utils';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';

const expenseFormSchema = z.object({
  amount: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ required_error: 'El monto es requerido.' }).positive('El monto debe ser positivo.')
  ),
  account: z.string().min(1, 'La cuenta es requerida.'),
  date: z.string().min(1, 'La fecha es requerida.'),
  category: z.string().min(1, 'La categoría es requerida.'),
  sub_category: z.string().optional().nullable(),
  description: z.string().min(1, 'La descripción es requerida.').max(255),
  numero_gasto: z.string().optional().nullable(),
  colaborador_id: z.string().uuid().optional().nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const MAIN_EXPENSE_CATEGORIES = [
  { value: 'Gasto Fijo', label: 'Gasto Fijo' },
  { value: 'Viáticos', label: 'Viáticos' },
  { value: 'Otros', label: 'Otros' },
];

const GASTOS_FIJOS_SUB_CATEGORIES = [
  { value: 'internet', label: 'Internet' },
  { value: 'servidor', label: 'Servidor' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'agua_mantenimiento', label: 'Agua/Mantenimiento' },
  { value: 'luz', label: 'Luz' },
  { value: 'sueldo', label: 'Sueldo' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'afp', label: 'AFP' },
  { value: 'contador', label: 'Contador' },
];

const VIATICOS_SUB_CATEGORIES = [
  { value: 'tecnicos', label: 'Técnicos' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'representantes', label: 'Representantes' },
  { value: 'ocasional', label: 'Ocasional' },
];

const generateNextNumeroGasto = (expenses: GastoType[]): string => {
  let maxNumber = 0;
  expenses.forEach(expense => {
    if (expense.numero_gasto?.startsWith('GA')) {
      const numPart = parseInt(expense.numero_gasto.substring(2), 10);
      if (!isNaN(numPart) && numPart > maxNumber) maxNumber = numPart;
    }
  });
  return `GA${String(maxNumber + 1).padStart(3, '0')}`;
};

export default function Expenses() {
  const { data: expenseData, loading, addRecord, updateRecord, deleteRecord, refreshData, setFilters } = useSupabaseData<GastoType>({
    tableName: 'gastos',
    initialSort: { column: 'date', ascending: false },
  });
  
  const { data: accountsData } = useSupabaseData<Cuenta>({ tableName: 'cuentas' });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GastoType | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dataToConfirm, setDataToConfirm] = useState<ExpenseFormValues | null>(null);
  const [isConfirmingSubmission, setIsConfirmingSubmission] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: 0,
      account: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      category: '',
      sub_category: null,
      description: '',
      numero_gasto: null,
      colaborador_id: null,
    },
  });

  const watchedCategory = form.watch('category');

  useEffect(() => {
    const newFilters: Record<string, any> = {};
    if (dateFilter) newFilters.date = format(dateFilter, 'yyyy-MM-dd');
    setFilters(newFilters);
  }, [dateFilter, setFilters]);

  const handleOpenDialog = (expense?: GastoType) => {
    setEditingExpense(expense || null);
    if (expense) {
      form.reset({
        amount: Math.abs(expense.amount),
        account: expense.account || '',
        date: expense.date,
        category: expense.category || '',
        sub_category: expense.sub_category || null,
        description: expense.description || '',
        numero_gasto: expense.numero_gasto || null,
        colaborador_id: expense.colaborador_id || null,
      });
    } else {
      form.reset({
        amount: 0,
        account: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        category: '',
        sub_category: null,
        description: '',
        numero_gasto: generateNextNumeroGasto(expenseData),
        colaborador_id: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!dataToConfirm) return;
    setIsConfirmingSubmission(true);
    try {
      const amountToStore = -Math.abs(dataToConfirm.amount);
      if (editingExpense) {
        await updateRecord(editingExpense.id, { ...dataToConfirm, amount: amountToStore });
        toast.success('Gasto actualizado');
      } else {
        await addRecord({ ...dataToConfirm, amount: amountToStore });
        toast.success('Gasto añadido');
      }
      setIsDialogOpen(false);
      setIsConfirmDialogOpen(false);
      refreshData();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsConfirmingSubmission(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      await deleteRecord(id);
      toast.success('Gasto eliminado');
    }
  };

  const columns: ColumnDef<GastoType>[] = [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }) => format(parseISO(row.getValue('date')), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'numero_gasto',
      header: 'Nº Gasto',
      cell: ({ row }) => <span className="font-bold text-slate-700">{row.getValue('numero_gasto') || 'N/A'}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Descripción',
      cell: ({ row }) => <span className="font-medium text-slate-600">{row.getValue('description')}</span>,
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-slate-400">{row.getValue('category')}</span>
          <span className="text-xs font-semibold text-indigo-600">{row.original.sub_category || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Monto</div>,
      cell: ({ row }) => (
        <div className="text-right font-bold text-red-600">
          {formatCurrency(row.getValue('amount'))}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-pink-400 hover:text-pink-600 hover:bg-pink-50"
            onClick={() => handleOpenDialog(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 p-4 md:p-8 bg-[#F8F9FC] min-h-screen">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Gastos</h1>
          <p className="text-slate-500 font-medium">Control y seguimiento de egresos</p>
        </div>
        <Button 
          onClick={() => handleOpenDialog()} 
          className="bg-[#9E7FFF] hover:bg-[#8B66FF] text-white h-12 px-6 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
        >
          <PlusCircle className="h-5 w-5" /> Añadir Gasto
        </Button>
      </header>

      <Card className="max-w-7xl mx-auto border-none shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar gastos..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 h-11 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 rounded-xl border-slate-200 text-slate-600">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "PPP", { locale: es }) : "Filtrar por fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} locale={es} />
              </PopoverContent>
            </Popover>
            {(dateFilter || globalFilter) && (
              <Button variant="ghost" onClick={() => { setDateFilter(undefined); setGlobalFilter(''); }} className="text-slate-400 hover:text-red-500">
                <XCircle className="h-4 w-4 mr-2" /> Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={expenseData}
              isLoading={loading}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          </div>

          <div className="grid gap-4 md:hidden">
            {expenseData.length > 0 ? (
              expenseData.map((expense) => (
                <Card key={expense.id} className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
                  <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-600">
                        {format(parseISO(expense.date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-white font-mono text-indigo-600 border-indigo-100">
                      <Hash className="h-3 w-3 mr-1" /> {expense.numero_gasto || 'N/A'}
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Descripción</span>
                      </div>
                      <p className="font-bold text-slate-700 leading-tight">{expense.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-bold uppercase">
                        <Tag className="h-3 w-3 mr-1" /> {expense.category}
                      </Badge>
                      {expense.sub_category && (
                        <Badge variant="outline" className="border-indigo-100 text-indigo-500 text-[10px] font-bold uppercase">
                          {expense.sub_category}
                        </Badge>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Monto</span>
                        <p className="text-lg font-black text-red-600">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-10 w-10 rounded-xl border-pink-100 text-pink-500 hover:bg-pink-50"
                          onClick={() => handleOpenDialog(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-10 w-10 rounded-xl border-red-100 text-red-500 hover:bg-red-50"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">No se encontraron gastos</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase">{editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
            <DialogDescription>Complete los detalles del egreso.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((vals) => { setDataToConfirm(vals); setIsConfirmDialogOpen(true); })} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} className="rounded-xl h-11" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl><Input type="date" {...field} className="rounded-xl h-11" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="account" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {accountsData.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={(val) => { field.onChange(val); form.setValue('sub_category', null); }} value={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Categoría" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {MAIN_EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {(watchedCategory === 'Gasto Fijo' || watchedCategory === 'Viáticos') && (
                  <FormField control={form.control} name="sub_category" render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-left-2 duration-300">
                      <FormLabel>Subcategoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger className="rounded-xl h-11 border-indigo-100 bg-indigo-50/30"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(watchedCategory === 'Gasto Fijo' ? GASTOS_FIJOS_SUB_CATEGORIES : VIATICOS_SUB_CATEGORIES).map(s => (
                            <SelectItem key={s.value} value={s.label}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl><Textarea {...field} className="rounded-xl min-h-[80px]" placeholder="Detalle del gasto..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">Cancelar</Button>
                <Button type="submit" className="bg-[#9E7FFF] hover:bg-[#8B66FF] rounded-xl h-11 px-8 font-bold">Guardar Gasto</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirmar Gasto"
        description="¿Desea guardar este registro de gasto?"
        data={dataToConfirm || {}}
        isConfirming={isConfirmingSubmission}
      />
    </div>
  );
}
