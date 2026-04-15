import { useState, useEffect } from 'react';
import { SummaryStats, Period, MarketDataPoint } from '../types';
import { getMarketInsights } from '../services/geminiService';

const INSIGHT_CACHE_KEY = 'aiInsightCacheV1';
const INSIGHT_TTL_MS = 30 * 60 * 1000; // 30 min
const MIN_CALL_GAP_MS = 20 * 1000; // 20 sek mellom kall

type CachedInsight = {
  key: string;
  insight: string;
  timestamp: number;
};

const readCache = (): CachedInsight[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(INSIGHT_CACHE_KEY) || '[]') as CachedInsight[];
  } catch {
    return [];
  }
};

const writeCache = (items: CachedInsight[]) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify(items.slice(0, 25)));
  } catch {
    // ignore storage errors
  }
};

export const useAIInsights = (summary: SummaryStats[], period: Period, data: MarketDataPoint[]) => {
  const [aiInsight, setAiInsight] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (summary.length === 0) return;
    let active = true;
    const now = Date.now();
    const symbolsKey = [...summary].map(s => s.symbol).sort().join(',');
    const latestTs = data.length ? String(data[data.length - 1].timestamp) : 'no-data';
    const cacheKey = `${period}|${symbolsKey}|${latestTs}`;

    const cache = readCache();
    const cached = cache.find(c => c.key === cacheKey && now - c.timestamp < INSIGHT_TTL_MS);
    if (cached?.insight) {
      setAiInsight(cached.insight);
      setLoading(false);
      return;
    }

    const recentCall = cache.find(c => c.key.startsWith(`${period}|${symbolsKey}|`));
    if (recentCall && now - recentCall.timestamp < MIN_CALL_GAP_MS) {
      setAiInsight(recentCall.insight || 'Bruker nylig analyse for å unngå for mange API-kall.');
      setLoading(false);
      return;
    }

    setLoading(true);
    // Behold forrige tekst mens ny analyse lastes for bedre UX og færre "tomme" states.
    const recentData = data.slice(-20);
    const timeout = setTimeout(() => {
      getMarketInsights(summary, period, recentData)
        .then(insight => {
          if (!active) return;
          setAiInsight(insight);
          const existing = readCache().filter(c => c.key !== cacheKey);
          writeCache([{ key: cacheKey, insight, timestamp: Date.now() }, ...existing]);
        })
        .catch(err => {
          console.error("Failed to fetch AI insights", err);
          if (active) setAiInsight('Kunne ikke hente AI-innsikt for øyeblikket.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 500);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [
    period,
    summary.map(s => `${s.symbol}:${s.percentChange.toFixed(2)}`).join(','),
    data.length,
    data.length ? String(data[data.length - 1].timestamp) : ''
  ]);

  return { aiInsight, loadingAI: loading };
};
