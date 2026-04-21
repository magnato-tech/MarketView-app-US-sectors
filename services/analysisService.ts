import { MarketDataPoint, SummaryStats, Period, Interval } from '../types';

export type DerivedMetrics = {
  rank: number;
  volatility: number;
  maxDrawdown: number;
  trendStatus: 'Bull' | 'Bear' | 'Neutral';
  momentumScore: number;
  regime: 'High Vol' | 'Low Vol' | 'Stable';
  relativeStrength: number;
  flowScore: number; // Volum-momentum %
};

export type RangeSummaryRow = {
  symbol: string;
  name: string;
  startPrice: number;
  endPrice: number;
  changePct: number;
  isBenchmark?: boolean;
  color: string;
  metrics?: DerivedMetrics;
};

/**
 * Beregner volatilitet (standardavvik av daglig avkastning)
 */
export const calculateVolatility = (prices: number[]): number => {
  if (prices.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1] !== 0) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
  }
  if (returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualisert %
};

/**
 * Beregner Max Drawdown
 */
export const calculateMaxDrawdown = (prices: number[]): number => {
  if (prices.length === 0) return 0;
  let maxSoFar = prices[0];
  let maxDD = 0;
  for (const p of prices) {
    if (p > maxSoFar) maxSoFar = p;
    const dd = (p - maxSoFar) / maxSoFar;
    if (dd < maxDD) maxDD = dd;
  }
  return Math.abs(maxDD) * 100;
};

/**
 * Beregner sammendrag for en gitt periode basert på markedsdata.
 */
export const calculateRangeSummary = (
  data: MarketDataPoint[],
  summary: SummaryStats[]
): RangeSummaryRow[] => {
  if (data.length < 2) return [];

  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];

  // Finn benchmark (f.eks. SPY eller første index-lignende ticker)
  const benchmarkSymbol = summary.find(s => s.symbol === 'SPY' || s.symbol.startsWith('^'))?.symbol || summary[0]?.symbol;
    const benchmarkPrices = data.map(d => d[benchmarkSymbol] as number).filter(v => typeof v === 'number' && !isNaN(v));
    const benchmarkReturn = benchmarkPrices.length >= 2 
      ? (benchmarkPrices[benchmarkPrices.length-1] - benchmarkPrices[0]) / (benchmarkPrices[0] || 1) 
      : 0;

    const rows = summary.map(s => {
      const prices = data.map(d => d[s.symbol] as number).filter(v => typeof v === 'number' && !isNaN(v));
      const startPrice = prices[0] || 0;
      const endPrice = prices[prices.length - 1] || 0;
      
      // Vi bruker s.percentChange direkte fra SummaryStats, da den er beregnet 
      // korrekt mot første datapunkt i useMarketData/buildSummary.
      const changePct = s.percentChange;
      
      const vol = calculateVolatility(prices);
      const mdd = calculateMaxDrawdown(prices);
      const rs = changePct - (benchmarkReturn * 100);

      // Beregn Volum-momentum (Flow Score)
      const volKey = `${s.symbol}_dollar_volume`;
      const volumes = data.map(d => d[volKey] as number).filter(v => typeof v === 'number' && isFinite(v));
      const baselineVol = volumes.length > 0 ? volumes[0] : 0;
      
      // Bruk et 5-dagers snitt for "recent volume" for å unngå ekstreme utslag på enkeltdager
      const recentVol = volumes.length >= 5 
        ? volumes.slice(-5).reduce((a, b) => a + b, 0) / 5 
        : (volumes[volumes.length - 1] || 0);
      
      const flowScore = baselineVol > 0 
        ? ((recentVol - baselineVol) / baselineVol) * 100 
        : 0;

      const metrics: DerivedMetrics = {
        rank: 0,
        volatility: isFinite(vol) && vol < 1000 ? parseFloat(vol.toFixed(2)) : 0,
        maxDrawdown: isFinite(mdd) ? parseFloat(mdd.toFixed(2)) : 0,
        trendStatus: changePct > 2 ? 'Bull' : changePct < -2 ? 'Bear' : 'Neutral',
        momentumScore: isFinite(changePct / (vol || 1)) ? parseFloat((changePct / (vol || 1)).toFixed(2)) : 0,
        regime: vol > 25 ? 'High Vol' : vol < 12 ? 'Low Vol' : 'Stable',
        relativeStrength: isFinite(rs) ? parseFloat(rs.toFixed(2)) : 0,
        flowScore: isFinite(flowScore) ? parseFloat(flowScore.toFixed(2)) : 0
      };

      return {
        symbol: s.symbol,
        name: s.name,
        startPrice,
        endPrice,
        changePct: parseFloat(changePct.toFixed(2)),
        color: s.color,
        isBenchmark: s.symbol === benchmarkSymbol,
        metrics
      };
    });

  // Sorter og sett rank basert på changePct
  return rows
    .sort((a, b) => b.changePct - a.changePct)
    .map((row, idx) => ({
      ...row,
      metrics: row.metrics ? { ...row.metrics, rank: idx + 1 } : undefined
    }));
};

/**
 * Beregner glidende gjennomsnitt (Simple Moving Average)
 */
export const calculateSMA = (data: number[], window: number): (number | null)[] => {
  if (data.length < window) return new Array(data.length).fill(null);
  
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < window; j++) {
      sum += data[i - j];
    }
    result.push(sum / window);
  }
  return result;
};

/**
 * Dynamic Excel Optimizer: Simulerer trailing stop-loss for å finne optimal prosent.
 * Basert på brukerens algoritme: testing av 1-80% stop-loss.
 */
export interface StopLossSimResult {
  slPercent: number;
  totalReturn: number;
  tradeCount: number;
  winRate: number;
}

export const simulateTrailingStop = (
  prices: { high: number; low: number; open: number; close: number }[],
  slPercent: number
): number => {
  if (prices.length === 0) return 0;
  
  let inPosition = true; // Vi antar entry på dag 1 for optimalisering
  let entryPrice = prices[0].open;
  let highestPrice = prices[0].high;
  let cumulativeReturn = 1.0;

  for (let i = 1; i < prices.length; i++) {
    const day = prices[i];
    
    if (inPosition) {
      // Sjekk stop loss FØR vi oppdaterer highestPrice for dagen? 
      // Nei, vanligvis kan man bli stoppet ut i løpet av dagen etter at en ny topp er nådd.
      // Men stop loss er basert på highestPrice sett SÅ LANGT.
      
      const stopLevel = highestPrice * (1 - slPercent);

      if (day.low <= stopLevel) {
        // Exit trade
        const exitPrice = Math.min(stopLevel, day.open); // Håndter gap down: hvis open er under stopLevel, selg på open
        cumulativeReturn *= (exitPrice / entryPrice);
        inPosition = false;
      } else {
        // Oppdater highestPrice kun hvis vi ikke ble stoppet ut
        highestPrice = Math.max(highestPrice, day.high);
      }
    } else {
      // Re-entry logikk: For optimalisering antar vi re-entry neste dag
      inPosition = true;
      entryPrice = day.open;
      highestPrice = day.high;
    }
  }

  // Hvis vi fortsatt er i posisjon ved slutten av perioden
  if (inPosition) {
    const lastPrice = prices[prices.length - 1].close;
    cumulativeReturn *= (lastPrice / entryPrice);
  }

  return (cumulativeReturn - 1) * 100; // Avkastning i %
};

export const findOptimalStopLoss = (
  prices: { high: number; low: number; open: number; close: number }[]
): { optimalSL: number; curve: { sl: number; profit: number }[] } => {
  const curve = [];
  let maxProfit = -Infinity;
  let optimalSL = 0.10; // Default

  for (let sl = 0.01; sl <= 0.80; sl += 0.01) {
    const profit = simulateTrailingStop(prices, sl);
    curve.push({ sl: Math.round(sl * 100), profit });
    
    if (profit > maxProfit) {
      maxProfit = profit;
      optimalSL = sl;
    }
  }

  return { optimalSL, curve };
};
