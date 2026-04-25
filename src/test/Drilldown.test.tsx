import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import Sidebar from '../../components/Sidebar';
import { TICKERS } from '../../constants';
import { renderWithProviders } from './helpers';
import { useDashboard } from '../../contexts/DashboardContext';

// Mocking useDashboardLogic to avoid actual API calls
vi.mock('../../hooks/useDashboardLogic', () => ({
  useDashboardLogic: (initialTickers: string[]) => ({
    state: {
      selectedTickers: initialTickers,
      period: '6mo',
      interval: '1d',
      data: [],
      summary: [],
      loading: false,
      error: null,
      aiInsight: '',
      aiSignals: [],
    },
    rangeSummary: [],
    activeTickers: initialTickers,
    handleTickerToggle: vi.fn(),
    handlePeriodChange: vi.fn(),
    handleIntervalChange: vi.fn(),
    refreshData: vi.fn(),
    setSelectedTickers: vi.fn()
  })
}));

describe('Sidebar Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock matchMedia for JSDOM
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders major sectors in the sidebar', () => {
    renderWithProviders(<Sidebar />);

    const majorSectors = [
      'Teknologi', 'Helse', 'Finans', 'Eiendom', 'Infrastruktur', 
      'Konsum', 'Telekom', 'Industri', 'Forsyning', 'Obligasjoner kort', 'Obligasjoner lang',
      'Energi', 'Materialer', 'Råvarer', 'Edelmetaller'
    ];

    majorSectors.forEach(sectorName => {
      expect(screen.getByText(new RegExp(`^${sectorName}$`, 'i'))).toBeTruthy();
    });
  });

  it('verifies that ETFs are correctly linked to parents in constants', () => {
    const techChildren = TICKERS.filter(t => t.parentSymbol === 'XLK');
    expect(techChildren.length).toBeGreaterThan(0);
    expect(techChildren.map(c => c.symbol)).toContain('SOXX');

    const energyChildren = TICKERS.filter(t => t.parentSymbol === 'XLE');
    expect(energyChildren.length).toBeGreaterThan(0);
    expect(energyChildren.map(c => c.symbol)).toContain('XOP');
  });
});
