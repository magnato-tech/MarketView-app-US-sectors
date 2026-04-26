import React from 'react';
import type { CrisisVisualTier } from '../services/crisisEngineRules';

type Props = {
  tier: CrisisVisualTier;
  title?: string;
};

/** Pulserende statusprikk for sidebar. `prefers-reduced-motion`: grid_lock blinker ikke. */
export const CrisisStatusDot: React.FC<Props> = ({ tier, title }) => {
  const base = 'inline-block h-2 w-2 shrink-0 rounded-full ring-2 ring-offset-0';

  if (tier === 'offline') {
    return (
      <span
        className={`${base} bg-slate-500 ring-slate-600 ring-offset-0 motion-safe:animate-pulse`}
        title={title}
        aria-hidden
      />
    );
  }

  if (tier === 'grid_lock') {
    return (
      <span className="relative inline-flex h-2 w-2 shrink-0" title={title}>
        <span className="absolute inline-flex h-full w-full rounded-full bg-rose-600 opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600 ring-2 ring-rose-900/40 ring-offset-0" />
      </span>
    );
  }

  if (tier === 'red') {
    return (
      <span className={`${base} bg-rose-500 ring-rose-700 ring-offset-0 motion-safe:animate-pulse`} title={title} aria-hidden />
    );
  }

  if (tier === 'yellow') {
    return (
      <span className={`${base} bg-amber-400 ring-amber-700 ring-offset-0 motion-safe:animate-pulse`} title={title} aria-hidden />
    );
  }

  return (
    <span className={`${base} bg-emerald-500 ring-emerald-700 ring-offset-0 motion-safe:animate-pulse`} title={title} aria-hidden />
  );
};
