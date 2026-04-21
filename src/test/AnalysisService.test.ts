import { describe, it, expect } from 'vitest';
import { calculateVolatility, calculateMaxDrawdown, calculateSMA, simulateTrailingStop, findOptimalStopLoss } from '../../services/analysisService';

describe('analysisService', () => {
  describe('calculateVolatility', () => {
    it('should calculate volatility for a stable series', () => {
      const prices = [100, 100, 100, 100, 100];
      expect(calculateVolatility(prices)).toBe(0);
    });

    it('should calculate higher volatility for varying prices', () => {
      const prices = [100, 110, 90, 120, 80];
      const vol = calculateVolatility(prices);
      expect(vol).toBeGreaterThan(0);
      expect(vol).toBeLessThan(1000); // Reasonable range
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('should be 0 for ever-increasing prices', () => {
      const prices = [100, 110, 120, 130];
      expect(calculateMaxDrawdown(prices)).toBe(0);
    });

    it('should calculate correct drawdown for a dip', () => {
      const prices = [100, 120, 90, 110]; // Peak 120, trough 90
      // DD = (90 - 120) / 120 = -0.25 = 25%
      expect(calculateMaxDrawdown(prices)).toBe(25);
    });
  });

  describe('calculateSMA', () => {
    it('should return nulls for insufficient data', () => {
      const data = [10, 20];
      const result = calculateSMA(data, 3);
      expect(result).toEqual([null, null]);
    });

    it('should calculate correct averages', () => {
      const data = [10, 20, 30, 40];
      const result = calculateSMA(data, 3);
      // [null, null, (10+20+30)/3, (20+30+40)/3]
      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
      expect(result[2]).toBe(20);
      expect(result[3]).toBe(30);
    });
  });

  describe('simulateTrailingStop', () => {
    it('should exit when price hits stop level', () => {
      const prices = [
        { open: 100, high: 100, low: 100, close: 100 },
        { open: 100, high: 100, low: 85, close: 85 }, // 85 < 90 (10% SL from 100)
        { open: 90, high: 90, low: 90, close: 90 }  // Re-entry at 90
      ];
      // Day 0: Entry 100, Highest 100.
      // Day 1: Stop 90. Low 85 hits 90. Exit 90. Return = 0.9. inPosition = false.
      // Day 2: inPosition is false. Re-entry: entryPrice = 90, highestPrice = 90, inPosition = true.
      // End: inPosition is true. Return *= (90/90) = 0.9.
      // Total Return = (0.9 - 1) * 100 = -10%
      const profit = simulateTrailingStop(prices, 0.1);
      expect(profit).toBeCloseTo(-10, 1);
    });

    it('should update stop level as price increases', () => {
      const prices = [
        { open: 100, high: 100, low: 100, close: 100 },
        { open: 100, high: 200, low: 195, close: 200 }, // Peak 200, SL at 180
        { open: 200, high: 200, low: 170, close: 170 }, // Hits 170, Exit 180
        { open: 180, high: 180, low: 180, close: 180 }  // Re-entry at 180
      ];
      // Day 0: Entry 100, Highest 100.
      // Day 1: Stop 90. Low 195 > 90. Highest becomes 200.
      // Day 2: Stop 180. Low 170 hits 180. Exit 180. Return = 1.8. inPosition = false.
      // Day 3: inPosition is false. Re-entry: entryPrice = 180, highestPrice = 180, inPosition = true.
      // End: inPosition is true. Return *= (180/180) = 1.8.
      // Total Return = (1.8 - 1) * 100 = 80%
      const profit = simulateTrailingStop(prices, 0.1);
      expect(profit).toBeCloseTo(80, 1);
    });
  });

  describe('findOptimalStopLoss', () => {
    it('should find the best SL percentage', () => {
      const prices = [
        { open: 100, high: 110, low: 95, close: 105 },
        { open: 105, high: 120, low: 100, close: 115 },
        { open: 115, high: 130, low: 110, close: 125 }
      ];
      const result = findOptimalStopLoss(prices);
      expect(result.optimalSL).toBeDefined();
      expect(result.curve.length).toBeGreaterThan(0);
    });
  });
});
