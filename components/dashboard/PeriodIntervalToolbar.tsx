import React from 'react';
import { PERIODS, INTERVALS } from '../../constants';
import type { Interval, Period } from '../../types';
import type { ChartToolbarProps } from './types';

export function PeriodIntervalToolbar({
  period,
  interval,
  onPeriodChange,
  onIntervalChange,
}: ChartToolbarProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-2 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 px-4 shadow-inner">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden lg:block">Tidsperiode:</span>
        <div className="flex bg-slate-950/50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriodChange(p as Period)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                period === p
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden lg:block">Intervall:</span>
        <div className="flex bg-slate-950/50 p-1 rounded-xl w-full sm:w-auto">
          {INTERVALS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => onIntervalChange(i as Interval)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                interval === i
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
