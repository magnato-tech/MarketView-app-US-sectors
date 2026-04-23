export interface ComponentContext {
  prices: number[];
  latestPrice: number;
}

export interface FactoryComponent {
  id: string;
  compute(context: ComponentContext, params: Record<string, number | string | boolean>): number;
}

export const clampScore = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
};

export const toNumber = (value: number | string | boolean | undefined, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

export const extractPriceSeries = (priceData: any): number[] => {
  if (Array.isArray(priceData)) {
    const fromNumbers = priceData.filter((value) => typeof value === 'number' && Number.isFinite(value));
    if (fromNumbers.length > 0) return fromNumbers as number[];

    const fromObjects = priceData
      .map((row) => {
        if (!row || typeof row !== 'object') return NaN;
        const maybeClose = (row as Record<string, unknown>).close;
        return typeof maybeClose === 'number' ? maybeClose : NaN;
      })
      .filter((value) => Number.isFinite(value)) as number[];
    if (fromObjects.length > 0) return fromObjects;
  }

  if (priceData && typeof priceData === 'object') {
    const record = priceData as Record<string, unknown>;
    const closes = record.closes;
    if (Array.isArray(closes)) {
      const filtered = closes.filter((value) => typeof value === 'number' && Number.isFinite(value)) as number[];
      if (filtered.length > 0) return filtered;
    }

    const prices = record.prices;
    if (Array.isArray(prices)) {
      const filtered = prices.filter((value) => typeof value === 'number' && Number.isFinite(value)) as number[];
      if (filtered.length > 0) return filtered;
    }

    const latest = record.close;
    if (typeof latest === 'number' && Number.isFinite(latest)) return [latest];
  }

  return [];
};
