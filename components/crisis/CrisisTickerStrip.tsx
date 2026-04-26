import React, { useMemo } from 'react';
import { useCrisisEngine } from '../../contexts/CrisisEngineContext';
import { twdPerOneUsd } from '../../services/crisisEngineRules';

type Props = { isNo: boolean };

export const CrisisTickerStrip: React.FC<Props> = ({ isNo }) => {
  const { engineRow } = useCrisisEngine();

  const cells = useMemo(() => {
    const twdPerUsd = twdPerOneUsd(engineRow?.twd_usd ?? null);
    const fmt = (n: number | null | undefined, d = 2) =>
      n != null && Number.isFinite(n) ? n.toFixed(d) : '—';
    return [
      {
        k: 'idx',
        label: isNo ? 'Crisis Index' : 'Crisis Index',
        v: engineRow?.crisis_index != null ? fmt(Number(engineRow.crisis_index), 1) : '—',
        accent: 'cyan' as const,
      },
      {
        k: 'tw',
        label: isNo ? 'Taiwan res.' : 'TW reserve',
        v: fmt(engineRow?.taiwan_reserve_pct ?? null, 1) + (engineRow?.taiwan_reserve_pct != null ? '%' : ''),
        accent: 'violet' as const,
      },
      {
        k: 'he',
        label: isNo ? 'Helium' : 'Helium',
        v: fmt(engineRow?.helium_price_usd ?? null, 2) + (engineRow?.helium_price_usd != null ? ' USD' : ''),
        accent: 'cyan' as const,
      },
      {
        k: 'fx',
        label: isNo ? 'TWD/USD' : 'TWD/USD',
        v: fmt(engineRow?.twd_usd ?? null, 5),
        accent: 'violet' as const,
      },
      {
        k: 'tp',
        label: isNo ? 'TWD per 1 USD' : 'TWD per 1 USD',
        v: twdPerUsd != null ? twdPerUsd.toFixed(2) : '—',
        accent: 'cyan' as const,
      },
    ];
  }, [engineRow, isNo]);

  return (
    <div className="rounded-xl border border-cyan-500/25 bg-slate-950/80 light:bg-white light:border-cyan-600/20 px-3 py-3 shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)]">
      <div className="flex flex-wrap gap-3 justify-between items-stretch">
        {cells.map(c => (
          <div
            key={c.k}
            className={`min-w-[100px] flex-1 rounded-lg border px-3 py-2 ${
              c.accent === 'cyan'
                ? 'border-cyan-500/40 bg-cyan-500/5'
                : 'border-violet-500/35 bg-violet-500/5'
            }`}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 light:text-slate-600">
              {c.label}
            </p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-100 light:text-slate-900 tracking-tight">
              {c.v}
            </p>
          </div>
        ))}
      </div>
      {engineRow?.critical_sell ? (
        <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 animate-pulse">
          {isNo ? 'KRITISK SALGSSIGNAL' : 'CRITICAL SELL'}
        </p>
      ) : null}
    </div>
  );
};
