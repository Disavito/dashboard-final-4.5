import { supabase } from '@/lib/supabaseClient';

export interface SocioDocument {
  id: number;
  socio_id: string;
  tipo_documento: 'Planos de ubicación' | 'Memoria descriptiva' | 'Comprobante de pago' | 'Contrato' | 'Ficha';
  link_documento: string;
  created_at: string;
}

/**
 * Optimizado: Solo trae las columnas necesarias
 */
export const fetchSocioDocuments = async (socioId: string) => {
  const { data, error } = await supabase
    .from('socio_documentos')
    .select('id, socio_id, tipo_documento, link_documento, created_at')
    .eq('socio_id', socioId);

  if (error) throw error;
  return data as SocioDocument[];
};

/**
 * Optimizado: Búsqueda más ligera con selección de columnas específica
 */
export const searchSocios = async (query: string) => {
  const { data, error } = await supabase
    .from('socio_titulares')
    .select('id, nombres, apellidoPaterno, apellidoMaterno, dni')
    .or(`nombres.ilike.%${query}%,apellidoPaterno.ilike.%${query}%,dni.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return data;
};
