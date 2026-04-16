import { MarketDataPoint, SummaryStats, Period, Interval } from '../types';

export type DerivedMetrics = {
  rank: number;
  volatility: number;
  maxDrawdown: number;
  trendStatus: 'Bull' | 'Bear' | 'Neutral';
  momentumScore: number;
  regime: 'High Vol' | 'Low Vol' | 'Stable';
  relativeStrength: number;
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

      const metrics: DerivedMetrics = {
        rank: 0,
        volatility: isFinite(vol) ? parseFloat(vol.toFixed(2)) : 0,
        maxDrawdown: isFinite(mdd) ? parseFloat(mdd.toFixed(2)) : 0,
        trendStatus: changePct > 2 ? 'Bull' : changePct < -2 ? 'Bear' : 'Neutral',
        momentumScore: isFinite(changePct / (vol || 1)) ? parseFloat((changePct / (vol || 1)).toFixed(2)) : 0,
        regime: vol > 25 ? 'High Vol' : vol < 12 ? 'Low Vol' : 'Stable',
        relativeStrength: isFinite(rs) ? parseFloat(rs.toFixed(2)) : 0
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
