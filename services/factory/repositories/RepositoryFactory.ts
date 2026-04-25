import { LocalFileBotRepository } from './LocalFileBotRepository';
import { SupabaseBotRepository } from './SupabaseBotRepository';
import { IBotRepository } from './IBotRepository';
import { isSupabaseConfigured } from '../../supabaseClient';

/** When not using Supabase, optional `localBaseDir` overrides the default `data/factory` root (e.g. tests). */
export const getRepository = (localBaseDir?: string): IBotRepository => {
  if (isSupabaseConfigured()) {
    return new SupabaseBotRepository();
  }

  return new LocalFileBotRepository(localBaseDir);
};
