import { LocalFileBotRepository } from './LocalFileBotRepository';
import { SupabaseBotRepository } from './SupabaseBotRepository';
import { IBotRepository } from './IBotRepository';

/** When not using Supabase, optional `localBaseDir` overrides the default `data/factory` root (e.g. tests). */
export const getRepository = (localBaseDir?: string): IBotRepository => {
  const isSupabaseEnabled = process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY;

  if (isSupabaseEnabled) {
    return new SupabaseBotRepository();
  }

  return new LocalFileBotRepository(localBaseDir);
};
