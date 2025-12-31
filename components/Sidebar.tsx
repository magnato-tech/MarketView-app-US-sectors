
import React from 'react';
import { TICKERS } from '../constants';

interface SidebarProps {
  selectedTickers: string[];
  onTickerToggle: (symbol: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedTickers,
  onTickerToggle,
}) => {
  const indices = TICKERS.filter(t => t.category === 'Index');
  const sectors = TICKERS.filter(t => t.category === 'Sector');

  return (
    <div className="w-full lg:w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-8 overflow-y-auto h-screen lg:sticky top-0 shadow-2xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/40">M</div>
        <h1 className="text-xl font-bold tracking-tight">MarketView <span className="text-blue-500 italic">Pro</span></h1>
      </div>

      <section>
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-5 border-b border-slate-800 pb-2">Major Indices</h3>
        <div className="space-y-3">
          {indices.map(t => (
            <label key={t.symbol} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700/50">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTickers.includes(t.symbol)}
                  onChange={() => onTickerToggle(t.symbol)}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-800 checked:bg-blue-600 appearance-none border checked:border-transparent transition-all"
                />
                {selectedTickers.includes(t.symbol) && (
                  <svg className="w-3 h-3 absolute left-0.5 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col">
                <span className={`text-sm transition-colors ${selectedTickers.includes(t.symbol) ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-300'}`}>
                  {t.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{t.symbol}</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="pb-10">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-5 border-b border-slate-800 pb-2">Sector ETFs</h3>
        <div className="space-y-1">
          {sectors.map(t => (
            <label key={t.symbol} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700/50">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTickers.includes(t.symbol)}
                  onChange={() => onTickerToggle(t.symbol)}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800 checked:bg-indigo-600 appearance-none border checked:border-transparent transition-all"
                />
                {selectedTickers.includes(t.symbol) && (
                  <svg className="w-3 h-3 absolute left-0.5 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-xs transition-colors ${selectedTickers.includes(t.symbol) ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-300'}`}>
                {t.symbol} <span className="text-slate-600 text-[10px] ml-1">({t.name})</span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Sidebar;
