import React, { useState } from 'react';
import { ResponsiveContainer } from 'recharts';
import { useDashboard } from '../contexts/DashboardContext';
import { MainLineChart } from './dashboard/MainLineChart';
import { ChartTooltip } from './dashboard/ChartTooltip';
import { AIInsightPanel } from './dashboard/AIInsightPanel';
import type { RechartsTooltipPayloadItem } from './dashboard/types';
import { formatPercent } from '../utils/formatters';

export const AnalysisBoard: React.FC = () => {
  const { data, summary, aiInsight, period, activeTickers, handleTickerToggle } = useDashboard();
  const [smaWindow, setSmaWindow] = useState(20);
  const [showSMA, setShowSMA] = useState(true);
  const [showLiquidityFlow, setShowLiquidityFlow] = useState(false);

  // Standardutvalg for analyse: S&P 500, Nasdaq 100, VIX
  const defaultAnalysisSymbols = ['^GSPC', '^NDX', '^VIX'];
  
  // Finn hvilke av standard-tickere som faktisk er tilgjengelige i data/summary
  // Sjekk både symbol og name for å være sikker
  const availableDefaults = summary
    .filter(s => defaultAnalysisSymbols.includes(s.symbol))
    .map(s => s.symbol);

  // Hvis vi er i analyse-modus og har mange tickere valgt, kan vi vurdere å filtrere
  // Men brukeren ba om "maks tre som standard". Vi implementerer en "Reset til standard" knapp
  // og sørger for at grafen i denne fanen bruker et begrenset utvalg hvis ønskelig.
  const [useDefaultSelection, setUseDefaultSelection] = useState(true);

  // VIKTIG: Hvis ingen av standard-tickere er tilgjengelige, må vi falle tilbake til activeTickers
  const analysisTickers = (useDefaultSelection && availableDefaults.length > 0)
    ? availableDefaults
    : activeTickers;

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
      <div className="bg-slate-900/50 dark:bg-slate-900/50 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-6 shadow-xl transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-white dark:text-white light:text-slate-900">Teknisk Trendanalyse</h3>
            <p className="text-xs text-slate-500 dark:text-slate-500 light:text-slate-400">Relativ avkastning med Simple Moving Average (SMA)</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-950 dark:bg-slate-950 light:bg-slate-100 p-1 rounded-lg border border-slate-800 dark:border-slate-800 light:border-slate-200">
            <button
              onClick={() => setUseDefaultSelection(!useDefaultSelection)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-2 ${
                useDefaultSelection
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 dark:text-slate-400 light:text-slate-500 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900'
              }`}
              title="Vis kun S&P 500, Nasdaq og VIX"
            >
              Standardutvalg
            </button>
            <div className="w-px h-4 bg-slate-800 dark:bg-slate-800 light:bg-slate-200 mx-1"></div>
            <button
              onClick={() => setShowLiquidityFlow(!showLiquidityFlow)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-2 ${
                showLiquidityFlow
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-400 dark:text-slate-400 light:text-slate-500 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900'
              }`}
              title="Vis hver sektors andel av total handelsverdi"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m17 17-5 5-5-5"/><path d="m7 7 5-5 5 5"/></svg>
              Kapitalstrøm
            </button>
            <div className="w-px h-4 bg-slate-800 dark:bg-slate-800 light:bg-slate-200 mx-1"></div>
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 light:text-slate-400 uppercase px-2">SMA:</span>
            {[10, 20, 50, 150, 200].map(w => (
              <button
                key={w}
                onClick={() => handleSmaClick(w)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  smaWindow === w && showSMA
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 dark:text-slate-400 light:text-slate-500 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900'
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
              activeTickers={analysisTickers} 
              onTooltipContent={renderTooltip}
              showSMA={showSMA}
              smaWindow={smaWindow}
              showLiquidityFlow={showLiquidityFlow}
            />
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Deep Dive */}
        <AIInsightPanel aiInsight={aiInsight} period={period} />

        {/* Volatility / Stats Panel */}
        <div className="bg-slate-900/50 dark:bg-slate-900/50 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-6 shadow-xl transition-colors duration-300">
          <h3 className="text-lg font-bold text-white dark:text-white light:text-slate-900 mb-4">Sektor-statistikk</h3>
          <div className="space-y-4">
            {summary.map(s => (
              <div key={s.symbol} className="flex items-center justify-between p-3 bg-slate-950/50 dark:bg-slate-950/50 light:bg-slate-50 rounded-xl border border-slate-800/50 dark:border-slate-800/50 light:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                  <span className="text-sm font-medium text-slate-200 dark:text-slate-200 light:text-slate-700">{s.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 dark:text-slate-500 light:text-slate-400 uppercase font-black">Avkastning</div>
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
