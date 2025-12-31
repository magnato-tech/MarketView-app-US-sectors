
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Period, Interval } from './types';
import Sidebar from './components/Sidebar';
import MainDashboard from './components/MainDashboard';
import { fetchMarketData } from './services/marketDataService';
import { getMarketInsights } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    selectedTickers: ['^GSPC', '^NDX', '^VIX', 'XLK', 'XLF'],
    period: '6mo',
    interval: '1d',
    data: [],
    summary: [],
    loading: true,
    aiInsight: ''
  });

  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const { data, summary } = await fetchMarketData(
        state.selectedTickers,
        state.period,
        state.interval
      );
      
      setState(prev => ({ ...prev, data, summary, loading: false }));

      // Fetch AI Insights in background with period context
      if (summary.length > 0) {
        getMarketInsights(summary, state.period).then(insight => {
          setState(prev => ({ ...prev, aiInsight: insight }));
        });
      }
    } catch (error) {
      console.error("Failed to fetch market data", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.selectedTickers, state.period, state.interval]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedTickers, state.period, state.interval]);

  const handleTickerToggle = (symbol: string) => {
    setState(prev => {
      const isSelected = prev.selectedTickers.includes(symbol);
      const newSelected = isSelected
        ? prev.selectedTickers.filter(s => s !== symbol)
        : [...prev.selectedTickers, symbol];
      
      if (newSelected.length === 0) return prev;
      return { ...prev, selectedTickers: newSelected };
    });
  };

  const handlePeriodChange = (period: Period) => setState(prev => ({ ...prev, period, aiInsight: '' }));
  const handleIntervalChange = (interval: Interval) => setState(prev => ({ ...prev, interval }));

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-200">
      <Sidebar
        selectedTickers={state.selectedTickers}
        onTickerToggle={handleTickerToggle}
      />
      <MainDashboard
        data={state.data}
        summary={state.summary}
        loading={state.loading}
        aiInsight={state.aiInsight}
        period={state.period}
        onPeriodChange={handlePeriodChange}
        interval={state.interval}
        onIntervalChange={handleIntervalChange}
      />
    </div>
  );
};

export default App;
