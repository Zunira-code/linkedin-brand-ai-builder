import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Fallback to your actual Supabase URL if VITE_SUPABASE_URL is missing
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://wrcfhqmyvuioclfxyrt.supabase.co';

// Support standard Vite key names
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

if (!SUPABASE_ANON_KEY) {
  console.warn('[Supabase Warning] VITE_SUPABASE_ANON_KEY is not set in environment variables.');
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
