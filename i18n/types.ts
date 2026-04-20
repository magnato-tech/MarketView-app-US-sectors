/**
 * Språkstøtte: norsk og engelsk.
 * "no" er kildespråket – TranslationKey utledes fra strukturen i messages.no.
 */

export type Language = 'no' | 'en';

export const SUPPORTED_LANGUAGES: Language[] = ['no', 'en'];

export const LANGUAGE_LABELS: Record<Language, string> = {
  no: 'Norsk',
  en: 'English',
};

/**
 * Hjelper: alle dot-noterte stier i et nestet objekt.
 * F.eks. for { a: { b: 'x' } } gir dette 'a.b'.
 */
export type Paths<T, P extends string = ''> = T extends string
  ? P
  : T extends object
  ? {
      [K in keyof T & string]: Paths<T[K], P extends '' ? K : `${P}.${K}`>;
    }[keyof T & string]
  : never;
