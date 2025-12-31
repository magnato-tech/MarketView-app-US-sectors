
import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { MarketDataPoint, SummaryStats, Period, Interval } from '../types';
import { TICKERS, PERIODS, INTERVALS } from '../constants';

interface DashboardProps {
  data: MarketDataPoint[];
  summary: SummaryStats[];
  loading: boolean;
  aiInsight: string;
  period: Period;
  onPeriodChange: (p: Period) => void;
  interval: Interval;
  onIntervalChange: (i: Interval) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-lg shadow-2xl text-xs">
        <p className="font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">{label}</p>
        <div className="space-y-1.5">
          {payload.sort((a: any, b: any) => b.value - a.value).map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-slate-400">{entry.name}:</span>
              </div>
              <span className={`font-mono font-bold ${entry.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {entry.value > 0 ? '+' : ''}{entry.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const MainDashboard: React.FC<DashboardProps> = ({ 
  data, summary, loading, aiInsight, 
  period, onPeriodChange, interval, onIntervalChange 
}) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium animate-pulse">Analyserer Markedsdata...</p>
        </div>
      </div>
    );
  }

  const activeTickers = summary.map(s => s.symbol);

  return (
    <div className="flex-1 p-4 lg:p-8 bg-slate-950 overflow-y-auto min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Stats Cards */}
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
                   <span className={`text-[10px] font-bold px-1 rounded ${s.percentChange >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                     {s.percentChange >= 0 ? '▲' : '▼'} {Math.abs(s.percentChange)}%
                   </span>
                 </div>
               </div>
             ))}
          </div>
        </header>

        {/* Top Control Bar */}
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-2 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 px-4 shadow-inner">
           <div className="flex items-center gap-4 w-full sm:w-auto">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden lg:block">Tidsperiode:</span>
             <div className="flex bg-slate-950/50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
               {PERIODS.map(p => (
                 <button
                   key={p}
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
               {INTERVALS.map(i => (
                 <button
                   key={i}
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

        {/* AI Insight Section - Gemini AS Markedsanalytiker */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-start">
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400 border border-blue-500/20 shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Aktiv Analyse</span>
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
                  Gemini AS <span className="text-blue-500">Markedsrapport</span>
                </h4>
                <span className="text-[10px] text-slate-500 font-bold bg-slate-950 px-2 py-1 rounded">Periode: {period}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    Markedskommentar
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed font-medium">
                    {aiInsight ? aiInsight.split('\n')[0] : "Genererer analyse av nåværende markedssituasjon..."}
                  </p>
                </div>
                <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                    Utsikter for neste periode
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed italic">
                    {aiInsight && aiInsight.includes('\n') ? aiInsight.split('\n').slice(1).join(' ') : "Vurderer makroøkonomiske utsikter..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Relativ Avkastning</h3>
              <p className="text-xs text-slate-500">Benchmark-sammenligning (0% ved start)</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                 {summary.slice(0, 3).map(s => (
                   <div key={s.symbol} className="w-6 h-6 rounded-full border-2 border-slate-900 shadow-lg" style={{ backgroundColor: s.color }}></div>
                 ))}
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-2">Valgte instrumenter</span>
            </div>
          </div>
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                  fontFamily="monospace"
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}%`}
                  fontFamily="monospace"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} 
                  iconType="circle"
                />
                {activeTickers.map(sym => {
                  const ticker = TICKERS.find(t => t.symbol === sym)!;
                  return (
                    <Line
                      key={sym}
                      type="monotone"
                      dataKey={sym}
                      name={ticker.name}
                      stroke={ticker.color}
                      strokeWidth={sym.startsWith('^') ? 3 : 2}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Table */}
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
                    <td className={`px-6 py-4 font-mono font-black ${s.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
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
      </div>
    </div>
  );
};

export default MainDashboard;
