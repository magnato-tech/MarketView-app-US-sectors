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
};

export function ChartTooltip({ 
  active, 
  payload, 
  label, 
  data, 
  anchorIndex,
  rangeSelection 
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const isRangeMode = rangeSelection && rangeSelection.rangeStart !== rangeSelection.rangeEnd;
  const startIdx = isRangeMode ? Math.min(rangeSelection!.rangeStart, rangeSelection!.rangeEnd) : -1;
  const endIdx = isRangeMode ? Math.max(rangeSelection!.rangeStart, rangeSelection!.rangeEnd) : -1;
  
  const baseRow = isRangeMode 
    ? data[startIdx] 
    : (anchorIndex != null && data[anchorIndex] ? data[anchorIndex] : null);

  const sorted = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-lg shadow-2xl text-xs min-w-[180px]">
      <div className="flex justify-between items-center mb-1 border-b border-slate-800 pb-1">
        <p className="font-bold text-slate-300">{label}</p>
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
        <p className="text-[10px] text-slate-500 mb-2">
          Tall vs. start av markering ({baseRow.timestamp})
        </p>
      ) : (
        <p className="text-[10px] text-slate-500 mb-2">Tall vs. start av Yahoo-periode</p>
      )}

      <div className="space-y-1.5">
        {sorted.map((entry, index) => {
          const key = String(entry.dataKey ?? index);
          if (key.endsWith('_SMA')) return null; // Skip SMA in range tooltip for clarity

          const raw = entry.value;
          let display: number;

          if (isRangeMode) {
            const startVal = data[startIdx]?.[key];
            const endVal = data[endIdx]?.[key];
            if (typeof startVal === 'number' && typeof endVal === 'number') {
              // Calculate relative change within the selected range
              // Since values are already relative to the chart start, 
              // we calculate the difference in percentage points
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
                <span className="text-slate-400">{entry.name}:</span>
              </div>
              <span className={`font-mono font-bold ${getTrendColorClass(display)}`}>
                {formatPercent(display)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
