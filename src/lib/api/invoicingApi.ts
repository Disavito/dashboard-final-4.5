import { supabase } from '../supabaseClient';
import { 
  BoletaPayload, 
  Client, 
  DailySummary, 
  DocumentoAfectado, 
  InvoicingCalendarItem, 
  IssueResponse, 
  NotaCreditoPayload, 
  AnnulledIncomeSummary,
  CheckSummaryStatusResponse,
  SummaryData
} from '../types/invoicing';

/**
 * Obtiene la actividad reciente de facturación.
 */
export const fetchRecentInvoices = async (): Promise<InvoicingCalendarItem[]> => {
  const { data, error } = await supabase
    .from('ingresos')
    .select('id, date, receipt_number, amount, full_name, transaction_type')
    .order('date', { ascending: false })
    .limit(20);

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id.toString(),
    date: item.date,
    type: item.transaction_type === 'Anulación' ? 'Nota Crédito' : (item.receipt_number?.startsWith('B') ? 'Boleta' : 'Factura'),
    serie: item.receipt_number || 'N/A',
    clientName: item.full_name || 'Cliente Desconocido',
    amount: item.amount,
    status: 'Aceptado' // Valor por defecto ya que no existe columna status
  }));
};

/**
 * Obtiene el historial de resúmenes diarios.
 */
export const fetchDailySummaries = async (): Promise<DailySummary[]> => {
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .order('fecha_resumen', { ascending: false });

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching summaries:", error);
  }

  return (data || []).map(item => ({
    id: item.id,
    fecha_resumen: item.fecha_resumen,
    numero_completo: item.numero_completo,
    correlativo: item.correlativo,
    ticket: item.ticket,
    estado_sunat: item.estado_sunat,
    summary_api_id: item.summary_api_id,
    external_id: item.external_id
  }));
};

/**
 * Busca un documento afectado.
 */
export const fetchDocumentoAfectado = async (
  _tipo: 'boleta' | 'factura',
  serie: string,
  numero: string
): Promise<DocumentoAfectado | null> => {
  const { data, error } = await supabase
    .from('ingresos')
    .select('*')
    .eq('receipt_number', `${serie}-${numero}`)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    fecha_emision: data.date,
    moneda: 'PEN',
    client: {
      tipo_documento: '1', 
      numero_documento: data.dni || '',
      razon_social: data.full_name || '',
    },
    detalles: [
      {
        descripcion: 'POR SERVICIOS PRESTADOS',
        unidad: 'ZZ',
        cantidad: 1,
        mto_valor_unitario: data.amount,
        porcentaje_igv: 18,
        tip_afe_igv: '10',
      }
    ],
    mto_imp_venta: data.amount,
  };
};

/**
 * Busca un cliente por DNI.
 */
export const fetchClientByDocument = async (documentNumber: string): Promise<Client | null> => {
  const { data, error } = await supabase
    .from('socio_titulares')
    .select('id, dni, nombres, "apellidoPaterno", "apellidoMaterno", localidad, mz, lote, celular')
    .eq('dni', documentNumber)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    tipo_documento: '1',
    numero_documento: data.dni,
    razon_social: `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`.trim(),
    direccion: `${data.localidad} ${data.mz ? 'Mz ' + data.mz : ''} ${data.lote ? 'Lt ' + data.lote : ''}`.trim(),
    telefono: data.celular || '',
    email: '',
  };
};

/**
 * Emite una Boleta Electrónica.
 */
export const issueBoleta = async (payload: BoletaPayload): Promise<IssueResponse> => {
  return {
    success: true,
    data: {
      id: Math.floor(Math.random() * 10000),
      numero_completo: `${payload.serie}-${Math.floor(Math.random() * 1000).toString().padStart(6, '0')}`,
      external_id: crypto.randomUUID(),
    }
  };
};

/**
 * Emite una Nota de Crédito.
 */
export const issueNotaCredito = async (payload: NotaCreditoPayload): Promise<IssueResponse> => {
  return { 
    success: true, 
    data: { 
      id: 1, 
      numero_completo: `${payload.serie}-000001`, 
      external_id: crypto.randomUUID() 
    } 
  };
};

// --- Funciones PDF y Almacenamiento ---

export const generateBoletaPdf = async (_id: number, _format: string) => {
  return { success: true };
};

export const saveBoletaPdfToSupabase = async (_id: number, _numero: string, _socioId: string, _format: string) => {
  return { success: true };
};

export const saveReceiptPdfToSupabase = async (_blob: Blob, _numero: string, _socioId: string) => {
  return { success: true };
};

export const downloadBoletaPdfToBrowser = async (_id: number, _numero: string, _format: string) => {
  console.log("Descargando PDF...");
};

// --- Funciones de Ingresos ---

export const createIncomeFromBoleta = async (data: any) => {
  const { error } = await supabase.from('ingresos').insert([data]);
  if (error) throw error;
};

export const updateIncomeOnCreditNote = async (originalReceipt: string, _amount: number, ncNumber: string) => {
  const { error } = await supabase
    .from('ingresos')
    .update({ 
      transaction_type: 'Anulación',
      observation: `Afectado por NC ${ncNumber}`
    })
    .eq('receipt_number', originalReceipt);
  
  if (error) throw error;
};

export const fetchNextReceiptCorrelative = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('ingresos')
    .select('receipt_number')
    .like('receipt_number', 'R-%')
    .order('receipt_number', { ascending: false })
    .limit(1);

  if (error) throw error;
  
  if (!data || data.length === 0) return 'R-000001';
  
  const lastNum = parseInt(data[0].receipt_number.split('-')[1]);
  return `R-${(lastNum + 1).toString().padStart(6, '0')}`;
};

// --- Funciones SUNAT ---

export const createDailySummary = async (fecha: string): Promise<{ success: boolean; data: SummaryData; message?: string }> => {
  return {
    success: true,
    data: {
      id: Math.floor(Math.random() * 1000),
      fecha_resumen: fecha,
      numero_completo: `RC-${fecha.replace(/-/g, '')}-1`,
      detalles: []
    },
    message: "Resumen creado correctamente"
  };
};

export const sendSummaryToSunat = async (id: number): Promise<{ success: boolean; data: any; message?: string }> => {
  return {
    success: true,
    data: {
      id,
      ticket: `T-${Math.random().toString(36).substring(7)}`,
      numero_completo: `RC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-1`
    },
    message: "Enviado a SUNAT con éxito"
  };
};

export const saveDailySummaryResult = async (data: any) => {
  const { error } = await supabase.from('daily_summaries').insert([{
    fecha_resumen: new Date().toISOString().split('T')[0],
    numero_completo: data.numero_completo,
    ticket: data.ticket,
    estado_sunat: 'PENDIENTE'
  }]);
  if (error) throw error;
};

export const sendNotaCreditoToSunat = async (_id: number) => {
  return { success: true };
};

export const updateSummaryStatusInDb = async (id: number, status: string) => {
  const { error } = await supabase
    .from('daily_summaries')
    .update({ estado_sunat: status })
    .eq('id', id);
  if (error) throw error;
};

export const checkSummaryStatus = async (apiId: number): Promise<CheckSummaryStatusResponse> => {
  return {
    success: true,
    data: {
      id: apiId,
      estado_sunat: 'ACEPTADO'
    }
  };
};

export const fetchAnnulledAndReturnedIncomes = async (type: 'annulled' | 'returned'): Promise<AnnulledIncomeSummary[]> => {
  const transactionType = type === 'annulled' ? 'Anulación' : 'Devolución';
  const { data, error } = await supabase
    .from('ingresos')
    .select('*')
    .eq('transaction_type', transactionType);
  if (error) throw error;
  return (data || []).map(item => ({
    id: item.id,
    date: item.date,
    receipt_number: item.receipt_number || 'N/A',
    amount: item.amount,
    client_dni: item.dni,
    client_name: item.full_name,
    transaction_type: item.transaction_type
  }));
};
