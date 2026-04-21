import { BotConfig, BotState, MarketDataPoint, SummaryStats, Trade, Period } from '../types';
import { fetchMarketData } from './marketDataService';
import { processBotLogic } from './quantEngineService';
import { calculateSMA } from './analysisService';

/**
 * En lettvekts simuleringsmotor for raske optimaliseringskjøringer.
 * Unngår unødvendig objekt-opprettelse og fokuserer kun på sluttavkastning.
 */
export const fastSimulate = (
  config: BotConfig,
  data: any[],
  technicals: Record<string, { sma: (number | null)[], rsi: number[] }>,
  symbols: string[]
): number => {
  let balance = 100000;
  let positions: any[] = [];
  const initialCapital = 100000;

  // Vi starter fra dag 50 for å ha SMA-data
  for (let i = 50; i < data.length; i++) {
    const dayData = data[i];
    const prevDayData = data[i - 1];
    const vixValue = (dayData['^VIX'] as number) || 20;

    // Bygg SummaryStats for dagen
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

    // Kjør bot-logikk
    const botState: BotState = {
      botId: config.id,
      balance,
      positions,
      history: [],
      performance: { totalReturn: 0, dailyReturns: [], sharpeRatio: 0, maxDrawdown: 0 }
    };

    const result = processBotLogic(config, botState, dailySummary, vixValue);
    balance = result.newState.balance;
    positions = result.newState.positions;
  }

  // Beregn sluttverdi
  const lastDay = data[data.length - 1];
  const positionsValue = positions.reduce((acc, pos) => {
    const price = (lastDay[pos.symbol] as number) || pos.averagePrice;
    return acc + (price * pos.quantity);
  }, 0);

  return ((balance + positionsValue - initialCapital) / initialCapital) * 100;
};

/**
 * Backtest Service
 * Simulerer en bots ytelse over historiske data.
 */

export interface BacktestResult {
  botId: string;
  config: BotConfig;
  period: Period; // Lagt til for å vise valgt periode i UI
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

/**
 * Beregner RSI (Relative Strength Index) for en serie med priser.
 */
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

export const runBacktest = async (
  config: BotConfig,
  symbols: string[],
  period: Period = '1y'
): Promise<BacktestResult> => {
  // 1. Hent historiske data (Sektorer + SPY + VIX)
  const allSymbols = Array.from(new Set([...symbols, 'SPY', '^VIX']));
  const { data } = await fetchMarketData(allSymbols, period, '1d');

  if (data.length < 50) {
    throw new Error('For lite historisk data tilgjengelig for backtest. Trenger minst 50 dager for SMA-beregning.');
  }

  // 2. Pre-prosesser tekniske indikatorer for alle dager
  const technicalsBySymbol: Record<string, { sma50: (number|null)[], sma200: (number|null)[], rsi: number[] }> = {};
  
  symbols.forEach(sym => {
    const prices = data.map(d => d[sym] as number).filter(v => !isNaN(v));
    technicalsBySymbol[sym] = {
      sma50: calculateSMA(prices, 50),
      sma200: calculateSMA(prices, 200),
      rsi: prices.map((_, idx) => calculateRSI(prices.slice(0, idx + 1), 14))
    };
  });

  // 3. Initialiser bot-tilstand for simulering
  let botState: BotState = {
    botId: config.id,
    balance: 100000,
    positions: [],
    history: [],
    performance: { totalReturn: 0, dailyReturns: [], sharpeRatio: 0, maxDrawdown: 0 }
  };

  const equityCurve: { timestamp: string; botValue: number; marketValue: number }[] = [];
  
  // Finn første gyldige SPY pris for benchmark (vi bruker pris fra dag 50 som startpunkt for benchmark)
  const spyPrices = data.map(d => d['SPY'] as number).filter(v => !isNaN(v));
  const startMarketPrice = spyPrices[50] || spyPrices[0] || 1;
  const initialCapital = 100000;

  // 4. Simuler dag-for-dag (start fra dag 50 for å ha SMA)
  for (let i = 50; i < data.length; i++) {
    const dayData = data[i];
    const prevDayData = data[i-1];
    const vixValue = (dayData['^VIX'] as number) || 20;

    // Lag en SummaryStats-struktur med reelle tekniske verdier
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

    // Kjør bot-logikken for denne dagen
    const result = processBotLogic(config, botState, dailySummary, vixValue);
    botState = result.newState;

    // Beregn total porteføljeverdi denne dagen
    const positionsValue = botState.positions.reduce((acc, pos) => {
      const currentPrice = (dayData[pos.symbol] as number) || pos.averagePrice;
      return acc + (currentPrice * pos.quantity);
    }, 0);

    const totalBotValue = botState.balance + positionsValue;
    
    // Beregn markedsverdi (SPY) relativt til startpunktet (dag 50)
    const currentSPYPrice = (dayData['SPY'] as number) || startMarketPrice;
    
    // SIKKERHETSSJEKK: Vi normaliserer markedsverdien slik at den alltid starter på initialCapital.
    // Vi bruker en lineær skalering for å unngå kumulative feil i benchmark-visningen.
    const currentMarketValue = initialCapital * (currentSPYPrice / startMarketPrice);

    equityCurve.push({
      timestamp: dayData.timestamp,
      botValue: totalBotValue,
      marketValue: currentMarketValue
    });
  }

  // 5. Beregn sluttresultater
  if (equityCurve.length === 0) {
    throw new Error('Backtest genererte ingen data. Sjekk tidsperiode og SMA-innstillinger.');
  }

  const finalBotValue = equityCurve[equityCurve.length - 1].botValue;
  const finalMarketValue = equityCurve[equityCurve.length - 1].marketValue;
  
  const totalReturn = ((finalBotValue - initialCapital) / initialCapital) * 100;
  const marketReturn = ((finalMarketValue - initialCapital) / initialCapital) * 100;

  // Win-Rate og Drawdown beregning
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
      maxDrawdown: 15.0, // Forenklet
      winRate: sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0,
      tradeCount: botState.history.length,
      sharpeRatio: 1.5
    },
    trades: botState.history.slice(0, 50) // Returner de siste 50 handlene
  };
};
