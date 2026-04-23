import { BotConfig, BotState, MarketDataPoint, SummaryStats, Trade, Period } from '../types';
import { fetchMarketData } from './marketDataService';
import { processBotLogic } from './quantEngineService';
import { calculateMaxDrawdown, calculateSMA } from './analysisService';

import { INITIAL_CASH, TRANSACTION_FEE } from '../constants/trading';

/**
 * En lettvekts simuleringsmotor for raske optimaliseringskjøringer.
 */
export const fastSimulate = (
  config: BotConfig,
  data: any[],
  technicals: Record<string, { sma: (number | null)[], rsi: number[] }>,
  symbols: string[]
): number => {
  let balance = INITIAL_CASH;
  let positions: any[] = [];
  const initialCapital = INITIAL_CASH;

  // Vi starter fra dag 50 for å ha SMA-data
  for (let i = 50; i < data.length; i++) {
    const dayData = data[i];
    const prevDayData = data[i - 1];
    const vixValue = (dayData['^VIX'] as number) || 20;

    const dailySummary: SummaryStats[] = symbols.map(sym => {
      const lastPrice = dayData[sym] as number;
      const prevPrice = prevDayData[sym] as number;
      return {
        symbol: sym,
        name: sym,
        lastPrice,
        percentChange: prevPrice ? ((lastPrice - prevPrice) / prevPrice) * 100 : 0,
        color: '#000',
        sma50: technicals[sym].sma[i] || undefined,
        rsi: technicals[sym].rsi[i],
        timestamp: dayData.timestamp
      };
    }).filter(s => !isNaN(s.lastPrice));

    const botState: BotState = {
      botId: config.id,
      balance,
      positions,
      history: [],
      performance: { totalReturn: 0, dailyReturns: [], sharpeRatio: 0, maxDrawdown: 0 }
    };

    const result = processBotLogic(config, botState, dailySummary, vixValue);
    balance = result.newState.balance;
    if (result.trades.length > 0) {
      balance -= result.trades.length * TRANSACTION_FEE;
    }
    positions = result.newState.positions;
  }

  const lastDay = data[data.length - 1];
  const positionsValue = positions.reduce((acc, pos) => {
    const price = (lastDay[pos.symbol] as number) || pos.averagePrice;
    return acc + (price * pos.quantity);
  }, 0);

  return ((balance + positionsValue - initialCapital) / initialCapital) * 100;
};

export interface BacktestResult {
  botId: string;
  config: BotConfig;
  period: Period;
  equityCurve: { timestamp: string; botValue: number; marketValue: number }[];
  summary: {
    totalReturn: number;
    marketReturn: number;
    maxDrawdown: number;
    winRate: number;
    tradeCount: number;
    sharpeRatio: number;
  };
  trades: Trade[];
}

const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  let rs = gains / losses;
  return 100 - (100 / (1 + rs));
};

const calculateSharpeRatioFromCurve = (
  equityCurve: { timestamp: string; botValue: number; marketValue: number }[],
  annualRiskFreeRate = 0.02
): number => {
  if (equityCurve.length < 2) return 0;

  const dailyRiskFreeRate = annualRiskFreeRate / 252;
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].botValue;
    const curr = equityCurve[i].botValue;
    if (prev > 0 && Number.isFinite(prev) && Number.isFinite(curr)) {
      returns.push((curr - prev) / prev);
    }
  }

  if (returns.length < 2) return 0;
  const avg = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  if (!Number.isFinite(stdDev) || stdDev === 0) return 0;

  const sharpe = ((avg - dailyRiskFreeRate) / stdDev) * Math.sqrt(252);
  return Number.isFinite(sharpe) ? sharpe : 0;
};

export const runBacktest = async (
  config: BotConfig,
  symbols: string[],
  period: Period = '1y'
): Promise<BacktestResult> => {
  // 1. Hent historiske data med rikelig buffer
  // Vi henter alltid 2 år for 1y test, og 5 år for 2y/5y for å ha SMA-historikk klar
  const fetchPeriod: Period = period === '1y' ? '2y' : '5y';
  const benchmarkSymbol = '^GSPC'; // Bruk samme som dashboard
  const allSymbols = Array.from(new Set([...symbols, benchmarkSymbol, 'SPY', '^VIX']));
  const { data: rawData } = await fetchMarketData(allSymbols, fetchPeriod, '1d', true);

  if (rawData.length < 50) {
    throw new Error('For lite historisk data tilgjengelig.');
  }

  // Finn nøyaktig startpunkt for den forespurte perioden
  const now = new Date();
  const lookbackDate = new Date();
  if (period === '1y') lookbackDate.setFullYear(now.getFullYear() - 1);
  else if (period === '2y') lookbackDate.setFullYear(now.getFullYear() - 2);
  else if (period === '5y') lookbackDate.setFullYear(now.getFullYear() - 5);

  let startIndex = rawData.findIndex(d => new Date(d.timestamp) >= lookbackDate);
  if (startIndex < 0) startIndex = Math.floor(rawData.length / 2); // Fallback
  
  // Sikre at vi har minst 50 dager historikk FØR startIndex for SMA
  if (startIndex < 50) {
    startIndex = 50;
  }

  const data = rawData;

  // 2. Pre-prosesser tekniske indikatorer for hele datasettet
  const technicalsBySymbol: Record<string, { sma50: (number|null)[], sma200: (number|null)[], rsi: number[] }> = {};
  
  const symbolsToProcess = Array.from(new Set([...symbols, benchmarkSymbol, 'SPY']));
  symbolsToProcess.forEach(sym => {
    const prices = data.map(d => d[sym] as number).filter(v => !isNaN(v));
    technicalsBySymbol[sym] = {
      sma50: calculateSMA(prices, 50),
      sma200: calculateSMA(prices, 200),
      rsi: prices.map((_, idx) => calculateRSI(prices.slice(0, idx + 1), 14))
    };
  });

  // 3. Initialiser bot-tilstand
  let botState: BotState = {
    botId: config.id,
    balance: INITIAL_CASH,
    positions: [],
    history: [],
    performance: { totalReturn: 0, dailyReturns: [], sharpeRatio: 0, maxDrawdown: 0 }
  };

  const equityCurve: { timestamp: string; botValue: number; marketValue: number }[] = [];
  
  // Bruk ^GSPC som primær benchmark, SPY som fallback
  const actualBenchmark = !isNaN(data[startIndex][benchmarkSymbol] as number) ? benchmarkSymbol : 'SPY';
  const startMarketPrice = (data[startIndex][actualBenchmark] as number) || 1;
  const initialCapital = INITIAL_CASH;

  // 4. Simuler dag-for-dag fra startIndex
  for (let i = startIndex; i < data.length; i++) {
    const dayData = data[i];
    const prevDayData = data[i-1];
    const vixValue = (dayData['^VIX'] as number) || 20;

    const dailySummary: SummaryStats[] = symbols.map(sym => {
      const lastPrice = dayData[sym] as number;
      const prevPrice = prevDayData[sym] as number;
      const percentChange = prevPrice ? ((lastPrice - prevPrice) / prevPrice) * 100 : 0;
      
      return {
        symbol: sym,
        name: sym,
        lastPrice,
        percentChange,
        color: '#000',
        sma50: technicalsBySymbol[sym].sma50[i] || undefined,
        sma200: technicalsBySymbol[sym].sma200[i] || undefined,
        rsi: technicalsBySymbol[sym].rsi[i],
        timestamp: dayData.timestamp
      };
    }).filter(s => !isNaN(s.lastPrice));

    const result = processBotLogic(config, botState, dailySummary, vixValue);
    botState = result.newState;
    if (result.trades.length > 0) {
      botState = {
        ...botState,
        balance: botState.balance - result.trades.length * TRANSACTION_FEE,
      };
    }

    const positionsValue = botState.positions.reduce((acc, pos) => {
      const currentPrice = (dayData[pos.symbol] as number) || pos.averagePrice;
      return acc + (currentPrice * pos.quantity);
    }, 0);

    const totalBotValue = botState.balance + positionsValue;
    const currentMarketPrice = (dayData[actualBenchmark] as number) || startMarketPrice;
    const currentMarketValue = initialCapital * (currentMarketPrice / startMarketPrice);

    equityCurve.push({
      timestamp: dayData.timestamp,
      botValue: totalBotValue,
      marketValue: currentMarketValue
    });
  }

  // 5. Beregn sluttresultater
  if (equityCurve.length === 0) {
    throw new Error('Backtest genererte ingen data.');
  }

  const finalBotValue = equityCurve[equityCurve.length - 1].botValue;
  const finalMarketValue = equityCurve[equityCurve.length - 1].marketValue;
  const totalReturn = ((finalBotValue - initialCapital) / initialCapital) * 100;
  const marketReturn = ((finalMarketValue - initialCapital) / initialCapital) * 100;
  const maxDrawdown = calculateMaxDrawdown(equityCurve.map(point => point.botValue));
  const sharpeRatio = calculateSharpeRatioFromCurve(equityCurve);
  const sellTrades = botState.history.filter(t => t.type === 'SELL');
  const winningTrades = sellTrades.filter(t => !t.reason.includes('Stop-loss'));

  return {
    botId: config.id,
    config,
    period,
    equityCurve,
    summary: {
      totalReturn,
      marketReturn,
      maxDrawdown,
      winRate: sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0,
      tradeCount: botState.history.length,
      sharpeRatio
    },
    trades: botState.history
  };
};
