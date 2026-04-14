import { MarketDataPoint, SummaryStats, Period, Interval } from '../types';

export type RangeSummaryRow = {
  symbol: string;
  name: string;
  startPrice: number;
  endPrice: number;
  changePct: number;
  isBenchmark?: boolean;
  color: string;
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

  return summary.map(s => {
    const startVal = firstPoint[s.symbol];
    const endVal = lastPoint[s.symbol];

    const startPrice = typeof startVal === 'number' ? startVal : 0;
    const endPrice = typeof endVal === 'number' ? endVal : 0;
    
    return {
      symbol: s.symbol,
      name: s.name,
      startPrice,
      endPrice,
      changePct: s.percentChange,
      color: s.color,
      isBenchmark: s.symbol.startsWith('^')
    };
  });
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
