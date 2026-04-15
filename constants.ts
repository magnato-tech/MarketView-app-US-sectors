
import { TickerInfo } from './types';

export const TICKERS: TickerInfo[] = [
  // Anchor indices (kept for context, but dashboard defaults to sectors)
  { symbol: '^GSPC', name: 'S&P 500', category: 'Index', color: '#3b82f6' },
  { symbol: '^NDX', name: 'Nasdaq 100', category: 'Index', color: '#8b5cf6' },
  { symbol: '^VIX', name: 'VIX Volatility', category: 'Index', color: '#f43f5e' },

  // Top-down sector categories (representative ETFs)
  { symbol: 'XLK', name: 'Teknologi', category: 'Sector', group: 'Hovedkategorier', color: '#10b981' },
  { symbol: 'XLV', name: 'Helse', category: 'Sector', group: 'Hovedkategorier', color: '#0ea5e9' },
  { symbol: 'XLF', name: 'Finans', category: 'Sector', group: 'Hovedkategorier', color: '#f59e0b' },
  { symbol: 'XLRE', name: 'Eiendom', category: 'Sector', group: 'Hovedkategorier', color: '#14b8a6' },
  { symbol: 'IGF', name: 'Infrastruktur', category: 'Sector', group: 'Hovedkategorier', color: '#64748b' },
  { symbol: 'XLY', name: 'Konsum', category: 'Sector', group: 'Hovedkategorier', color: '#ec4899' },
  { symbol: 'XLC', name: 'Telekom', category: 'Sector', group: 'Hovedkategorier', color: '#6366f1' },
  { symbol: 'XLI', name: 'Industri', category: 'Sector', group: 'Hovedkategorier', color: '#94a3b8' },
  { symbol: 'XLU', name: 'Forsyning', category: 'Sector', group: 'Hovedkategorier', color: '#eab308' },
  { symbol: 'SHY', name: 'Obligasjoner kort', category: 'Sector', group: 'Hovedkategorier', color: '#c084fc' },
  { symbol: 'TLT', name: 'Obligasjoner lang', category: 'Sector', group: 'Hovedkategorier', color: '#8b5cf6' },

  // Innsatsvarer (samlet)
  { symbol: 'XLE', name: 'Energi', category: 'Sector', group: 'Innsatsvarer', color: '#f97316' },
  { symbol: 'XLB', name: 'Materialer', category: 'Sector', group: 'Innsatsvarer', color: '#84cc16' },
  { symbol: 'DBC', name: 'Råvarer', category: 'Sector', group: 'Innsatsvarer', color: '#65a30d' },
  { symbol: 'GLD', name: 'Edelmetaller', category: 'Sector', group: 'Innsatsvarer', color: '#facc15' },

  // --- Drilldown ETFs (Initial set for testing) ---
  
  // Teknologi (XLK)
  { symbol: 'SOXX', name: 'Semiconductors', category: 'ETF', parentSymbol: 'XLK', color: '#34d399' },
  { symbol: 'SKYY', name: 'Cloud Computing', category: 'ETF', parentSymbol: 'XLK', color: '#60a5fa' },
  { symbol: 'CIBR', name: 'Cybersecurity', category: 'ETF', parentSymbol: 'XLK', color: '#818cf8' },
  
  // Energi (XLE)
  { symbol: 'XOP', name: 'Oil & Gas Expl.', category: 'ETF', parentSymbol: 'XLE', color: '#fb923c' },
  { symbol: 'TAN', name: 'Solar Energy', category: 'ETF', parentSymbol: 'XLE', color: '#fbbf24' },
  { symbol: 'ICLN', name: 'Clean Energy', category: 'ETF', parentSymbol: 'XLE', color: '#4ade80' },
];

export const PERIODS = ['1d', '5d', '2w', '1mo', '2mo', '3mo', '6mo', '1y', '2y', '5y'] as const;
export const INTERVALS = ['1d', '1wk', '1mo'] as const;
