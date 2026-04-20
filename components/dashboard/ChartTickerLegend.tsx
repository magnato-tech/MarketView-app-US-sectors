import React, { useMemo } from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import { resolveTicker } from '../../utils/tickerResolver';

/**
 * Tydelig, alltid synlig fargenøkkel som gjenspeiler hvilke tickere
 * som vises i `MainLineChart`. Brukes i Analyseboardet fordi Recharts'
 * innebygde `<Legend />` kan klippes av begrensede containerhøyder.
 *
 * Prioriterer samme rekkefølge som charten:
 *   ETF-drilldown > Sektor-drilldown > standard (activeTickers)
 */
export const ChartTickerLegend: React.FC = () => {
  const {
    activeTickers,
    drilldownSector,
    activeDrilldownTickers,
    drilldownETF,
    activeEtfStockTickers,
    isDarkMode,
  } = useDashboard();

  const visibleTickers = useMemo(() => {
    if (drilldownETF) return [drilldownETF, ...activeEtfStockTickers];
    if (drilldownSector && activeDrilldownTickers.length > 0) return activeDrilldownTickers;
    return activeTickers;
  }, [activeTickers, drilldownSector, activeDrilldownTickers, drilldownETF, activeEtfStockTickers]);

  if (visibleTickers.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 rounded-lg border overflow-x-auto max-w-full ${
        isDarkMode
          ? 'bg-slate-950/40 border-slate-800'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      {visibleTickers.map(sym => {
        const { name, color } = resolveTicker(sym);
        return (
          <div key={sym} className="flex items-center gap-2 min-w-0 shrink-0">
            <span
              className="inline-block w-3 h-[3px] rounded-sm shrink-0"
              style={{ backgroundColor: color }}
            />
            <span
              className={`text-[11px] font-semibold truncate whitespace-nowrap ${
                isDarkMode ? 'text-slate-200' : 'text-slate-700'
              }`}
              title={`${sym} · ${name}`}
            >
              {name}
              <span className={`ml-1.5 font-mono font-normal ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {sym}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
};
