import { Language } from '../i18n/types';

export interface ETFHolding {
  symbol: string;
  name: string;
  weight: number; // Prosentandel (f.eks. 22.5)
}

export interface ETFDetails {
  symbol: string;
  name: string;
  description: string;
  expenseRatio: number;
  dividendYield: number;
  beta: number;
  peRatio: number;
  holdings: ETFHolding[];
  sectorExposure: Record<string, number>;
}

export async function fetchETFDetails(symbol: string, language: Language = 'no'): Promise<ETFDetails> {
  // Yahoo Finance API endepunkt for fondsinformasjon
  // Vi bruker 'assetProfile' for beskrivelse og 'fundProfile'/'topHoldings' for innmat
  const path = `/api/yahoo/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile,fundProfile,topHoldings,defaultKeyStatistics,summaryDetail`;
  
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const json = await res.json();
    const result = json.quoteSummary?.result?.[0];
    
    if (!result) throw new Error('No data found for symbol');

    const profile = result.assetProfile || {};
    const holdingsData = result.topHoldings || {};
    const stats = result.defaultKeyStatistics || {};
    const detail = result.summaryDetail || {};

    // Map holdings
    const holdings: ETFHolding[] = (holdingsData.holdings || []).map((h: any) => ({
      symbol: h.symbol,
      name: h.holdingName,
      weight: h.holdingPercent?.raw * 100 || 0
    }));

    // Map sektor-eksponering hvis tilgjengelig
    const sectorExposure: Record<string, number> = {};
    if (holdingsData.sectorWeightings) {
      holdingsData.sectorWeightings.forEach((sw: any) => {
        const sectorName = Object.keys(sw)[0];
        sectorExposure[sectorName] = sw[sectorName]?.raw * 100 || 0;
      });
    }

    return {
      symbol,
      name: detail.shortName || symbol,
      description: profile.longBusinessSummary || '',
      expenseRatio: detail.annualReportExpenseRatio?.raw * 100 || 0,
      dividendYield: detail.dividendYield?.raw * 100 || 0,
      beta: detail.beta?.raw || 0,
      peRatio: detail.trailingPE?.raw || 0,
      holdings,
      sectorExposure
    };
  } catch (err) {
    console.error(`Failed to fetch ETF details for ${symbol}:`, err);
    throw err;
  }
}
