import React from 'react';
import type { MarketSummaryTableProps } from './types';
import { getStrongTrendColorClass } from '../../utils/formatters';

export const MarketSummaryTable: React.FC<MarketSummaryTableProps> = ({ summary }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Markedsoversikt</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="px-6 py-5">Instrument</th>
              <th className="px-6 py-5">Ticker</th>
              <th className="px-6 py-5">Siste Kurs</th>
              <th className="px-6 py-5">Endring %</th>
              <th className="px-6 py-5">Styrke</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {summary.map((s) => (
              <tr key={s.symbol} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4 font-medium text-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: s.color }}></div>
                    {s.name}
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-400 group-hover:text-slate-200">{s.symbol}</td>
                <td className="px-6 py-4 text-slate-300 font-mono font-bold">${s.lastPrice.toLocaleString()}</td>
                <td className={`px-6 py-4 font-mono font-black ${getStrongTrendColorClass(s.percentChange)}`}>
                  {s.percentChange > 0 ? '+' : ''}{s.percentChange}%
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden min-w-[60px] max-w-[100px]">
                       <div 
                         className={`h-full ${s.percentChange >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                         style={{ width: `${Math.min(100, Math.abs(s.percentChange) * 5)}%` }}
                       ></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
