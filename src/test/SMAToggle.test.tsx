import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AnalysisBoard } from '../../components/AnalysisBoard';

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
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
  const mockData = {
    data: [{ timestamp: 'Jan 1', AAPL: 100 }],
    summary: [{ symbol: 'AAPL', name: 'Apple', percentChange: 5, color: '#ff0000' }],
    aiInsight: 'Test insight',
    period: '6mo',
    activeTickers: ['AAPL'],
  };

  it('skal slå av SMA når man klikker på det aktive SMA-vinduet', () => {
    mockUseDashboard.mockReturnValue(mockData);
    
    render(<AnalysisBoard />);

    // Finn knappen for SMA 20 (standard er 20 i koden)
    const sma20Button = screen.getByText('20');
    
    // Sjekk at den har aktiv klasse (bg-blue-600)
    expect(sma20Button).toHaveClass('bg-blue-600');

    // Klikk på den aktive knappen for å slå av
    fireEvent.click(sma20Button);

    // Sjekk at den ikke lenger har aktiv klasse
    expect(sma20Button).not.toHaveClass('bg-blue-600');
  });

  it('skal slå på SMA igjen når man klikker på en annen knapp', () => {
    mockUseDashboard.mockReturnValue(mockData);
    
    render(<AnalysisBoard />);

    const sma20Button = screen.getByText('20');
    const sma50Button = screen.getByText('50');

    // Klikk på 20 for å slå av
    fireEvent.click(sma20Button);
    expect(sma20Button).not.toHaveClass('bg-blue-600');

    // Klikk på 50 for å slå på 50
    fireEvent.click(sma50Button);
    expect(sma50Button).toHaveClass('bg-blue-600');
    expect(sma20Button).not.toHaveClass('bg-blue-600');
  });
});
