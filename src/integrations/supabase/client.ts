import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Always use the project's own environment configuration — never a hard-coded
// project reference, which would point the app at the wrong backend.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || (import.meta.env.SUPABASE_URL as string | undefined) || '';

// Support standard Vite key names
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (import.meta.env.SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — auth and data requests will fail.',
  );
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
