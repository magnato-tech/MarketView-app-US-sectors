import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area } from 'recharts';
import { Card } from './ui/Card';
import { X, TrendingUp, TrendingDown, Activity, Target, ShieldCheck } from 'lucide-react';
import { BacktestResult } from '../services/backtestService';

interface BacktestResultModalProps {
  result: BacktestResult;
  onClose: () => void;
}

export const BacktestResultModal: React.FC<BacktestResultModalProps> = ({ result, onClose }) => {
  const isPositive = result.summary.totalReturn >= result.summary.marketReturn;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-full max-w-4xl bg-slate-900 border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Backtest Resultat</h2>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                {result.config.name} ({result.period === '1y' ? '12 mnd' : result.period === '2y' ? '24 mnd' : '60 mnd'} historikk)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Bot Avkastning</p>
              <p className={`text-xl font-mono font-black ${result.summary.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.summary.totalReturn >= 0 ? '+' : ''}{result.summary.totalReturn.toFixed(2)}%
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Marked (SPY)</p>
              <p className="text-xl font-mono font-black text-slate-300">
                {result.summary.marketReturn >= 0 ? '+' : ''}{result.summary.marketReturn.toFixed(2)}%
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Win Rate</p>
              <div className="flex items-center gap-2">
                <Target className="w-3 h-3 text-blue-400" />
                <p className="text-xl font-mono font-black text-white">{result.summary.winRate.toFixed(1)}%</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Max Drawdown</p>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-rose-400" />
                <p className="text-xl font-mono font-black text-rose-400">-{result.summary.maxDrawdown.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Equity Curve Chart */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Equity Curve: Bot vs. S&P 500</h3>
            <div className="h-[350px] w-full bg-slate-950/30 rounded-2xl p-4 border border-slate-800/50">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={result.equityCurve}>
                  <defs>
                    <linearGradient id="colorBot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Verdi']}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Area 
                    name="Bot Portefølje"
                    type="monotone" 
                    dataKey="botValue" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorBot)" 
                  />
                  <Line 
                    name="S&P 500 (Benchmark)"
                    type="monotone" 
                    dataKey="marketValue" 
                    stroke="#64748b" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trade History */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gjennomførte Handler ({result.summary.tradeCount})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.trades.slice().reverse().slice(0, 10).map((trade, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-800/20 border border-slate-700/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${trade.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {trade.type}
                    </span>
                    <div>
                      <p className="text-xs font-black text-white">{trade.symbol}</p>
                      <p className="text-[8px] text-slate-500 font-mono">{new Date(trade.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-slate-300">${trade.price.toFixed(2)}</p>
                    <p className="text-[8px] text-slate-500 uppercase tracking-tighter">{trade.reason}</p>
                  </div>
                </div>
              ))}
              {result.trades.length > 10 && (
                <div className="col-span-full text-center py-2 text-[10px] text-slate-500 italic">
                  Viser de 10 siste av totalt {result.trades.length} handler
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20"
          >
            Lukk Resultat
          </button>
        </div>
      </Card>
    </div>
  );
};
