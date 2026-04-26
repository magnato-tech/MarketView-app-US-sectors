import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(repoRoot, '.env') });
config({ path: path.join(repoRoot, '.env.local'), override: true });

const { getSupabaseClient, isSupabaseConfigured } = await import('../services/supabaseClient');

async function main() {
  if (!isSupabaseConfigured()) {
    const url =
      Boolean(process.env.VITE_SUPABASE_URL) ||
      Boolean(process.env.SUPABASE_URL) ||
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const key =
      Boolean(process.env.VITE_SUPABASE_ANON_KEY) ||
      Boolean(process.env.SUPABASE_ANON_KEY) ||
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
      Boolean(process.env.SUPABASE_PUBLISHABLE_KEY);
    console.log(
      `Fant prosjekt-URL i miljø: ${url}. Fant anon-nøkkel i miljø: ${key}.`
    );
    console.log(
      'Forventede navn på anon-nøkkel: VITE_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY eller SUPABASE_PUBLISHABLE_KEY (i .env eller .env.local under repo-roten).'
    );
    process.exit(1);
  }

  const sb = getSupabaseClient();
  const tables = [
    'bots',
    'evaluations',
    'deployments',
    'evolution_events',
    'factory_state',
    'crisis_log',
    'engine_status',
  ];

  for (const t of tables) {
    const { error } = await sb.from(t).select('*', { head: true, count: 'exact' });
    console.log(`${t}: ${error ? `FEIL: ${error.message}` : 'OK'}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
