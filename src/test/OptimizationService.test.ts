import { describe, it, expect, vi } from 'vitest';
import { optimizeBotConfig } from '../../services/optimizationService';
import { BotConfig } from '../../types';

describe('optimizationService', () => {
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
      kpiWeights: { momentum: 0.8, rsi: 0.1, pe: 0.1 }
    },
    stopLossModule: {
      type: 'Dynamic_Excel_Optimizer',
      optimizationRange: [0.01, 0.8],
      stepInterval: 0.01,
      lookbackPeriodMonths: 12,
      currentOptimalSl: 0.1
    },
    swapLogic: { enabled: true, alphaBufferPercent: 10, rebalanceDay: 'Monday' },
    riskManagement: { maxRiskPerTradePercent: 10, maxPortfolioDrawdown: 15, emergencyExitEnabled: true }
  };

  const mockData = Array.from({ length: 100 }, (_, i) => ({
    timestamp: `2026-01-${i + 1}`,
    AAPL: 100 + i, // Steady growth
    '^VIX': 20
  }));

  const symbols = ['AAPL'];

  it('should find better configuration when parameters are unlocked', async () => {
    const params = {
      smaRange: [20, 50],
      momentumRange: [14, 21],
      weightStep: 0.1,
      lockedParams: { sma: false, momentum: false, weights: false }
    };

    const optimized = await optimizeBotConfig(mockConfig, mockData, symbols, params);
    
    expect(optimized).toBeDefined();
    // Since data is steady growth, it should ideally find a config that stays in
    expect(optimized.entryLogic.primarySma).toBeDefined();
  });

  it('should respect locked parameters', async () => {
    const params = {
      smaRange: [10, 20, 100],
      momentumRange: [5, 10, 60],
      weightStep: 0.1,
      lockedParams: { sma: true, momentum: true, weights: true }
    };

    const optimized = await optimizeBotConfig(mockConfig, mockData, symbols, params);
    
    expect(optimized.entryLogic.primarySma).toBe(mockConfig.entryLogic.primarySma);
    expect(optimized.entryLogic.momentumPeriodDays).toBe(mockConfig.entryLogic.momentumPeriodDays);
    expect(optimized.entryLogic.kpiWeights).toEqual(mockConfig.entryLogic.kpiWeights);
  });

  it('should report progress', async () => {
    const onProgress = vi.fn();
    const params = {
      smaRange: [20, 50],
      momentumRange: [14, 21],
      weightStep: 0.1,
      lockedParams: { sma: false, momentum: false, weights: false }
    };

    await optimizeBotConfig(mockConfig, mockData, symbols, params, onProgress);
    
    expect(onProgress).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(expect.any(Number));
  });
});
