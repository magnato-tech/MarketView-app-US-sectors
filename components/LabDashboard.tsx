import React from 'react';
import { BotDNA } from '../types/bot-dna';

export const LabDashboard: React.FC = () => {
  const [publishedBots, setPublishedBots] = React.useState<BotDNA[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadPublishedBots = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/factory/published');
      const payload = (await response.json().catch(() => ({}))) as { error?: string; bots?: BotDNA[] };
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      setPublishedBots(payload.bots ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown load error');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadPublishedBots();
  }, [loadPublishedBots]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-black text-white uppercase tracking-wide">The Lab (Library)</h2>
        <p className="text-slate-400 mt-2 text-sm">
          Modul-biblioteket og din stall av ferdige botter. Her bygger du manuelt og
          klargjor kandidater for Factory.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-3">Komponentbibliotek</h3>
          <p className="text-sm text-slate-400">
            Neste steg: vis modul-katalog fra factory-komponenter med parametere, defaults og constraints.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-3">Published botter</h3>
          <button
            type="button"
            onClick={loadPublishedBots}
            className="mb-3 px-3 py-2 text-xs font-black uppercase tracking-wider rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Refresh
          </button>
          {loading && <p className="text-sm text-slate-400">Laster published botter...</p>}
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {!loading && !error && publishedBots.length === 0 && (
            <p className="text-sm text-slate-500">Ingen published botter ennå.</p>
          )}
          {!loading && !error && publishedBots.length > 0 && (
            <ul className="space-y-2 text-sm text-slate-300">
              {publishedBots.map((bot) => (
                <li key={bot.id} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
                  <span className="font-mono text-slate-200">{bot.id}</span>
                  <span className="text-slate-500"> · v{bot.version} · {bot.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
