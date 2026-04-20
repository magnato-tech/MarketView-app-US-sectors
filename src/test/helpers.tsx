import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { DashboardProvider } from '../../contexts/DashboardContext';
import type { Language } from '../../i18n/types';

interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  language?: Language;
  initialTickers?: string[];
}

/**
 * Render a React element wrapped in LanguageProvider and DashboardProvider 
 * so that components relying on `useLanguage()` and `useDashboard()` work in tests.
 */
export const renderWithProviders = (ui: ReactElement, opts: ProviderOptions = {}) => {
  const { language = 'no', initialTickers = ['XLK', 'XLF'], ...rest } = opts;
  return render(ui, {
    wrapper: ({ children }) => (
      <LanguageProvider initialLanguage={language}>
        <DashboardProvider initialTickers={initialTickers}>
          {children}
        </DashboardProvider>
      </LanguageProvider>
    ),
    ...rest,
  });
};

export const renderWithLang = (ui: ReactElement, opts: ProviderOptions = {}) => {
  const { language = 'no', ...rest } = opts;
  return render(ui, {
    wrapper: ({ children }) => (
      <LanguageProvider initialLanguage={language}>{children}</LanguageProvider>
    ),
    ...rest,
  });
};
