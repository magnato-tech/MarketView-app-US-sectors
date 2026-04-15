import React, { createContext, useContext, ReactNode, useState } from 'react';
import { Period, Interval, MarketDataPoint, SummaryStats } from '../types';
import { useDashboardLogic } from '../hooks/useDashboardLogic';

export type DashboardTab = 'dashboard' | 'analysis';

interface DashboardContextType {
  selectedTickers: string[];
  period: Period;
  interval: Interval;
  data: MarketDataPoint[];
  summary: SummaryStats[];
  loading: boolean;
  aiInsight: string;
  rangeSummary: any[]; // Adjust type if needed
  activeTickers: string[];
  activeTab: DashboardTab;
  isDarkMode: boolean;
  drilldownSector: string | null; // Symbolet til sektoren som er i drilldown (f.eks. 'XLK')
  setActiveTab: (tab: DashboardTab) => void;
  toggleDarkMode: () => void;
  setDrilldownSector: (symbol: string | null) => void;
  handleTickerToggle: (symbol: string) => void;
  handlePeriodChange: (period: Period) => void;
  handleIntervalChange: (interval: Interval) => void;
  onPeriodChange: (period: Period) => void;
  onIntervalChange: (interval: Interval) => void;
  refreshData: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode; initialTickers: string[] }> = ({ 
  children, 
  initialTickers 
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [drilldownSector, setDrilldownSectorState] = useState<string | null>(null);
  const [previousTickers, setPreviousTickers] = useState<string[]>([]);
  
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
      setSelectedTickers([symbol]); // Isoler sektoren i grafen
    } else {
      // Deaktiverer drilldown (Gjenopprett)
      setDrilldownSectorState(null);
      if (previousTickers.length > 0) {
        setSelectedTickers(previousTickers);
      }
    }
  };

  const value: DashboardContextType = {
    ...state,
    rangeSummary,
    activeTickers,
    activeTab,
    isDarkMode,
    drilldownSector,
    setActiveTab,
    toggleDarkMode,
    setDrilldownSector,
    handleTickerToggle,
    handlePeriodChange,
    handleIntervalChange,
    onPeriodChange: handlePeriodChange,
    onIntervalChange: handleIntervalChange,
    refreshData,
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
