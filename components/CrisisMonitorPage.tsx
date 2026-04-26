import React, { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCrisisEngine } from '../contexts/CrisisEngineContext';
import { HEARTBEAT_OK_MINUTES } from '../services/crisisEngineRules';
import { AnalystVerdict } from './AnalystVerdict';

const systemPrompt = `Jeg vil bygge en "Crisis Monitor" modul for min investeringsplattform, KInvest.

Programmet skal tracke ledende KPI-er for å forutse et krakk i halvlederindustrien basert på energikrisen i 2026.

1. Datainnhenting:
- Hent JKM LNG Spot Price og Brent Crude (Twelve Data API)
- Hent TWD/USD vekslingskurs
- Scrape Taipower Operating Reserve % fra taipower.com.tw
- Hent Helium Spot Price (placeholder-funksjon via CSV/API)

2. Lagring og tracking:
- Logg alle verdier hver time i lokal SQLite
- Kalkuler Rate of Change (ROC) over siste 24 timer

3. Varslingslogikk (Kill Switch):
- Lag Health Score fra 0-100
- Send CRITICAL_SELL (rød tekst) når:
  - Helium-pris stiger > 10% på 24t
  - Taipower Reserve faller under 6%
  - TWD svekker seg > 2% samtidig som Nasdaq er flat eller opp

4. Visualisering:
- Terminal-dashboard med Rich som viser KPI-tabell og status
- Skriv modulær, robust kode med feilhåndtering

Ekstra:
Health Score = (Grid_weight * Reserve) + (Gas_weight * Price_inv) + (FX_weight * Stability)
Alarm: Delta Helium_24h > 15% => Immediate Liquidation Warning`;

export const CrisisMonitorPage: React.FC = () => {
  const { language } = useLanguage();
  const isNo = language === 'no';
  const [instructionsOpen, setInstructionsOpen] = useState(true);

  const { supabaseReady, engineRow, realtimeState, heartbeatFresh, operational, visualTier } =
    useCrisisEngine();

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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-orange-500/10 p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-rose-400">
          {isNo ? 'Kinvest Moduler' : 'Kinvest Modules'}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100 dark:text-slate-100 light:text-slate-900">
          Crisis Monitor
        </h2>
        <p className="mt-2 text-sm text-slate-300 dark:text-slate-300 light:text-slate-700">
          {isNo
            ? 'Live status fra Supabase (engine_status + Realtime). Kjør kinvest_monitor.py med service role for å skrive KPI-rader.'
            : 'Live status from Supabase (engine_status + Realtime). Run kinvest_monitor.py with the service role to write KPI rows.'}
        </p>
      </div>

      {!supabaseReady ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          {isNo
            ? 'Supabase er ikke konfigurert i frontend. Sett VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY (eller SUPABASE_URL / SUPABASE_ANON_KEY) og restart Vite.'
            : 'Supabase is not configured for the frontend. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY) and restart Vite.'}
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
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isNo ? 'Engine heartbeat (Supabase)' : 'Engine heartbeat (Supabase)'}
            </p>
            <p className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">{heartbeatTitle}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">{heartbeatSubtitle}</p>
            {engineRow?.last_heartbeat ? (
              <p className="text-xs text-slate-500 mt-1 font-mono">{engineRow.last_heartbeat}</p>
            ) : null}
            <p className="text-[10px] text-slate-500 mt-1">
              Realtime: {realtimeState === 'subscribed' ? 'SUBSCRIBED' : realtimeState === 'error' ? 'ERROR' : '…'}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400 space-y-1">
            {engineRow?.status ? (
              <p>
                <span className="font-bold text-slate-300">Status:</span>{' '}
                <span className="font-mono text-slate-100">{engineRow.status}</span>
              </p>
            ) : null}
            {engineRow?.crisis_index != null ? (
              <p>
                <span className="font-bold text-slate-300">Crisis Index:</span>{' '}
                <span className="font-mono text-slate-100">{Number(engineRow.crisis_index).toFixed(1)}</span>
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

      <div className="rounded-2xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900 dark:bg-slate-900 light:bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setInstructionsOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/40 dark:hover:bg-slate-800/40 light:hover:bg-slate-50 transition-colors"
        >
          <span className="text-sm font-black uppercase tracking-widest text-blue-400">
            {isNo ? 'Oppstart for operatør' : 'Operator startup'}
          </span>
          <span className="text-xs font-bold text-slate-500">{instructionsOpen ? '−' : '+'}</span>
        </button>
        {instructionsOpen ? (
          <div className="px-5 pb-5 space-y-4 border-t border-slate-800 dark:border-slate-800 light:border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">
                {isNo ? 'Installer avhengigheter' : 'Install dependencies'}
              </p>
              <pre className="text-[11px] font-mono bg-slate-950/60 light:bg-slate-100 p-3 rounded-lg text-slate-200 light:text-slate-800 overflow-x-auto">
                pip install -r requirements-monitor.txt
              </pre>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">
                {isNo ? 'Loop-modus (hver time)' : 'Loop mode (hourly)'}
              </p>
              <pre className="text-[11px] font-mono bg-slate-950/60 light:bg-slate-100 p-3 rounded-lg text-slate-200 light:text-slate-800 overflow-x-auto">
                python kinvest_monitor.py --loop --interval-seconds 3600 --db-path kinvest_crisis.db --helium-csv helium_placeholder.csv
              </pre>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">
                {isNo ? 'Miljøvariabler (.env)' : 'Environment variables (.env)'}
              </p>
              <ul className="text-sm text-slate-300 dark:text-slate-300 light:text-slate-700 space-y-1 list-disc pl-5">
                <li>
                  <code className="text-emerald-300">SUPABASE_URL</code> {isNo ? 'eller' : 'or'}{' '}
                  <code className="text-emerald-300">VITE_SUPABASE_URL</code> — Python + Vite
                </li>
                <li>
                  <code className="text-emerald-300">SUPABASE_SERVICE_ROLE_KEY</code> —{' '}
                  {isNo ? 'kun i Python (kinvest_monitor), aldri VITE_' : 'Python only (kinvest_monitor), never VITE_'}
                </li>
                <li>
                  <code className="text-emerald-300">VITE_SUPABASE_ANON_KEY</code> {isNo ? 'eller' : 'or'}{' '}
                  <code className="text-emerald-300">SUPABASE_ANON_KEY</code> —{' '}
                  {isNo ? 'nettleser (Crisis Monitor)' : 'browser (Crisis Monitor)'}
                </li>
                <li>
                  <code className="text-emerald-300">TWELVE_DATA_API_KEY</code> /{' '}
                  <code className="text-emerald-300">ALPHA_VANTAGE_API_KEY</code> — KPI-kilder
                </li>
                <li>
                  <code className="text-emerald-300">KINVEST_BLOCKADE_START</code> —{' '}
                  {isNo ? 'valgfri void-tidslinje i terminal' : 'optional void timeline in terminal'}
                </li>
              </ul>
            </div>
            <p className="text-[11px] text-slate-500">
              {isNo
                ? 'Migrasjoner: supabase/migrations/20260426201000_engine_status_realtime.sql (Realtime) og 20260426220000_engine_status_kpi_columns.sql (KPI-kolonner på engine_status for sidebar/analytiker).'
                : 'Migrations: supabase/migrations/20260426201000_engine_status_realtime.sql (Realtime) and 20260426220000_engine_status_kpi_columns.sql (KPI columns on engine_status for sidebar/analyst).'}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900 dark:bg-slate-900 light:bg-white p-5">
          <h3 className="text-xs uppercase tracking-widest font-black text-slate-400 mb-3">
            {isNo ? 'System Prompt til Cursor' : 'System Prompt for Cursor'}
          </h3>
          <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-200 dark:text-slate-200 light:text-slate-800 font-mono">
            {systemPrompt}
          </pre>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900 dark:bg-slate-900 light:bg-white p-4">
            <h4 className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">
              {isNo ? 'Hva denne modulen gjør' : 'What this module does'}
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-300 dark:text-slate-300 light:text-slate-700">
              <li>{isNo ? 'Skriver KPI-rader til Supabase crisis_log hver kjøring.' : 'Writes KPI rows to Supabase crisis_log on each run.'}</li>
              <li>{isNo ? 'Oppdaterer engine_status (id=1) med OPERATIONAL heartbeat.' : 'Updates engine_status (id=1) with an OPERATIONAL heartbeat.'}</li>
              <li>{isNo ? 'Asian Grid Lock: Taipower og KPX begge under 6% → crisis index 95+ og umiddelbar critical sell.' : 'Asian Grid Lock: Taipower and KPX both under 6% → crisis index 95+ and immediate critical sell.'}</li>
            </ul>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <h4 className="text-sm font-bold text-amber-300">
              {isNo ? 'Analysesjefens tommelfingerregel' : 'Chief analyst rule of thumb'}
            </h4>
            <p className="mt-2 text-sm text-amber-100/90">
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
