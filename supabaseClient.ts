import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string) || (globalThis as any).__SUPABASE_URL || 'https://invalid.supabase.co';
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || (globalThis as any).__SUPABASE_ANON_KEY || 'public-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment.');
}

export const supabase = createClient(url, anon);
