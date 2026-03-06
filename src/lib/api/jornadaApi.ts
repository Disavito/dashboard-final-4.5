import { supabase } from '../supabaseClient';
import { Tables, TablesInsert, TablesUpdate } from '../database.types';
import { format, parseISO, differenceInMinutes } from 'date-fns';

export type Jornada = Tables<'registros_jornada'>;
export type Colaborador = Tables<'colaboradores'>;

export const calculateWorkedMinutesForJornada = (jornada: Jornada): number => {
  if (!jornada.hora_inicio_jornada || !jornada.hora_fin_jornada) return 0;
  const inicio = parseISO(jornada.hora_inicio_jornada);
  const fin = parseISO(jornada.hora_fin_jornada);
  let totalMinutes = differenceInMinutes(fin, inicio);
  
  if (jornada.hora_inicio_almuerzo && jornada.hora_fin_almuerzo) {
    const inicioAlmuerzo = parseISO(jornada.hora_inicio_almuerzo);
    const finAlmuerzo = parseISO(jornada.hora_fin_almuerzo);
    totalMinutes -= Math.max(0, differenceInMinutes(finAlmuerzo, inicioAlmuerzo));
  }
  return Math.max(0, totalMinutes);
};

export const getColaboradorProfile = async (userId: string): Promise<Colaborador | null> => {
  const { data, error } = await supabase.from('colaboradores').select('*').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const getAllColaboradores = async (): Promise<Colaborador[]> => {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getJornadaByDate = async (colaboradorId: string, date: Date): Promise<Jornada | null> => {
  const fecha = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase.from('registros_jornada').select('*').eq('colaborador_id', colaboradorId).eq('fecha', fecha).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const getAdminJornadas = async ({ 
  startDate, 
  endDate, 
  colaboradorId 
}: { 
  startDate: string, 
  endDate: string, 
  colaboradorId?: string 
}) => {
  let query = supabase
    .from('registros_jornada')
    .select(`
      *,
      colaboradores (*)
    `)
    .gte('fecha', startDate)
    .lte('fecha', endDate)
    .order('fecha', { ascending: false });

  if (colaboradorId && colaboradorId !== 'todos') {
    query = query.eq('colaborador_id', colaboradorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createManualJornada = async (payload: TablesInsert<'registros_jornada'>) => {
  const { data, error } = await supabase
    .from('registros_jornada')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const clockIn = async (
  colaboradorId: string, 
  justificacion?: string, 
  observaciones?: string,
  customDate?: Date
): Promise<Jornada> => {
  const timestamp = customDate || new Date();
  const newJornada: TablesInsert<'registros_jornada'> = {
    colaborador_id: colaboradorId,
    fecha: format(timestamp, 'yyyy-MM-dd'),
    hora_inicio_jornada: timestamp.toISOString(),
    justificacion_inicio: justificacion || null,
    observaciones_inicio: observaciones || null,
  };
  
  const { data, error } = await supabase.from('registros_jornada').insert(newJornada).select().single();
  if (error || !data) throw new Error(error?.message || "Error al iniciar jornada");
  return data;
};

export const clockOut = async (
  jornadaId: number, 
  justificacion?: string, 
  observaciones?: string,
  customDate?: Date
): Promise<Jornada> => {
  const timestamp = customDate || new Date();
  const { data, error } = await supabase.from('registros_jornada').update({ 
    hora_fin_jornada: timestamp.toISOString(),
    justificacion_fin: justificacion || null,
    observaciones_fin: observaciones || null
  }).eq('id', jornadaId).select().single();
  
  if (error || !data) throw new Error(error?.message || "Error al finalizar jornada");
  return data;
};

export const startLunch = async (jornadaId: number, customDate?: Date) => {
  const timestamp = customDate || new Date();
  const { data, error } = await supabase.from('registros_jornada').update({ 
    hora_inicio_almuerzo: timestamp.toISOString() 
  }).eq('id', jornadaId).select().single();
  if (error) throw error;
  return data;
};

export const endLunch = async (jornadaId: number, customDate?: Date) => {
  const timestamp = customDate || new Date();
  const { data, error } = await supabase.from('registros_jornada').update({ 
    hora_fin_almuerzo: timestamp.toISOString() 
  }).eq('id', jornadaId).select().single();
  if (error) throw error;
  return data;
};

export const adminUpdateJornada = async (
  jornadaId: number, 
  updates: Partial<TablesUpdate<'registros_jornada'>>
): Promise<Jornada> => {
  const { data, error } = await supabase
    .from('registros_jornada')
    .update(updates)
    .eq('id', jornadaId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};
