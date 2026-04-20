import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../../contexts/LanguageContext';

const Probe: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="title">{t('aiInsight.titleSuffix')}</span>
      <span data-testid="interp">{t('leaderboard.winnerLast', { period: '6mo' })}</span>
      <button type="button" onClick={() => setLanguage('en')}>to-en</button>
      <button type="button" onClick={() => setLanguage('no')}>to-no</button>
    </div>
  );
};

describe('LanguageContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to Norwegian and translates known keys', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId('lang').textContent).toBe('no');
    expect(screen.getByTestId('title').textContent).toBe('Markedsrapport');
    expect(screen.getByTestId('interp').textContent).toContain('6mo');
  });

  it('switches to English and updates translations', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    act(() => {
      fireEvent.click(screen.getByText('to-en'));
    });
    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('title').textContent).toBe('Market Report');
    expect(screen.getByTestId('interp').textContent).toMatch(/Top performer last 6mo/i);
  });

  it('persists the chosen language in localStorage', () => {
    const { unmount } = render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    act(() => {
      fireEvent.click(screen.getByText('to-en'));
    });
    expect(window.localStorage.getItem('marketview.language')).toBe('en');
    unmount();

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId('lang').textContent).toBe('en');
  });

  it('falls back to the key itself when missing in both languages', () => {
    const Bad: React.FC = () => {
      const { t } = useLanguage();
      return <span>{t('missing.unknown.key' as any)}</span>;
    };
    render(
      <LanguageProvider>
        <Bad />
      </LanguageProvider>
    );
    expect(screen.getByText('missing.unknown.key')).toBeInTheDocument();
  });
});
