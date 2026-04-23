import { useState, useEffect } from 'react';
import { SummaryStats, Period, MarketDataPoint } from '../types';
import { getMarketInsights } from '../services/geminiService';
import type { Language } from '../i18n/types';
import { AISignal } from '../types/trading';

const INSIGHT_CACHE_KEY = 'aiInsightCacheV1';
const INSIGHT_TTL_MS = 30 * 60 * 1000; // 30 min
const MIN_CALL_GAP_MS = 20 * 1000; // 20 sek mellom kall

type CachedInsight = {
  key: string;
  insight: string;
  signals: AISignal[];
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

const fallbackText = (language: Language) =>
  language === 'en'
    ? 'Could not fetch AI insight right now.'
    : 'Kunne ikke hente AI-innsikt for øyeblikket.';

const reuseRecentText = (language: Language) =>
  language === 'en'
    ? 'Using recent analysis to avoid excessive API calls.'
    : 'Bruker nylig analyse for å unngå for mange API-kall.';

export const useAIInsights = (
  summary: SummaryStats[],
  period: Period,
  data: MarketDataPoint[],
  language: Language = 'no'
) => {
  const [aiInsight, setAiInsight] = useState('');
  const [aiSignals, setAiSignals] = useState<AISignal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (summary.length === 0) return;
    let active = true;
    const now = Date.now();
    const symbolsKey = [...summary].map(s => s.symbol).sort().join(',');
    const latestTs = data.length ? String(data[data.length - 1].timestamp) : 'no-data';
    const cacheKey = `${language}|${period}|${symbolsKey}|${latestTs}`;

    const cache = readCache();
    const cached = cache.find(c => c.key === cacheKey && now - c.timestamp < INSIGHT_TTL_MS);
    if (cached?.insight) {
      setAiInsight(cached.insight);
      setAiSignals(cached.signals || []);
      setLoading(false);
      return;
    }

    const recentCall = cache.find(c => c.key.startsWith(`${language}|${period}|${symbolsKey}|`));
    if (recentCall && now - recentCall.timestamp < MIN_CALL_GAP_MS) {
      setAiInsight(recentCall.insight || reuseRecentText(language));
      setAiSignals(recentCall.signals || []);
      setLoading(false);
      return;
    }

    setLoading(true);
    const recentData = data.slice(-20);
    const timeout = setTimeout(() => {
      getMarketInsights(summary, period, recentData, language)
        .then(result => {
          if (!active) return;
          setAiInsight(result.analysis);
          setAiSignals(result.signals);
          const existing = readCache().filter(c => c.key !== cacheKey);
          writeCache([{ key: cacheKey, insight: result.analysis, signals: result.signals, timestamp: Date.now() }, ...existing]);
        })
        .catch(err => {
          console.error("Failed to fetch AI insights", err);
          if (active) {
            setAiInsight(fallbackText(language));
            setAiSignals([]);
          }
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
    language,
    summary.map(s => `${s.symbol}:${s.percentChange.toFixed(2)}`).join(','),
    data.length,
    data.length ? String(data[data.length - 1].timestamp) : ''
  ]);

  return { aiInsight, aiSignals, loadingAI: loading };
};
