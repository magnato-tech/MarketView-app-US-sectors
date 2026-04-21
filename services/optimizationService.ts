import { BotConfig, BotState, SummaryStats } from '../types';
import { processBotLogic } from './quantEngineService';
import { calculateSMA } from './analysisService';
import { fastSimulate } from './backtestService';

export interface OptimizationParams {
  smaRange: number[];
  momentumRange: number[];
  weightStep: number;
  lockedParams: {
    sma?: boolean;
    momentum?: boolean;
    weights?: boolean;
    stopLoss?: boolean;
  };
}

/**
 * Brute Force optimaliseringstjeneste.
 * Itererer gjennom parameterrommet for å finne den beste konfigurasjonen.
 */
export const optimizeBotConfig = async (
  currentConfig: BotConfig,
  data: any[],
  symbols: string[],
  params: OptimizationParams,
  onProgress?: (progress: number) => void
): Promise<BotConfig> => {
  let bestConfig = { ...currentConfig };
  let maxProfit = -Infinity;

  const totalSteps = (params.lockedParams.sma ? 1 : params.smaRange.length) *
                     (params.lockedParams.momentum ? 1 : params.momentumRange.length) *
                     (params.lockedParams.weights ? 1 : 10); // Forenklet vekting-steg

  let currentStep = 0;

  // Pre-kalkuler alle SMA-kombinasjoner for å spare tid i loopen
  const technicalsCache: Record<number, Record<string, { sma: (number | null)[], rsi: number[] }>> = {};
  
  const getTechnicals = (smaPeriod: number) => {
    if (technicalsCache[smaPeriod]) return technicalsCache[smaPeriod];
    
    const tech: Record<string, { sma: (number | null)[], rsi: number[] }> = {};
    symbols.forEach(sym => {
      const prices = data.map(d => d[sym] as number).filter(v => !isNaN(v));
      tech[sym] = {
        sma: calculateSMA(prices, smaPeriod),
        rsi: prices.map((_, idx) => 50) // Forenklet RSI for nå for å øke hastighet
      };
    });
    technicalsCache[smaPeriod] = tech;
    return tech;
  };

  const smaOptions = params.lockedParams.sma ? [currentConfig.entryLogic.primarySma] : params.smaRange;
  const momOptions = params.lockedParams.momentum ? [currentConfig.entryLogic.momentumPeriodDays] : params.momentumRange;

  for (const sma of smaOptions) {
    const technicals = getTechnicals(sma);
    
    for (const mom of momOptions) {
      // For vekting kjører vi en forenklet brute force (3 hovedkombinasjoner hvis låst, ellers flere)
      const weightConfigs = params.lockedParams.weights 
        ? [currentConfig.entryLogic.kpiWeights]
        : [
            { momentum: 0.8, rsi: 0.1, pe: 0.1 },
            { momentum: 0.5, rsi: 0.3, pe: 0.2 },
            { momentum: 0.3, rsi: 0.4, pe: 0.3 },
            { momentum: 0.1, rsi: 0.1, pe: 0.8 }
          ];

      for (const weights of weightConfigs) {
        currentStep++;
        if (onProgress) onProgress((currentStep / totalSteps) * 100);

        const testConfig: BotConfig = {
          ...currentConfig,
          entryLogic: {
            ...currentConfig.entryLogic,
            primarySma: sma,
            momentumPeriodDays: mom,
            kpiWeights: weights
          }
        };

        const profit = fastSimulate(testConfig, data, technicals, symbols);

        if (profit > maxProfit) {
          maxProfit = profit;
          bestConfig = { ...testConfig };
        }
        
        // Gi UI-tråden en sjanse til å puste
        if (currentStep % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
  }

  return bestConfig;
};
