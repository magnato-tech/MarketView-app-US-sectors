import React, { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCrisisEngine } from '../contexts/CrisisEngineContext';
import { HEARTBEAT_OK_MINUTES } from '../services/crisisEngineRules';
import { AnalystVerdict } from './AnalystVerdict';
import { CRISIS_DEVELOPER_SYSTEM_PROMPT } from '../content/crisisDeveloperPrompt';
import { CrisisTickerStrip } from './crisis/CrisisTickerStrip';
import { CrisisIndexBand } from './crisis/CrisisIndexBand';
import { CrisisTimeSeriesPanels } from './crisis/CrisisTimeSeriesPanels';
import { CrisisSparklineRow } from './crisis/CrisisSparklineRow';
import { CrisisKpiHighlightCards } from './crisis/CrisisKpiHighlightCards';
import { CrisisStackNarrative } from './crisis/CrisisStackNarrative';
import { CrisisAiPrimer } from './crisis/CrisisAiPrimer';

export const CrisisMonitorPage: React.FC = () => {
  const { language } = useLanguage();
  const isNo = language === 'no';
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [devDocOpen, setDevDocOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);

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
          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-orange-500/10 p-6">
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-rose-400">
              {isNo ? 'Kinvest Moduler' : 'Kinvest Modules'}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100 dark:text-slate-100 light:text-slate-900">
              Crisis Monitor
            </h2>
            <p className="mt-2 text-sm text-slate-300 dark:text-slate-300 light:text-slate-700">
              {isNo
                ? 'Fysiske ledende KPI-er, tidsserier fra Supabase og sanntids heartbeat — bygget for å lese bunnen av kaka før toppen av markedet rekker å ompris.'
                : 'Physical leading KPIs, Supabase time series and a realtime heartbeat — built to read the bottom of the stack before the market reprices the top.'}
            </p>
          </div>

          <div className="lg:hidden">
            <CrisisAiPrimer isNo={isNo} />
          </div>

          {!supabaseReady ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              {isNo
                ? 'Supabase er ikke konfigurert i frontend. Sett VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY (eller SUPABASE_URL / SUPABASE_ANON_KEY) og restart Vite.'
                : 'Supabase is not configured for the frontend. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY) and restart Vite.'}
            </div>
          ) : null}

          {supabaseReady ? (
            <div className="space-y-4">
              <CrisisTickerStrip isNo={isNo} />
              <CrisisKpiHighlightCards isNo={isNo} />
              <CrisisIndexBand isNo={isNo} />
              <CrisisTimeSeriesPanels isNo={isNo} />
              <CrisisSparklineRow isNo={isNo} />
            </div>
          ) : null}

          <div
            className={`rounded-2xl border p-4 ${
              visualTier === 'green'
                ? 'border-emerald-500/50 bg-emerald-500/15'
                : visualTier === 'yellow'
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : visualTier === 'red' || visualTier === 'grid_lock'
                    ? 'border-rose-500/50 bg-rose-500/10'
                    : 'border-slate-700 bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100'
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

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 light:bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setStoryOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                {isNo ? 'Narrativ & Verdikjede' : 'Narrative & Value Chain'}
              </span>
              <span className="text-xs font-bold text-slate-500">{storyOpen ? '−' : '+'}</span>
            </button>
            {storyOpen ? (
              <div className="px-4 pb-4 border-t border-slate-800">
                <div className="mt-4 transform scale-[0.9] origin-top">
                  <CrisisStackNarrative isNo={isNo} />
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 light:bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setInstructionsOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                {isNo ? 'Operatør-oppstart' : 'Operator Startup'}
              </span>
              <span className="text-xs font-bold text-slate-500">{instructionsOpen ? '−' : '+'}</span>
            </button>
            {instructionsOpen ? (
              <div className="px-4 pb-4 space-y-4 border-t border-slate-800 text-[11px]">
                <div>
                  <p className="font-bold text-slate-400 mb-1">{isNo ? 'Install' : 'Install'}</p>
                  <pre className="bg-slate-950/60 p-2 rounded text-slate-300 overflow-x-auto">
                    pip install -r requirements-monitor.txt
                  </pre>
                </div>
                <div>
                  <p className="font-bold text-slate-400 mb-1">{isNo ? 'Run loop' : 'Run loop'}</p>
                  <pre className="bg-slate-950/60 p-2 rounded text-slate-300 overflow-x-auto">
                    python kinvest_monitor.py --loop --interval-seconds 3600
                  </pre>
                </div>
                <p className="text-slate-500 leading-tight">
                  {isNo
                    ? 'Sørg for at SUPABASE_SERVICE_ROLE_KEY er satt i .env for heartbeat-oppdatering.'
                    : 'Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env for heartbeat updates.'}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 light:bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setDevDocOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {isNo ? 'System Prompt' : 'System Prompt'}
              </span>
              <span className="text-xs font-bold text-slate-500">{devDocOpen ? '−' : '+'}</span>
            </button>
            {devDocOpen ? (
              <div className="px-4 pb-4 border-t border-slate-800">
                <pre className="mt-4 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-400 font-mono">
                  {CRISIS_DEVELOPER_SYSTEM_PROMPT}
                </pre>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900 dark:bg-slate-900 light:bg-white p-4">
            <h4 className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">
              {isNo ? 'Hva denne modulen gjør' : 'What this module does'}
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-300 dark:text-slate-300 light:text-slate-700 leading-snug">
              <li>
                {isNo
                  ? 'Skriver KPI-rader til Supabase crisis_log hver kjøring.'
                  : 'Writes KPI rows to Supabase crisis_log on each run.'}
              </li>
              <li>
                {isNo
                  ? 'Oppdaterer engine_status (id=1) med OPERATIONAL heartbeat.'
                  : 'Updates engine_status (id=1) with an OPERATIONAL heartbeat.'}
              </li>
              <li>
                {isNo
                  ? 'Asian Grid Lock: Taipower og KPX begge under 6% → crisis index 95+ og umiddelbar critical sell.'
                  : 'Asian Grid Lock: Taipower and KPX both under 6% → crisis index 95+ and immediate critical sell.'}
              </li>
            </ul>
          </div>

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
