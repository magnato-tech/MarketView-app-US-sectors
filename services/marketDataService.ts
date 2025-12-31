
import { MarketDataPoint, SummaryStats, Period, Interval } from '../types';
import { TICKERS } from '../constants';

/**
 * Generates mock market data. 
 * In a production app, this would be an async fetch to a backend proxying yfinance or Alpaca.
 */
export const fetchMarketData = async (
  symbols: string[],
  period: Period,
  interval: Interval
): Promise<{ data: MarketDataPoint[]; summary: SummaryStats[] }> => {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  const daysMap: Record<Period, number> = {
    '1d': 1, '5d': 5, '1mo': 30, '2mo': 60, '3mo': 90, '6mo': 180, '1y': 365, '2y': 730
  };
  
  const stepMap: Record<Interval, number> = {
    '1d': 1, '1wk': 7, '1mo': 30
  };

  const totalDays = daysMap[period];
  const stepDays = stepMap[interval];
  const pointsCount = Math.ceil(totalDays / stepDays);
  
  const data: MarketDataPoint[] = [];
  const now = new Date();

  // Create base prices for symbols
  const basePrices: Record<string, number> = {
    '^GSPC': 5000, '^NDX': 18000, '^DJI': 38000,
    'XLK': 200, 'XLF': 40, 'XLV': 140, 'XLE': 90, 'XLI': 120,
    'XLY': 180, 'XLP': 75, 'XLB': 90, 'XLU': 65, 'XLC': 75, 'XLRE': 40
  };

  // Generate path data
  const symbolPaths: Record<string, number[]> = {};
  symbols.forEach(sym => {
    let current = basePrices[sym] || 100;
    // Walk backwards from "now" to "start"
    const path = [];
    const volatility = sym.startsWith('^') ? 0.015 : 0.025;
    const trend = 0.0005; // slight upward bias

    for (let i = 0; i <= pointsCount; i++) {
      path.push(current);
      const change = current * (volatility * (Math.random() - 0.5) + trend);
      current -= change; // going backwards
    }
    symbolPaths[sym] = path.reverse();
  });

  // Assemble into MarketDataPoints and calculate Relative Performance
  for (let i = 0; i <= pointsCount; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - (pointsCount - i) * stepDays);
    
    const point: MarketDataPoint = {
      timestamp: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    };

    symbols.forEach(sym => {
      // For the chart, we want cumulative % change from the first point (i=0)
      const initialPrice = symbolPaths[sym][0];
      const currentPrice = symbolPaths[sym][i];
      const relPerf = ((currentPrice - initialPrice) / initialPrice) * 100;
      point[sym] = parseFloat(relPerf.toFixed(2));
    });

    data.push(point);
  }

  // Create Summary Stats (based on absolute prices for the table)
  const summary: SummaryStats[] = symbols.map(sym => {
    const ticker = TICKERS.find(t => t.symbol === sym)!;
    const lastPriceRaw = symbolPaths[sym][symbolPaths[sym].length - 1];
    const firstPriceRaw = symbolPaths[sym][0];
    const pctChange = ((lastPriceRaw - firstPriceRaw) / firstPriceRaw) * 100;
    
    return {
      symbol: sym,
      name: ticker.name,
      lastPrice: parseFloat(lastPriceRaw.toFixed(2)),
      percentChange: parseFloat(pctChange.toFixed(2)),
      color: ticker.color
    };
  });

  return { data, summary };
};
