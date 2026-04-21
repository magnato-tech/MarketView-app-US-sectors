import { describe, it, expect } from 'vitest';
import { calculateStrategyScore, processBotLogic } from '../../services/quantEngineService';
import { BotConfig, BotState, SummaryStats } from '../../types';

describe('quantEngineService', () => {
  describe('calculateStrategyScore', () => {
    it('should calculate score based on weights', () => {
      const stats: SummaryStats = {
        symbol: 'AAPL',
        name: 'Apple',
        lastPrice: 150,
        percentChange: 2, // (2 + 5) * 10 = 70 momentum score
        color: 'blue',
        rsi: 30, // 100 - 30 = 70 rsi score
        peRatio: 15, // 100 - (15 * 2) = 70 pe score
      };

      const weights = { momentum: 0.5, rsi: 0.3, pe: 0.2 };
      const score = calculateStrategyScore(stats, weights);

      // (70 * 0.5) + (70 * 0.3) + (70 * 0.2) = 35 + 21 + 14 = 70
      expect(score).toBeCloseTo(70, 1);
    });

    it('should handle missing indicators with default scores', () => {
      const stats: SummaryStats = {
        symbol: 'AAPL',
        name: 'Apple',
        lastPrice: 150,
        percentChange: 0,
        color: 'blue',
      };

      const weights = { momentum: 1, rsi: 0, pe: 0 };
      const score = calculateStrategyScore(stats, weights);
      
      // momentum score = (0 + 5) * 10 = 50
      expect(score).toBe(50);
    });
  });

  describe('processBotLogic', () => {
    const mockConfig: BotConfig = {
      id: 'test-bot',
      name: 'Test Bot',
      version: '1.0',
      mode: 'Advanced',
      enabled: true,
      entryLogic: {
        vixFilterEnabled: true,
        vixThreshold: 25,
        primarySma: 50,
        secondarySma: 200,
        momentumPeriodDays: 21,
        minRelativeStrengthScore: 60,
        kpiWeights: { momentum: 1, rsi: 0, pe: 0 }
      },
      stopLossModule: {
        type: 'Dynamic_Excel_Optimizer',
        optimizationRange: [0.01, 0.8],
        stepInterval: 0.01,
        lookbackPeriodMonths: 12,
        currentOptimalSl: 0.1 // 10% stop loss
      },
      swapLogic: { enabled: true, alphaBufferPercent: 10, rebalanceDay: 'Monday' },
      riskManagement: { maxRiskPerTradePercent: 20, maxPortfolioDrawdown: 15, emergencyExitEnabled: true }
    };

    const initialState: BotState = {
      botId: 'test-bot',
      balance: 100000,
      positions: [],
      history: [],
      performance: { totalReturn: 0, dailyReturns: [], sharpeRatio: 0, maxDrawdown: 0 }
    };

    it('should trigger VIX exit when threshold is exceeded', () => {
      const stateWithPosition: BotState = {
        ...initialState,
        positions: [{ symbol: 'AAPL', quantity: 10, averagePrice: 100, highestPriceSinceEntry: 100 }]
      };

      const marketSummary: SummaryStats[] = [
        { symbol: 'AAPL', name: 'Apple', lastPrice: 105, percentChange: 0, color: 'blue' }
      ];

      const { newState, trades } = processBotLogic(mockConfig, stateWithPosition, marketSummary, 30); // VIX 30 > 25

      expect(trades.length).toBe(1);
      expect(trades[0].type).toBe('SELL');
      expect(trades[0].reason).toContain('VIX');
      expect(newState.positions.length).toBe(0);
      expect(newState.balance).toBe(100000 + (10 * 105));
    });

    it('should trigger Stop-loss exit when price drops', () => {
      const stateWithPosition: BotState = {
        ...initialState,
        positions: [{ symbol: 'AAPL', quantity: 10, averagePrice: 100, highestPriceSinceEntry: 100 }]
      };

      const marketSummary: SummaryStats[] = [
        { symbol: 'AAPL', name: 'Apple', lastPrice: 85, percentChange: -15, color: 'blue' } // 85 < 90 (10% SL)
      ];

      const { newState, trades } = processBotLogic(mockConfig, stateWithPosition, marketSummary, 20); // VIX 20 < 25

      expect(trades.length).toBe(1);
      expect(trades[0].type).toBe('SELL');
      expect(trades[0].reason).toContain('Stop-loss');
      expect(newState.positions.length).toBe(0);
    });

    it('should buy when score is above threshold and trend is positive', () => {
      const marketSummary: SummaryStats[] = [
        { 
          symbol: 'AAPL', 
          name: 'Apple', 
          lastPrice: 110, 
          percentChange: 10, // Score will be (10+5)*10 = 150 (capped at 100)
          color: 'blue',
          sma50: 100 // Price 110 > SMA 100
        }
      ];

      const { newState, trades } = processBotLogic(mockConfig, initialState, marketSummary, 20);

      expect(trades.length).toBe(1);
      expect(trades[0].type).toBe('BUY');
      expect(newState.positions.length).toBe(1);
      expect(newState.positions[0].symbol).toBe('AAPL');
    });

    it('should NOT buy when price is below SMA', () => {
      const marketSummary: SummaryStats[] = [
        { 
          symbol: 'AAPL', 
          name: 'Apple', 
          lastPrice: 90, 
          percentChange: 10,
          color: 'blue',
          sma50: 100 // Price 90 < SMA 100
        }
      ];

      const { newState, trades } = processBotLogic(mockConfig, initialState, marketSummary, 20);

      expect(trades.length).toBe(0);
      expect(newState.positions.length).toBe(0);
    });
  });
});
