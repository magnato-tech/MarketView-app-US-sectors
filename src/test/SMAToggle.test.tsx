import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AnalysisToolbar } from '../../components/dashboard/AnalysisToolbar';
import { renderWithLang } from './helpers';

// Mock DashboardContext slik at vi kan styre analysisSettings direkte
const mockUseDashboard = vi.fn();
vi.mock('../../contexts/DashboardContext', () => ({
  useDashboard: () => mockUseDashboard(),
}));

describe('AnalysisToolbar - SMA Toggle', () => {
  const buildMockData = () => {
    let analysisSettings = { showSMA: true, smaWindow: 20, showLiquidityFlow: false };
    const setAnalysisSettings = (updater: any) => {
      analysisSettings = typeof updater === 'function' ? updater(analysisSettings) : updater;
      mockUseDashboard.mockReturnValue({ analysisSettings, setAnalysisSettings });
    };
    return { analysisSettings, setAnalysisSettings };
  };

  it('skal slå av SMA når man klikker på det aktive SMA-vinduet', () => {
    mockUseDashboard.mockReturnValue(buildMockData());

    const { rerender } = renderWithLang(<AnalysisToolbar />);

    const sma20Button = screen.getByText('20');
    expect(sma20Button).toHaveClass('bg-blue-600');

    fireEvent.click(sma20Button);
    rerender(<AnalysisToolbar />);

    expect(screen.getByText('20')).not.toHaveClass('bg-blue-600');
  });

  it('skal slå på SMA igjen når man klikker på en annen knapp', () => {
    mockUseDashboard.mockReturnValue(buildMockData());

    const { rerender } = renderWithLang(<AnalysisToolbar />);

    fireEvent.click(screen.getByText('20'));
    rerender(<AnalysisToolbar />);
    expect(screen.getByText('20')).not.toHaveClass('bg-blue-600');

    fireEvent.click(screen.getByText('50'));
    rerender(<AnalysisToolbar />);
    expect(screen.getByText('50')).toHaveClass('bg-blue-600');
    expect(screen.getByText('20')).not.toHaveClass('bg-blue-600');
  });
});
