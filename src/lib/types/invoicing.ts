import { z } from 'zod';

// --- Esquemas Base ---

export const DetalleBoletaSchema = z.object({
  codigo: z.string().optional(),
  descripcion: z.string().min(1, "La descripción es requerida."),
  unidad: z.string().min(1, "La unidad es requerida (ej: NIU)."),
  cantidad: z.coerce.number().min(0.01, "La cantidad debe ser mayor a 0."),
  mto_valor_unitario: z.coerce.number().min(0, "El precio no puede ser negativo."),
  porcentaje_igv: z.coerce.number().min(0, "El % IGV no puede ser negativo."),
  tip_afe_igv: z.string().min(1, "Seleccione un tipo de afectación."),
  codigo_producto_sunat: z.string().optional(),
});

export const ClientBoletaSchema = z.object({
  id: z.string().optional(), 
  tipo_documento: z.string().min(1, "Seleccione un tipo de documento."),
  numero_documento: z.string().min(1, "El número de documento es requerido."),
  razon_social: z.string().min(1, "La razón social o nombre es requerido."),
  nombre_comercial: z.string().optional().or(z.literal('')),
  direccion: z.string().optional().or(z.literal('')),
  ubigeo: z.string().optional().or(z.literal('')),
  distrito: z.string().optional().or(z.literal('')),
  provincia: z.string().optional().or(z.literal('')),
  departamento: z.string().optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  pais: z.string().optional().or(z.literal('')), 
});

// --- Recibos de Pago ---

export const ReciboPagoFormSchema = z.object({
  dni: z.string().length(8, "El DNI debe tener 8 dígitos"),
  client_name: z.string().min(1, "El nombre es requerido"),
  client_id: z.string().nullable(),
  fecha_emision: z.string(),
  monto: z.number().min(0.1, "El monto debe ser mayor a 0"),
  concepto: z.string().min(1, "El concepto es requerido"),
  metodo_pago: z.string(),
  numero_operacion: z.string().optional(),
  is_payment_observed: z.boolean().default(false),
  payment_observation_detail: z.string().optional(),
});

export type ReciboPagoFormValues = z.infer<typeof ReciboPagoFormSchema>;

// --- Resúmenes Diarios ---

export const ResumenDiarioSchema = z.object({
  fecha_resumen: z.string(),
});

export type ResumenDiarioFormValues = z.infer<typeof ResumenDiarioSchema>;

export type SummaryData = {
  id: number;
  fecha_resumen: string;
  numero_completo: string;
  detalles: Array<{
    serie_numero: string;
    mto_imp_venta: number;
  }>;
};

// --- Boletas y Facturas ---

export const BoletaFormSchema = z.object({
  serie: z.string(),
  fecha_emision: z.string(),
  moneda: z.string().min(1, "Seleccione una moneda."),
  tipo_operacion: z.string(),
  metodo_envio: z.string(),
  forma_pago_tipo: z.string(),
  usuario_creacion: z.string(),
  client: ClientBoletaSchema,
  detalles: z.array(DetalleBoletaSchema).min(1, "Debe agregar al menos un producto o servicio."),
  create_income_record: z.boolean().default(true),
  income_date: z.string().optional(),
  income_numero_operacion: z.string().optional(),
  income_account: z.string().optional(),
}).refine(data => {
    if (data.create_income_record) {
        return !!data.income_date && !!data.income_account;
    }
    return true;
}, {
    message: "La fecha y cuenta son requeridos para registrar el ingreso.",
    path: ["create_income_record"],
});

export type BoletaFormValues = z.infer<typeof BoletaFormSchema>;

// --- Payload API ---

export const ClientPayloadSchema = z.object({
  tipo_documento: z.string(),
  numero_documento: z.string(),
  razon_social: z.string(),
  nombre_comercial: z.string().optional(),
  direccion: z.string().optional(),
  ubigeo: z.string().optional(),
  distrito: z.string().optional(),
  provincia: z.string().optional(),
  departamento: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  pais: z.string().optional(),
});

export const DetallePayloadSchema = z.object({
    codigo: z.string().optional(),
    descripcion: z.string(),
    unidad: z.string(),
    cantidad: z.number(),
    mto_valor_unitario: z.number(), 
    porcentaje_igv: z.number(),
    tip_afe_igv: z.string(),
    codigo_producto_sunat: z.string().optional(),
});

export const BoletaPayloadSchema = z.object({
  company_id: z.number(),
  branch_id: z.number(),
  serie: z.string(),
  fecha_emision: z.string(),
  moneda: z.string(),
  tipo_operacion: z.string(),
  metodo_envio: z.string(),
  forma_pago_tipo: z.string(),
  usuario_creacion: z.string(),
  client: ClientPayloadSchema,
  detalles: z.array(DetallePayloadSchema),
});

export type BoletaPayload = z.infer<typeof BoletaPayloadSchema>;

export const IssueResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    id: z.number(),
    numero_completo: z.string(),
    external_id: z.string().optional(),
    pdf_path: z.string().nullish(),
    xml_path: z.string().nullish(),
    cdr_path: z.string().nullish(),
    sunat_status: z.string().nullish(),
  }),
});

export type IssueResponse = z.infer<typeof IssueResponseSchema>;

// --- Resúmenes Diarios (Tipos de Datos) ---

export type DailySummary = {
  id: number;
  fecha_resumen: string;
  fecha_referencia?: string;
  numero_completo: string;
  correlativo: string;
  ticket: string;
  estado_sunat: string | null;
  summary_api_id: number | null;
  external_id?: string;
};

export const CheckSummaryStatusResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.number(),
    estado_sunat: z.string().nullable(),
  }),
  message: z.string().optional(),
});

export type CheckSummaryStatusResponse = z.infer<typeof CheckSummaryStatusResponseSchema>;

// --- Notas de Crédito ---

export const NotaCreditoFormSchema = z.object({
  documento_afectado_tipo: z.enum(['boleta', 'factura']),
  documento_afectado_serie: z.string(),
  documento_afectado_numero: z.string(),
  motivo_codigo: z.string(),
  motivo_descripcion: z.string(),
  serie: z.string(),
  fecha_emision: z.string(),
  moneda: z.string(),
  client: ClientBoletaSchema,
  detalles: z.array(DetalleBoletaSchema),
});

export type NotaCreditoFormValues = z.infer<typeof NotaCreditoFormSchema>;

export const NotaCreditoPayloadSchema = z.object({
  company_id: z.number(),
  branch_id: z.number(),
  serie: z.string(),
  fecha_emision: z.string(),
  moneda: z.string(),
  tipo_doc_afectado: z.string(),
  num_doc_afectado: z.string(),
  cod_motivo: z.string(),
  des_motivo: z.string(),
  client: ClientPayloadSchema,
  detalles: z.array(DetallePayloadSchema),
});

export type NotaCreditoPayload = z.infer<typeof NotaCreditoPayloadSchema>;

export type DocumentoAfectado = {
    id: number;
    fecha_emision: string;
    moneda: string;
    client: z.infer<typeof ClientBoletaSchema>;
    detalles: z.infer<typeof DetalleBoletaSchema>[];
    mto_imp_venta: number;
};

// --- Otros ---

export interface Client {
  id?: string;
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion: string;
  ubigeo?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  telefono?: string;
  email?: string;
  pais?: string;
}

export interface InvoicingCalendarItem {
  id: string;
  type: 'Boleta' | 'Factura' | 'Nota Crédito';
  serie: string;
  clientName: string;
  amount: number;
  date: string;
  status: 'Aceptado' | 'Pendiente' | 'Rechazado';
}

export type AnnulledIncomeSummary = {
  id: number;
  date: string;
  receipt_number: string;
  amount: number;
  client_dni: string | null;
  client_name: string | null;
  transaction_type: string;
};

export type SendSummaryData = {
  id: number;
  fecha_resumen: string;
  numero_completo: string;
  correlativo: string;
  ticket: string;
  estado_sunat: string | null;
};
