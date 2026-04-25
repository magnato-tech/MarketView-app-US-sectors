
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

  // --- Drilldown ETFs ---
  
  // Teknologi (XLK)
  { symbol: 'SOXX', name: 'Semiconductors', category: 'ETF', parentSymbol: 'XLK', color: '#34d399' },
  { symbol: 'SKYY', name: 'Cloud Computing', category: 'ETF', parentSymbol: 'XLK', color: '#60a5fa' },
  { symbol: 'CIBR', name: 'Cybersecurity', category: 'ETF', parentSymbol: 'XLK', color: '#818cf8' },
  { symbol: 'IGV', name: 'Software', category: 'ETF', parentSymbol: 'XLK', color: '#a78bfa' },
  
  // Helse (XLV)
  { symbol: 'IBB', name: 'Biotechnology', category: 'ETF', parentSymbol: 'XLV', color: '#38bdf8' },
  { symbol: 'XBI', name: 'S&P Biotech', category: 'ETF', parentSymbol: 'XLV', color: '#0ea5e9' },
  { symbol: 'IHI', name: 'Medical Devices', category: 'ETF', parentSymbol: 'XLV', color: '#7dd3fc' },
  
  // Finans (XLF)
  { symbol: 'KBE', name: 'Banks', category: 'ETF', parentSymbol: 'XLF', color: '#fbbf24' },
  { symbol: 'KRE', name: 'Regional Banks', category: 'ETF', parentSymbol: 'XLF', color: '#f59e0b' },
  { symbol: 'IAI', name: 'Brokers & Exch.', category: 'ETF', parentSymbol: 'XLF', color: '#d97706' },
  
  // Eiendom (XLRE)
  { symbol: 'VNQ', name: 'Real Estate Index', category: 'ETF', parentSymbol: 'XLRE', color: '#2dd4bf' },
  { symbol: 'REM', name: 'Mortgage REITs', category: 'ETF', parentSymbol: 'XLRE', color: '#14b8a6' },
  { symbol: 'SRRE', name: 'Data & Infra REITs', category: 'ETF', parentSymbol: 'XLRE', color: '#0d9488' },

  // Infrastruktur (IGF)
  { symbol: 'PAVE', name: 'US Infrastructure', category: 'ETF', parentSymbol: 'IGF', color: '#94a3b8' },
  { symbol: 'GRID', name: 'Smart Grid', category: 'ETF', parentSymbol: 'IGF', color: '#64748b' },
  { symbol: 'IFRA', name: 'US Infra (Bred)', category: 'ETF', parentSymbol: 'IGF', color: '#475569' },

  // Konsum (XLY)
  { symbol: 'XRT', name: 'Retail', category: 'ETF', parentSymbol: 'XLY', color: '#f472b6' },
  { symbol: 'PEJ', name: 'Leisure & Ent.', category: 'ETF', parentSymbol: 'XLY', color: '#ec4899' },
  { symbol: 'AWAY', name: 'Travel Tech', category: 'ETF', parentSymbol: 'XLY', color: '#db2777' },

  // Telekom (XLC)
  { symbol: 'VOX', name: 'Comm. Services', category: 'ETF', parentSymbol: 'XLC', color: '#818cf8' },
  { symbol: 'FCOM', name: 'MSCI Comm.', category: 'ETF', parentSymbol: 'XLC', color: '#6366f1' },

  // Industri (XLI)
  { symbol: 'ITA', name: 'Aerospace & Def.', category: 'ETF', parentSymbol: 'XLI', color: '#cbd5e1' },
  { symbol: 'JETS', name: 'Airlines', category: 'ETF', parentSymbol: 'XLI', color: '#94a3b8' },
  { symbol: 'XTN', name: 'Transportation', category: 'ETF', parentSymbol: 'XLI', color: '#64748b' },

  // Forsyning (XLU)
  { symbol: 'VPU', name: 'Vanguard Utilities', category: 'ETF', parentSymbol: 'XLU', color: '#fde047' },
  { symbol: 'IDU', name: 'US Utilities', category: 'ETF', parentSymbol: 'XLU', color: '#eab308' },

  // Obligasjoner kort (SHY)
  { symbol: 'BIL', name: '1-3 Month T-Bill', category: 'ETF', parentSymbol: 'SHY', color: '#d8b4fe' },
  { symbol: 'VGSH', name: 'Short Treasury', category: 'ETF', parentSymbol: 'SHY', color: '#c084fc' },

  // Obligasjoner lang (TLT)
  { symbol: 'IEF', name: '7-10 Yr Treasury', category: 'ETF', parentSymbol: 'TLT', color: '#a78bfa' },
  { symbol: 'VGLT', name: 'Long Treasury', category: 'ETF', parentSymbol: 'TLT', color: '#8b5cf6' },

  // Energi (XLE)
  { symbol: 'XOP', name: 'Oil & Gas Expl.', category: 'ETF', parentSymbol: 'XLE', color: '#fb923c' },
  { symbol: 'TAN', name: 'Solar Energy', category: 'ETF', parentSymbol: 'XLE', color: '#fbbf24' },
  { symbol: 'ICLN', name: 'Clean Energy', category: 'ETF', parentSymbol: 'XLE', color: '#4ade80' },

  // Materialer (XLB)
  { symbol: 'XME', name: 'Metals & Mining', category: 'ETF', parentSymbol: 'XLB', color: '#a3e635' },
  { symbol: 'LIT', name: 'Lithium & Batt.', category: 'ETF', parentSymbol: 'XLB', color: '#84cc16' },
  { symbol: 'WOOD', name: 'Timber & Forestry', category: 'ETF', parentSymbol: 'XLB', color: '#65a30d' },

  // Råvarer (DBC)
  { symbol: 'USO', name: 'Oil Fund', category: 'ETF', parentSymbol: 'DBC', color: '#a3e635' },
  { symbol: 'UNG', name: 'Natural Gas', category: 'ETF', parentSymbol: 'DBC', color: '#84cc16' },
  { symbol: 'DBA', name: 'Agriculture', category: 'ETF', parentSymbol: 'DBC', color: '#65a30d' },

  // Edelmetaller (GLD)
  { symbol: 'SLV', name: 'Silver Trust', category: 'ETF', parentSymbol: 'GLD', color: '#fef08a' },
  { symbol: 'SIL', name: 'Silver Miners', category: 'ETF', parentSymbol: 'GLD', color: '#cbd5e1' },
  { symbol: 'GDX', name: 'Gold Miners', category: 'ETF', parentSymbol: 'GLD', color: '#facc15' },
  { symbol: 'PPLT', name: 'Platinum Shares', category: 'ETF', parentSymbol: 'GLD', color: '#eab308' },
];

export const PERIODS = ['1d', '5d', '2w', '3w', '1mo', '2mo', '3mo', '6mo', '1y', '2y', '5y'] as const;
export const INTERVALS = ['1d', '1wk', '1mo'] as const;
