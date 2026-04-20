import React from 'react';
import type { MarketSummaryTableProps } from './types';
import { getStrongTrendColorClass } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { TICKERS } from '../../constants';

export const MarketSummaryTable: React.FC<MarketSummaryTableProps> = ({ 
  summary, 
  title,
  showCheckboxes = false,
  activeCheckboxes = [],
  onCheckboxToggle,
  onRowClick,
  onExitDrilldown,
  holdingsWeights = {}
}) => {
  const { t } = useLanguage();
  const { isDarkMode } = useDashboard();

  const getSymbolType = (symbol: string): 'sector' | 'etf' | 'stock' => {
    const ticker = TICKERS.find(t => t.symbol === symbol);
    if (!ticker) return 'stock';
    if (ticker.category === 'Sector') return 'sector';
    return 'etf';
  };

  return (
    <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-colors duration-300">
      <div className="p-6 border-b border-slate-800 dark:border-slate-800 light:border-slate-100 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white dark:text-white light:text-slate-900">
          {title || t('marketSummaryFull.title')}
        </h3>
        {onExitDrilldown && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExitDrilldown();
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {t('drilldown.backToOverview')}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-950/50 dark:bg-slate-950/50 light:bg-slate-50 text-slate-500 dark:text-slate-500 light:text-slate-400 uppercase text-[10px] font-black tracking-widest">
            <tr>
              {showCheckboxes && <th className="px-6 py-5 w-10"></th>}
              <th className="px-6 py-5">{t('marketSummaryFull.instrument')}</th>
              <th className="px-6 py-5">{t('marketSummaryFull.ticker')}</th>
              {Object.keys(holdingsWeights).length > 0 && (
                <th className="px-6 py-5 text-right">{t('leaderboard.etfDetails.weight')}</th>
              )}
              <th className="px-6 py-5">{t('marketSummaryFull.lastPrice')}</th>
              <th className="px-6 py-5">{t('marketSummaryFull.changePct')}</th>
              <th className="px-6 py-5">{t('marketSummaryFull.strength')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 dark:divide-slate-800 light:divide-slate-100">
            {summary.map((s) => {
              const weight = holdingsWeights[s.symbol];
              const isChecked = activeCheckboxes.includes(s.symbol);
              const type = getSymbolType(s.symbol);

              return (
                <tr 
                  key={s.symbol} 
                  onClick={() => onRowClick?.(s.symbol, type)}
                  className={`transition-colors group cursor-pointer ${
                    isChecked 
                      ? 'bg-blue-600/10 hover:bg-blue-600/20' 
                      : 'hover:bg-slate-800/30 dark:hover:bg-slate-800/30 light:hover:bg-slate-50'
                  }`}
                >
                  {showCheckboxes && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onCheckboxToggle?.(s.symbol)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 font-medium text-slate-200 dark:text-slate-200 light:text-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: s.color }}></div>
                      {s.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 group-hover:text-slate-200 dark:group-hover:text-slate-200 light:group-hover:text-slate-900">{s.symbol}</td>
                  {Object.keys(holdingsWeights).length > 0 && (
                    <td className="px-6 py-4 text-right font-mono text-blue-500 font-bold">
                      {weight ? `${weight.toFixed(2)}%` : '-'}
                    </td>
                  )}
                  <td className="px-6 py-4 text-slate-300 dark:text-slate-300 light:text-slate-600 font-mono font-bold">${s.lastPrice.toLocaleString()}</td>
                  <td className={`px-6 py-4 font-mono font-black ${getStrongTrendColorClass(s.percentChange)}`}>
                    {s.percentChange > 0 ? '+' : ''}{s.percentChange}%
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 dark:bg-slate-800 light:bg-slate-100 h-1.5 rounded-full overflow-hidden min-w-[60px] max-w-[100px]">
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
