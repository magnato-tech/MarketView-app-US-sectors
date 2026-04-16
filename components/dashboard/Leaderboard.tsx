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
    rank: 0
  }));

  const sorted = [...data].sort((a, b) => b.changePct - a.changePct);
  const top5 = sorted.slice(0, 5);
  const bottom5 = [...sorted].reverse().slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Vinner-kort */}
      <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-2xl p-5 shadow-lg backdrop-blur-sm shrink-0">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
              Vinner siste {period}
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">{sorted[0]?.name}</h3>
          </div>
          <div className={`text-xl font-black font-mono ${getStrongTrendColorClass(sorted[0]?.changePct)}`}>
            +{sorted[0]?.changePct}%
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sorted[0]?.color }}></div>
          <span>{sorted[0]?.symbol}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Topp 5 */}
        <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-colors duration-300">
          <div className="px-6 py-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-100 bg-emerald-500/5">
            <h4 className="text-sm font-bold text-emerald-500 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              Topp 5
            </h4>
          </div>
          <div className="divide-y divide-slate-800 dark:divide-slate-800 light:divide-slate-100">
            {top5.map((item, i) => (
              <div key={item.symbol} className="px-5 py-2.5 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold text-slate-500 w-3">{i + 1}</span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-200 dark:text-slate-200 light:text-slate-700 truncate max-w-[100px]">{item.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">{item.symbol}</span>
                  </div>
                </div>
                <span className={`text-[11px] font-mono font-black ${getStrongTrendColorClass(item.changePct)}`}>
                  +{item.changePct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bunn 5 */}
        <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-colors duration-300">
          <div className="px-6 py-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-100 bg-rose-500/5">
            <h4 className="text-sm font-bold text-rose-500 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
              </svg>
              Bunn 5
            </h4>
          </div>
          <div className="divide-y divide-slate-800 dark:divide-slate-800 light:divide-slate-100">
            {bottom5.map((item, i) => (
              <div key={item.symbol} className="px-5 py-2.5 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
