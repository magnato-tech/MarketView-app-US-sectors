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
  setActiveTab: (tab: DashboardTab) => void;
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
  const { 
    state, 
    rangeSummary, 
    activeTickers, 
    handleTickerToggle, 
    handlePeriodChange, 
    handleIntervalChange, 
    refreshData 
  } = useDashboardLogic(initialTickers);

  const value: DashboardContextType = {
    ...state,
    rangeSummary,
    activeTickers,
    activeTab,
    setActiveTab,
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
