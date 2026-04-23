import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { InfoIcon } from '../ui/InfoIcon';

/**
 * Toolbar for teknisk analyse (SMA + Kapitalstrøm).
 *
 * Tidligere lå disse kontrollene i AnalysisBoard-fanen. Etter at
 * Dashboard og Analyse ble slått sammen, plasseres denne i chart-headeren
 * via `RelativeAvkastningPanel`-prop `toolbar`.
 */
export const AnalysisToolbar: React.FC = () => {
  const { analysisSettings, setAnalysisSettings } = useDashboard();
  const { t } = useLanguage();
  const { showSMA, smaWindow, showLiquidityFlow, showPortfolio } = analysisSettings;

  const handleSmaClick = (w: number) => {
    if (smaWindow === w && showSMA) {
      setAnalysisSettings(prev => ({ ...prev, showSMA: false }));
    } else {
      setAnalysisSettings(prev => ({ ...prev, smaWindow: w, showSMA: true }));
    }
  };

  const toggleLiquidityFlow = () => {
    setAnalysisSettings(prev => ({ ...prev, showLiquidityFlow: !prev.showLiquidityFlow }));
  };

  const togglePortfolio = () => {
    setAnalysisSettings(prev => ({ ...prev, showPortfolio: !prev.showPortfolio }));
  };

  return (
    <div className="flex items-center gap-2 bg-slate-950 dark:bg-slate-950 light:bg-slate-100 p-1 rounded-lg border border-slate-800 dark:border-slate-800 light:border-slate-200 overflow-x-auto max-w-full">
      <button
        type="button"
        onClick={togglePortfolio}
        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
          showPortfolio
            ? 'bg-amber-500 text-white'
            : 'text-slate-400 dark:text-slate-400 light:text-slate-500 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7h-9" />
          <path d="M14 17H5" />
          <circle cx="17" cy="17" r="3" />
          <circle cx="7" cy="7" r="3" />
        </svg>
        Min Portefølje
      </button>
      <div className="w-px h-3 bg-slate-800 dark:bg-slate-800 light:bg-slate-200 mx-0.5 shrink-0"></div>
      <button
        type="button"
        onClick={toggleLiquidityFlow}
        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
          showLiquidityFlow
            ? 'bg-indigo-600 text-white'
            : 'text-slate-400 dark:text-slate-400 light:text-slate-500 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900'
        }`}
        title={t('analysis.capitalFlowTooltip')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20" />
          <path d="m17 17-5 5-5-5" />
          <path d="m7 7 5-5 5 5" />
        </svg>
        {t('analysis.capitalFlow')}
        <InfoIcon title={t('analysis.capitalFlowInfo')} />
      </button>
      <div className="w-px h-3 bg-slate-800 dark:bg-slate-800 light:bg-slate-200 mx-0.5 shrink-0"></div>
      <span className="text-[9px] font-black text-slate-500 dark:text-slate-500 light:text-slate-400 uppercase px-1 whitespace-nowrap">
        {t('analysis.smaLabel')}
      </span>
      <div className="flex items-center gap-1">
        {[10, 20, 50, 150, 200].map(w => (
          <button
            key={w}
            type="button"
            onClick={() => handleSmaClick(w)}
            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${
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
  );
};
