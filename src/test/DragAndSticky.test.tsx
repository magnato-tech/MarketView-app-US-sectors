import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MainLineChart } from '../../components/dashboard/MainLineChart';
import { MarketDataPoint } from '../../types';

// Simple mock for Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children, onMouseDown, onMouseMove, onMouseUp }: any) => {
    return (
      <div 
        data-testid="recharts-linechart"
        onMouseDown={(e: any) => onMouseDown?.({ activeTooltipIndex: e.activeTooltipIndex, ...e })}
        onMouseMove={(e: any) => onMouseMove?.({ activeTooltipIndex: e.activeTooltipIndex, ...e })}
        onMouseUp={(e: any) => onMouseUp?.({ activeTooltipIndex: e.activeTooltipIndex, ...e })}
      >
        {children}
      </div>
    );
  },
  Tooltip: ({ content, active, payload, label, rangeSelection, anchorIndex }: any) => {
    // If Recharts doesn't pass these, we might need to find where they come from
    return (
      <div data-testid="recharts-tooltip">
        {content({ active: true, payload, label, rangeSelection, anchorIndex })}
      </div>
    );
  },
  ReferenceArea: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
}));

const mockData: MarketDataPoint[] = Array.from({ length: 10 }, (_, i) => ({
  timestamp: `2024-01-0${i + 1}`,
  '^GSPC': 100 + i,
  'XLK': 100 + i * 2,
}));

describe('MainLineChart - Drag-to-Select and Sticky Tooltip', () => {
  it('should handle drag-to-select and show reference area', () => {
    const mockOnTooltipContent = vi.fn(() => <div>Tooltip</div>);
    render(
      <MainLineChart 
        data={mockData} 
        activeTickers={['XLK']} 
        onTooltipContent={mockOnTooltipContent}
      />
    );

    const chart = screen.getByTestId('recharts-linechart');

    // 1. Start drag at index 0
    fireEvent.mouseDown(chart, { activeTooltipIndex: 0 });
    
    // 2. Move to index 5
    fireEvent.mouseMove(chart, { activeTooltipIndex: 5 });

    // Check if onTooltipContent was called with rangeSelection
    expect(mockOnTooltipContent).toHaveBeenCalledWith(
      expect.objectContaining({
        rangeSelection: expect.objectContaining({
          rangeStart: 0,
          rangeEnd: 5
        })
      })
    );
  });

  it('should lock tooltip (sticky) on click after drag', () => {
    const mockOnTooltipContent = vi.fn(() => <div>Tooltip</div>);
    render(
      <MainLineChart 
        data={mockData} 
        activeTickers={['XLK']} 
        onTooltipContent={mockOnTooltipContent}
      />
    );

    const chart = screen.getByTestId('recharts-linechart');

    // Simulate a simple click at index 5
    fireEvent.mouseDown(chart, { activeTooltipIndex: 5 });
    fireEvent.mouseUp(chart, { activeTooltipIndex: 5 });

    // Check if onTooltipContent was called with anchorIndex: 5
    expect(mockOnTooltipContent).toHaveBeenCalledWith(
      expect.objectContaining({
        anchorIndex: 5
      })
    );
  });

  it('should clear selection and sticky tooltip when "Nullstill valg" is clicked', () => {
    const mockOnTooltipContent = vi.fn(() => <div>Tooltip</div>);
    render(
      <MainLineChart 
        data={mockData} 
        activeTickers={['XLK']} 
        onTooltipContent={mockOnTooltipContent}
      />
    );

    const chart = screen.getByTestId('recharts-linechart');

    // 1. Create a selection
    fireEvent.mouseDown(chart, { activeTooltipIndex: 0 });
    fireEvent.mouseMove(chart, { activeTooltipIndex: 5 });
    fireEvent.mouseUp(chart, { activeTooltipIndex: 5 });

    // 2. Find and click the reset button
    const resetBtn = screen.getByText(/Nullstill valg/i);
    fireEvent.click(resetBtn);

    // 3. Verify selection is cleared
    expect(mockOnTooltipContent).toHaveBeenCalledWith(
      expect.objectContaining({
        rangeSelection: null,
        anchorIndex: null
      })
    );
  });
});
