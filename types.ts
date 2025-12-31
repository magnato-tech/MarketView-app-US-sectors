
export type Period = '1d' | '5d' | '1mo' | '2mo' | '3mo' | '6mo' | '1y' | '2y';
export type Interval = '1d' | '1wk' | '1mo';

export interface TickerInfo {
  symbol: string;
  name: string;
  category: 'Index' | 'Sector';
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
