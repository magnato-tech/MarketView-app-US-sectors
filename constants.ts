
import { TickerInfo } from './types';

export const TICKERS: TickerInfo[] = [
  // Indices
  { symbol: '^GSPC', name: 'S&P 500', category: 'Index', color: '#3b82f6' },
  { symbol: '^NDX', name: 'Nasdaq 100', category: 'Index', color: '#8b5cf6' },
  { symbol: '^DJI', name: 'Dow Jones', category: 'Index', color: '#ef4444' },
  // Sectors
  { symbol: 'XLK', name: 'Technology', category: 'Sector', color: '#10b981' },
  { symbol: 'XLF', name: 'Financial', category: 'Sector', color: '#f59e0b' },
  { symbol: 'XLV', name: 'Health Care', category: 'Sector', color: '#06b6d4' },
  { symbol: 'XLE', name: 'Energy', category: 'Sector', color: '#f97316' },
  { symbol: 'XLI', name: 'Industrials', category: 'Sector', color: '#64748b' },
  { symbol: 'XLY', name: 'Consumer Disc', category: 'Sector', color: '#ec4899' },
  { symbol: 'XLP', name: 'Consumer Staples', category: 'Sector', color: '#a855f7' },
  { symbol: 'XLB', name: 'Materials', category: 'Sector', color: '#84cc16' },
  { symbol: 'XLU', name: 'Utilities', category: 'Sector', color: '#eab308' },
  { symbol: 'XLC', name: 'Communication', category: 'Sector', color: '#6366f1' },
  { symbol: 'XLRE', name: 'Real Estate', category: 'Sector', color: '#14b8a6' },
];

export const PERIODS = ['1d', '5d', '1mo', '2mo', '3mo', '6mo', '1y', '2y'] as const;
export const INTERVALS = ['1d', '1wk', '1mo'] as const;
