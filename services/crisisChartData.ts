/**
 * Normaliserer crisis_log-rader fra Supabase til tidsserier for Recharts.
 */

export type CrisisLogRow = {
  id: number;
  ts_utc: string;
  taiwan_reserve_pct: number | null;
  korea_reserve_pct: number | null;
  helium_price_usd: number | null;
  jkm_price_usd: number | null;
  twd_usd: number | null;
  nasdaq_proxy: number | null;
  helium_roc_24h_pct: number | null;
  helium_roc_7d_pct: number | null;
  twd_roc_24h_pct: number | null;
  nasdaq_roc_24h_pct: number | null;
  crisis_index: number;
  critical_sell: boolean;
  asian_grid_lock: boolean;
};

export type CrisisChartPoint = {
  t: number;
  label: string;
  crisis_index: number | null;
  helium_price_usd: number | null;
  taiwan_reserve_pct: number | null;
  twd_usd: number | null;
  jkm_price_usd: number | null;
  nasdaq_proxy: number | null;
};

export const CRISIS_LOG_CHART_LIMIT = 200;

export function parseCrisisLogRows(raw: unknown[]): CrisisLogRow[] {
  const out: CrisisLogRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = Number(r.id);
    if (!Number.isFinite(id)) continue;
    out.push({
      id,
      ts_utc: String(r.ts_utc ?? ''),
      taiwan_reserve_pct: numOrNull(r.taiwan_reserve_pct),
      korea_reserve_pct: numOrNull(r.korea_reserve_pct),
      helium_price_usd: numOrNull(r.helium_price_usd),
      jkm_price_usd: numOrNull(r.jkm_price_usd),
      twd_usd: numOrNull(r.twd_usd),
      nasdaq_proxy: numOrNull(r.nasdaq_proxy),
      helium_roc_24h_pct: numOrNull(r.helium_roc_24h_pct),
      helium_roc_7d_pct: numOrNull(r.helium_roc_7d_pct),
      twd_roc_24h_pct: numOrNull(r.twd_roc_24h_pct),
      nasdaq_roc_24h_pct: numOrNull(r.nasdaq_roc_24h_pct),
      crisis_index: Number(r.crisis_index ?? 0),
      critical_sell: Boolean(r.critical_sell),
      asian_grid_lock: Boolean(r.asian_grid_lock),
    });
  }
  return out;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Kronologisk stigende (eldst først) for linjegrafer. */
export function sortCrisisLogChronological(rows: CrisisLogRow[]): CrisisLogRow[] {
  return [...rows].sort((a, b) => Date.parse(a.ts_utc) - Date.parse(b.ts_utc));
}

export function rowsToChartPoints(rows: CrisisLogRow[]): CrisisChartPoint[] {
  return sortCrisisLogChronological(rows).map(r => {
    const t = Date.parse(r.ts_utc);
    const d = new Date(r.ts_utc);
    const label = Number.isNaN(t)
      ? ''
      : `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}Z`;
    return {
      t,
      label,
      crisis_index: Number.isFinite(r.crisis_index) ? r.crisis_index : null,
      helium_price_usd: r.helium_price_usd,
      taiwan_reserve_pct: r.taiwan_reserve_pct,
      twd_usd: r.twd_usd,
      jkm_price_usd: r.jkm_price_usd,
      nasdaq_proxy: r.nasdaq_proxy,
    };
  });
}

/** Nyeste rad (Supabase returnerer ofte DESC). */
export function newestCrisisLogRow(rows: CrisisLogRow[]): CrisisLogRow | null {
  if (rows.length === 0) return null;
  let best = rows[0];
  let bestT = Date.parse(best.ts_utc);
  for (let i = 1; i < rows.length; i++) {
    const t = Date.parse(rows[i].ts_utc);
    if (!Number.isNaN(t) && (Number.isNaN(bestT) || t > bestT)) {
      best = rows[i];
      bestT = t;
    }
  }
  return best;
}
