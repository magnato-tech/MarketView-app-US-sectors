import React, { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { useDashboard } from '../../contexts/DashboardContext';
import { useCrisisEngine } from '../../contexts/CrisisEngineContext';
import { rowsToChartPoints } from '../../services/crisisChartData';

type Props = { isNo: boolean };

export const CrisisTimeSeriesPanels: React.FC<Props> = ({ isNo }) => {
  const { isDarkMode } = useDashboard();
  const { crisisLogRows, crisisLogLoading, crisisLogError } = useCrisisEngine();

  const points = useMemo(() => rowsToChartPoints(crisisLogRows), [crisisLogRows]);
  const grid = isDarkMode ? '#1e293b' : '#e2e8f0';
  const axis = isDarkMode ? '#64748b' : '#64748b';
  const tooltipBg = isDarkMode ? '#0f172a' : '#f8fafc';

  if (crisisLogError) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">
        {isNo ? 'Kunne ikke laste historikk: ' : 'Could not load history: '}
        {crisisLogError}
      </div>
    );
  }

  if (crisisLogLoading && points.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 p-8 text-center text-sm text-slate-500">
        {isNo ? 'Laster tidsserier…' : 'Loading time series…'}
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 p-8 text-center text-sm text-slate-500">
        {isNo
          ? 'Ingen rader i crisis_log ennå. Kjør kinvest_monitor.py for å fylle historikk.'
          : 'No rows in crisis_log yet. Run kinvest_monitor.py to populate history.'}
      </div>
    );
  }

  const tip = (props: TooltipContentProps<number, string>) => {
    const { active, payload } = props;
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as Record<string, unknown>;
    return (
      <div
        className="rounded border border-slate-600 px-2 py-1 text-[11px] font-mono shadow-lg"
        style={{ background: tooltipBg, color: isDarkMode ? '#e2e8f0' : '#0f172a' }}
      >
        <div>{String(p.label)}</div>
        {p.crisis_index != null ? <div>index {Number(p.crisis_index).toFixed(1)}</div> : null}
        {p.helium_price_usd != null ? <div>He {Number(p.helium_price_usd).toFixed(2)}</div> : null}
        {p.taiwan_reserve_pct != null ? <div>TW {Number(p.taiwan_reserve_pct).toFixed(1)}%</div> : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 light:bg-white light:border-slate-200 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400/90 mb-2 px-1">
          {isNo ? 'Crisis Index over tid' : 'Crisis index over time'}
        </p>
        <div className="h-[220px] w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: axis, fontSize: 9 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis domain={[0, 100]} tick={{ fill: axis, fontSize: 9 }} width={32} />
              <Tooltip content={tip} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
              <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="4 4" strokeOpacity={0.7} />
              <Line
                type="monotone"
                dataKey="crisis_index"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 light:bg-white light:border-slate-200 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-violet-400/90 mb-2 px-1">
          {isNo ? 'Helium (USD) og Taiwan-reserve (%)' : 'Helium (USD) and Taiwan reserve (%)'}
        </p>
        <div className="h-[220px] w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: axis, fontSize: 9 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis yAxisId="L" tick={{ fill: axis, fontSize: 9 }} width={40} />
              <YAxis yAxisId="R" orientation="right" tick={{ fill: axis, fontSize: 9 }} width={40} />
              <Tooltip content={tip} />
              <ReferenceLine yAxisId="R" y={6} stroke="#f43f5e" strokeDasharray="4 4" strokeOpacity={0.7} />
              <Line
                yAxisId="L"
                type="monotone"
                dataKey="helium_price_usd"
                name="He"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="R"
                type="monotone"
                dataKey="taiwan_reserve_pct"
                name="TW%"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
