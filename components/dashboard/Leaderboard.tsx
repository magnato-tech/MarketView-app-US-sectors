import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import { getStrongTrendColorClass } from '../../utils/formatters';

export const Leaderboard: React.FC = () => {
  const { summary, rangeSummary, loading, period } = useDashboard();

  if (loading || summary.length === 0) {
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

  // Bruk rangeSummary hvis tilgjengelig, ellers summary
  const data = rangeSummary.length > 0 ? rangeSummary : summary.map(s => ({
    symbol: s.symbol,
    name: s.name,
    changePct: s.percentChange,
    color: s.color,
    metrics: {
      rank: 0,
      volatility: 0,
      maxDrawdown: 0,
      trendStatus: 'Neutral' as const,
      momentumScore: 0,
      regime: 'Stable' as const,
      relativeStrength: 0
    }
  }));

  const sorted = [...data].sort((a, b) => b.changePct - a.changePct);
  const top5 = sorted.slice(0, 5);
  const bottom5 = [...sorted].reverse().slice(0, 5);

  const MetricBadge = ({ label, value, colorClass }: { label: string, value: string | number, colorClass?: string }) => (
    <div className="flex flex-col items-center px-2 py-1.5 rounded bg-slate-950/40 border border-white/10 shadow-inner">
      <span className="text-[8px] uppercase text-slate-400 font-black tracking-wider leading-tight mb-0.5">{label}</span>
      <span className={`text-[11px] font-mono font-black leading-tight ${colorClass || 'text-white'}`}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Vinner-kort */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 border border-blue-400/30 rounded-2xl p-6 shadow-2xl shrink-0">
        <div className="flex justify-between items-start mb-5">
          <div>
            <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em]">
              Vinner siste {period}
            </span>
            <h3 className="text-2xl font-black text-white mt-1 tracking-tight">{sorted[0]?.name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: sorted[0]?.color }}></div>
              <span className="text-xs text-blue-100 font-bold font-mono tracking-wider">{sorted[0]?.symbol}</span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black font-mono leading-none drop-shadow-md ${sorted[0]?.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {sorted[0]?.changePct > 0 ? '+' : ''}{sorted[0]?.changePct}%
            </div>
            <div className="text-[9px] text-blue-200 font-black uppercase mt-2 tracking-widest opacity-80">Total Return</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <MetricBadge 
            label="Rel. Strength" 
            value={`${(sorted[0]?.metrics?.relativeStrength ?? 0) > 0 ? '+' : ''}${sorted[0]?.metrics?.relativeStrength ?? 0}%`} 
            colorClass={(sorted[0]?.metrics?.relativeStrength ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-300'} 
          />
          <MetricBadge label="Volatility" value={`${sorted[0]?.metrics?.volatility ?? 0}%`} colorClass="text-blue-100" />
          <MetricBadge label="Max DD" value={`${sorted[0]?.metrics?.maxDrawdown ?? 0}%`} colorClass="text-rose-300" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Topp 5 */}
        <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-colors duration-300">
          <div className="px-6 py-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-100 bg-emerald-500/5">
            <h4 className="text-sm font-bold text-emerald-500 flex items-center gap-2 uppercase tracking-wider">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              Momentum Leaders
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
                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-tight">Rel. Strength</span>
                    <span className={`text-[9px] font-mono font-bold ${(item.metrics?.relativeStrength ?? 0) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {(item.metrics?.relativeStrength ?? 0) > 0 ? '+' : ''}{item.metrics?.relativeStrength ?? 0}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-tight">Volatility</span>
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
              Mean Reversion?
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
                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-tight">Max Drawdown</span>
                    <span className="text-[9px] font-mono font-bold text-rose-500">{item.metrics?.maxDrawdown ?? 0}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-tight">Volatility</span>
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
