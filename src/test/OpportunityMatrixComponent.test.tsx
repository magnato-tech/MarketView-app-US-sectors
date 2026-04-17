import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { OpportunityMatrix } from '../../components/dashboard/OpportunityMatrix';
import { RangeSummaryRow } from '../../services/analysisService';
import { DashboardProvider } from '../../contexts/DashboardContext';

// Mock useDashboard since it's used in OpportunityMatrix
vi.mock('../../contexts/DashboardContext', async () => {
  const actual = await vi.importActual('../../contexts/DashboardContext');
  return {
    ...actual,
    useDashboard: () => ({
      isDarkMode: true,
    }),
  };
});

describe('OpportunityMatrix Component', () => {
  const mockSummary: RangeSummaryRow[] = [
    {
      symbol: 'XLK',
      name: 'Technology',
      startPrice: 100,
      endPrice: 110,
      changePct: 10,
      color: 'blue',
      metrics: {
        rank: 1,
        volatility: 15,
        maxDrawdown: 5,
        trendStatus: 'Bull',
        momentumScore: 0.6,
        regime: 'Stable',
        relativeStrength: 5,
        flowScore: 25
      }
    },
    {
      symbol: 'SPY',
      name: 'S&P 500',
      startPrice: 100,
      endPrice: 105,
      changePct: 5,
      color: 'grey',
      isBenchmark: true,
      metrics: {
        rank: 2,
        volatility: 10,
        maxDrawdown: 3,
        trendStatus: 'Bull',
        momentumScore: 0.5,
        regime: 'Stable',
        relativeStrength: 0,
        flowScore: 0
      }
    }
  ];

  it('should render the matrix and data points', () => {
    render(<OpportunityMatrix summary={mockSummary} />);
    
    // Check for title
    expect(screen.getByText(/Opportunity Matrix/i)).toBeInTheDocument();
    
    // Check for quadrant labels (using getAllByText because they appear in both matrix and legend)
    expect(screen.getAllByText(/Leaders/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Improving/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Weakening/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Laggards/i).length).toBeGreaterThan(0);
    
    // Check for the ticker label (XLK should be visible, SPY should be filtered out)
    expect(screen.getByText('XLK')).toBeInTheDocument();
    expect(screen.queryByText('SPY')).not.toBeInTheDocument();
  });

  it('should show empty state if no non-benchmark tickers are provided', () => {
    render(<OpportunityMatrix summary={[mockSummary[1]]} />);
    expect(screen.getByText(/Ingen data å sammenligne/i)).toBeInTheDocument();
  });
});
