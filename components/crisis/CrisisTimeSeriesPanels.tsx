import React, { useMemo, useState } from 'react';
import {
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
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
  const [syncIndex, setSyncIndex] = useState<number | undefined>(undefined);

  const points = useMemo(() => rowsToChartPoints(crisisLogRows), [crisisLogRows]);
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;

  const grid = isDarkMode ? '#1e293b' : '#e2e8f0';
  const axis = isDarkMode ? '#64748b' : '#64748b';
  const tooltipBg = isDarkMode ? '#0f172a' : '#f8fafc';

  const onMouseMove = (state: any) => {
    if (state?.activeTooltipIndex !== undefined) {
      setSyncIndex(state.activeTooltipIndex);
    }
  };

  const onMouseLeave = () => setSyncIndex(undefined);

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
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-3 h-[280px] animate-pulse flex items-center justify-center">
          <div className="text-slate-600 font-black uppercase tracking-widest text-[10px]">
            {isNo ? 'Laster tidsserier…' : 'Loading time series…'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-3 h-[240px] animate-pulse flex items-center justify-center">
          <div className="text-slate-600 font-black uppercase tracking-widest text-[10px]">
            {isNo ? 'Henter historikk…' : 'Fetching history…'}
          </div>
        </div>
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
        <div className="border-b border-slate-700 mb-1 pb-1 font-bold">{String(p.label)}</div>
        {p.crisis_index != null ? (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500 uppercase text-[9px]">Index:</span>
            <span className="font-bold">{Number(p.crisis_index).toFixed(1)}</span>
          </div>
        ) : null}
        {p.helium_price_usd != null ? (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500 uppercase text-[9px]">Helium:</span>
            <span className="font-bold text-violet-400">{Number(p.helium_price_usd).toFixed(2)}</span>
          </div>
        ) : null}
        {p.taiwan_reserve_pct != null ? (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500 uppercase text-[9px]">Taiwan %:</span>
            <span className={`font-bold ${Number(p.taiwan_reserve_pct) < 6 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {Number(p.taiwan_reserve_pct).toFixed(1)}%
            </span>
          </div>
        ) : null}
        {p.korea_reserve_pct != null ? (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500 uppercase text-[9px]">Korea %:</span>
            <span className={`font-bold ${Number(p.korea_reserve_pct) < 6 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {Number(p.korea_reserve_pct).toFixed(1)}%
            </span>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 light:bg-white light:border-slate-200 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400/90 mb-2 px-1">
          {isNo ? 'Crisis Index over tid' : 'Crisis index over time'}
        </p>
        <div className="h-[260px] w-full min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={points}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: axis, fontSize: 9 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis domain={[0, 100]} tick={{ fill: axis, fontSize: 9 }} width={32} />
              <Tooltip content={tip} activeIndex={syncIndex} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
              <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="4 4" strokeOpacity={0.7} />
              {lastPoint && lastPoint.crisis_index != null && (
                <ReferenceDot
                  x={lastPoint.label}
                  y={lastPoint.crisis_index}
                  r={3}
                  fill="#22d3ee"
                  stroke="#0f172a"
                  strokeWidth={1}
                />
              )}
              <Line
                type="monotone"
                dataKey="crisis_index"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              {points.length > 50 && (
                <Brush
                  dataKey="label"
                  height={20}
                  stroke="#334155"
                  fill="#0f172a"
                  startIndex={Math.max(0, points.length - 100)}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 light:bg-white light:border-slate-200 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-violet-400/90 mb-2 px-1">
          {isNo ? 'Energi-reserver vs 6% terskel' : 'Energy reserves vs 6% threshold'}
        </p>
        <div className="h-[260px] w-full min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={points}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: axis, fontSize: 9 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fill: axis, fontSize: 9 }} width={40} domain={[0, 15]} />
              <Tooltip content={tip} activeIndex={syncIndex} />
              {/* 6% Critical Line */}
              <ReferenceLine y={6} stroke="#f43f5e" strokeWidth={2} strokeDasharray="6 3" label={{ position: 'right', value: '6% LIMIT', fill: '#f43f5e', fontSize: 8, fontWeight: 'bold' }} />
              
              {lastPoint && lastPoint.taiwan_reserve_pct != null && (
                <ReferenceDot
                  x={lastPoint.label}
                  y={lastPoint.taiwan_reserve_pct}
                  r={3}
                  fill="#34d399"
                  stroke="#0f172a"
                  strokeWidth={1}
                />
              )}
              {lastPoint && (lastPoint as any).korea_reserve_pct != null && (
                <ReferenceDot
                  x={lastPoint.label}
                  y={(lastPoint as any).korea_reserve_pct}
                  r={3}
                  fill="#fbbf24"
                  stroke="#0f172a"
                  strokeWidth={1}
                />
              )}
              <Line
                type="monotone"
                dataKey="taiwan_reserve_pct"
                name="Taiwan %"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="korea_reserve_pct"
                name="Korea %"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              {points.length > 50 && (
                <Brush
                  dataKey="label"
                  height={20}
                  stroke="#334155"
                  fill="#0f172a"
                  startIndex={Math.max(0, points.length - 100)}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 light:bg-white light:border-slate-200 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-violet-400/90 mb-2 px-1">
          {isNo ? 'Helium (USD) Markedspris' : 'Helium (USD) Market Price'}
        </p>
        <div className="h-[220px] w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={points}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: axis, fontSize: 9 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fill: axis, fontSize: 9 }} width={40} domain={['auto', 'auto']} />
              <Tooltip content={tip} activeIndex={syncIndex} />
              {lastPoint && lastPoint.helium_price_usd != null && (
                <ReferenceDot
                  x={lastPoint.label}
                  y={lastPoint.helium_price_usd}
                  r={3}
                  fill="#a78bfa"
                  stroke="#0f172a"
                  strokeWidth={1}
                />
              )}
              <Line
                type="monotone"
                dataKey="helium_price_usd"
                name="He"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
