import { MarketDataPoint, SummaryStats, Period, Interval } from '../types';
import { TICKERS } from '../constants';

const periodMap: Record<Period, string> = {
  '1d': '1d',
  '5d': '5d',
  '1mo': '1mo',
  '2mo': '2mo',
  '3mo': '3mo',
  '6mo': '6mo',
  '1y': '1y',
  '2y': '2y',
};

const intervalMap: Record<Interval, string> = {
  '1d': '1d',
  '1wk': '1wk',
  '1mo': '1mo',
};

type PriceSeries = { times: number[]; closes: number[] };

function parseChartJson(json: unknown): PriceSeries | null {
  const root = json as {
    chart?: {
      error?: { description?: string };
      result?: Array<{
        meta?: { symbol?: string; shortName?: string; longName?: string };
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      }>;
    };
  };
  const err = root.chart?.error;
  if (err?.description) {
    console.warn('Yahoo chart error:', err.description);
    return null;
  }
  const r = root.chart?.result?.[0];
  if (!r?.timestamp?.length) return null;

  const close = r.indicators?.quote?.[0]?.close;
  if (!close || close.length !== r.timestamp.length) return null;

  const times: number[] = [];
  const closes: number[] = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const c = close[i];
    if (c != null && Number.isFinite(c)) {
      times.push(r.timestamp[i]);
      closes.push(c);
    }
  }
  return times.length ? { times, closes } : null;
}

function closeAtOrBefore(series: PriceSeries, t: number): number | null {
  let best: number | null = null;
  for (let i = 0; i < series.times.length; i++) {
    if (series.times[i] > t) break;
    best = series.closes[i];
  }
  return best;
}

function mergeSeriesToChartData(
  symbols: string[],
  bySymbol: Record<string, PriceSeries>
): MarketDataPoint[] {
  const allTs = new Set<number>();
  for (const sym of symbols) {
    const s = bySymbol[sym];
    if (s) s.times.forEach((unix) => allTs.add(unix));
  }
  const sorted = [...allTs].sort((a, b) => a - b);
  const baseline: Record<string, number> = {};
  for (const sym of symbols) {
    const s = bySymbol[sym];
    if (s?.closes.length) baseline[sym] = s.closes[0];
  }

  const data: MarketDataPoint[] = [];
  for (const t of sorted) {
    const point: MarketDataPoint = {
      timestamp: new Date(t * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      }),
    };
    let hasValue = false;
    for (const sym of symbols) {
      const series = bySymbol[sym];
      const base = baseline[sym];
      if (!series || base == null || base === 0) continue;
      const price = closeAtOrBefore(series, t);
      if (price == null) continue;
      point[sym] = parseFloat((((price - base) / base) * 100).toFixed(2));
      hasValue = true;
    }
    if (hasValue) data.push(point);
  }
  return data;
}

function buildSummary(
  symbols: string[],
  bySymbol: Record<string, PriceSeries>,
  metaBySymbol: Record<string, { shortName?: string; longName?: string }>
): SummaryStats[] {
  const summary: SummaryStats[] = [];
  for (const sym of symbols) {
    const s = bySymbol[sym];
    if (!s?.closes.length) continue;
    const first = s.closes[0];
    const last = s.closes[s.closes.length - 1];
    if (first === 0) continue;
    const pct = ((last - first) / first) * 100;
    const ticker = TICKERS.find((t) => t.symbol === sym);
    const meta = metaBySymbol[sym];
    summary.push({
      symbol: sym,
      name: ticker?.name ?? meta?.longName ?? meta?.shortName ?? sym,
      lastPrice: parseFloat(last.toFixed(2)),
      percentChange: parseFloat(pct.toFixed(2)),
      color: ticker?.color ?? '#64748b',
    });
  }
  return summary;
}

export const fetchMarketData = async (
  symbols: string[],
  period: Period,
  interval: Interval
): Promise<{ data: MarketDataPoint[]; summary: SummaryStats[] }> => {
  const range = periodMap[period];
  const intv = intervalMap[interval];
  const bySymbol: Record<string, PriceSeries> = {};
  const metaBySymbol: Record<string, { shortName?: string; longName?: string }> = {};

  try {
    await Promise.all(
      symbols.map(async (symbol) => {
        const path = `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${intv}&range=${range}`;
        const res = await fetch(path);
        if (!res.ok) {
          console.warn('Yahoo fetch failed', symbol, res.status);
          return;
        }
        const json: unknown = await res.json();
        const series = parseChartJson(json);
        if (series) {
          bySymbol[symbol] = series;
          const r = (json as { chart?: { result?: Array<{ meta?: { shortName?: string; longName?: string } }> } })
            .chart?.result?.[0];
          if (r?.meta) metaBySymbol[symbol] = r.meta;
        }
      })
    );

    const data = mergeSeriesToChartData(symbols, bySymbol);
    const summary = buildSummary(symbols, bySymbol, metaBySymbol);
    return { data, summary };
  } catch (error) {
    console.error('Failed to fetch market data', error);
    return { data: [], summary: [] };
  }
};
