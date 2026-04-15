
import React from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { TICKERS } from '../constants';
import { getStrongTrendColorClass } from '../utils/formatters';

export const DrilldownTable: React.FC = () => {
  const { 
    drilldownSector, 
    summary, 
    selectedTickers, 
    handleTickerToggle, 
    isDarkMode 
  } = useDashboard();

  if (!drilldownSector) return null;

  const parentTicker = TICKERS.find(t => t.symbol === drilldownSector);
  const childTickers = TICKERS.filter(t => t.parentSymbol === drilldownSector);
  
  // Filtrer summary for å kun vise instrumenter som tilhører denne drilldownen
  const drilldownSummary = summary.filter(s => 
    s.symbol === drilldownSector || childTickers.some(ct => ct.symbol === s.symbol)
  );

  return (
    <div className={`rounded-2xl overflow-hidden shadow-xl border transition-all duration-300 ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      <div className={`p-6 border-b flex justify-between items-center ${
        isDarkMode ? 'border-slate-800' : 'border-slate-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
          <div>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Sektordetaljer: {parentTicker?.name || drilldownSector}
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Velg spesifikke instrumenter for å sammenligne med sektoren
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className={`uppercase text-[10px] font-black tracking-widest ${
            isDarkMode ? 'bg-slate-950/50 text-slate-500' : 'bg-slate-50 text-slate-400'
          }`}>
            <tr>
              <th className="px-6 py-4 w-10"></th>
              <th className="px-6 py-4">Instrument</th>
              <th className="px-6 py-4">Ticker</th>
              <th className="px-6 py-4">Siste Kurs</th>
              <th className="px-6 py-4">Endring %</th>
              <th className="px-6 py-4">Styrke</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
            {drilldownSummary.map((s) => {
              const isParent = s.symbol === drilldownSector;
              return (
                <tr 
                  key={s.symbol} 
                  className={`transition-colors group ${
                    isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                  } ${isParent ? (isDarkMode ? 'bg-blue-900/10' : 'bg-blue-50/50') : ''}`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedTickers.includes(s.symbol)}
                      onChange={() => handleTickerToggle(s.symbol)}
                      className={`w-4 h-4 rounded appearance-none border transition-all cursor-pointer ${
                        isDarkMode 
                          ? 'border-slate-700 bg-slate-800 checked:bg-blue-600' 
                          : 'border-slate-300 bg-white checked:bg-blue-600'
                      } text-blue-600 focus:ring-blue-500 checked:border-transparent`}
                    />
                  </td>
                  <td className={`px-6 py-4 font-medium ${
                    isDarkMode ? 'text-slate-200' : 'text-slate-700'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: s.color }}></div>
                      {s.name}
                      {isParent && (
                        <span className="text-[9px] bg-blue-600/20 text-blue-500 px-1.5 py-0.5 rounded font-black uppercase ml-2">
                          Sektor
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 font-mono text-xs ${
                    isDarkMode ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-500 group-hover:text-slate-900'
                  }`}>{s.symbol}</td>
                  <td className={`px-6 py-4 font-mono font-bold ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>${s.lastPrice.toLocaleString()}</td>
                  <td className={`px-6 py-4 font-mono font-black ${getStrongTrendColorClass(s.percentChange)}`}>
                    {s.percentChange > 0 ? '+' : ''}{s.percentChange}%
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 h-1.5 rounded-full overflow-hidden min-w-[60px] max-w-[100px] ${
                        isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                      }`}>
                         <div 
                           className={`h-full ${s.percentChange >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                           style={{ width: `${Math.min(100, Math.abs(s.percentChange) * 5)}%` }}
                         ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
