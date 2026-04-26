import React from 'react';
import { useCrisisEngine } from '../../contexts/CrisisEngineContext';

type Props = { isNo: boolean };

export const CrisisIndexBand: React.FC<Props> = ({ isNo }) => {
  const { engineRow } = useCrisisEngine();
  const raw = engineRow?.crisis_index;
  const v = raw != null && Number.isFinite(Number(raw)) ? Math.max(0, Math.min(100, Number(raw))) : null;

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 light:bg-slate-100 light:border-slate-200 p-4">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {isNo ? 'Stress-indeks 0–100' : 'Stress index 0–100'}
        </span>
        <span className="font-mono text-xl font-bold text-slate-100 light:text-slate-900 tabular-nums">
          {v != null ? v.toFixed(1) : '—'}
        </span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-emerald-600/40 via-amber-500/50 to-rose-600/70">
        {v != null ? (
          <div
            className="absolute top-0 bottom-0 w-1.5 rounded-sm bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] border border-slate-900"
            style={{ left: `calc(${v}% - 3px)` }}
            title={`${v.toFixed(1)}`}
          />
        ) : null}
      </div>
      <div className="mt-1 flex justify-between text-[9px] font-mono text-slate-500">
        <span>0</span>
        <span className="text-amber-400/90">50</span>
        <span className="text-rose-400/90">75</span>
        <span>100</span>
      </div>
    </div>
  );
};
