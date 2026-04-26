import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getStrongTrendColorClass } from '../../utils/formatters';
import type { DerivedMetrics, RangeSummaryRow } from '../../services/analysisService';
import type { Interval, Period, SummaryStats } from '../../types';
import { TICKERS } from '../../constants';
import { fetchMarketData } from '../../services/marketDataService';
import {
  getEtfHoldings,
  getHoldingName,
  getTopHoldingSymbolsByWeight,
  hasETFDetails,
} from '../../services/etfService';

type LeaderboardRow = {
  symbol: string;
  name: string;
  changePct: number;
  color: string;
  metrics: DerivedMetrics;
};

type HoldingSpotlightRow = {
  symbol: string;
  name: string;
  changePct: number;
};

const HOLDINGS_FETCH_CAP = 30; // Økt fra 14 for å fange opp en større portefølje

const emptyMetrics = (): DerivedMetrics => ({
  rank: 0,
  volatility: 0,
  maxDrawdown: 0,
  trendStatus: 'Neutral',
  momentumScore: 0,
  regime: 'Stable',
  relativeStrength: 0,
  flowScore: 0,
});

const SECTOR_SYMBOL_SET = new Set(TICKERS.filter(t => t.category === 'Sector').map(t => t.symbol));

export type LeaderboardProps = {
  summary: SummaryStats[];
  rangeSummary: RangeSummaryRow[];
  loading: boolean;
  period: Period;
  interval: Interval;
  allSectorsSummary: SummaryStats[];
  isDarkMode: boolean;
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
  summary,
  rangeSummary,
  loading,
  period,
  interval,
  allSectorsSummary,
  isDarkMode,
}) => {
  const { t } = useLanguage();

  const universeRows = useMemo((): LeaderboardRow[] => {
    if (allSectorsSummary.length > 0) {
      return allSectorsSummary.map(s => ({
        symbol: s.symbol,
        name: s.name,
        changePct: s.percentChange,
        color: s.color,
        metrics: emptyMetrics(),
      }));
    }
    if (rangeSummary.length > 0) {
      return rangeSummary.map(r => ({
        symbol: r.symbol,
        name: r.name,
        changePct: r.changePct,
        color: r.color,
        metrics: r.metrics ?? emptyMetrics(),
      }));
    }
    return summary.map(s => ({
      symbol: s.symbol,
      name: s.name,
      changePct: s.percentChange,
      color: s.color,
      metrics: emptyMetrics(),
    }));
  }, [allSectorsSummary, rangeSummary, summary]);

  const sectorRows = useMemo(
    () => universeRows.filter(r => SECTOR_SYMBOL_SET.has(r.symbol)),
    [universeRows]
  );

  const sortedSectors = useMemo(
    () => [...sectorRows].sort((a, b) => b.changePct - a.changePct),
    [sectorRows]
  );

  const winner = sortedSectors[0];

  const topEtfUnderSectorWinner = useMemo(() => {
    if (!winner) return null;
    const childSyms = new Set(
      TICKERS.filter(t => t.category === 'ETF' && t.parentSymbol === winner.symbol).map(t => t.symbol)
    );
    if (childSyms.size === 0) return null;
    const childRows = universeRows.filter(r => childSyms.has(r.symbol));
    if (childRows.length === 0) return null;
    return [...childRows].sort((a, b) => b.changePct - a.changePct)[0];
  }, [winner, universeRows]);

  /** Når vinner-ETF mangler aksjebeholdninger (f.eks. USO), fullfør pyramiden med de to sterkeste søsken-ETF-ene under samme sektor. */
  const topSiblingEtfRows = useMemo((): LeaderboardRow[] => {
    const w = sortedSectors[0];
    const topEtf = topEtfUnderSectorWinner;
    if (!w || !topEtf) return [];
    const siblingSyms = TICKERS.filter(
      t => t.category === 'ETF' && t.parentSymbol === w.symbol && t.symbol !== topEtf.symbol
    ).map(t => t.symbol);
    if (siblingSyms.length === 0) return [];
    const rows = universeRows.filter(r => siblingSyms.includes(r.symbol));
    return [...rows].sort((a, b) => b.changePct - a.changePct).slice(0, 4);
  }, [sortedSectors, topEtfUnderSectorWinner, universeRows]);

  const [holdingSpotlight, setHoldingSpotlight] = useState<{
    loading: boolean;
    error: boolean;
    rows: HoldingSpotlightRow[];
  }>({ loading: false, error: false, rows: [] });

  useEffect(() => {
    // VIKTIG: Hierarki-logikk for Spotlight:
    // 1. Hvis under-ETF-en har aksjer (f.eks. SOXX), vis de 4 sterkeste aksjene der.
    // 2. Hvis ikke (f.eks. USO), sjekk om hovedsektoren (DBC) har aksjer.
    // 3. Ellers vis ingenting (fallback til søsken-ETFer skjer i render).
    
    let etfSym = topEtfUnderSectorWinner?.symbol;
    if (etfSym && getEtfHoldings(etfSym).length === 0 && winner) {
      // Fallback til sektorens egne definerte aksjer hvis sub-fondet er tomt (f.eks. olje-futures)
      if (getEtfHoldings(winner.symbol).length > 0) {
        etfSym = winner.symbol;
      }
    }

    if (!etfSym || !hasETFDetails(etfSym)) {
      setHoldingSpotlight({ loading: false, error: false, rows: [] });
      return;
    }
    const symbols = getTopHoldingSymbolsByWeight(etfSym, HOLDINGS_FETCH_CAP);
    if (symbols.length === 0) {
      setHoldingSpotlight({ loading: false, error: false, rows: [] });
      return;
    }
    let cancelled = false;
    setHoldingSpotlight({ loading: true, error: false, rows: [] });
    fetchMarketData(symbols, period, interval)
      .then(({ summary: fetched }) => {
        if (cancelled) return;
        const sorted = [...fetched].sort((a, b) => b.percentChange - a.percentChange);
        const top4 = sorted.slice(0, 4).map(s => ({
          symbol: s.symbol,
          name: getHoldingName(s.symbol) || s.name,
          changePct: s.percentChange,
        }));
        setHoldingSpotlight({ loading: false, error: false, rows: top4 });
      })
      .catch(() => {
        if (!cancelled) setHoldingSpotlight({ loading: false, error: true, rows: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [topEtfUnderSectorWinner?.symbol, winner, period, interval]);

  if (loading && summary.length === 0) {
    return (
      <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-800 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-slate-800/50 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (universeRows.length === 0) {
    return (
      <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-6 animate-pulse">
        <div className="h-6 w-40 bg-slate-800 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-slate-800/50 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const top5 = sortedSectors.slice(0, 5);
  const bottom5 = [...sortedSectors].reverse().slice(0, 5);

  const MetricBadge = ({ label, value, colorClass }: { label: string, value: string | number, colorClass?: string }) => (
    <div className="flex flex-col items-center px-1 py-1.5 rounded bg-slate-950/40 border border-white/10 shadow-inner min-w-0">
      <span className="text-[7px] uppercase text-slate-400 font-black tracking-tighter leading-tight mb-0.5 text-center truncate w-full px-0.5">{label}</span>
      <span className={`text-[11px] font-mono font-black leading-tight ${colorClass || 'text-white'} whitespace-nowrap`}>{value}</span>
    </div>
  );

  const subWinnerSym = topEtfUnderSectorWinner?.symbol;
  let spotlightSym = subWinnerSym;
  
  if (subWinnerSym && getEtfHoldings(subWinnerSym).length === 0 && winner) {
    if (getEtfHoldings(winner.symbol).length > 0) {
      spotlightSym = winner.symbol;
    }
  }

  const hasStockHoldings = Boolean(spotlightSym && getEtfHoldings(spotlightSym).length > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {/* Vinner-kort (kun hoved-/innsatssektorer) */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 border border-blue-400/30 rounded-2xl p-6 shadow-2xl shrink-0">
          <div className="flex justify-between items-start mb-5">
            <div>
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em]">
                {t('leaderboard.winnerLast', { period })}
              </span>
              <h3 className="text-2xl font-black text-white mt-1 tracking-tight">{winner?.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: winner?.color }}></div>
                <span className="text-xs text-blue-100 font-bold font-mono tracking-wider">{winner?.symbol}</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-black font-mono leading-none drop-shadow-md ${(winner?.changePct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(winner?.changePct ?? 0) > 0 ? '+' : ''}{winner?.changePct}%
              </div>
              <div className="text-[9px] text-blue-200 font-black uppercase mt-2 tracking-widest opacity-80">{t('leaderboard.totalReturn')}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MetricBadge
              label={t('leaderboard.metrics.relStrength')}
              value={`${(winner?.metrics?.relativeStrength ?? 0) > 0 ? '+' : ''}${winner?.metrics?.relativeStrength ?? 0}%`}
              colorClass={(winner?.metrics?.relativeStrength ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-300'}
            />
            <MetricBadge label={t('leaderboard.metrics.volatility')} value={`${winner?.metrics?.volatility ?? 0}%`} colorClass="text-blue-100" />
            <MetricBadge label={t('leaderboard.metrics.maxDrawdown')} value={`${winner?.metrics?.maxDrawdown ?? 0}%`} colorClass="text-rose-300" />
          </div>
        </div>

        {topEtfUnderSectorWinner && winner && (
          <div
            className={`rounded-xl border-l-4 border-blue-500/80 pl-4 pr-3 py-3 shadow-inner ${
              isDarkMode
                ? 'bg-slate-900/90 border border-slate-800 border-l-blue-500'
                : 'bg-slate-50 border border-slate-200 border-l-blue-500'
            }`}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-1">
              {t('leaderboard.subWinner.badge')}
            </p>
            <p className={`text-[11px] font-semibold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('leaderboard.subWinner.context', { sector: winner.name })}
            </p>
            
            <div className="flex justify-between items-center gap-3 mb-3 border-b border-white/5 pb-3">
              <div className="min-w-0">
                <div className="text-sm font-bold dark:text-slate-100 light:text-slate-800 truncate">
                  {topEtfUnderSectorWinner.name}
                </div>
                <span className="text-[10px] font-mono text-slate-500">{topEtfUnderSectorWinner.symbol}</span>
              </div>
              <span className={`text-lg font-black font-mono shrink-0 ${getStrongTrendColorClass(topEtfUnderSectorWinner.changePct)}`}>
                {topEtfUnderSectorWinner.changePct > 0 ? '+' : ''}
                {topEtfUnderSectorWinner.changePct}%
              </span>
            </div>

            <p className="text-[9px] font-black uppercase tracking-widest text-blue-500/90 mb-2">
              {hasStockHoldings ? t('leaderboard.subWinnerHoldings.badge') : t('leaderboard.subWinnerHoldings.siblingBadge')}
            </p>
            
            {/* Vi viser enten aksjer eller søsken-ETF-er i samme grid-layout */}
            <div className="mt-2">
              {hasStockHoldings ? (
                <>
                  {holdingSpotlight.loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={`rounded-lg px-3 py-2 animate-pulse ${isDarkMode ? 'bg-slate-800/60' : 'bg-slate-200/80'}`}
                        >
                          <div className={`h-3 w-16 rounded mb-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
                          <div className={`h-4 w-12 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
                        </div>
                      ))}
                    </div>
                  )}
                  {!holdingSpotlight.loading && holdingSpotlight.error && (
                    <p className="text-[10px] text-rose-400">Kunne ikke laste aksjedata</p>
                  )}
                  {!holdingSpotlight.loading && !holdingSpotlight.error && holdingSpotlight.rows.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {holdingSpotlight.rows.map(row => (
                        <div
                          key={row.symbol}
                          className={`rounded-lg border px-3 py-2 min-w-0 ${
                            isDarkMode ? 'bg-slate-950/40 border-slate-700/80' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <div className="min-w-0">
                              <div className={`text-[11px] font-bold truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                {row.name}
                              </div>
                              <span className="text-[9px] font-mono text-slate-500">{row.symbol}</span>
                            </div>
                            <span className={`text-xs font-black font-mono shrink-0 ${getStrongTrendColorClass(row.changePct)}`}>
                              {row.changePct > 0 ? '+' : ''}{row.changePct}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topSiblingEtfRows.map(row => (
                    <div
                      key={row.symbol}
                      className={`rounded-lg border px-3 py-2 min-w-0 ${
                        isDarkMode ? 'bg-slate-950/40 border-slate-700/80' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="min-w-0">
                          <div className={`text-[11px] font-bold truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                            {row.name}
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">{row.symbol}</span>
                        </div>
                        <span className={`text-xs font-black font-mono shrink-0 ${getStrongTrendColorClass(row.changePct)}`}>
                          {row.changePct > 0 ? '+' : ''}{row.changePct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Topp 5 */}
        <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-colors duration-300">
          <div className="px-6 py-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-100 bg-emerald-500/5">
            <h4 className="text-sm font-bold text-emerald-500 flex items-center gap-2 uppercase tracking-wider">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              {t('leaderboard.momentumLeaders')}
            </h4>
          </div>
          <div className="divide-y divide-slate-800 dark:divide-slate-800 light:divide-slate-100">
            {top5.map((item, i) => (
              <div key={item.symbol} className="px-5 py-3 hover:bg-slate-800/30 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-bold text-slate-500 w-3">{i + 1}</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-200 dark:text-slate-200 light:text-slate-700 truncate max-w-[100px]">{item.name}</span>
                      <span className="text-[9px] font-mono text-slate-500">{item.symbol}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-mono font-black ${getStrongTrendColorClass(item.changePct)}`}>
                    {item.changePct > 0 ? '+' : ''}{item.changePct}%
                  </span>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-tight">{t('leaderboard.metrics.relStrength')}</span>
                    <span className={`text-[9px] font-mono font-bold ${(item.metrics?.relativeStrength ?? 0) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {(item.metrics?.relativeStrength ?? 0) > 0 ? '+' : ''}{item.metrics?.relativeStrength ?? 0}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-tight">{t('leaderboard.metrics.volatility')}</span>
                    <span className="text-[9px] font-mono font-bold text-slate-400">{item.metrics?.volatility ?? 0}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bunn 5 */}
        <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-colors duration-300">
          <div className="px-6 py-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-100 bg-rose-500/5">
            <h4 className="text-sm font-bold text-rose-500 flex items-center gap-2 uppercase tracking-wider">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
              </svg>
              {t('leaderboard.meanReversion')}
            </h4>
          </div>
          <div className="divide-y divide-slate-800 dark:divide-slate-800 light:divide-slate-100">
            {bottom5.map((item, i) => (
              <div key={item.symbol} className="px-5 py-3 hover:bg-slate-800/30 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-bold text-slate-500 w-3">{i + 1}</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-200 dark:text-slate-200 light:text-slate-700 truncate max-w-[100px]">{item.name}</span>
                      <span className="text-[9px] font-mono text-slate-500">{item.symbol}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-mono font-black ${getStrongTrendColorClass(item.changePct)}`}>
                    {item.changePct}%
                  </span>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-tight">{t('leaderboard.metrics.maxDrawdown')}</span>
                    <span className="text-[9px] font-mono font-bold text-rose-500">{item.metrics?.maxDrawdown ?? 0}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-tight">{t('leaderboard.metrics.volatility')}</span>
                    <span className="text-[9px] font-mono font-bold text-slate-400">{item.metrics?.volatility ?? 0}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
