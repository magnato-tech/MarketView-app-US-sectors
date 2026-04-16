import { MarketDataPoint, SummaryStats } from '../types';
import { TICKERS } from '../constants';

export type PriceSeries = { 
  times: number[]; 
  closes: number[];
  volumes: number[];
};

export interface YahooChartResponse {
  chart?: {
    error?: { description?: string };
    result?: Array<{
      meta?: { symbol?: string; shortName?: string; longName?: string };
      timestamp?: number[];
      indicators?: { 
        quote?: Array<{ 
          close?: (number | null)[];
          volume?: (number | null)[];
        }> 
      };
    }>;
  };
}

export function parseChartJson(json: unknown): PriceSeries | null {
  const root = json as YahooChartResponse;
  const err = root.chart?.error;
  if (err?.description) {
    console.warn('Yahoo chart error:', err.description);
    return null;
  }
  const r = root.chart?.result?.[0];
  if (!r?.timestamp?.length) return null;

  const close = r.indicators?.quote?.[0]?.close;
  const volume = r.indicators?.quote?.[0]?.volume;
  if (!close || close.length !== r.timestamp.length) return null;

  const times: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const c = close[i];
    const v = volume ? volume[i] : 0;
    if (c != null && Number.isFinite(c)) {
      times.push(r.timestamp[i]);
      closes.push(c);
      volumes.push(v != null && Number.isFinite(v) ? v : 0);
    }
  }
  return times.length ? { times, closes, volumes } : null;
}

function closeAtOrBefore(series: PriceSeries, t: number): { close: number | null, volume: number | null } {
  let bestClose: number | null = null;
  let bestVolume: number | null = null;
  for (let i = 0; i < series.times.length; i++) {
    if (series.times[i] > t) break;
    bestClose = series.closes[i];
    bestVolume = series.volumes[i];
  }
  return { close: bestClose, volume: bestVolume };
}

export function mergeSeriesToChartData(
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
      const { close, volume } = closeAtOrBefore(series, t);
      if (close == null) continue;
      
      // Beregn relativ endring %
      point[sym] = parseFloat((((close - base) / base) * 100).toFixed(2));
      
      // Beregn handelsverdi i dollar (Dollar Volume)
      const dollarVolume = close * (volume || 0);
      point[`${sym}_dollar_volume`] = dollarVolume;
      
      hasValue = true;
    }
    if (hasValue) data.push(point);
  }
  return data;
}

export function buildSummary(
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
