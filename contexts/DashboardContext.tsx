import React, { createContext, useContext, ReactNode, useState } from 'react';
import { Period, Interval, MarketDataPoint, SummaryStats } from '../types';
import { useDashboardLogic } from '../hooks/useDashboardLogic';
import { TICKERS } from '../constants';
import { getEtfHoldings } from '../services/etfService';
import { fetchMarketData } from '../services/marketDataService';

import { RangeSummaryRow } from '../services/analysisService';
import { AISignal } from '../types/trading';

export type DashboardTab = 'dashboard' | 'commandCenter' | 'factory' | 'lab';

export type DetailType = 'sector' | 'etf' | 'stock';

export type ActiveTrendFilter = 'positive' | 'negative' | null;

export interface DetailContext {
  type: DetailType;
  symbol: string;
}

interface DashboardContextType {
  selectedTickers: string[];
  period: Period;
  interval: Interval;
  data: MarketDataPoint[];
  summary: SummaryStats[];
  loading: boolean;
  /** Markedsdata (Yahoo) feilet – se UI i MainDashboard. */
  marketDataError: Error | null;
  aiInsight: string;
  aiSignals: AISignal[];
  rangeSummary: RangeSummaryRow[];
  activeTickers: string[];
  activeTab: DashboardTab;
  isDarkMode: boolean;
  drilldownSector: string | null; // Symbolet til sektoren som er i drilldown (f.eks. 'XLK')
  activeDrilldownTickers: string[]; // Tickers som faktisk skal vises i grafen under drilldown
  sectorTrendBySymbol: Record<string, number>;
  /** Alle sektorer + innsatsvarer for valgt periode (uavhengig av diagramutvalg). */
  allSectorsSummary: SummaryStats[];
  autoTopThreeEnabled: boolean;
  activeTrendFilter: ActiveTrendFilter;
  setActiveTab: (tab: DashboardTab) => void;
  toggleDarkMode: () => void;
  setAutoTopThreeEnabled: (enabled: boolean) => void;
  toggleTrendFilter: (direction: 'positive' | 'negative') => void;
  setDrilldownSector: (symbol: string | null) => void;
  /** Avslutt sektor-drilldown og sett diagram til nøyaktig disse symbolene (ingen barn-ETF). */
  leaveSectorDrilldownWithSymbols: (symbols: string[]) => void;
  toggleDrilldownTicker: (symbol: string) => void;
  handleTickerToggle: (symbol: string) => void;
  handlePeriodChange: (period: Period) => void;
  handleIntervalChange: (interval: Interval) => void;
  onPeriodChange: (period: Period) => void;
  onIntervalChange: (interval: Interval) => void;
  refreshData: () => void;
  // Analyse-innstillinger som skal huskes på tvers av re-renders
  analysisSettings: {
    showSMA: boolean;
    smaWindow: number;
    showLiquidityFlow: boolean;
    showPortfolio: boolean;
  };
  setAnalysisSettings: React.Dispatch<React.SetStateAction<{
    showSMA: boolean;
    smaWindow: number;
    showLiquidityFlow: boolean;
    showPortfolio: boolean;
  }>>;
  // Detalj-kontekst for sidepanelet (erstatter selectedETFSymbol)
  detailContext: DetailContext | null;
  setDetailContext: (context: DetailContext | null) => void;
  // Drilldown fra ETF til dens holdings (barn/aksjer). Symmetrisk med
  // sektor-drilldown: moder-ETF er alltid synlig, søsken-aksjer kan toggles av.
  drilldownETF: string | null;
  activeEtfStockTickers: string[];
  openEtfDrilldown: (etfSymbol: string) => void;
  closeEtfDrilldown: () => void;
  toggleEtfStockTicker: (symbol: string) => void;
  // Prisoppslag
  lastPrices: Record<string, number>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode; initialTickers: string[] }> = ({ 
  children, 
  initialTickers 
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [drilldownSector, setDrilldownSectorState] = useState<string | null>(null);
  const [activeDrilldownTickers, setActiveDrilldownTickers] = useState<string[]>([]);
  const [detailContext, setDetailContext] = useState<DetailContext | null>(null);
  const [drilldownETF, setDrilldownETFState] = useState<string | null>(null);
  const [activeEtfStockTickers, setActiveEtfStockTickers] = useState<string[]>([]);
  const [preEtfDrilldownTickers, setPreEtfDrilldownTickers] = useState<string[]>([]);
  const [autoTopThreeEnabled, setAutoTopThreeEnabledState] = useState<boolean>(true);
  const [activeTrendFilter, setActiveTrendFilter] = useState<ActiveTrendFilter>(null);
  const [allSectorsSummary, setAllSectorsSummary] = useState<SummaryStats[]>([]);
  
  // Analyse-innstillinger flyttet til Context for å overleve re-renders av AnalysisBoard
  const [analysisSettings, setAnalysisSettings] = useState({
    showSMA: true,
    smaWindow: 20,
    showLiquidityFlow: false,
    showPortfolio: false
  });
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      // Force body background for safety
      document.body.style.backgroundColor = '#020617'; // slate-950
      document.body.style.color = '#e2e8f0'; // slate-200
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('theme', 'light');
      // Force body background for safety
      document.body.style.backgroundColor = '#f8fafc'; // slate-50
      document.body.style.color = '#0f172a'; // slate-900
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const { 
    state, 
    rangeSummary, 
    activeTickers, 
    handleTickerToggle: baseHandleTickerToggle, 
    handlePeriodChange, 
    handleIntervalChange, 
    refreshData,
    setSelectedTickers 
  } = useDashboardLogic(initialTickers);

  const setAutoTopThreeEnabled = (enabled: boolean) => {
    setAutoTopThreeEnabledState(enabled);
    if (enabled) {
      setActiveTrendFilter(null);
      setDrilldownSectorState(null);
      setActiveDrilldownTickers([]);
      setDrilldownETFState(null);
      setActiveEtfStockTickers([]);
      setPreEtfDrilldownTickers([]);
      setDetailContext(null);
    }
  };

  const sectorSymbolSet = React.useMemo(
    () => new Set(TICKERS.filter(t => t.category === 'Sector').map(t => t.symbol)),
    []
  );

  const sectorSummaryForRanking = React.useMemo(
    () => allSectorsSummary.filter(s => sectorSymbolSet.has(s.symbol)),
    [allSectorsSummary, sectorSymbolSet]
  );

  React.useEffect(() => {
    let cancelled = false;
    const sectorSymbols = TICKERS.filter(t => t.category === 'Sector').map(t => t.symbol);
    const drilldownEtfSymbols = TICKERS.filter(
      t => t.category === 'ETF' && t.parentSymbol && sectorSymbolSet.has(t.parentSymbol)
    ).map(t => t.symbol);
    const allSymbols = [...new Set([...sectorSymbols, ...drilldownEtfSymbols])];

    const loadAllSectorsSummary = async () => {
      try {
        const { summary } = await fetchMarketData(
          allSymbols,
          state.period,
          state.interval
        );
        if (!cancelled) {
          setAllSectorsSummary(summary);
        }
      } catch (error) {
        console.warn('Failed to load all-sector summary:', error);
      }
    };

    loadAllSectorsSummary();
    return () => {
      cancelled = true;
    };
  }, [state.period, state.interval, sectorSymbolSet]);

  const clearSectorDrilldownState = () => {
    setDrilldownSectorState(null);
    setActiveDrilldownTickers([]);
  };

  const leaveSectorDrilldownWithSymbols = (symbols: string[]) => {
    setActiveTrendFilter(null);
    setAutoTopThreeEnabledState(false);
    clearSectorDrilldownState();
    setDetailContext(null);
    setSelectedTickers(symbols);
  };

  const setDrilldownSector = (symbol: string | null) => {
    if (symbol === drilldownSector) return;

    if (symbol) {
      setActiveTrendFilter(null);
      setDrilldownSectorState(symbol);

      const childTickers = TICKERS.filter(t => t.parentSymbol === symbol).map(t => t.symbol);

      setSelectedTickers([symbol, ...childTickers]);
      setActiveDrilldownTickers([symbol]);
    } else {
      const focus = drilldownSector;
      clearSectorDrilldownState();
      if (focus) {
        setSelectedTickers([focus]);
      }
    }
  };

  const openEtfDrilldown = (etfSymbol: string) => {
    if (drilldownETF === etfSymbol) return;

    const holdings = getEtfHoldings(etfSymbol);

    if (!drilldownETF) {
      setPreEtfDrilldownTickers(state.selectedTickers);
    }

    setActiveTrendFilter(null);

    if (drilldownSector) {
      setDrilldownSectorState(null);
      setActiveDrilldownTickers([]);
    }

    setDrilldownETFState(etfSymbol);
    setSelectedTickers([etfSymbol, ...holdings]);
    setActiveEtfStockTickers([]);
  };

  const closeEtfDrilldown = () => {
    if (!drilldownETF) return;
    setDrilldownETFState(null);
    setActiveEtfStockTickers([]);
    if (preEtfDrilldownTickers.length > 0) {
      setSelectedTickers(preEtfDrilldownTickers);
      setPreEtfDrilldownTickers([]);
    }
  };

  const toggleEtfStockTicker = (symbol: string) => {
    setActiveEtfStockTickers(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const NEUTRAL_TREND_THRESHOLD = 0.1;

  const resetDrilldownModes = () => {
    setDrilldownSectorState(null);
    setActiveDrilldownTickers([]);
    setDrilldownETFState(null);
    setActiveEtfStockTickers([]);
    setPreEtfDrilldownTickers([]);
    setDetailContext(null);
  };

  const computeTrendFilteredSymbols = (
    direction: 'positive' | 'negative',
    summary: SummaryStats[]
  ): string[] | null => {
    if (summary.length === 0) return null;
    const filteredSymbols = summary
      .filter(row =>
        direction === 'positive'
          ? row.percentChange > NEUTRAL_TREND_THRESHOLD
          : row.percentChange < -NEUTRAL_TREND_THRESHOLD
      )
      .map(row => row.symbol);
    if (filteredSymbols.length === 0) return null;
    return filteredSymbols;
  };

  const applyTrendFilterFromSummary = (
    direction: 'positive' | 'negative',
    summary: SummaryStats[],
    options: { resetDrilldown: boolean }
  ) => {
    const filteredSymbols = computeTrendFilteredSymbols(direction, summary);
    if (!filteredSymbols) return;

    setAutoTopThreeEnabledState(false);
    if (options.resetDrilldown) {
      resetDrilldownModes();
    }
    setSelectedTickers(filteredSymbols);
  };

  const toggleTrendFilter = (direction: 'positive' | 'negative') => {
    if (activeTrendFilter === direction) {
      setActiveTrendFilter(null);
      return;
    }
    const filtered = computeTrendFilteredSymbols(direction, sectorSummaryForRanking);
    if (!filtered) return;

    setActiveTrendFilter(direction);
    setAutoTopThreeEnabledState(false);
    resetDrilldownModes();
    setSelectedTickers(filtered);
  };

  const handleTickerToggle = (symbol: string) => {
    setActiveTrendFilter(null);
    if (autoTopThreeEnabled) {
      setAutoTopThreeEnabledState(false);
    }

    if (drilldownSector) {
      const meta = TICKERS.find(t => t.symbol === symbol);
      const isRootSector =
        meta?.category === 'Sector' && !meta.parentSymbol;

      if (symbol === drilldownSector) {
        setDrilldownSector(null);
        setDetailContext(null);
        return;
      }

      if (isRootSector && symbol !== drilldownSector) {
        leaveSectorDrilldownWithSymbols([drilldownSector, symbol]);
        return;
      }
    }

    baseHandleTickerToggle(symbol);
  };

  const toggleDrilldownTicker = (symbol: string) => {
    setActiveDrilldownTickers(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol) 
        : [...prev, symbol]
    );
  };


  const lastPrices = React.useMemo(() => {
    const prices: Record<string, number> = {};
    state.summary.forEach(s => {
      prices[s.symbol] = s.lastPrice;
    });
    return prices;
  }, [state.summary]);

  const sectorTrendBySymbol = React.useMemo(() => {
    const map: Record<string, number> = {};
    sectorSummaryForRanking.forEach(row => {
      map[row.symbol] = row.percentChange;
    });
    return map;
  }, [sectorSummaryForRanking]);

  React.useEffect(() => {
    if (!autoTopThreeEnabled) return;
    if (drilldownSector || drilldownETF) return;
    if (sectorSummaryForRanking.length === 0) return;

    const topThree = [...sectorSummaryForRanking]
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 3)
      .map(row => row.symbol);

    if (topThree.length === 0) return;

    const sameSelection =
      state.selectedTickers.length === topThree.length &&
      topThree.every(sym => state.selectedTickers.includes(sym));

    if (!sameSelection) {
      setSelectedTickers(topThree);
    }
  }, [
    autoTopThreeEnabled,
    drilldownSector,
    drilldownETF,
    sectorSummaryForRanking,
    state.selectedTickers,
    setSelectedTickers,
  ]);

  React.useEffect(() => {
    if (!activeTrendFilter) return;
    if (drilldownSector || drilldownETF) return;
    if (sectorSummaryForRanking.length === 0) return;

    applyTrendFilterFromSummary(activeTrendFilter, sectorSummaryForRanking, {
      resetDrilldown: false,
    });
  }, [activeTrendFilter, sectorSummaryForRanking, drilldownSector, drilldownETF]);

  const { error: marketDataError, ...stateForContext } = state;
  const value: DashboardContextType = {
    ...stateForContext,
    marketDataError,
    rangeSummary,
    activeTickers,
    activeTab,
    isDarkMode,
    drilldownSector,
    activeDrilldownTickers,
    sectorTrendBySymbol,
    allSectorsSummary,
    autoTopThreeEnabled,
    activeTrendFilter,
    setActiveTab,
    toggleDarkMode,
    setAutoTopThreeEnabled,
    toggleTrendFilter,
    setDrilldownSector,
    leaveSectorDrilldownWithSymbols,
    toggleDrilldownTicker,
    handleTickerToggle,
    handlePeriodChange,
    handleIntervalChange,
    onPeriodChange: handlePeriodChange,
    onIntervalChange: handleIntervalChange,
    refreshData,
    analysisSettings,
    setAnalysisSettings,
    detailContext,
    setDetailContext,
    drilldownETF,
    activeEtfStockTickers,
    openEtfDrilldown,
    closeEtfDrilldown,
    toggleEtfStockTicker,
    lastPrices,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
