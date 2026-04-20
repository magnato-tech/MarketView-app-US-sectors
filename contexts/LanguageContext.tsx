import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Language, Paths, SUPPORTED_LANGUAGES } from '../i18n/types';
import { messages, MessageTree } from '../i18n/messages';

const STORAGE_KEY = 'marketview.language';
const DEFAULT_LANGUAGE: Language = 'no';

export type TranslationKey = Paths<MessageTree>;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /**
   * Slå opp en oversatt streng via dot-notert nøkkel.
   * Støtter enkle {var}-substitusjoner: t('leaderboard.winnerLast', { period: '6mo' })
   * Returnerer nøkkelen selv hvis den ikke finnes (gjør debugging enkel).
   */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const readStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && (SUPPORTED_LANGUAGES as string[]).includes(raw)) {
      return raw as Language;
    }
  } catch {
    /* localStorage utilgjengelig – ignorer */
  }
  return DEFAULT_LANGUAGE;
};

const lookup = (tree: MessageTree, key: string): string | undefined => {
  const parts = key.split('.');
  let cur: unknown = tree;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
};

const interpolate = (template: string, vars?: Record<string, string | number>): string => {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name) => {
    const v = vars[name];
    return v !== undefined ? String(v) : m;
  });
};

export const LanguageProvider: React.FC<{ children: ReactNode; initialLanguage?: Language }> = ({
  children,
  initialLanguage,
}) => {
  const [language, setLanguageState] = useState<Language>(() => initialLanguage ?? readStoredLanguage());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback<LanguageContextValue['t']>(
    (key, vars) => {
      const tree = messages[language];
      const direct = lookup(tree, key);
      if (direct !== undefined) return interpolate(direct, vars);
      // Fallback til norsk hvis nøkkelen mangler i valgt språk
      const fallback = lookup(messages.no, key);
      if (fallback !== undefined) return interpolate(fallback, vars);
      return key;
    },
    [language]
  );

  const value = useMemo<LanguageContextValue>(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
