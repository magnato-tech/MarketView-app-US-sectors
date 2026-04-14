import React, { useState } from 'react';
import { ResponsiveContainer } from 'recharts';
import { useDashboard } from '../contexts/DashboardContext';
import { MainLineChart } from './dashboard/MainLineChart';
import { ChartTooltip } from './dashboard/ChartTooltip';
import { AIInsightPanel } from './dashboard/AIInsightPanel';
import type { RechartsTooltipPayloadItem } from './dashboard/types';
import { formatPercent } from '../utils/formatters';

export const AnalysisBoard: React.FC = () => {
  const { data, summary, aiInsight, period, activeTickers } = useDashboard();
  const [smaWindow, setSmaWindow] = useState(20);
  const [showSMA, setShowSMA] = useState(true);

  const handleSmaClick = (w: number) => {
    if (smaWindow === w && showSMA) {
      setShowSMA(false);
    } else {
      setSmaWindow(w);
      setShowSMA(true);
    }
  };

  const renderTooltip = (props: { 
    active?: boolean; 
    payload?: RechartsTooltipPayloadItem[]; 
    label?: string | number; 
    rangeSelection?: ChartRangeSelection | null;
    anchorIndex?: number | null 
  }) => (
    <ChartTooltip
      active={props.active}
      payload={props.payload}
      label={props.label}
      data={data}
      anchorIndex={props.anchorIndex ?? null}
      rangeSelection={props.rangeSelection}
    />
  );

  return (
    <div className="space-y-6">
      {/* Technical Analysis Chart */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Teknisk Trendanalyse</h3>
            <p className="text-xs text-slate-500">Relativ avkastning med Simple Moving Average (SMA)</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] font-black text-slate-500 uppercase px-2">SMA Vindu:</span>
            {[10, 20, 50, 150, 200].map(w => (
              <button
                key={w}
                onClick={() => handleSmaClick(w)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  smaWindow === w && showSMA
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <MainLineChart 
              data={data} 
              activeTickers={activeTickers} 
              onTooltipContent={renderTooltip}
              showSMA={showSMA}
              smaWindow={smaWindow}
            />
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Deep Dive */}
        <AIInsightPanel aiInsight={aiInsight} period={period} />

        {/* Volatility / Stats Panel */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4">Sektor-statistikk</h3>
          <div className="space-y-4">
            {summary.map(s => (
              <div key={s.symbol} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                  <span className="text-sm font-medium text-slate-200">{s.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-black">Avkastning</div>
                    <div className={`text-sm font-bold ${s.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatPercent(s.percentChange)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
