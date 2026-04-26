import React from 'react';
import { useCrisisEngine } from '../../contexts/CrisisEngineContext';

type Props = { isNo: boolean };

export const CrisisGridLockVisual: React.FC<Props> = ({ isNo }) => {
  const { engineRow } = useCrisisEngine();
  const tw = engineRow?.taiwan_reserve_pct ?? null;
  const kr = engineRow?.korea_reserve_pct ?? null;
  const isLock = engineRow?.asian_grid_lock === true;

  const getLevel = (v: number | null) => {
    if (v === null) return 'gray';
    if (v < 6) return 'critical';
    if (v < 10) return 'warning';
    return 'ok';
  };

  const twLevel = getLevel(tw);
  const krLevel = getLevel(kr);

  const barColor = (level: string) => {
    if (level === 'critical') return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)]';
    if (level === 'warning') return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]';
    if (level === 'ok') return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]';
    return 'bg-slate-700';
  };

  return (
    <div className={`rounded-2xl border p-6 transition-all duration-700 ${
      isLock 
        ? 'border-rose-600 bg-rose-950/40 shadow-[0_0_50px_-10px_rgba(225,29,72,0.5)]' 
        : 'border-slate-700 bg-slate-900/80 shadow-xl'
    }`}>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              {isNo ? 'Asiatisk Grid-status (Sanntid)' : 'Asian Grid Status (Realtime)'}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">
              {isNo ? 'Overvåking av kritisk wafer-fab infrastruktur' : 'Monitoring critical wafer-fab infrastructure'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLock ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                <span className="text-[10px] font-black text-rose-400 tracking-tighter uppercase">Grid Lock Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="text-[10px] font-black text-emerald-500 tracking-tighter uppercase">System Stable</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 items-center">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
            {/* Taiwan Meter */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Taiwan</span>
                  <p className="text-xs font-black text-slate-200">TAIPOWER RESERVE</p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-mono font-black tabular-nums ${twLevel === 'critical' ? 'text-rose-500' : 'text-slate-100'}`}>
                    {tw !== null ? tw.toFixed(1) : '—'}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-1">%</span>
                </div>
              </div>
              <div className="h-4 bg-slate-800/80 rounded-sm p-0.5 relative border border-slate-700">
                <div 
                  className={`h-full transition-all duration-1000 rounded-sm ${barColor(twLevel)}`}
                  style={{ width: `${Math.min(100, (tw ?? 0) * 6.6)}%` }}
                />
                {/* 6% Threshold Marker */}
                <div className="absolute top-0 bottom-0 left-[40%] w-0.5 bg-rose-500 z-10 shadow-[0_0_10px_#f43f5e]" title="6% CRITICAL LIMIT">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-rose-500 whitespace-nowrap tracking-tighter">
                    6% LIMIT
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 font-medium leading-tight italic">
                {isNo ? 'Kritisk for TSMC Wafer Fabs' : 'Critical for TSMC Wafer Fabs'}
              </p>
            </div>

            {/* Korea Meter */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">South Korea</span>
                  <p className="text-xs font-black text-slate-200">KPX RESERVE</p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-mono font-black tabular-nums ${krLevel === 'critical' ? 'text-rose-500' : 'text-slate-100'}`}>
                    {kr !== null ? kr.toFixed(1) : '—'}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-1">%</span>
                </div>
              </div>
              <div className="h-4 bg-slate-800/80 rounded-sm p-0.5 relative border border-slate-700">
                <div 
                  className={`h-full transition-all duration-1000 rounded-sm ${barColor(krLevel)}`}
                  style={{ width: `${Math.min(100, (kr ?? 0) * 6.6)}%` }}
                />
                {/* 6% Threshold Marker */}
                <div className="absolute top-0 bottom-0 left-[40%] w-0.5 bg-rose-500 z-10 shadow-[0_0_10px_#f43f5e]" title="6% CRITICAL LIMIT">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-rose-500 whitespace-nowrap tracking-tighter">
                    6% LIMIT
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 font-medium leading-tight italic">
                {isNo ? 'Kritisk for Samsung/SK Hynix' : 'Critical for Samsung/SK Hynix'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center min-w-[140px] p-4 bg-slate-950/40 rounded-xl border border-slate-800/50">
            <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-700 ${
              isLock 
                ? 'border-rose-500 bg-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.4)]' 
                : 'border-slate-600 bg-slate-800/40'
            }`}>
              <svg 
                viewBox="0 0 24 24" 
                className={`w-7 h-7 transition-colors duration-700 ${isLock ? 'text-rose-100' : 'text-slate-500'}`}
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5"
              >
                {isLock ? (
                  <path d="M7 11V7a5 5 0 0110 0v4M8 11h8a2 2 0 012 2v5a2 2 0 01-2 2H8a2 2 0 01-2-2v-5a2 2 0 012-2z" />
                ) : (
                  <path d="M7 11V7a5 5 0 019.9-1M8 11h8a2 2 0 012 2v5a2 2 0 01-2 2H8a2 2 0 01-2-2v-5a2 2 0 012-2z" />
                )}
              </svg>
            </div>
            <p className={`mt-3 text-[10px] font-black uppercase tracking-[0.2em] ${isLock ? 'text-rose-400' : 'text-slate-500'}`}>
              {isLock ? (isNo ? 'GRID LOCK' : 'GRID LOCK') : (isNo ? 'STABLE' : 'STABLE')}
            </p>
          </div>
        </div>
      </div>
      
      {isLock && (
        <div className="mt-6 border-t border-rose-500/30 pt-4">
          <div className="flex gap-3 items-start">
            <span className="text-xl">🚨</span>
            <div className="space-y-1">
              <p className="text-xs font-black text-rose-200 uppercase tracking-wide">
                {isNo ? 'Kritisk systemkollaps detektert' : 'Critical System Collapse Detected'}
              </p>
              <p className="text-[11px] text-rose-300/80 leading-relaxed">
                {isNo 
                  ? 'Både Taiwan og Sør-Korea rapporterer reserver under 6%. Dette utløser umiddelbar likvidasjonsvarsel (Crisis Index 95+).' 
                  : 'Both Taiwan and South Korea report reserves below 6%. This triggers immediate liquidation warning (Crisis Index 95+).'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
