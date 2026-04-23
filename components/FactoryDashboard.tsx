import React, { useEffect, useMemo, useState } from 'react';

type EvaluationMetrics = {
  totalReturn: number;
  marketReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  tradeCount: number;
};

type EvolutionApiResponse = {
  usedFallback: boolean;
  reasoning: string;
  statuses: string[];
  appliedChanges: Array<{ componentId: string; paramKey: string; value: number | string | boolean }>;
  rejectedChanges: Array<{ componentId: string; paramKey: string; value: number | string | boolean }>;
  baseline: { metrics: EvaluationMetrics };
  challenger: { metrics: EvaluationMetrics };
};

const loadingMessages = [
  'Initializing evolution engine...',
  'Loading Genesis bot and rule set...',
  'Running baseline simulation...',
  'DeepSeek is analyzing crash data...',
  'Evaluating challenger performance...',
];

const formatDiff = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(3)}`;
const FACTORY_LAST_RESULT_KEY = 'marketview.factory.lastResult';

export const FactoryDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvolutionApiResponse | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setLoadingMessageIdx((idx) => (idx + 1) % loadingMessages.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FACTORY_LAST_RESULT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { result?: EvolutionApiResponse; ranAt?: string };
      if (parsed.result) setResult(parsed.result);
      if (parsed.ranAt) setLastRunAt(parsed.ranAt);
    } catch {
      // Ignore malformed local cache.
    }
  }, []);

  const runCycle = async () => {
    setLoading(true);
    setLoadingMessageIdx(0);
    setError(null);
    try {
      const response = await fetch('/api/factory/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'SPY', period: '1y', dataMode: 'historical' }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Factory API failed with HTTP ${response.status}`);
      }
      const payload = (await response.json()) as EvolutionApiResponse;
      setResult(payload);
      const now = new Date().toISOString();
      setLastRunAt(now);
      localStorage.setItem(
        FACTORY_LAST_RESULT_KEY,
        JSON.stringify({ result: payload, ranAt: now })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error while running evolution cycle.');
    } finally {
      setLoading(false);
    }
  };

  const publishGenesis = async () => {
    setPublishMessage(null);
    try {
      const response = await fetch('/api/factory/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: 'alpha-zero-genesis' }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; bot?: { id?: string } };
      if (!response.ok) {
        throw new Error(payload.error || `Publish failed with HTTP ${response.status}`);
      }
      setPublishMessage(`Published bot: ${payload.bot?.id ?? 'alpha-zero-genesis'}`);
    } catch (err) {
      setPublishMessage(err instanceof Error ? err.message : 'Unknown publish error');
    }
  };

  const comparison = useMemo(() => {
    if (!result) return null;
    const baseline = result.baseline.metrics;
    const challenger = result.challenger.metrics;
    return {
      sharpeDiff: challenger.sharpeRatio - baseline.sharpeRatio,
      drawdownDiff: challenger.maxDrawdown - baseline.maxDrawdown,
    };
  }, [result]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-black text-white uppercase tracking-wide">Factory Dashboard</h2>
        <p className="text-slate-400 mt-2 text-sm">
          Kjør en evolusjonssyklus direkte fra appen og sammenlign Baseline mot Challenger.
        </p>

        <div className="mt-5 flex items-center gap-4">
          <button
            type="button"
            onClick={runCycle}
            disabled={loading}
            className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
              loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            Start Evolution Cycle
          </button>
          {loading && (
            <div className="flex items-center gap-3 text-slate-300">
              <span className="w-4 h-4 border-2 border-slate-500 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-sm">{loadingMessages[loadingMessageIdx]}</span>
            </div>
          )}
          <button
            type="button"
            onClick={publishGenesis}
            className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Publish Genesis
          </button>
        </div>
        {publishMessage && <p className="text-sm text-slate-300 mt-3">{publishMessage}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-3">Klar for test</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>- Data mode: historical (Yahoo + daglig cache)</li>
            <li>- Baseline vs Challenger sammenlignes automatisk</li>
            <li>- Hard blokkering av trading-univers er aktiv</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-3">Siste kjøring</h3>
          {lastRunAt ? (
            <p className="text-sm text-slate-300">
              {new Date(lastRunAt).toLocaleString()}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Ingen kjøring enda i denne nettleseren.</p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Trykk på Start Evolution Cycle for å fylle timeline, metrikker og reasoning.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-3">Forventet output</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>- Status timeline for hele syklusen</li>
            <li>- Sharpe og drawdown side-by-side</li>
            <li>- AI reasoning + applied/rejected changes</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-700/40 bg-rose-900/20 p-4 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {!result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider mb-4">Sharpe Comparison</h3>
            <p className="text-sm text-slate-500">Ingen data ennå.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider mb-4">Drawdown Comparison</h3>
            <p className="text-sm text-slate-500">Ingen data ennå.</p>
          </div>
        </div>
      )}

      {result && comparison && (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-3">Factory Status Timeline</h3>
            <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
              {result.statuses.map((status, idx) => (
                <li key={`${idx}-${status}`}>{status}</li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-4">Sharpe Comparison</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Baseline</span>
                <span className="font-mono text-slate-200">{result.baseline.metrics.sharpeRatio.toFixed(3)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-400">Challenger</span>
                <span className="font-mono text-slate-200">{result.challenger.metrics.sharpeRatio.toFixed(3)}</span>
              </div>
              <div className="mt-4 text-sm font-bold flex items-center gap-2">
                <span className={comparison.sharpeDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {comparison.sharpeDiff >= 0 ? '▲' : '▼'} {formatDiff(comparison.sharpeDiff)}
                </span>
                <span className="text-slate-500">Sharpe delta</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-4">Drawdown Comparison</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Baseline</span>
                <span className="font-mono text-slate-200">{result.baseline.metrics.maxDrawdown.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-400">Challenger</span>
                <span className="font-mono text-slate-200">{result.challenger.metrics.maxDrawdown.toFixed(2)}%</span>
              </div>
              <div className="mt-4 text-sm font-bold flex items-center gap-2">
                <span className={comparison.drawdownDiff <= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {comparison.drawdownDiff <= 0 ? '▲' : '▼'} {formatDiff(comparison.drawdownDiff)}
                </span>
                <span className="text-slate-500">Drawdown delta (lavere er bedre)</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-800/40 bg-blue-950/20 p-5">
            <h3 className="text-sm font-black text-blue-300 uppercase tracking-wider mb-3">Ollama Reasoning</h3>
            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{result.reasoning}</p>
          </div>
        </>
      )}
    </div>
  );
};
