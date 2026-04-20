import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AnalysisBoard } from '../../components/AnalysisBoard';
import { renderWithLang } from './helpers';

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  ComposedChart: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  Bar: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

// Mock DashboardContext
const mockUseDashboard = vi.fn();
vi.mock('../../contexts/DashboardContext', () => ({
  useDashboard: () => mockUseDashboard(),
}));

describe('AnalysisBoard - SMA Toggle (Punkt 1)', () => {
  // analysisSettings/setAnalysisSettings is read by AnalysisBoard via useDashboard.
  // We use a real React state variable via a closure so the toggle reflects across renders.
  const buildMockData = () => {
    let analysisSettings = { showSMA: true, smaWindow: 20, showLiquidityFlow: false };
    const setAnalysisSettings = (updater: any) => {
      analysisSettings = typeof updater === 'function' ? updater(analysisSettings) : updater;
      mockUseDashboard.mockReturnValue({ ...base, analysisSettings, setAnalysisSettings });
    };
    const base = {
      data: [{ timestamp: 'Jan 1', AAPL: 100 }],
      summary: [{ symbol: 'AAPL', name: 'Apple', percentChange: 5, color: '#ff0000' }],
      aiInsight: 'Test insight',
      period: '6mo',
      activeTickers: ['AAPL'],
      analysisSettings,
      setAnalysisSettings,
    };
    return base;
  };

  it('skal slå av SMA når man klikker på det aktive SMA-vinduet', () => {
    mockUseDashboard.mockReturnValue(buildMockData());

    const { rerender } = renderWithLang(<AnalysisBoard />);

    const sma20Button = screen.getByText('20');
    expect(sma20Button).toHaveClass('bg-blue-600');

    fireEvent.click(sma20Button);
    rerender(<AnalysisBoard />);

    expect(screen.getByText('20')).not.toHaveClass('bg-blue-600');
  });

  it('skal slå på SMA igjen når man klikker på en annen knapp', () => {
    mockUseDashboard.mockReturnValue(buildMockData());

    const { rerender } = renderWithLang(<AnalysisBoard />);

    fireEvent.click(screen.getByText('20'));
    rerender(<AnalysisBoard />);
    expect(screen.getByText('20')).not.toHaveClass('bg-blue-600');

    fireEvent.click(screen.getByText('50'));
    rerender(<AnalysisBoard />);
    expect(screen.getByText('50')).toHaveClass('bg-blue-600');
    expect(screen.getByText('20')).not.toHaveClass('bg-blue-600');
  });
});
