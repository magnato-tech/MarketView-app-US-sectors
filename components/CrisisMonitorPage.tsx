import React, { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCrisisEngine } from '../contexts/CrisisEngineContext';
import { HEARTBEAT_OK_MINUTES } from '../services/crisisEngineRules';
import { AnalystVerdict } from './AnalystVerdict';
import { CrisisTickerStrip } from './crisis/CrisisTickerStrip';
import { CrisisIndexBand } from './crisis/CrisisIndexBand';
import { CrisisTimeSeriesPanels } from './crisis/CrisisTimeSeriesPanels';
import { CrisisSparklineRow } from './crisis/CrisisSparklineRow';
import { CrisisKpiHighlightCards } from './crisis/CrisisKpiHighlightCards';
import { CrisisAiPrimer } from './crisis/CrisisAiPrimer';
import { CrisisGridLockVisual } from './crisis/CrisisGridLockVisual';
import { CrisisSixPercentExplainer } from './crisis/CrisisSixPercentExplainer';

export const CrisisMonitorPage: React.FC = () => {
  const { language } = useLanguage();
  const isNo = language === 'no';

  const { supabaseReady, engineRow, realtimeState, heartbeatFresh, visualTier } = useCrisisEngine();

  const heartbeatTitle = useMemo(() => {
    if (!heartbeatFresh) {
      return isNo ? 'Ingen fersk heartbeat' : 'No fresh heartbeat';
    }
    if (visualTier === 'grid_lock') {
      return isNo ? 'Asian Grid Lock' : 'Asian Grid Lock';
    }
    if (visualTier === 'red') {
      return isNo ? 'Rød KPI-sone' : 'Red KPI band';
    }
    if (visualTier === 'yellow') {
      return isNo ? 'Gul advarsel / drift' : 'Yellow alert / degraded';
    }
    return isNo ? 'OPERATIONAL' : 'OPERATIONAL';
  }, [heartbeatFresh, visualTier, isNo]);

  const heartbeatAgeHint = useMemo(() => {
    const raw = engineRow?.last_heartbeat;
    if (!raw) return null;
    const t = Date.parse(raw);
    if (Number.isNaN(t)) return null;
    const min = Math.floor((Date.now() - t) / 60_000);
    if (min < 0) return null;
    return isNo
      ? `Siste heartbeat er ${min} min gammel (grense ${HEARTBEAT_OK_MINUTES} min for «fersk»).`
      : `Last heartbeat is ${min} min old (fresh limit ${HEARTBEAT_OK_MINUTES} min).`;
  }, [engineRow?.last_heartbeat, isNo]);

  const heartbeatSubtitle = useMemo(() => {
    if (!heartbeatFresh) {
      return isNo
        ? `Kjør kinvest_monitor.py med Supabase-nøkler (minst én gang innen ${HEARTBEAT_OK_MINUTES} min). ${heartbeatAgeHint ?? ''}`
        : `Run kinvest_monitor.py with Supabase keys (at least once within ${HEARTBEAT_OK_MINUTES} min). ${heartbeatAgeHint ?? ''}`;
    }
    if (visualTier === 'green') {
      return isNo
        ? `Heartbeat nyere enn ${HEARTBEAT_OK_MINUTES} min, OPERATIONAL, KPI i grønn sone. TWD per 1 USD = 1 ÷ twd_usd (Alpha Vantage lagrer USD per TWD).`
        : `Heartbeat newer than ${HEARTBEAT_OK_MINUTES} min, OPERATIONAL, KPIs in green. TWD per 1 USD = 1 ÷ twd_usd (Alpha Vantage stores USD per TWD).`;
    }
    return isNo
      ? 'Verstefall vinner: Asian Grid Lock > rød KPI > gul > grønn. Rød Taiwan/KPI overstyrer «grønn» helium.'
      : 'Worst case wins: Asian Grid Lock > red KPI > yellow > green. A red Taiwan/KPI band overrides a “green” helium print.';
  }, [heartbeatFresh, visualTier, isNo, heartbeatAgeHint]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-6">
          <div className="rounded-2xl border border-rose-500/30 bg-slate-950 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500/50 via-orange-500/50 to-rose-500/50" />
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-rose-500/80">
              {isNo ? 'Kinvest Terminal' : 'Kinvest Terminal'}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tighter text-slate-100 uppercase">
              Crisis Monitor <span className="text-rose-500 ml-2">v2.6</span>
            </h2>
            <p className="mt-4 text-sm text-slate-400 max-w-2xl leading-relaxed font-medium">
              {isNo
                ? 'Sanntidsovervåking av fysiske flaskehalser i halvleder-verdikjeden. Vi måler energireserver, industrigass og kapitalflukt før de reflekteres i aksjekursene.'
                : 'Real-time monitoring of physical bottlenecks in the semiconductor value chain. Measuring energy reserves, industrial gas, and capital flight before they hit equity prices.'}
            </p>
          </div>

          <div className="lg:hidden">
            <CrisisAiPrimer isNo={isNo} />
          </div>

          {!supabaseReady ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100 font-mono">
              {isNo
                ? '!! SUPABASE_CONFIG_MISSING: Sett VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY.'
                : '!! SUPABASE_CONFIG_MISSING: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'}
            </div>
          ) : null}

          {supabaseReady ? (
            <div className="space-y-6">
              <CrisisTickerStrip isNo={isNo} />
              <CrisisGridLockVisual isNo={isNo} />
              <CrisisSixPercentExplainer isNo={isNo} />
              <div className="grid grid-cols-1 gap-6">
                <CrisisKpiHighlightCards isNo={isNo} />
                <CrisisIndexBand isNo={isNo} />
                <CrisisTimeSeriesPanels isNo={isNo} />
                <CrisisSparklineRow isNo={isNo} />
              </div>
            </div>
          ) : null}

          <div
            className={`rounded-2xl border p-6 transition-all ${
              visualTier === 'green'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : visualTier === 'yellow'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : visualTier === 'red' || visualTier === 'grid_lock'
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : 'border-slate-800 bg-slate-900/40'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 light:text-slate-500">
                  {isNo ? 'Engine heartbeat (Supabase)' : 'Engine heartbeat (Supabase)'}
                </p>
                <p className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">
                  {heartbeatTitle}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xl light:text-slate-500">{heartbeatSubtitle}</p>
                {engineRow?.last_heartbeat ? (
                  <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">{engineRow.last_heartbeat}</p>
                ) : null}
            <div className="mt-1 flex items-center gap-2">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">
                Realtime: {realtimeState === 'subscribed' ? 'SUBSCRIBED' : realtimeState === 'error' ? 'ERROR' : '…'}
              </p>
              {realtimeState === 'subscribed' && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
              )}
            </div>
              </div>
              <div className="text-right text-xs text-slate-400 space-y-1 light:text-slate-500 font-mono">
                {engineRow?.status ? (
                  <p>
                    <span className="font-bold text-slate-300 light:text-slate-400">Status:</span>{' '}
                    <span className="text-slate-100 light:text-slate-900">{engineRow.status}</span>
                  </p>
                ) : null}
                {engineRow?.crisis_index != null ? (
                  <p>
                    <span className="font-bold text-slate-300 light:text-slate-400 uppercase text-[9px]">Index:</span>{' '}
                    <span className="text-slate-100 light:text-slate-900 font-bold tabular-nums">
                      {Number(engineRow.crisis_index).toFixed(1)}
                    </span>
                  </p>
                ) : null}
                {engineRow?.asian_grid_lock ? (
                  <p className="text-rose-400 font-black uppercase tracking-wide">Asian Grid Lock</p>
                ) : null}
                {engineRow?.critical_sell ? (
                  <p className="text-rose-500 font-black uppercase tracking-wide">
                    {isNo ? 'Kritisk salgssignal' : 'Critical sell signal'}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {supabaseReady ? <AnalystVerdict /> : null}
        </div>

        <aside className="w-full lg:w-80 space-y-6">
          <div className="hidden lg:block">
            <CrisisAiPrimer isNo={isNo} />
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <h4 className="text-sm font-bold text-amber-300">
              {isNo ? 'Analysesjefens tommelfingerregel' : 'Chief analyst rule of thumb'}
            </h4>
            <p className="mt-2 text-sm text-amber-100/90 leading-snug">
              {isNo
                ? 'Når begge nett reservene kryper under 6%, er det ikke lenger «nyheter» — det er fysisk kapasitetskollaps. Da prioriteres Asian Grid Lock over alt annet.'
                : 'When both grid reserves slip under 6%, it is no longer “headlines” — it is physical capacity collapse. Asian Grid Lock then overrides softer signals.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
