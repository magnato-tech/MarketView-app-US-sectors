import React from 'react';
import type { SummaryStats } from '../../types';
import type { SelectedInstrumentBadgesProps } from './types';

export function SelectedInstrumentBadges({
  summary,
  maxItems,
  bubbleClassName,
  containerClassName = 'flex -space-x-2',
  labelClassName = 'text-[10px] text-slate-400 font-bold uppercase tracking-widest',
}: SelectedInstrumentBadgesProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={containerClassName}>
        {summary.slice(0, maxItems).map((s) => (
          <div key={s.symbol} className={bubbleClassName} style={{ backgroundColor: s.color }} />
        ))}
      </div>
      <span className={labelClassName}>Valgte instrumenter</span>
    </div>
  );
}
