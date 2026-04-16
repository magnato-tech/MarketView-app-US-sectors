import React from 'react';
import type { MarketDataPoint } from '../../types';
import type { RechartsTooltipPayloadItem, ChartRangeSelection } from './types';
import { formatPercent, getTrendColorClass } from '../../utils/formatters';

export type ChartTooltipProps = {
  active?: boolean;
  payload?: RechartsTooltipPayloadItem[];
  label?: string | number;
  data: MarketDataPoint[];
  anchorIndex: number | null;
  rangeSelection?: ChartRangeSelection | null;
  showLiquidityFlow?: boolean;
};

/**
 * Formaterer store tall med K, M, B forkortelser
 */
const formatLargeNumber = (val: number): string => {
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toString();
};

export function ChartTooltip({ 
  active, 
  payload, 
  label, 
  data, 
  anchorIndex,
  rangeSelection,
  showLiquidityFlow
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const isRangeMode = rangeSelection && rangeSelection.rangeStart !== rangeSelection.rangeEnd;
  const startIdx = isRangeMode ? Math.min(rangeSelection!.rangeStart, rangeSelection!.rangeEnd) : -1;
  const endIdx = isRangeMode ? Math.max(rangeSelection!.rangeStart, rangeSelection!.rangeEnd) : -1;
  
  const baseRow = isRangeMode 
    ? data[startIdx] 
    : (anchorIndex != null && data[anchorIndex] ? data[anchorIndex] : null);

  // Separer volum og kapitalstrøm fra priskurver
  const volumeItems = payload.filter(p => String(p.dataKey).endsWith('_dollar_volume') || p.dataKey === 'total_dollar_volume');
  const flowItems = payload.filter(p => String(p.dataKey).endsWith('_FLOW'));
  const priceItems = payload.filter(p => 
    !String(p.dataKey).endsWith('_dollar_volume') && 
    p.dataKey !== 'total_dollar_volume' && 
    !String(p.dataKey).endsWith('_SMA') &&
    !String(p.dataKey).endsWith('_FLOW')
  );

  const sortedPriceItems = [...priceItems].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  
  // Finn total dollar-volum (enten fra total_dollar_volume eller summen av synlige)
  const totalDollarVolume = payload.find(p => p.dataKey === 'total_dollar_volume')?.value as number || 0;

  return (
    <div className="bg-slate-900/95 dark:bg-slate-900/95 light:bg-white/95 backdrop-blur-md border border-slate-700 dark:border-slate-700 light:border-slate-200 p-3 rounded-lg shadow-2xl text-xs min-w-[200px] transition-colors duration-300">
      <div className="flex justify-between items-center mb-1 border-b border-slate-800 dark:border-slate-800 light:border-slate-100 pb-1">
        <p className="font-bold text-slate-300 dark:text-slate-300 light:text-slate-900">{label}</p>
        {isRangeMode && (
          <span className="text-[9px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">
            Periodevalg
          </span>
        )}
      </div>

      {isRangeMode ? (
        <p className="text-[10px] text-blue-400/80 mb-2 font-medium">
          Utvikling fra {data[startIdx]?.timestamp}
        </p>
      ) : baseRow ? (
        <p className="text-[10px] text-slate-500 dark:text-slate-500 light:text-slate-400 mb-2">
          Tall vs. start av markering ({baseRow.timestamp})
        </p>
      ) : (
        <p className="text-[10px] text-slate-500 dark:text-slate-500 light:text-slate-400 mb-2">Tall vs. start av Yahoo-periode</p>
      )}

      <div className="space-y-1.5">
        {sortedPriceItems.map((entry, index) => {
          const key = String(entry.dataKey ?? index);
          const isVix = key === '^VIX' || key === '^VIX_SCALED';
          const raw = entry.value;
          let display: number;

          if (isRangeMode) {
            const startVal = data[startIdx]?.[key];
            const endVal = data[endIdx]?.[key];
            if (typeof startVal === 'number' && typeof endVal === 'number') {
              display = endVal - startVal;
            } else {
              display = typeof raw === 'number' ? raw : 0;
            }
          } else if (baseRow && typeof raw === 'number' && typeof baseRow[key] === 'number') {
            display = raw - (baseRow[key] as number);
          } else {
            display = typeof raw === 'number' ? raw : 0;
          }

          return (
            <div key={`${key}-${index}`} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-400 dark:text-slate-400 light:text-slate-600">
                  {entry.name}
                  {isVix && <span className="text-[8px] ml-1 opacity-50">(skalert)</span>}:
                </span>
              </div>
              <span className={`font-mono font-bold ${getTrendColorClass(display)}`}>
                {formatPercent(display)}
              </span>
            </div>
          );
        })}

        {/* Kapitalstrøm-seksjon (hvis aktiv) */}
        {showLiquidityFlow && flowItems.length > 0 && (
          <div className="mt-2 pt-1 border-t border-slate-800 dark:border-slate-800 light:border-slate-100 space-y-1">
            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-1">Volum-momentum (vs. start)</p>
            {flowItems.map((item, i) => {
              const sym = String(item.dataKey).replace('_FLOW', '');
              const dollarVol = data[anchorIndex ?? data.length - 1]?.[`${sym}_dollar_volume`] as number || 0;
              return (
                <div key={`flow-${i}`} className="flex flex-col opacity-90">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-400 dark:text-slate-400 light:text-slate-600">{item.name?.replace('(Volum %)', '').trim()}:</span>
                    </div>
                    <span className={`font-mono font-bold ${getTrendColorClass(item.value as number)}`}>
                      {typeof item.value === 'number' ? (item.value > 0 ? '+' : '') + item.value.toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <span className="text-[9px] text-slate-500 font-mono italic">Verdi: ${formatLargeNumber(dollarVol)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Volum-seksjon nederst */}
        {totalDollarVolume > 0 && (
          <div className="mt-2 pt-1 border-t border-slate-800 dark:border-slate-800 light:border-slate-100">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-slate-500 dark:text-slate-500 light:text-slate-400">Total verdi handlet:</span>
              </div>
              <span className="font-mono font-bold text-slate-300 dark:text-slate-300 light:text-slate-700">
                ${formatLargeNumber(totalDollarVolume)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
