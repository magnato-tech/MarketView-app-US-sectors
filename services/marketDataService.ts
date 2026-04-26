import { MarketDataPoint, SummaryStats, Period, Interval } from '../types';
import { 
  PriceSeries, 
  parseChartJson, 
  mergeSeriesToChartData, 
  buildSummary,
  YahooChartResponse 
} from './dataTransformers';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const periodMap: Record<Period, string> = {
  '1d': '1d',
  '5d': '5d',
  '2w': '14d',
  '3w': '21d',
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

interface FileCachePayload {
  fetchedAtDate: string;
  response: YahooChartResponse;
}

const cache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutter
const MAX_CACHE_SIZE = 100; // Begrens antall instrumenter i minnet

const getCacheKey = (symbol: string, range: string, interval: string) => 
  `${symbol}:${range}:${interval}`;

const isNodeRuntime = (): boolean =>
  typeof window === 'undefined';

const toCacheDateKey = (date = new Date()): string =>
  date.toISOString().slice(0, 10);

const getYahooChartUrl = (symbol: string, interval: string, range: string): string => {
  const encoded = encodeURIComponent(symbol);
  if (isNodeRuntime()) {
    return `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=${interval}&range=${range}`;
  }
  return `/api/yahoo/v8/finance/chart/${encoded}?interval=${interval}&range=${range}`;
};

const getFileCachePath = async (symbol: string, range: string, interval: string): Promise<string> => {
  const pathModule = await import('node:path');
  return pathModule.join(process.cwd(), 'data', 'cache', `yahoo_${symbol}_${range}_${interval}.json`);
};

const readDailyFileCache = async (
  symbol: string,
  range: string,
  interval: string
): Promise<YahooChartResponse | null> => {
  if (!isNodeRuntime()) return null;
  try {
    const fs = await import('node:fs/promises');
    const filePath = await getFileCachePath(symbol, range, interval);
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as FileCachePayload;
    if (parsed.fetchedAtDate !== toCacheDateKey()) return null;
    return parsed.response;
  } catch {
    return null;
  }
};

const writeDailyFileCache = async (
  symbol: string,
  range: string,
  interval: string,
  response: YahooChartResponse
): Promise<void> => {
  if (!isNodeRuntime()) return;
  try {
    const fs = await import('node:fs/promises');
    const pathModule = await import('node:path');
    const cacheDir = pathModule.join(process.cwd(), 'data', 'cache');
    await fs.mkdir(cacheDir, { recursive: true });
    const filePath = await getFileCachePath(symbol, range, interval);
    const payload: FileCachePayload = {
      fetchedAtDate: toCacheDateKey(),
      response,
    };
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch {
    // Best effort cache; ignore write failures.
  }
};

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
    // 1. Prøv å hente fra Supabase market_stats først hvis konfigurert
    // Vi gjør dette kun for perioder som matcher vår daglige sync (f.eks. 6mo/1d)
    const isStandardRequest = period === '6mo' && interval === '1d';
    
    if (isSupabaseConfigured() && isStandardRequest) {
      try {
        const supabase = getSupabaseClient();
        const { data: cachedStats, error } = await supabase
          .from('market_stats')
          .select('*, instruments(name, color, category)')
          .in('symbol', symbols);

        if (!error && cachedStats && cachedStats.length === symbols.length) {
          console.log('Using Supabase cached market stats');
          // Konverter Supabase-data til SummaryStats-format
          const summary: SummaryStats[] = cachedStats.map(s => ({
            symbol: s.symbol,
            name: s.instruments?.name || s.symbol,
            lastPrice: s.last_price,
            percentChange: s.change_pct,
            color: s.instruments?.color || '#64748b',
            // Legg til andre felt hvis nødvendig, eller bruk defaults
          }));

          // Merk: Siden vi ikke lagrer full historikk i market_stats ennå, 
          // må vi fortsatt hente data fra Yahoo for å tegne grafer.
          // Men vi kan returnere summary umiddelbart for Leaderboard.
        }
      } catch (e) {
        console.warn('Supabase cache lookup failed, falling back to Yahoo', e);
      }
    }

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

      try {
        const cachedResponse = await readDailyFileCache(symbol, range, intv);
        const json = cachedResponse ?? await (async () => {
          const url = getYahooChartUrl(symbol, intv, range);
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const responseJson = await res.json() as YahooChartResponse;
          await writeDailyFileCache(symbol, range, intv, responseJson);
          return responseJson;
        })();

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
