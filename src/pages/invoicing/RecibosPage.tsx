import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Search, FileText, Wallet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ReciboPagoFormSchema, ReciboPagoFormValues } from '@/lib/types/invoicing';
import { fetchClientByDocument, fetchNextReceiptCorrelative, saveReceiptPdfToSupabase } from '@/lib/api/invoicingApi';
import { Client } from '@/lib/types/invoicing';
import { TablesInsert } from '@/lib/database.types';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';

const PAYMENT_METHODS = [
  { value: 'BBVA Empresa', label: 'BBVA Empresa' },
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Cuenta Fidel', label: 'Cuenta Fidel' },
];

export default function RecibosPage() {
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correlative, setCorrelative] = useState<string>('');
  const [clientData, setClientData] = useState<Client | null>(null);

  const form = useForm<ReciboPagoFormValues>({
    resolver: zodResolver(ReciboPagoFormSchema),
    defaultValues: {
      dni: '',
      client_name: '',
      client_id: null,
      fecha_emision: format(new Date(), 'yyyy-MM-dd'),
      monto: 250.00,
      concepto: 'Elaboracion de Expediente Tecnico',
      metodo_pago: 'Efectivo',
      numero_operacion: '',
      is_payment_observed: false,
      payment_observation_detail: '',
    },
  });

  const dni = form.watch('dni');
  const metodoPago = form.watch('metodo_pago');
  const watchedIsPaymentObserved = form.watch('is_payment_observed');
  const showOperationNumber = metodoPago === 'BBVA Empresa' || metodoPago === 'Cuenta Fidel';

  const loadCorrelative = useCallback(async () => {
    try {
      const next = await fetchNextReceiptCorrelative();
      setCorrelative(next);
    } catch (error) {
      toast.error("No se pudo sincronizar el número de recibo");
    }
  }, []);

  useEffect(() => {
    loadCorrelative();

    const channel = supabase
      .channel('ingresos-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'ingresos' }, 
        (payload) => {
          if (payload.new.receipt_number?.startsWith('R-')) {
            loadCorrelative();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCorrelative]);

  const handleDniSearch = async () => {
    if (!dni || dni.length !== 8) return;
    setIsSearching(true);
    try {
      const client = await fetchClientByDocument(dni);
      if (client) {
        setClientData(client);
        form.setValue('client_name', client.razon_social);
        form.setValue('client_id', client.id || null);
        toast.success("Socio identificado");
      } else {
        toast.error("Socio no encontrado en el padrón");
      }
    } catch (error) {
      toast.error("Error al consultar base de datos");
    } finally {
      setIsSearching(false);
    }
  };

  const onSubmit = async (values: ReciboPagoFormValues) => {
    if (!clientData?.id) {
      toast.error("Debe identificar a un socio primero");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalCorrelative = await fetchNextReceiptCorrelative();
      
      const receiptData = {
        correlative: finalCorrelative,
        client_full_name: clientData.razon_social,
        client_dni: clientData.numero_documento,
        fecha_emision: values.fecha_emision,
        monto: values.monto,
        concepto: values.concepto,
        metodo_pago: values.metodo_pago,
        numero_operacion: values.numero_operacion,
      };
      
      const { generateReceiptPdf } = await import('@/lib/receiptPdfGenerator');
      const pdfBlob = await generateReceiptPdf(receiptData);

      await saveReceiptPdfToSupabase(pdfBlob, finalCorrelative, clientData.id);

      const incomeData: Omit<TablesInsert<'ingresos'>, 'id' | 'created_at'> = {
        receipt_number: finalCorrelative,
        dni: values.dni,
        full_name: clientData.razon_social,
        amount: values.monto,
        account: values.metodo_pago,
        date: values.fecha_emision,
        transaction_type: 'Recibo de Pago',
        numeroOperacion: showOperationNumber ? Number(values.numero_operacion) : null
      };

      const { error: insertError } = await supabase.from('ingresos').insert(incomeData);
      
      if (insertError && insertError.code === '23505') {
        toast.error("El número de recibo acaba de ser tomado. Reintentando...");
        setIsSubmitting(false);
        loadCorrelative();
        return;
      }

      if (insertError) throw insertError;

      if (values.is_payment_observed) {
        await supabase.from('socio_titulares').update({
          is_payment_observed: true,
          payment_observation_detail: values.payment_observation_detail || null,
        }).eq('id', clientData.id);
      }

      toast.success(`Recibo ${finalCorrelative} generado con éxito`);

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${finalCorrelative}.pdf`;
      link.click();

      form.reset();
      setClientData(null);
      loadCorrelative();
    } catch (error: any) {
      console.error(error);
      toast.error("Error crítico: " + (error.message || "No se pudo completar la operación"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#9E7FFF]/10 rounded-2xl">
            <Wallet className="h-7 w-7 text-[#9E7FFF]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Emitir Recibo</h1>
            <p className="text-sm text-gray-500 font-medium">Sincronización en tiempo real activa.</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadCorrelative}
          className="rounded-xl border-gray-200 text-gray-500 hover:text-[#9E7FFF] gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Sincronizar Número
        </Button>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#9E7FFF]/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
        
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-50">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Comprobante Interno</span>
            <div className="text-right">
                <span className="text-[10px] text-gray-400 font-bold block uppercase mb-1">Próximo Correlativo</span>
                <span className="text-3xl font-mono font-black text-[#9E7FFF] tracking-tighter">
                  {correlative || '---'}
                </span>
            </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">DNI del Socio</FormLabel>
                      <div className="flex gap-3">
                        <FormControl>
                          <Input 
                            placeholder="8 dígitos" 
                            {...field} 
                            maxLength={8} 
                            className="h-14 bg-gray-50 border-none rounded-2xl text-lg font-bold focus:ring-2 focus:ring-[#9E7FFF]/20" 
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          onClick={handleDniSearch} 
                          disabled={isSearching || dni.length !== 8}
                          className="h-14 w-14 rounded-2xl bg-gray-900 hover:bg-black text-white"
                        >
                          {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="fecha_emision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Fecha Emisión</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-14 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-[#9E7FFF]/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Nombre del Titular</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="h-14 bg-gray-100 border-none rounded-2xl font-black text-gray-700 uppercase" />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="monto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Monto Total (S/.)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value))} 
                          className="h-14 bg-gray-50 border-none rounded-2xl font-black text-2xl text-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="metodo_pago"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Método de Pago</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 bg-gray-50 border-none rounded-2xl font-bold">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                          {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value} className="font-bold py-3">{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="concepto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Concepto del Pago</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-14 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-[#9E7FFF]/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showOperationNumber && (
              <FormField
                control={form.control}
                name="numero_operacion"
                render={({ field }) => (
                  <FormItem className="animate-in fade-in slide-in-from-top-2">
                    <FormLabel className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">N° de Operación Bancaria</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-14 bg-[#F0EEFF] border-none rounded-2xl font-mono font-bold text-[#9E7FFF] focus:ring-2 focus:ring-[#9E7FFF]/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="p-6 rounded-[2rem] border border-amber-100 bg-amber-50/30 space-y-6">
                <FormField
                    control={form.control}
                    name="is_payment_observed"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-4 space-y-0">
                            <FormControl>
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange} 
                                  className="w-6 h-6 rounded-lg border-amber-200 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className="text-amber-700 font-black uppercase text-[10px] tracking-widest">Observar este Pago</FormLabel>
                                <FormDescription className="text-xs text-amber-600/70 font-medium">Marcar si el pago requiere revisión por parte de la directiva.</FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                {watchedIsPaymentObserved && (
                    <FormField
                        control={form.control}
                        name="payment_observation_detail"
                        render={({ field }) => (
                            <FormItem className="animate-in zoom-in-95 duration-300">
                                <FormControl>
                                    <Textarea 
                                        placeholder="Escriba el motivo de la observación..." 
                                        className="bg-white border-amber-100 rounded-2xl min-h-[100px] focus:ring-amber-500/20" 
                                        {...field} 
                                        value={field.value ?? ''}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-16 gap-3 rounded-2xl bg-[#9E7FFF] hover:bg-[#8B6EEF] text-white text-lg font-black shadow-xl shadow-[#9E7FFF]/20 transition-all active:scale-[0.98]" 
              disabled={isSubmitting || !clientData}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Procesando Transacción...
                </>
              ) : (
                <>
                  <FileText className="h-6 w-6" />
                  Generar Recibo e Ingreso
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
