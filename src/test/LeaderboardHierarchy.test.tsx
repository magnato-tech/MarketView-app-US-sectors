import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Leaderboard } from '../../components/dashboard/Leaderboard';
import { LanguageProvider } from '../../contexts/LanguageContext';
import * as marketDataService from '../../services/marketDataService';

// Mock formatters and other utils if needed
vi.mock('../../utils/formatters', () => ({
  getStrongTrendColorClass: () => 'text-emerald-500',
}));

// Mock market data service
vi.mock('../../services/marketDataService', () => ({
  fetchMarketData: vi.fn(),
}));

const mockSummary = [
  { symbol: 'XLK', name: 'Teknologi', percentChange: 5.5, color: '#10b981', category: 'Sector' },
  { symbol: 'SOXX', name: 'Semiconductors', percentChange: 8.2, color: '#34d399', category: 'ETF' },
  { symbol: 'AAPL', name: 'Apple Inc.', percentChange: 2.1, color: '#000', category: 'Stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', percentChange: 12.5, color: '#000', category: 'Stock' },
  { symbol: 'DBC', name: 'Råvarer', percentChange: 3.2, color: '#65a30d', category: 'Sector' },
  { symbol: 'USO', name: 'Oil Fund', percentChange: 4.5, color: '#a3e635', category: 'ETF' },
  { symbol: 'EQNR', name: 'Equinor ASA', percentChange: 6.1, color: '#000', category: 'Stock' },
  { symbol: 'XOM', name: 'Exxon Mobil', percentChange: 5.8, color: '#000', category: 'Stock' },
];

const renderLeaderboard = (props: any) => {
  return render(
    <LanguageProvider>
      <Leaderboard {...props} />
    </LanguageProvider>
  );
};

describe('Leaderboard Hierarchy Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario 1: XLK winner should show SOXX as sub-winner and stocks from SOXX', async () => {
    const xlkWinnerSummary = [
      { symbol: 'XLK', name: 'Teknologi', percentChange: 10.0, color: '#10b981', category: 'Sector' },
      { symbol: 'SOXX', name: 'Semiconductors', percentChange: 12.0, color: '#34d399', category: 'ETF' },
      { symbol: 'XLV', name: 'Helse', percentChange: 2.0, color: '#0ea5e9', category: 'Sector' },
    ];

    (marketDataService.fetchMarketData as any).mockResolvedValue({
      summary: [
        { symbol: 'NVDA', name: 'NVIDIA Corp.', percentChange: 15.0 },
        { symbol: 'AVGO', name: 'Broadcom Inc.', percentChange: 10.0 },
        { symbol: 'AMD', name: 'Advanced Micro Devices', percentChange: 8.0 },
        { symbol: 'QCOM', name: 'Qualcomm Inc.', percentChange: 5.0 },
      ],
    });

    renderLeaderboard({
      summary: xlkWinnerSummary,
      rangeSummary: [],
      loading: false,
      period: '1mo',
      interval: '1d',
      allSectorsSummary: xlkWinnerSummary,
      isDarkMode: true,
    });

    // Check sector winner (main card title is usually an h3)
    const winnerTitle = screen.getAllByText('Teknologi').find(el => el.tagName === 'H3');
    expect(winnerTitle).toBeTruthy();
    
    // Use a more specific selector for the large percentage
    const mainChange = screen.getAllByText('+10%').find(el => el.className.includes('text-3xl'));
    expect(mainChange).toBeTruthy();

    // Check sub-winner (2nd gen)
    expect(screen.getByText('Semiconductors')).toBeTruthy();
    expect(screen.getByText('+12%')).toBeTruthy();

    // Check that it shows "Beholdninger" badge (stocks)
    await waitFor(() => {
      expect(screen.getByText('NVIDIA Corp.')).toBeTruthy();
      expect(screen.getByText('+15%')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('Scenario 2: DBC winner should show USO as sub-winner and stocks fallback from DBC', async () => {
    const dbcWinnerSummary = [
      { symbol: 'DBC', name: 'Råvarer', percentChange: 8.0, color: '#65a30d', category: 'Sector' },
      { symbol: 'USO', name: 'Oil Fund', percentChange: 10.0, color: '#a3e635', category: 'ETF' },
      { symbol: 'XLK', name: 'Teknologi', percentChange: 2.0, color: '#10b981', category: 'Sector' },
    ];

    // Mocking the stock data for DBC holdings (Equinor, Exxon, etc.)
    (marketDataService.fetchMarketData as any).mockResolvedValue({
      summary: [
        { symbol: 'EQNR', name: 'Equinor ASA', percentChange: 12.0 },
        { symbol: 'XOM', name: 'Exxon Mobil', percentChange: 10.0 },
        { symbol: 'SHEL', name: 'Shell plc', percentChange: 8.0 },
        { symbol: 'BP', name: 'BP plc', percentChange: 6.0 },
      ],
    });

    renderLeaderboard({
      summary: dbcWinnerSummary,
      rangeSummary: [],
      loading: false,
      period: '1mo',
      interval: '1d',
      allSectorsSummary: dbcWinnerSummary,
      isDarkMode: true,
    });

    // Check sector winner
    const winnerTitle = screen.getAllByText('Råvarer').find(el => el.tagName === 'H3');
    expect(winnerTitle).toBeTruthy();

    // Check sub-winner (2nd gen)
    expect(screen.getByText('Oil Fund')).toBeTruthy();

    // Verify it falls back to DBC stocks (Equinor etc.) because USO has no holdings in etfService
    await waitFor(() => {
      expect(screen.getByText('Equinor ASA')).toBeTruthy();
      expect(screen.getByText('+12%')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('Scenario 3: SHY winner should show BIL as sub-winner and fallback to sibling ETFs (VGSH)', async () => {
    const shyWinnerSummary = [
      { symbol: 'SHY', name: 'Obligasjoner kort', percentChange: 1.0, color: '#c084fc', category: 'Sector' },
      { symbol: 'BIL', name: '1-3 Month T-Bill', percentChange: 1.2, color: '#d8b4fe', category: 'ETF' },
      { symbol: 'VGSH', name: 'Short Treasury', percentChange: 0.8, color: '#c084fc', category: 'ETF' },
      { symbol: 'XLK', name: 'Teknologi', percentChange: 0.2, color: '#10b981', category: 'Sector' },
    ];

    renderLeaderboard({
      summary: shyWinnerSummary,
      rangeSummary: [],
      loading: false,
      period: '1mo',
      interval: '1d',
      allSectorsSummary: shyWinnerSummary,
      isDarkMode: true,
    });

    // Check sector winner
    const winnerTitle = screen.getAllByText('Obligasjoner kort').find(el => el.tagName === 'H3');
    expect(winnerTitle).toBeTruthy();

    // Check sub-winner (2nd gen)
    expect(screen.getByText('1-3 Month T-Bill')).toBeTruthy();

    // Verify it falls back to sibling ETFs because neither SHY nor BIL has holdings
    // Sibling is VGSH
    await waitFor(() => {
      expect(screen.getByText('Short Treasury')).toBeTruthy();
      expect(screen.getByText('VGSH')).toBeTruthy();
    });
  });

  it('Scenario 4: Percentage Hierarchy - Stocks should outperform their parent ETF', async () => {
    const xlkWinnerSummary = [
      { symbol: 'XLK', name: 'Teknologi', percentChange: 10.0, color: '#10b981', category: 'Sector' },
      { symbol: 'SOXX', name: 'Semiconductors', percentChange: 12.0, color: '#34d399', category: 'ETF' },
    ];

    // Mocking stock data where some stocks are lower than the ETF (which is mathematically possible
    // if other stocks in the ETF are much higher), but the TOP stocks should be higher.
    (marketDataService.fetchMarketData as any).mockResolvedValue({
      summary: [
        { symbol: 'NVDA', name: 'NVIDIA Corp.', percentChange: 15.0 },
        { symbol: 'AVGO', name: 'Broadcom Inc.', percentChange: 13.0 },
        { symbol: 'AMD', name: 'Advanced Micro Devices', percentChange: 11.0 },
        { symbol: 'QCOM', name: 'Qualcomm Inc.', percentChange: 9.0 },
      ],
    });

    renderLeaderboard({
      summary: xlkWinnerSummary,
      rangeSummary: [],
      loading: false,
      period: '1mo',
      interval: '1d',
      allSectorsSummary: xlkWinnerSummary,
      isDarkMode: true,
    });

    // Check sector winner (10%)
    const mainChange = screen.getAllByText('+10%').find(el => el.className.includes('text-3xl'));
    expect(mainChange).toBeTruthy();

    // Check sub-winner (12%)
    expect(screen.getByText('+12%')).toBeTruthy();

    // The top 4 stocks shown should be sorted by performance.
    // In our mock, NVDA (15%) and AVGO (13%) are > 12%.
    // AMD (11%) and QCOM (9%) are < 12%.
    // The user's point is that if the ETF is up 81%, the BEST stocks MUST be up > 81%.
    
    await waitFor(() => {
      const stockChanges = screen.getAllByText(/\+\d+\.?\d*%/).map(el => el.textContent);
      // We expect to find +15% and +13% in the list
      expect(stockChanges).toContain('+15%');
      expect(stockChanges).toContain('+13%');
      
      // Verify sorting: the first stock should be the best one (15%)
      const firstStockPerf = screen.getAllByText('+15%').find(el => el.className.includes('text-xs'));
      expect(firstStockPerf).toBeTruthy();

      // IMPORTANT: Verify the hierarchy rule
      // If ETF is 12%, at least some of the top 4 MUST be >= 12%
      const percentages = stockChanges.map(s => parseFloat(s!.replace('+', '').replace('%', '')));
      const etfPct = 12.0;
      const hasOutperformer = percentages.some(p => p >= etfPct);
      expect(hasOutperformer).toBe(true);
    });
  });
});
