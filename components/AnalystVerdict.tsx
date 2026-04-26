import React, { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCrisisEngine } from '../contexts/CrisisEngineContext';
import { getAnalystVerdictLines } from '../services/crisisEngineRules';

export const AnalystVerdict: React.FC = () => {
  const { language } = useLanguage();
  const isNo = language === 'no';
  const { supabaseReady, engineRow } = useCrisisEngine();

  const lines = useMemo(() => getAnalystVerdictLines(engineRow, isNo), [engineRow, isNo]);

  if (!supabaseReady) return null;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 dark:bg-slate-900/80 light:bg-white light:border-slate-200 p-5 space-y-3">
      <h3 className="text-xs uppercase tracking-widest font-black text-slate-400">
        {isNo ? 'AI-analytikerens dom' : 'AI analyst verdict'}
      </h3>
      {lines.length === 0 ? (
        <p className="text-sm text-slate-400">
          {isNo ? 'Ingen aktive varsler ut fra gjeldende terskler.' : 'No active alerts under current thresholds.'}
        </p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 list-disc pl-5">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
