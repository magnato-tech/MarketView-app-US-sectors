import { describe, it, expect } from 'vitest';
import { calculateRangeSummary } from '../../services/analysisService';
import { MarketDataPoint, SummaryStats } from '../../types';

describe('OpportunityMatrix Metrics', () => {
  it('should calculate flowScore correctly', () => {
    const mockData: MarketDataPoint[] = [
      { timestamp: '2026-01-01', XLK: 100, XLK_dollar_volume: 1000, total_dollar_volume: 1000 },
      { timestamp: '2026-01-02', XLK: 101, XLK_dollar_volume: 1100, total_dollar_volume: 1100 },
      { timestamp: '2026-01-03', XLK: 102, XLK_dollar_volume: 1200, total_dollar_volume: 1200 },
      { timestamp: '2026-01-04', XLK: 103, XLK_dollar_volume: 2000, total_dollar_volume: 2000 }, // Significant jump
    ];

    const mockSummary: SummaryStats[] = [
      { symbol: 'XLK', name: 'Technology', color: 'blue', percentChange: 3, price: 103, change: 3 }
    ];

    const result = calculateRangeSummary(mockData, mockSummary);
    const metrics = result[0].metrics;

    expect(metrics).toBeDefined();
    expect(metrics?.flowScore).toBeDefined();
    // baselineVol = 1000. recentVol (last 3) = (1100+1200+2000)/3 = 1433.33
    // flowScore = (1433.33 - 1000) / 1000 * 100 = 43.33
    expect(metrics?.flowScore).toBeCloseTo(43.33, 1);
  });
});
