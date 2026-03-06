import { createClient } from '@supabase/supabase-js';

// Limpiamos la URL para evitar problemas de formato
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://n8n-supabase.mv7mvl.easypanel.host').trim().replace(/\/$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE').trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Accept': 'application/json',
    },
  },
  // Configuración de Realtime para ser más tolerante a fallos de red
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    // Si el WebSocket falla repetidamente, esto ayuda a que no sature el log
    timeout: 20000, 
  },
});
