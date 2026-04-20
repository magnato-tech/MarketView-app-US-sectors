import React, { createContext, useContext, ReactNode, useState } from 'react';
import { Period, Interval, MarketDataPoint, SummaryStats } from '../types';
import { useDashboardLogic } from '../hooks/useDashboardLogic';
import { TICKERS } from '../constants';

import { RangeSummaryRow } from '../services/analysisService';
import { AISignal } from './TradingContext';

export type DashboardTab = 'dashboard' | 'analysis' | 'portfolio';

interface DashboardContextType {
  selectedTickers: string[];
  period: Period;
  interval: Interval;
  data: MarketDataPoint[];
  summary: SummaryStats[];
  loading: boolean;
  aiInsight: string;
  aiSignals: AISignal[];
  rangeSummary: RangeSummaryRow[];
  activeTickers: string[];
  activeTab: DashboardTab;
  isDarkMode: boolean;
  drilldownSector: string | null; // Symbolet til sektoren som er i drilldown (f.eks. 'XLK')
  activeDrilldownTickers: string[]; // Tickers som faktisk skal vises i grafen under drilldown
  setActiveTab: (tab: DashboardTab) => void;
  toggleDarkMode: () => void;
  setDrilldownSector: (symbol: string | null) => void;
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
  };
  setAnalysisSettings: React.Dispatch<React.SetStateAction<{
    showSMA: boolean;
    smaWindow: number;
    showLiquidityFlow: boolean;
  }>>;
  // ETF Detaljer
  selectedETFSymbol: string | null;
  setSelectedETFSymbol: (symbol: string | null) => void;
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
  const [previousTickers, setPreviousTickers] = useState<string[]>([]);
  
  // Analyse-innstillinger flyttet til Context for å overleve re-renders av AnalysisBoard
  const [analysisSettings, setAnalysisSettings] = useState({
    showSMA: true,
    smaWindow: 20,
    showLiquidityFlow: false
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
    handleTickerToggle, 
    handlePeriodChange, 
    handleIntervalChange, 
    refreshData,
    setSelectedTickers 
  } = useDashboardLogic(initialTickers);

  const setDrilldownSector = (symbol: string | null) => {
    if (symbol === drilldownSector) return;

    if (symbol) {
      // Aktiverer drilldown (Fokus-modus)
      setPreviousTickers(state.selectedTickers);
      setDrilldownSectorState(symbol);
      
      // Finn alle barn (ETF-er) for denne sektoren
      const childTickers = TICKERS.filter(t => t.parentSymbol === symbol).map(t => t.symbol);
      
      // Vi setter ALLE i selectedTickers slik at data lastes inn for alle.
      // Vi skal nå bruke en ny state 'activeDrilldownTickers' for å styre hvem som faktisk VISES i grafen.
      setSelectedTickers([symbol, ...childTickers]);
      setActiveDrilldownTickers([symbol]); // Kun sektoren vises initialt
    } else {
      // Deaktiverer drilldown (Gjenopprett)
      setDrilldownSectorState(null);
      setActiveDrilldownTickers([]);
      if (previousTickers.length > 0) {
        setSelectedTickers(previousTickers);
      }
    }
  };

  const [activeDrilldownTickers, setActiveDrilldownTickers] = useState<string[]>([]);
  const [selectedETFSymbol, setSelectedETFSymbol] = useState<string | null>(null);

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

  const value: DashboardContextType = {
    ...state,
    rangeSummary,
    activeTickers,
    activeTab,
    isDarkMode,
    drilldownSector,
    activeDrilldownTickers,
    setActiveTab,
    toggleDarkMode,
    setDrilldownSector,
    toggleDrilldownTicker,
    handleTickerToggle,
    handlePeriodChange,
    handleIntervalChange,
    onPeriodChange: handlePeriodChange,
    onIntervalChange: handleIntervalChange,
    refreshData,
    analysisSettings,
    setAnalysisSettings,
    selectedETFSymbol,
    setSelectedETFSymbol,
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
