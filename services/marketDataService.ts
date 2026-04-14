import { MarketDataPoint, SummaryStats, Period, Interval } from '../types';
import { 
  PriceSeries, 
  parseChartJson, 
  mergeSeriesToChartData, 
  buildSummary,
  YahooChartResponse 
} from './dataTransformers';

const periodMap: Record<Period, string> = {
  '1d': '1d',
  '5d': '5d',
  '2w': '14d',
  '1mo': '1mo',
  '2mo': '2mo',
  '3mo': '3mo',
  '6mo': '6mo',
  '1y': '1y',
  '2y': '2y',
  '5y': '5y',
};

const intervalMap: Record<Interval, string> = {
  '1d': '1d',
  '1wk': '1wk',
  '1mo': '1mo',
};

export const fetchMarketData = async (
  symbols: string[],
  period: Period,
  interval: Interval,
  retries = 2
): Promise<{ data: MarketDataPoint[]; summary: SummaryStats[] }> => {
    const range = periodMap[period];
    const intv = intervalMap[interval];
    const bySymbol: Record<string, PriceSeries> = {};
    const metaBySymbol: Record<string, { shortName?: string; longName?: string }> = {};

    const fetchWithRetry = async (symbol: string, attempt = 0): Promise<void> => {
      const path = `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${intv}&range=${range}`;
      try {
        const res = await fetch(path);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json() as YahooChartResponse;
        const series = parseChartJson(json);
        if (series) {
          bySymbol[symbol] = series;
          const r = json.chart?.result?.[0];
          if (r?.meta) metaBySymbol[symbol] = r.meta;
        }
      } catch (err) {
        if (attempt < retries) {
          console.warn(`Retry ${attempt + 1} for ${symbol}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          return fetchWithRetry(symbol, attempt + 1);
        }
        console.error(`Yahoo fetch failed for ${symbol} after ${retries + 1} attempts:`, err);
      }
    };

    await Promise.all(symbols.map(symbol => fetchWithRetry(symbol)));

    const data = mergeSeriesToChartData(symbols, bySymbol);
    const summary = buildSummary(symbols, bySymbol, metaBySymbol);
    return { data, summary };
};
