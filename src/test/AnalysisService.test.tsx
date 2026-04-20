import { describe, it, expect } from 'vitest';
import { calculateRangeSummary } from '../../services/analysisService';
import { MarketDataPoint, SummaryStats } from '../../types';

describe('analysisService – calculateRangeSummary metrics', () => {
  it('should calculate flowScore correctly', () => {
    const mockData: MarketDataPoint[] = [
      { timestamp: '2026-01-01', XLK: 100, XLK_dollar_volume: 1000, total_dollar_volume: 1000 },
      { timestamp: '2026-01-02', XLK: 101, XLK_dollar_volume: 1100, total_dollar_volume: 1100 },
      { timestamp: '2026-01-03', XLK: 102, XLK_dollar_volume: 1200, total_dollar_volume: 1200 },
      { timestamp: '2026-01-04', XLK: 103, XLK_dollar_volume: 1300, total_dollar_volume: 1300 },
      { timestamp: '2026-01-05', XLK: 104, XLK_dollar_volume: 1400, total_dollar_volume: 1400 },
      { timestamp: '2026-01-06', XLK: 105, XLK_dollar_volume: 2000, total_dollar_volume: 2000 }, // Significant jump
    ];

    const mockSummary: SummaryStats[] = [
      { symbol: 'XLK', name: 'Technology', color: 'blue', percentChange: 5, price: 105, change: 5 }
    ];

    const result = calculateRangeSummary(mockData, mockSummary);
    const metrics = result[0].metrics;

    expect(metrics).toBeDefined();
    expect(metrics?.flowScore).toBeDefined();
    // baselineVol = 1000. 
    // recentVol (last 5) = (1100+1200+1300+1400+2000)/5 = 1400
    // flowScore = (1400 - 1000) / 1000 * 100 = 40
    expect(metrics?.flowScore).toBeCloseTo(40, 1);
  });
});
