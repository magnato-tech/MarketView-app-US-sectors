import { useState, useMemo } from 'react';
import { Period, Interval } from '../types';
import { calculateRangeSummary } from '../services/analysisService';
import { useMarketData } from './useMarketData';
import { useAIInsights } from './useAIInsights';
import { useLanguage } from '../contexts/LanguageContext';

export const useDashboardLogic = (initialTickers: string[]) => {
  const [selectedTickers, setSelectedTickers] = useState<string[]>(initialTickers);
  const [period, setPeriod] = useState<Period>('6mo');
  const [interval, setInterval] = useState<Interval>('1d');
  const { language } = useLanguage();

  const { data, summary, loading, error, refreshData } = useMarketData(selectedTickers, period, interval);
  const { aiInsight, aiSignals } = useAIInsights(summary, period, data, language);

  const handleTickerToggle = (symbol: string) => {
    setSelectedTickers(prev => {
      const isSelected = prev.includes(symbol);
      const newSelected = isSelected
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol];
      
      if (newSelected.length === 0) return prev;
      return newSelected;
    });
  };

  const handlePeriodChange = (p: Period) => setPeriod(p);
  const handleIntervalChange = (i: Interval) => setInterval(i);

  const rangeSummary = useMemo(() => {
    if (loading || data.length === 0) return [];
    
    // Vi sender med bySymbol hvis vi hadde hatt tilgang til det her for mer nøyaktige beregninger,
    // men calculateRangeSummary er nå robust nok til å bruke data-arrayen alene.
    return calculateRangeSummary(data, summary);
  }, [data, summary, loading]);

  const activeTickers = useMemo(() => summary.map(s => s.symbol), [summary]);

  return {
    state: {
      selectedTickers,
      period,
      interval,
      data,
      summary,
      loading,
      error,
      aiInsight,
      aiSignals
    },
    rangeSummary,
    activeTickers,
    handleTickerToggle,
    handlePeriodChange,
    handleIntervalChange,
    refreshData,
    setSelectedTickers
  };
};
