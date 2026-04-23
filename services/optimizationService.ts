import { BotConfig, BotState, SummaryStats } from '../types';
import { processBotLogic } from './quantEngineService';
import { calculateSMA } from './analysisService';
import { fastSimulate } from './backtestService';
import { OllamaClient } from '../lib/factory/ollama/OllamaClient';

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
  useAI?: boolean;
}

/**
 * AI-basert optimalisering ved bruk av Ollama.
 */
const optimizeWithAI = async (
  currentConfig: BotConfig,
  currentProfit: number,
  symbols: string[],
  onProgress?: (progress: number) => void
): Promise<BotConfig> => {
  const ollama = new OllamaClient();
  
  const prompt = `
    Du er en Senior Quant Researcher. Vi har en trading-bot med følgende konfigurasjon:
    - SMA Periode: ${currentConfig.entryLogic.primarySma}
    - Momentum Dager: ${currentConfig.entryLogic.momentumPeriodDays}
    - Stop Loss: ${currentConfig.entryLogic.stopLossModule.currentOptimalSl * 100}%
    - Vekting: Momentum=${currentConfig.entryLogic.kpiWeights.momentum}, RSI=${currentConfig.entryLogic.kpiWeights.rsi}, PE=${currentConfig.entryLogic.kpiWeights.pe}

    Nåværende avkastning i backtest: ${currentProfit.toFixed(2)}%

    Foreslå en forbedret konfigurasjon for å øke avkastningen og redusere risiko.
    Returner KUN JSON med feltene reasoning og patch.
    Patch skal være et array med endringer: {componentId, paramKey, value}.
    Gyldige componentIds: 'TREND_SMA', 'MOMENTUM', 'STOP_LOSS', 'WEIGHTS'.
    Gyldige paramKeys: 'fastPeriod' (10-200), 'days' (5-60), 'threshold' (0.01-0.5), 'momentum' (0-1), 'rsi' (0-1), 'pe' (0-1).
  `;

  try {
    if (onProgress) onProgress(50);
    const result = await ollama.generateMutation({ prompt, timeoutMs: 60000 });
    
    let nextConfig = { ...currentConfig };
    result.proposals.forEach(p => {
      if (p.componentId === 'TREND_SMA' && p.paramKey === 'fastPeriod') {
        nextConfig.entryLogic.primarySma = Number(p.value);
      } else if (p.componentId === 'MOMENTUM' && p.paramKey === 'days') {
        nextConfig.entryLogic.momentumPeriodDays = Number(p.value);
      } else if (p.componentId === 'STOP_LOSS' && p.paramKey === 'threshold') {
        nextConfig.entryLogic.stopLossModule.currentOptimalSl = Number(p.value);
      } else if (p.componentId === 'WEIGHTS') {
        if (p.paramKey === 'momentum') nextConfig.entryLogic.kpiWeights.momentum = Number(p.value);
        if (p.paramKey === 'rsi') nextConfig.entryLogic.kpiWeights.rsi = Number(p.value);
        if (p.paramKey === 'pe') nextConfig.entryLogic.kpiWeights.pe = Number(p.value);
      }
    });
    
    if (onProgress) onProgress(100);
    return nextConfig;
  } catch (err) {
    console.error('AI Optimization failed, falling back to brute force', err);
    throw err;
  }
};

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
  if (params.useAI) {
    try {
      // Kjør en rask simulering først for å gi AI-en et utgangspunkt
      const technicals = {
        [symbols[0]]: {
          sma: calculateSMA(data.map(d => d[symbols[0]] as number).filter(v => !isNaN(v)), currentConfig.entryLogic.primarySma),
          rsi: data.map(() => 50)
        }
      };
      const currentProfit = fastSimulate(currentConfig, data, technicals, symbols);
      return await optimizeWithAI(currentConfig, currentProfit, symbols, onProgress);
    } catch {
      // Fallback til brute force
    }
  }
  
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
