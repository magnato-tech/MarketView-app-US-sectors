
export type Period = '1d' | '5d' | '2w' | '3w' | '1mo' | '2mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';
export type Interval = '1d' | '1wk' | '1mo';

export interface TickerInfo {
  symbol: string;
  name: string;
  category: 'Index' | 'Sector' | 'ETF';
  group?: string;
  parentSymbol?: string; // For drilldown (f.eks. 'XLK' for en teknologi-ETF)
  color: string;
}

export interface MarketDataPoint {
  timestamp: string;
  [symbol: string]: number | string; // price or timestamp
}

export interface SummaryStats {
  symbol: string;
  name: string;
  lastPrice: number;
  percentChange: number;
  color: string;
  timestamp?: string; // Lagt til for backtesting
  // Nye fundamentale felt
  marketCap?: number;
  peRatio?: number;
  psRatio?: number;
  dividendYield?: number;
  high52w?: number;
  low52w?: number;
  volume?: number;
  // Tekniske indikatorer for Quant Engine
  rsi?: number;
  sma50?: number;
  sma200?: number;
}

export interface BotConfig {
  id: string;
  name: string;
  version: string;
  mode: 'Simple' | 'Advanced';
  enabled: boolean;
  entryLogic: {
    vixFilterEnabled: boolean;
    vixThreshold: number;
    primarySma: number;
    secondarySma: number;
    momentumPeriodDays: number;
    minRelativeStrengthScore: number;
    kpiWeights: {
      momentum: number;
      rsi: number;
      pe: number;
    };
  };
  stopLossModule: {
    type: 'Static' | 'Dynamic_Excel_Optimizer';
    optimizationRange: [number, number];
    stepInterval: number;
    lookbackPeriodMonths: number;
    currentOptimalSl: number;
    staticSlPercent?: number;
  };
  swapLogic: {
    enabled: boolean;
    alphaBufferPercent: number;
    rebalanceDay: 'Monday' | 'Daily';
  };
  riskManagement: {
    maxRiskPerTradePercent: number;
    maxPortfolioDrawdown: number;
    emergencyExitEnabled: boolean;
  };
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  timestamp: string;
  reason: string;
}

export interface BotState {
  botId: string;
  balance: number;
  positions: Array<{
    symbol: string;
    quantity: number;
    averagePrice: number;
    highestPriceSinceEntry: number;
  }>;
  history: Trade[];
  performance: {
    totalReturn: number;
    dailyReturns: number[];
    sharpeRatio: number;
    maxDrawdown: number;
  };
}


export interface AppState {
  selectedTickers: string[];
  period: Period;
  interval: Interval;
  data: MarketDataPoint[];
  summary: SummaryStats[];
  loading: boolean;
  aiInsight: string;
}
