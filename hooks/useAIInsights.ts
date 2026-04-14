import { useState, useEffect } from 'react';
import { SummaryStats, Period } from '../types';
import { getMarketInsights } from '../services/geminiService';

export const useAIInsights = (summary: SummaryStats[], period: Period) => {
  const [aiInsight, setAiInsight] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (summary.length > 0) {
      setLoading(true);
      setAiInsight('');
      getMarketInsights(summary, period)
        .then(insight => {
          setAiInsight(insight);
        })
        .catch(err => {
          console.error("Failed to fetch AI insights", err);
          setAiInsight('Kunne ikke hente AI-innsikt for øyeblikket.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [summary, period]);

  return { aiInsight, loadingAI: loading };
};
