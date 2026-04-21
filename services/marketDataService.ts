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

// --- In-memory Cache Logic ---

interface CacheEntry {
  series: PriceSeries;
  meta: YahooChartResponse['chart']['result'][0]['meta'];
  timestamp: number;
}

const cache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutter
const MAX_CACHE_SIZE = 100; // Begrens antall instrumenter i minnet

const getCacheKey = (symbol: string, range: string, interval: string) => 
  `${symbol}:${range}:${interval}`;

const purgeOldCache = () => {
  if (cache.size <= MAX_CACHE_SIZE) return;
  
  // Slett den eldste oppføringen basert på timestamp (LRU-ish)
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  
  for (const [key, entry] of cache.entries()) {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      oldestKey = key;
    }
  }
  
  if (oldestKey) cache.delete(oldestKey);
};

// --- Batching Logic ---

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

export const fetchMarketData = async (
  symbols: string[],
  period: Period,
  interval: Interval,
  useRawPrices: boolean = false,
  retries = 2
): Promise<{ data: MarketDataPoint[]; summary: SummaryStats[] }> => {
    const range = periodMap[period];
    const intv = intervalMap[interval];
    const bySymbol: Record<string, PriceSeries> = {};
    const metaBySymbol: Record<string, YahooChartResponse['chart']['result'][0]['meta']> = {};

    const fetchSingleSymbol = async (symbol: string, attempt = 0): Promise<void> => {
      const cacheKey = getCacheKey(symbol, range, intv);
      const cached = cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        bySymbol[symbol] = cached.series;
        metaBySymbol[symbol] = cached.meta;
        return;
      }

      const path = `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${intv}&range=${range}`;
      try {
        const res = await fetch(path);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json() as YahooChartResponse;
        const series = parseChartJson(json);
        if (series) {
          const r = json.chart?.result?.[0];
          const meta = r?.meta || {};
          
          bySymbol[symbol] = series;
          metaBySymbol[symbol] = meta;
          
          // Oppdater cache
          cache.set(cacheKey, { series, meta, timestamp: Date.now() });
          purgeOldCache();
        }
      } catch (err) {
        if (attempt < retries) {
          console.warn(`Retry ${attempt + 1} for ${symbol}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          return fetchSingleSymbol(symbol, attempt + 1);
        }
        console.error(`Yahoo fetch failed for ${symbol} after ${retries + 1} attempts:`, err);
      }
    };

    // Batching: Del opp symbols i grupper for å unngå API-overbelastning
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(symbol => fetchSingleSymbol(symbol)));
      
      // Legg inn en liten pause mellom batches hvis det er flere igjen
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    const data = mergeSeriesToChartData(symbols, bySymbol, useRawPrices);
    const summary = buildSummary(symbols, bySymbol, metaBySymbol);
    return { data, summary };
};
