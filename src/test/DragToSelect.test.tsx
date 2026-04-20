import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MainLineChart } from '../../components/dashboard/MainLineChart';
import { ChartTooltip } from '../../components/dashboard/ChartTooltip';
import { renderWithLang } from './helpers';

// Mock Recharts since it's hard to test SVG-based charts in JSDOM
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    ComposedChart: ({ children, onMouseDown, onMouseMove, onMouseUp }: any) => (
      <div 
        data-testid="line-chart" 
        onMouseDown={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onMouseDown?.({ activeTooltipIndex: 0, chartX: 0, chartY: 0 });
        }}
        onMouseMove={(e) => {
          onMouseMove?.({ activeTooltipIndex: 5, chartX: 100, chartY: 100 });
        }}
        onMouseUp={() => onMouseUp?.()}
      >
        {children}
      </div>
    ),
    LineChart: ({ children, onMouseDown, onMouseMove, onMouseUp }: any) => (
      <div 
        data-testid="line-chart" 
        onMouseDown={(e) => {
          onMouseDown?.({ activeTooltipIndex: 0, chartX: 0, chartY: 0 });
        }}
        onMouseMove={(e) => {
          onMouseMove?.({ activeTooltipIndex: 5, chartX: 100, chartY: 100 });
        }}
        onMouseUp={() => onMouseUp?.()}
      >
        {children}
      </div>
    ),
    ReferenceArea: ({ x1, x2 }: any) => <div data-testid="reference-area" data-x1={x1} data-x2={x2} />,
    Bar: ({ children }: any) => <div>{children}</div>,
    Cell: () => null,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Legend: () => null,
  };
});

// Mock DashboardContext
vi.mock('../../contexts/DashboardContext', () => ({
  useDashboard: () => ({
    activeTab: 'dashboard',
    setActiveTab: vi.fn(),
  }),
}));

describe('MainLineChart - Drag to Select (Punkt 2)', () => {
  const mockData = [
    { timestamp: 'Jan 1', AAPL: 100, MSFT: 200 },
    { timestamp: 'Jan 2', AAPL: 105, MSFT: 205 },
    { timestamp: 'Jan 3', AAPL: 110, MSFT: 210 },
    { timestamp: 'Jan 4', AAPL: 115, MSFT: 215 },
    { timestamp: 'Jan 5', AAPL: 120, MSFT: 220 },
    { timestamp: 'Jan 6', AAPL: 125, MSFT: 225 },
  ];

  it('skal vise ReferenceArea når man drar i grafen', () => {
    const onTooltipContent = vi.fn(() => null);
    renderWithLang(
      <MainLineChart 
        data={mockData} 
        activeTickers={['AAPL']} 
        onTooltipContent={onTooltipContent} 
      />
    );

    const chart = screen.getByTestId('line-chart');

    // Simuler drag: MouseDown på index 0, MouseMove til index 5
    fireEvent.mouseDown(chart);
    fireEvent.mouseMove(chart);

    const refArea = screen.getByTestId('reference-area');
    expect(refArea).toBeInTheDocument();
    expect(refArea.getAttribute('data-x1')).toBe('Jan 1');
    expect(refArea.getAttribute('data-x2')).toBe('Jan 6');
  });

  it('skal vise "Nullstill valg" knapp etter at man har dratt ferdig', () => {
    const onTooltipContent = vi.fn(() => null);
    renderWithLang(
      <MainLineChart 
        data={mockData} 
        activeTickers={['AAPL']} 
        onTooltipContent={onTooltipContent} 
      />
    );

    const chart = screen.getByTestId('line-chart');

    fireEvent.mouseDown(chart);
    fireEvent.mouseMove(chart);
    fireEvent.mouseUp(chart);

    expect(screen.getByText('Nullstill valg')).toBeInTheDocument();
  });

  it('skal fjerne markering når man klikker på "Nullstill valg"', () => {
    const onTooltipContent = vi.fn(() => null);
    renderWithLang(
      <MainLineChart 
        data={mockData} 
        activeTickers={['AAPL']} 
        onTooltipContent={onTooltipContent} 
      />
    );

    const chart = screen.getByTestId('line-chart');

    fireEvent.mouseDown(chart);
    fireEvent.mouseMove(chart);
    fireEvent.mouseUp(chart);

    const resetButton = screen.getByText('Nullstill valg');
    fireEvent.click(resetButton);

    expect(screen.queryByTestId('reference-area')).not.toBeInTheDocument();
    expect(screen.queryByText('Nullstill valg')).not.toBeInTheDocument();
  });
});

describe('ChartTooltip - Range Calculation (Punkt 2)', () => {
  const mockData = [
    { timestamp: 'Jan 1', AAPL: 10, MSFT: 20 }, // AAPL: +10% fra start
    { timestamp: 'Jan 2', AAPL: 15, MSFT: 25 },
    { timestamp: 'Jan 3', AAPL: 20, MSFT: 30 },
    { timestamp: 'Jan 4', AAPL: 25, MSFT: 35 },
    { timestamp: 'Jan 5', AAPL: 30, MSFT: 40 },
    { timestamp: 'Jan 6', AAPL: 40, MSFT: 50 }, // AAPL: +40% fra start
  ];

  it('skal beregne korrekt utvikling i et valgt område', () => {
    const rangeSelection = {
      rangeStart: 0, // Jan 1 (10%)
      rangeEnd: 5,   // Jan 6 (40%)
      anchorIdx: 0
    };

    const payload = [
      { dataKey: 'AAPL', name: 'Apple', value: 40, color: '#ff0000' }
    ];

    renderWithLang(
      <ChartTooltip 
        active={true} 
        payload={payload} 
        label="Jan 6" 
        data={mockData} 
        anchorIndex={null} 
        rangeSelection={rangeSelection}
      />
    );

    // Utvikling skal være 40% - 10% = +30.00%
    expect(screen.getByText('Periodevalg')).toBeInTheDocument();
    expect(screen.getByText('Utvikling fra Jan 1')).toBeInTheDocument();
    expect(screen.getByText('+30.00%')).toBeInTheDocument();
  });
});
