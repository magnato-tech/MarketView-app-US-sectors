import type { Language } from '../i18n/types';

/**
 * Korte brukertekster for vanlige Gemini-feil.
 * Unngår å speile Googles fulle råmelding (f.eks. «leaked key») når vi kan forklare tiltak.
 */
export function formatGeminiApiErrorForUser(raw: string | undefined, language: Language): string {
  const m = (raw || '').toLowerCase();
  if (
    m.includes('leaked') ||
    m.includes('invalid api key') ||
    m.includes('api key not valid') ||
    m.includes('must be a valid') ||
    m.includes('incorrect api key')
  ) {
    return language === 'en'
      ? 'Google rejected this API key (invalid or exposed). Create a new key in Google AI Studio, set VITE_GEMINI_API_KEY in .env, restart the dev server, and do not commit .env.'
      : 'Google avviste API-nøkkelen (ugyldig eller eksponert). Opprett ny nøkkel i Google AI Studio, sett VITE_GEMINI_API_KEY i .env, start dev-server på nytt, og ikke sjekk inn .env i git.';
  }
  if (m.includes('resource exhausted') || m.includes('quota') || m.includes('429')) {
    return language === 'en'
      ? 'Rate limit or quota reached. Try again in a few minutes.'
      : 'Kvote eller rate limit er brukt opp. Prøv igjen om noen minutter.';
  }
  if (!raw?.trim()) {
    return language === 'en' ? 'Connection error.' : 'Tilkoblingsfeil.';
  }
  return raw.trim();
}
