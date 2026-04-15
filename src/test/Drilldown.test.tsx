import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../../components/Sidebar';
import { DashboardProvider } from '../../contexts/DashboardContext';
import { TICKERS } from '../../constants';

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
      aiInsight: ''
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

describe('Drilldown Functionality', () => {
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

  it('renders drilldown arrows for sectors with children', () => {
    const { container } = render(
      <DashboardProvider initialTickers={['XLK']}>
        <Sidebar selectedTickers={['XLK']} onTickerToggle={vi.fn()} />
      </DashboardProvider>
    );

    // Debug: skriv ut HTML hvis det feiler
    // console.log(container.innerHTML);

    // Sjekk at Teknologi (XLK) har en drilldown-knapp (pil)
    const drilldownButtons = screen.getAllByTitle(/Åpne drilldown/i);
    expect(drilldownButtons.length).toBeGreaterThan(0);
  });

  it('verifies that all major sectors have drilldown capability', () => {
    const { container } = render(
      <DashboardProvider initialTickers={[]}>
        <Sidebar selectedTickers={[]} onTickerToggle={vi.fn()} />
      </DashboardProvider>
    );

    const majorSectors = [
      'Teknologi', 'Helse', 'Finans', 'Eiendom', 'Infrastruktur', 
      'Konsum', 'Telekom', 'Industri', 'Forsyning', 'Obligasjoner kort', 'Obligasjoner lang',
      'Energi', 'Materialer', 'Råvarer', 'Edelmetaller'
    ];

    majorSectors.forEach(sectorName => {
      const textElement = screen.getByText(new RegExp(`^${sectorName}$`, 'i'));
      // Vi må finne den ytre div-en som inneholder både label og button
      const row = textElement.closest('div.flex.items-center.group');
      const button = row?.querySelector('button[title="Åpne drilldown"]');
      if (!button) {
        throw new Error(`Sector ${sectorName} is missing drilldown button. Row classes: ${row?.className}. Parent classes: ${textElement.parentElement?.className}`);
      }
      expect(button).toBeTruthy();
    });
  });

  it('toggles drilldown state when clicking the arrow', () => {
    render(
      <DashboardProvider initialTickers={['XLK']}>
        <Sidebar selectedTickers={['XLK']} onTickerToggle={vi.fn()} />
      </DashboardProvider>
    );

    const techText = screen.getByText(/^Teknologi$/i);
    const techRow = techText.closest('div.flex.items-center.group');
    const techButton = techRow?.querySelector('button[title="Åpne drilldown"]');
    
    if (techButton) {
      fireEvent.click(techButton);
      // Etter klikk skal tittelen endre seg til "Lukk drilldown"
      expect(techButton.getAttribute('title')).toBe('Lukk drilldown');
      // Ikonet skal ha 'rotate-90' klasse
      expect(techButton.className).toContain('rotate-90');
    } else {
      throw new Error('Tech drilldown button not found');
    }
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
