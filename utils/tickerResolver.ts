import { TICKERS } from '../constants';
import { getEtfName, getHoldingName } from '../services/etfService';

const FALLBACK_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4',
];

const hashSymbol = (sym: string): number => {
  let h = 0;
  for (let i = 0; i < sym.length; i++) h = (h * 31 + sym.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export interface ResolvedTicker {
  symbol: string;
  name: string;
  color: string;
}

/**
 * Slår opp visningsnavn og farge for et ticker-symbol.
 *
 * Oppslagsrekkefølge:
 *   1. TICKERS (kjente sektorer/indekser) → bruk definert navn og farge
 *   2. ETF-database → bruk ETF-navnet, deterministisk fargevalg
 *   3. Holdings-tabell → bruk selskapsnavnet, deterministisk fargevalg
 *   4. Ukjent → fall tilbake til symbolet som navn
 *
 * Brukes av både `MainLineChart` (Recharts Line + Legend) og
 * egne legend-komponenter som viser nøkkel/forklaring utenfor charten.
 */
export const resolveTicker = (sym: string): ResolvedTicker => {
  const t = TICKERS.find(x => x.symbol === sym);
  if (t) return { symbol: t.symbol, name: t.name, color: t.color };

  const etfName = getEtfName(sym);
  const stockName = etfName ? null : getHoldingName(sym);
  return {
    symbol: sym,
    name: etfName ?? stockName ?? sym,
    color: FALLBACK_COLORS[hashSymbol(sym) % FALLBACK_COLORS.length],
  };
};
