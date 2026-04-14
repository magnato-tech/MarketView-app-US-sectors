import React from 'react';
import type { MarketDataPoint } from '../../types';
import type { RechartsTooltipPayloadItem } from './types';
import { formatPercent, getTrendColorClass } from '../../utils/formatters';

export type ChartTooltipProps = {
  active?: boolean;
  payload?: RechartsTooltipPayloadItem[];
  label?: string | number;
  data: MarketDataPoint[];
  anchorIndex: number | null;
};

export function ChartTooltip({ active, payload, label, data, anchorIndex }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const baseRow = anchorIndex != null && data[anchorIndex] ? data[anchorIndex] : null;

  const sorted = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-lg shadow-2xl text-xs">
      <p className="font-bold text-slate-300 mb-1 border-b border-slate-800 pb-1">{label}</p>
      {baseRow ? (
        <p className="text-[10px] text-slate-500 mb-2">
          Tall vs. start av markering ({baseRow.timestamp})
        </p>
      ) : (
        <p className="text-[10px] text-slate-500 mb-2">Tall vs. start av Yahoo-periode</p>
      )}
      <div className="space-y-1.5">
        {sorted.map((entry, index) => {
          const key = String(entry.dataKey ?? index);
          const raw = entry.value;
          let display: number;
          if (baseRow && typeof raw === 'number' && typeof baseRow[key] === 'number') {
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
