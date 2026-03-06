import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, Search, UserCheck, Hash, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { Cuenta, Ingreso } from '@/lib/types';
import { toast } from 'sonner';
import { DialogFooter } from '@/components/ui/dialog';

const formSchema = z.object({
  accountName: z.string().min(1, "Seleccione una cuenta"),
  transactionType: z.enum(['Ingreso', 'Anulacion', 'Devolucion', 'Gasto', 'Recibo de Pago', 'Venta']),
  dni: z.string().min(8, "DNI debe tener 8 dígitos").max(8),
  fullName: z.string().min(1, "El nombre es requerido"),
  receiptNumber: z.string().min(1, "Nº de recibo es requerido"),
  amount: z.number().min(0, "El monto no puede ser negativo"),
  date: z.date(),
  description: z.string().optional(),
  numeroOperacion: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  initialData?: Ingreso;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionForm({ initialData, onClose, onSuccess }: TransactionFormProps) {
  const [accounts, setAccounts] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchingDni, setIsSearchingDni] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionType: 'Ingreso',
      amount: 0,
      date: new Date(),
      dni: '',
      fullName: '',
      receiptNumber: '',
      accountName: '',
      numeroOperacion: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        transactionType: (initialData.transaction_type as any) || 'Ingreso',
        amount: Math.abs(initialData.amount),
        date: parseISO(initialData.date),
        dni: initialData.dni || '',
        fullName: initialData.full_name || '',
        receiptNumber: initialData.receipt_number || '',
        accountName: initialData.account || '',
        numeroOperacion: initialData.numeroOperacion?.toString() || '',
      });
    }
  }, [initialData, form]);

  const selectedType = form.watch('transactionType');
  const selectedAccount = form.watch('accountName');
  const dniValue = form.watch('dni');

  const showOperationField = selectedAccount === 'BBVA Empresa' || selectedAccount === 'Cuenta Fidel';

  useEffect(() => {
    const fetchAccounts = async () => {
      const { data } = await supabase.from('cuentas').select('*').order('name');
      if (data) setAccounts(data);
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    const searchSocio = async () => {
      if (dniValue?.length === 8 && (!initialData || dniValue !== initialData.dni)) {
        setIsSearchingDni(true);
        const { data } = await supabase
          .from('socio_titulares')
          .select('nombres, apellidoPaterno, apellidoMaterno')
          .eq('dni', dniValue)
          .single();

        if (data) {
          const name = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`;
          form.setValue('fullName', name);
          toast.success("Socio encontrado");
        } else {
          form.setValue('fullName', '');
          toast.error("DNI no registrado");
        }
        setIsSearchingDni(false);
      }
    };
    searchSocio();
  }, [dniValue, form, initialData]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const finalAmount = values.transactionType === 'Devolucion' 
        ? -Math.abs(values.amount) 
        : values.amount;

      const payload = {
        account: values.accountName,
        amount: finalAmount,
        date: format(values.date, 'yyyy-MM-dd'),
        transaction_type: values.transactionType,
        receipt_number: values.receiptNumber,
        dni: values.dni,
        full_name: values.fullName,
        numeroOperacion: showOperationField && values.numeroOperacion ? Number(values.numeroOperacion) : null,
      };

      if (initialData?.id) {
        const { error } = await supabase.from('ingresos').update(payload).eq('id', initialData.id);
        if (error) throw error;
        toast.success('Registro actualizado');
      } else {
        const { error } = await supabase.from('ingresos').insert(payload);
        if (error) throw error;
        toast.success('Registro creado');
      }
      onSuccess();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                <FormLabel className="text-right text-slate-500 font-semibold">Fecha</FormLabel>
                <div className="col-span-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal rounded-xl border-slate-200 h-11",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="receiptNumber"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                <FormLabel className="text-right text-slate-500 font-semibold">Nº Recibo</FormLabel>
                <div className="col-span-3 relative">
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Ej: 001-00045" 
                      className="rounded-xl border-slate-200 h-11 pl-10 font-mono font-bold text-indigo-600" 
                    />
                  </FormControl>
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="h-px bg-slate-100 my-2" />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="dni"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                <FormLabel className="text-right text-slate-500 font-semibold">DNI Socio</FormLabel>
                <div className="col-span-3 relative">
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="8 dígitos" 
                      className="rounded-xl border-slate-200 h-11 pl-10"
                      maxLength={8}
                    />
                  </FormControl>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {isSearchingDni ? (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    ) : (
                      <Search className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                <FormLabel className="text-right text-slate-500 font-semibold">Nombre</FormLabel>
                <div className="col-span-3 relative">
                  <FormControl>
                    <Input 
                      {...field} 
                      readOnly 
                      className="rounded-xl border-slate-100 bg-slate-50 h-11 font-bold text-slate-700 pl-10 uppercase text-xs"
                    />
                  </FormControl>
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="h-px bg-slate-100 my-2" />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="accountName"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                <FormLabel className="text-right text-slate-500 font-semibold">Cuenta</FormLabel>
                <div className="col-span-3">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white">
                        <SelectValue placeholder="Seleccione cuenta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.name}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="transactionType"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                <FormLabel className="text-right text-slate-500 font-semibold">Tipo</FormLabel>
                <div className="col-span-3">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white">
                        <SelectValue placeholder="Seleccione tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Ingreso">Ingreso Normal</SelectItem>
                      <SelectItem value="Anulacion">Anulación</SelectItem>
                      <SelectItem value="Devolucion">Devolución</SelectItem>
                      <SelectItem value="Recibo de Pago">Recibo de Pago</SelectItem>
                      <SelectItem value="Venta">Venta (Boleta)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                <FormLabel className="text-right text-slate-500 font-semibold">Monto</FormLabel>
                <div className="col-span-3 relative">
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field} 
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                      disabled={selectedType === 'Anulacion'}
                      className={cn(
                        "rounded-xl border-slate-200 h-11 pl-10 font-black text-lg",
                        selectedType === 'Anulacion' ? "bg-slate-50 text-slate-400" : "text-slate-900"
                      )}
                    />
                  </FormControl>
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {showOperationField && (
            <FormField
              control={form.control}
              name="numeroOperacion"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0 animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormLabel className="text-right text-slate-500 font-semibold">Operación</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Nº de operación bancaria" 
                        className="rounded-xl border-indigo-200 bg-indigo-50/30 h-11 focus:border-indigo-500" 
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          )}
        </div>

        <DialogFooter className="pt-6 mt-4 border-t border-slate-100 gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 h-11 px-6 font-semibold"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 h-11 px-10 font-bold transition-all active:scale-95"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              initialData ? "Guardar Cambios" : "Registrar Ingreso"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
