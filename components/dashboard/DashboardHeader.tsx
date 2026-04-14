import React from 'react';
import type { DashboardHeaderProps } from './types';
import { getTrendColorClass } from '../../utils/formatters';

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ summary }) => {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight italic">Gemini <span className="text-blue-500 not-italic">AS</span> Terminal</h2>
        <p className="text-slate-400 text-sm">Avansert portefølje- og sektoranalyse.</p>
      </div>
      <div className="flex flex-wrap gap-3">
         {summary.slice(0, 4).map(s => (
           <div key={s.symbol} className="bg-slate-900 border border-slate-800 p-3 rounded-xl min-w-[130px] transition-transform hover:scale-[1.02]">
             <div className="text-[10px] text-slate-500 uppercase font-black mb-1">{s.name}</div>
             <div className="flex items-baseline gap-2">
               <span className="text-lg font-bold text-white">{s.lastPrice.toLocaleString()}</span>
               <span className={`text-[10px] font-bold px-1 rounded ${getTrendColorClass(s.percentChange)} ${s.percentChange >= 0 ? 'bg-emerald-400/10' : 'bg-rose-400/10'}`}>
                 {s.percentChange >= 0 ? '▲' : '▼'} {Math.abs(s.percentChange)}%
               </span>
             </div>
           </div>
         ))}
      </div>
    </header>
  );
};
