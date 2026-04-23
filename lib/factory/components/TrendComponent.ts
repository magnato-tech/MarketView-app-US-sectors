import { clampScore, ComponentContext, FactoryComponent, toNumber } from './types';

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const TrendComponent: FactoryComponent = {
  id: 'TREND_SMA',
  compute(context: ComponentContext, params: Record<string, number | string | boolean>): number {
    const fastPeriod = Math.max(2, Math.floor(toNumber(params.fastPeriod, 20)));
    const slowPeriod = Math.max(fastPeriod + 1, Math.floor(toNumber(params.slowPeriod, 50)));
    const intensity = Math.max(1, toNumber(params.intensity, 8));

    if (context.prices.length < slowPeriod) return 0;

    const fastSma = average(context.prices.slice(-fastPeriod));
    const slowSma = average(context.prices.slice(-slowPeriod));
    if (slowSma === 0) return 0;

    const spread = (fastSma - slowSma) / slowSma;
    return clampScore(spread * intensity);
  },
};
