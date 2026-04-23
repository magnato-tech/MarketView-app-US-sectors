import { clampScore, ComponentContext, FactoryComponent, toNumber } from './types';

export const CrisisComponent: FactoryComponent = {
  id: 'CRISIS_DROP',
  compute(context: ComponentContext, params: Record<string, number | string | boolean>): number {
    const lookbackDays = Math.max(2, Math.floor(toNumber(params.lookbackDays, 3)));
    const minDropPct = Math.abs(toNumber(params.minDropPct, 5));
    const intensity = Math.max(1, toNumber(params.intensity, 3));

    if (context.prices.length < lookbackDays + 1) return 0;

    const recent = context.prices.slice(-(lookbackDays + 1));
    const dailyDrops: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1];
      const curr = recent[i];
      if (prev <= 0) continue;
      const pct = ((curr - prev) / prev) * 100;
      dailyDrops.push(pct);
    }

    if (dailyDrops.length === 0) return 0;
    const avgDailyMove = dailyDrops.reduce((sum, move) => sum + move, 0) / dailyDrops.length;

    // Crisis alpha: negative market shock gives a positive contrarian score.
    if (avgDailyMove >= 0) return 0;
    const absoluteDrop = Math.abs(avgDailyMove);
    if (absoluteDrop < minDropPct) return 0;

    const normalized = (absoluteDrop - minDropPct) / minDropPct;
    return clampScore(normalized * intensity);
  },
};
