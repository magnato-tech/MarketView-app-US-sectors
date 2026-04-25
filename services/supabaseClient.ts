import { createClient, SupabaseClient } from '@supabase/supabase-js';

function readSupabaseUrl(): string {
  return (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  );
}

/** «Anon» / publishable key fra Supabase → API → Project API keys. */
function readSupabaseAnonKey(): string {
  return (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  );
}

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(readSupabaseUrl() && readSupabaseAnonKey());
}

/**
 * Lazily creates the Supabase client so importing this module without env vars
 * (e.g. in tests or local-only mode) does not throw.
 */
export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = readSupabaseUrl();
  const supabaseAnonKey = readSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase credentials missing. Set URL + anon key (e.g. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or SUPABASE_URL and SUPABASE_ANON_KEY).'
    );
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}
