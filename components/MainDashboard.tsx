
import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { MarketDataPoint, SummaryStats } from '../types';
import { TICKERS } from '../constants';

interface DashboardProps {
  data: MarketDataPoint[];
  summary: SummaryStats[];
  loading: boolean;
  aiInsight: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-2xl text-xs">
        <p className="font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-mono text-slate-100">{entry.value > 0 ? '+' : ''}{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const MainDashboard: React.FC<DashboardProps> = ({ data, summary, loading, aiInsight }) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium animate-pulse">Analyzing Market Dynamics...</p>
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
            <h2 className="text-2xl font-bold text-white">Market Intelligence Dashboard</h2>
            <p className="text-slate-400 text-sm">Real-time relative performance analysis across sectors.</p>
          </div>
          <div className="flex gap-4">
             {summary.slice(0, 3).map(s => (
               <div key={s.symbol} className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg min-w-[140px]">
                 <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">{s.name}</div>
                 <div className="flex items-baseline gap-2">
                   <span className="text-lg font-bold text-white">{s.lastPrice.toLocaleString()}</span>
                   <span className={`text-xs font-medium ${s.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                     {s.percentChange >= 0 ? '▲' : '▼'} {Math.abs(s.percentChange)}%
                   </span>
                 </div>
               </div>
             ))}
          </div>
        </header>

        {/* AI Insight Section */}
        <div className="bg-indigo-900/10 border border-indigo-500/20 p-4 rounded-xl flex gap-4 items-start">
          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-300 mb-1 flex items-center gap-2">
              Gemini AI Analyst
              <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] rounded uppercase">Beta</span>
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed italic">
              {aiInsight || "Requesting market analysis from Gemini..."}
            </p>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Cumulative Return Comparison</h3>
            <div className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              Normalized to 0% at period start
            </div>
          </div>
          <div className="h-[400px] w-full">
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
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} 
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
                      strokeWidth={2.5}
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
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">Performance Metrics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-4">Instrument</th>
                  <th className="px-6 py-4">Ticker</th>
                  <th className="px-6 py-4">Last Price</th>
                  <th className="px-6 py-4">Period Chg%</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {summary.map((s) => (
                  <tr key={s.symbol} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                        {s.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400 group-hover:text-slate-200">{s.symbol}</td>
                    <td className="px-6 py-4 text-slate-300 font-mono">${s.lastPrice.toLocaleString()}</td>
                    <td className={`px-6 py-4 font-bold ${s.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {s.percentChange > 0 ? '+' : ''}{s.percentChange}%
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        s.percentChange >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {s.percentChange > 0 ? 'Outperforming' : 'Lagging'}
                      </span>
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
