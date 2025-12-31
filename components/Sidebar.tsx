
import React from 'react';
import { TICKERS, PERIODS, INTERVALS } from '../constants';
import { Period, Interval } from '../types';

interface SidebarProps {
  selectedTickers: string[];
  onTickerToggle: (symbol: string) => void;
  period: Period;
  onPeriodChange: (p: Period) => void;
  interval: Interval;
  onIntervalChange: (i: Interval) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedTickers,
  onTickerToggle,
  period,
  onPeriodChange,
  interval,
  onIntervalChange
}) => {
  const indices = TICKERS.filter(t => t.category === 'Index');
  const sectors = TICKERS.filter(t => t.category === 'Sector');

  return (
    <div className="w-full lg:w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-8 overflow-y-auto h-screen lg:sticky top-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">M</div>
        <h1 className="text-xl font-bold tracking-tight">MarketView <span className="text-blue-500 italic">Pro</span></h1>
      </div>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Time Horizon</h3>
        <div className="grid grid-cols-4 gap-2">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => onPeriodChange(p as Period)}
              className={`py-1.5 text-xs rounded transition-all ${
                period === p 
                  ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/20' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Granularity</h3>
        <div className="flex gap-2">
          {INTERVALS.map(i => (
            <button
              key={i}
              onClick={() => onIntervalChange(i as Interval)}
              className={`flex-1 py-2 text-xs rounded transition-all ${
                interval === i 
                  ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-900/20' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Indices</h3>
        <div className="space-y-2">
          {indices.map(t => (
            <label key={t.symbol} className="flex items-center gap-3 cursor-pointer group p-1 rounded hover:bg-slate-800/50 transition-colors">
              <input
                type="checkbox"
                checked={selectedTickers.includes(t.symbol)}
                onChange={() => onTickerToggle(t.symbol)}
                className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-800"
              />
              <span className={`text-sm transition-colors ${selectedTickers.includes(t.symbol) ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-300'}`}>
                {t.name}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="pb-10">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Sector ETFs</h3>
        <div className="space-y-1">
          {sectors.map(t => (
            <label key={t.symbol} className="flex items-center gap-3 cursor-pointer group p-1 rounded hover:bg-slate-800/50 transition-colors">
              <input
                type="checkbox"
                checked={selectedTickers.includes(t.symbol)}
                onChange={() => onTickerToggle(t.symbol)}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
              />
              <span className={`text-sm transition-colors ${selectedTickers.includes(t.symbol) ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-300'}`}>
                {t.symbol} <span className="text-slate-500 text-[10px] ml-1 opacity-60">({t.name})</span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Sidebar;
