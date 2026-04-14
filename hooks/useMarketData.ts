import { useState, useEffect, useCallback } from 'react';
import { MarketDataPoint, SummaryStats, Period, Interval } from '../types';
import { fetchMarketData } from '../services/marketDataService';

export const useMarketData = (selectedTickers: string[], period: Period, interval: Interval) => {
  const [data, setData] = useState<MarketDataPoint[]>([]);
  const [summary, setSummary] = useState<SummaryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMarketData(selectedTickers, period, interval);
      setData(result.data);
      setSummary(result.summary);
    } catch (err) {
      console.error("Failed to fetch market data", err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [selectedTickers, period, interval]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, summary, loading, error, refreshData: loadData };
};
