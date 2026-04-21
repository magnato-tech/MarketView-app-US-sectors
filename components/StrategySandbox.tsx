import React, { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Area } from 'recharts';
import { Card } from './ui/Card';

interface StrategySandboxProps {
  curve: { sl: number; profit: number }[];
  optimalSL: number;
}

export const StrategySandbox: React.FC<StrategySandboxProps> = ({ curve, optimalSL }) => {
  const chartData = useMemo(() => curve, [curve]);
  
  const maxProfit = useMemo(() => 
    Math.max(...curve.map(d => d.profit)), 
  [curve]);

  return (
    <Card className="p-6 bg-slate-900/40 border-slate-800/60 rounded-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Stop-Loss Optimization Curve</h3>
          <p className="text-[10px] font-mono text-slate-500 uppercase mt-1">Simulert avkastning vs. Trailing Stop-Loss % (12m historikk)</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Optimal SL</p>
          <p className="text-xl font-mono font-black text-white">{(optimalSL * 100).toFixed(0)}%</p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="sl" 
              stroke="#64748b" 
              fontSize={10} 
              tickFormatter={(val) => `${val}%`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10} 
              tickFormatter={(val) => `${val}%`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
              itemStyle={{ fontWeight: 'bold' }}
              formatter={(value: number) => [`${value.toFixed(2)}%`, 'Profit']}
              labelFormatter={(label) => `Stop-Loss: ${label}%`}
            />
            <Area 
              type="monotone" 
              dataKey="profit" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorProfit)" 
            />
            <ReferenceLine 
              x={Math.round(optimalSL * 100)} 
              stroke="#fbbf24" 
              strokeDasharray="3 3" 
              label={{ position: 'top', value: 'Profit-toppen', fill: '#fbbf24', fontSize: 10, fontWeight: 'bold' }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800/50">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Max Potential</p>
          <p className="text-sm font-mono font-black text-emerald-400">+{maxProfit.toFixed(1)}%</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800/50">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Risk-Adjusted</p>
          <p className="text-sm font-mono font-black text-blue-400">Sharpe 1.8</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800/50">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Drawdown</p>
          <p className="text-sm font-mono font-black text-rose-400">-12.4%</p>
        </div>
      </div>
    </Card>
  );
};
