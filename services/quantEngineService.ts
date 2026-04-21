import { SummaryStats, BotConfig, BotState, Trade } from '../types';
import { calculateSMA, findOptimalStopLoss } from './analysisService';

/**
 * Quant Engine Service
 * Håndterer logikk for Alpha-Max Rotator botter.
 */

export const DEFAULT_BOT_CONFIGS: BotConfig[] = [
  {
    id: 'bot-1',
    name: 'Simple Trend Follower',
    version: '3.0',
    mode: 'Simple',
    enabled: true,
    entryLogic: {
      vixFilterEnabled: true,
      vixThreshold: 28.0,
      primarySma: 50,
      secondarySma: 200,
      momentumPeriodDays: 21,
      minRelativeStrengthScore: 55,
      kpiWeights: { momentum: 0.8, rsi: 0.1, pe: 0.1 }
    },
    stopLossModule: {
      type: 'Dynamic_Excel_Optimizer',
      optimizationRange: [0.01, 0.80],
      stepInterval: 0.01,
      lookbackPeriodMonths: 12,
      currentOptimalSl: 0.12
    },
    swapLogic: {
      enabled: true,
      alphaBufferPercent: 10.0,
      rebalanceDay: 'Monday'
    },
    riskManagement: {
      maxRiskPerTradePercent: 10.0,
      maxPortfolioDrawdown: 15.0,
      emergencyExitEnabled: true
    }
  },
  {
    id: 'bot-2',
    name: 'Advanced Alpha Rotator',
    version: '3.0',
    mode: 'Advanced',
    enabled: true,
    entryLogic: {
      vixFilterEnabled: true,
      vixThreshold: 24.0,
      primarySma: 20,
      secondarySma: 50,
      momentumPeriodDays: 14,
      minRelativeStrengthScore: 70,
      kpiWeights: { momentum: 0.4, rsi: 0.3, pe: 0.3 }
    },
    stopLossModule: {
      type: 'Dynamic_Excel_Optimizer',
      optimizationRange: [0.01, 0.80],
      stepInterval: 0.01,
      lookbackPeriodMonths: 12,
      currentOptimalSl: 0.22
    },
    swapLogic: {
      enabled: true,
      alphaBufferPercent: 15.0,
      rebalanceDay: 'Monday'
    },
    riskManagement: {
      maxRiskPerTradePercent: 5.0,
      maxPortfolioDrawdown: 20.0,
      emergencyExitEnabled: true
    }
  }
];

/**
 * Beregner en totalscore for et instrument basert på KPI-vekting.
 */
export const calculateStrategyScore = (
  stats: SummaryStats,
  weights: { momentum: number; rsi: number; pe: number }
): number => {
  // Normaliser Momentum (0-100) - vi antar percentChange som momentum proxy her
  // Vi øker følsomheten for å fange opp små bevegelser i sektorer
  const momentumScore = Math.min(100, Math.max(0, (stats.percentChange + 5) * 10));
  
  // Normaliser RSI (0-100, invertert da lav RSI er bra for entry)
  const rsiScore = stats.rsi ? 100 - stats.rsi : 50;
  
  // Normaliser P/E (lav P/E er bra, 0-100)
  const peScore = stats.peRatio ? Math.min(100, Math.max(0, 100 - (stats.peRatio * 2))) : 50;

  return (
    (momentumScore * weights.momentum) +
    (rsiScore * weights.rsi) +
    (peScore * weights.pe)
  );
};

/**
 * Rebalanseringslogikk for en bot.
 */
export const processBotLogic = (
  botConfig: BotConfig,
  botState: BotState,
  marketSummary: SummaryStats[],
  vixValue: number
): { newState: BotState; trades: Trade[] } => {
  const trades: Trade[] = [];
  let currentBalance = botState.balance;
  const currentPositions = [...botState.positions];

  // 1. Sjekk VIX Filter
  const isRiskOff = botConfig.entryLogic.vixFilterEnabled && vixValue > botConfig.entryLogic.vixThreshold;

    // 2. Sjekk Stop-loss for eksisterende posisjoner (Daglig sjekk)
    for (let i = currentPositions.length - 1; i >= 0; i--) {
      const pos = currentPositions[i];
      const stats = marketSummary.find(s => s.symbol === pos.symbol);
      if (!stats) continue;

      // Oppdater highest price
      pos.highestPriceSinceEntry = Math.max(pos.highestPriceSinceEntry, stats.lastPrice);
      
      const stopLevel = pos.highestPriceSinceEntry * (1 - botConfig.stopLossModule.currentOptimalSl);
      
      if (stats.lastPrice <= stopLevel || isRiskOff) {
        // Exit trade
        const sellTrade: Trade = {
          id: Math.random().toString(36).substr(2, 9),
          symbol: pos.symbol,
          type: 'SELL',
          price: stats.lastPrice,
          quantity: pos.quantity,
          timestamp: stats.timestamp || new Date().toISOString(),
          reason: isRiskOff ? 'VIX Threshold Exceeded' : 'Stop-loss Triggered'
        };
        trades.push(sellTrade);
        currentBalance += pos.quantity * stats.lastPrice;
        currentPositions.splice(i, 1);
      }
    }

    // 3. Alpha Swap / Nye kjøp (Kun hvis ikke Risk-Off)
    if (!isRiskOff && botConfig.enabled) {
      const scoredMarket = marketSummary
        .map(s => ({
          symbol: s.symbol,
          score: calculateStrategyScore(s, botConfig.entryLogic.kpiWeights),
          stats: s
        }))
        .filter(item => {
          // Trend filter
          if (botConfig.entryLogic.primarySma && item.stats.sma50) {
            if (item.stats.lastPrice < item.stats.sma50) return false;
          }
          return item.score >= botConfig.entryLogic.minRelativeStrengthScore;
        })
        .sort((a, b) => b.score - a.score);

      // Enkel kjøpslogikk: Fyll opp til maks risiko hvis vi har ledig kapital
      for (const item of scoredMarket) {
        if (currentPositions.some(p => p.symbol === item.symbol)) continue;
        
        // Sjekk om vi har nok kapital (vi tillater opptil 5 posisjoner)
        const maxPositions = 5;
        if (currentPositions.length >= maxPositions) break;

        const targetAllocation = (currentBalance + currentPositions.reduce((sum, p) => sum + (p.quantity * (marketSummary.find(s => s.symbol === p.symbol)?.lastPrice || p.averagePrice)), 0)) / maxPositions;
        const buyAmount = Math.min(currentBalance, targetAllocation);
        
        if (buyAmount < 1000) continue;

        const quantity = Math.floor(buyAmount / item.stats.lastPrice);
        if (quantity > 0) {
          const buyTrade: Trade = {
            id: Math.random().toString(36).substr(2, 9),
            symbol: item.symbol,
            type: 'BUY',
            price: item.stats.lastPrice,
            quantity,
            timestamp: item.stats.timestamp || new Date().toISOString(),
            reason: `Alpha Score: ${item.score.toFixed(1)}`
          };
          trades.push(buyTrade);
          currentBalance -= quantity * item.stats.lastPrice;
          currentPositions.push({
            symbol: item.symbol,
            quantity,
            averagePrice: item.stats.lastPrice,
            highestPriceSinceEntry: item.stats.lastPrice
          });
        }
      }
    }

  return {
    newState: {
      ...botState,
      balance: currentBalance,
      positions: currentPositions,
      history: [...trades, ...botState.history]
    },
    trades
  };
};
