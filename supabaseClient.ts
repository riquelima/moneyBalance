import { createClient } from '@supabase/supabase-js';

const persistedUrl = typeof window !== 'undefined' ? window.localStorage.getItem('SUPABASE_URL') || '' : '';
const persistedAnon = typeof window !== 'undefined' ? window.localStorage.getItem('SUPABASE_ANON_KEY') || '' : '';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || persistedUrl || (globalThis as any).__SUPABASE_URL || 'https://invalid.supabase.co';
export const supabaseAnon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || persistedAnon || (globalThis as any).__SUPABASE_ANON_KEY || 'public-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  const hasPersisted = Boolean(persistedUrl && persistedAnon);
  if (!hasPersisted) {
    console.warn('Supabase credentials missing. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY via .env ou em Configurações.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
