export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      colaboradores: {
        Row: {
          id: string
          created_at: string
          name: string
          apellidos: string
          dni: string
          user_id: string | null
          role: string
          cargo: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          apellidos: string
          dni: string
          user_id?: string | null
          role?: string
          cargo?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          apellidos?: string
          dni?: string
          user_id?: string | null
          role?: string
          cargo?: string | null
        }
      }
      registros_jornada: {
        Row: {
          id: number
          created_at: string
          colaborador_id: string
          fecha: string
          hora_inicio_jornada: string | null
          hora_inicio_almuerzo: string | null
          hora_fin_almuerzo: string | null
          hora_fin_jornada: string | null
          justificacion_inicio: string | null
          observaciones_inicio: string | null
          justificacion_fin: string | null
          observaciones_fin: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          colaborador_id: string
          fecha: string
          hora_inicio_jornada?: string | null
          hora_inicio_almuerzo?: string | null
          hora_fin_almuerzo?: string | null
          hora_fin_jornada?: string | null
          justificacion_inicio?: string | null
          observaciones_inicio?: string | null
          justificacion_fin?: string | null
          observaciones_fin?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          colaborador_id?: string
          fecha?: string
          hora_inicio_jornada?: string | null
          hora_inicio_almuerzo?: string | null
          hora_fin_almuerzo?: string | null
          hora_fin_jornada?: string | null
          justificacion_inicio?: string | null
          observaciones_inicio?: string | null
          justificacion_fin?: string | null
          observaciones_fin?: string | null
        }
      }
      socio_titulares: {
        Row: {
          id: string
          created_at: string
          dni: string
          nombres: string
          apellidoPaterno: string
          apellidoMaterno: string
          celular: string | null
          localidad: string
          mz: string | null
          lote: string | null
          is_payment_observed: boolean
          payment_observation_detail: string | null
          is_lote_medido: boolean
          isObservado: boolean
          observacion: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          dni: string
          nombres: string
          apellidoPaterno: string
          apellidoMaterno: string
          celular?: string | null
          localidad: string
          mz?: string | null
          lote?: string | null
          is_payment_observed?: boolean
          payment_observation_detail?: string | null
          is_lote_medido?: boolean
          isObservado?: boolean
          observacion?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          dni?: string
          nombres?: string
          apellidoPaterno?: string
          apellidoMaterno?: string
          celular?: string | null
          localidad?: string
          mz?: string | null
          lote?: string | null
          is_payment_observed?: boolean
          payment_observation_detail?: string | null
          is_lote_medido?: boolean
          isObservado?: boolean
          observacion?: string | null
        }
      }
      ingresos: {
        Row: {
          id: number
          created_at: string
          receipt_number: string
          dni: string | null
          full_name: string | null
          amount: number
          account: string
          date: string
          transaction_type: string | null
          numeroOperacion: number | null
        }
        Insert: {
          id?: number
          created_at?: string
          receipt_number: string
          dni?: string | null
          full_name?: string | null
          amount: number
          account: string
          date: string
          transaction_type?: string | null
          numeroOperacion?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          receipt_number?: string
          dni?: string | null
          full_name?: string | null
          amount?: number
          account?: string
          date?: string
          transaction_type?: string | null
          numeroOperacion?: number | null
        }
      }
      cuentas: {
        Row: {
          id: string
          name: string // Sincronizado con el UI (antes nombre)
          tipo: string
          saldo: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          tipo: string
          saldo?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          tipo?: string
          saldo?: number
          created_at?: string
        }
      }
      gastos: {
        Row: {
          id: number
          created_at: string
          description: string
          amount: number
          category: string
          sub_category: string | null
          date: string
          account: string
          numero_gasto: string | null
          colaborador_id: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          description: string
          amount: number
          category: string
          sub_category?: string | null
          date: string
          account: string
          numero_gasto?: string | null
          colaborador_id?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          description?: string
          amount?: number
          category?: string
          sub_category?: string | null
          date?: string
          account?: string
          numero_gasto?: string | null
          colaborador_id?: string | null
        }
      }
      resumenes_diarios: {
        Row: {
          id: number
          created_at: string
          fecha_resumen: string
          numero_completo: string
          correlativo: string
          ticket: string | null
          estado_sunat: string | null
          summary_api_id: number | null
        }
        Insert: {
          id?: number
          created_at?: string
          fecha_resumen: string
          numero_completo: string
          correlativo: string
          ticket?: string | null
          estado_sunat?: string | null
          summary_api_id?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          fecha_resumen?: string
          numero_completo?: string
          correlativo?: string
          ticket?: string | null
          estado_sunat?: string | null
          summary_api_id?: number | null
        }
      }
      resumen_diario_boletas: {
        Row: {
          id: number
          resumen_id: number
          serie_numero: string
        }
        Insert: {
          id?: number
          resumen_id: number
          serie_numero: string
        }
        Update: {
          id?: number
          resumen_id?: number
          serie_numero?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
