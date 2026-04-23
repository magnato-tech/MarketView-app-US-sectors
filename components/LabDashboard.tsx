import React from 'react';
import { BotDNA } from '../types/bot-dna';
import { ComponentCatalogItem } from '../lib/factory/components/catalog';

export const LabDashboard: React.FC = () => {
  const [components, setComponents] = React.useState<ComponentCatalogItem[]>([]);
  const [publishedBots, setPublishedBots] = React.useState<BotDNA[]>([]);
  const [draftBots, setDraftBots] = React.useState<BotDNA[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [builderId, setBuilderId] = React.useState('manual-draft');
  const [builderComponents, setBuilderComponents] = React.useState<BotDNA['components']>([]);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const loadComponents = React.useCallback(async () => {
    try {
      const response = await fetch('/api/factory/components');
      const payload = (await response.json().catch(() => ({}))) as { components?: ComponentCatalogItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      console.log('Loaded components:', payload.components);
      setComponents(payload.components ?? []);
    } catch (err) {
      console.error('Failed to load components:', err);
      throw err;
    }
  }, []);

  const loadPublishedBots = React.useCallback(async () => {
    const response = await fetch('/api/factory/published');
    const payload = (await response.json().catch(() => ({}))) as { error?: string; bots?: BotDNA[] };
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    setPublishedBots(payload.bots ?? []);
  }, []);

  const loadDrafts = React.useCallback(async () => {
    const response = await fetch('/api/factory/drafts');
    const payload = (await response.json().catch(() => ({}))) as { error?: string; drafts?: BotDNA[] };
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    setDraftBots(payload.drafts ?? []);
  }, []);

  const reloadAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadComponents(), loadPublishedBots(), loadDrafts()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown load error');
    } finally {
      setLoading(false);
    }
  }, [loadComponents, loadPublishedBots, loadDrafts]);

  React.useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  const createNewBotShell = () => {
    setBuilderId(`bot-${Date.now().toString(36)}`);
    setBuilderComponents([]);
    setStatusMessage('Nytt tomt skall opprettet. Steg 1 fullført.');
    setStep(2);
  };

  const addComponentToBuilder = (component: ComponentCatalogItem) => {
    setBuilderComponents((prev) => [
      ...prev,
      {
        type: component.type,
        id: component.id,
        weight: component.defaultWeight,
        params: { ...component.defaultParams },
      },
    ]);
    if (step === 2) setStep(3);
  };

  const updateBuilderComponentWeight = (idx: number, value: number) => {
    setBuilderComponents((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, weight: Number.isFinite(value) ? value : item.weight } : item))
    );
  };

  const updateBuilderParam = (idx: number, key: string, rawValue: string) => {
    const maybeNumber = Number(rawValue);
    const parsed: number | string = Number.isFinite(maybeNumber) ? maybeNumber : rawValue;
    setBuilderComponents((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, params: { ...item.params, [key]: parsed } }
          : item
      )
    );
  };

  const saveDraft = async () => {
    if (builderComponents.length === 0) {
      setStatusMessage('Feil: Kan ikke lagre en bot uten komponenter.');
      return;
    }
    setStatusMessage(null);
    try {
      const response = await fetch('/api/factory/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: builderId.trim(),
          version: '1.0.0',
          generation: 0,
          components: builderComponents,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setStatusMessage('Draft lagret.');
      setStep(1); // Reset to step 1 after save
      await loadDrafts();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Kunne ikke lagre draft.');
    }
  };

  const clonePublishedToDraft = async (botId: string) => {
    setStatusMessage(null);
    try {
      const response = await fetch('/api/factory/clone-to-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setStatusMessage(`Klonet ${botId} til draft.`);
      setStep(3); // Go to step 3 to tune
      await loadDrafts();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Kloning feilet.');
    }
  };

  const publishBotDirectly = async (botId: string) => {
    setStatusMessage(null);
    try {
      // First ensure it's saved as a draft if we're publishing from builder
      if (botId === builderId) {
        await saveDraft();
      }

      const response = await fetch('/api/factory/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setStatusMessage(`Publiserte ${botId} direkte til Command Center.`);
      if (botId === builderId) setStep(1);
      await Promise.all([loadDrafts(), loadPublishedBots()]);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Publisering feilet.');
    }
  };

  const sendDraftToFactory = async (botId: string) => {
    if (builderComponents.length === 0 && botId === builderId) {
      setStatusMessage('Feil: Kan ikke sende en bot uten komponenter.');
      return;
    }
    setStatusMessage(null);
    try {
      // First save the current state of the builder as a draft to ensure it exists
      if (botId === builderId) {
        await saveDraft();
      }

      const response = await fetch('/api/factory/send-to-factory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setStatusMessage(`Sendte ${botId} til Factory (Candidate).`);
      if (botId === builderId) setStep(1);
      await Promise.all([loadDrafts(), loadPublishedBots()]);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Send to Factory feilet.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wide">The Lab (Library)</h2>
          <p className="text-slate-400 mt-2 text-sm">
            Modul-biblioteket og din stall av ferdige botter. Her bygger du manuelt og
            klargjor kandidater for Factory.
          </p>
        </div>
        <button
          type="button"
          onClick={createNewBotShell}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20"
        >
          Opprett ny bot
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`rounded-2xl border ${step === 2 ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-800'} bg-slate-900/40 p-5 transition-all`}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">
              {step === 2 && <span className="text-blue-400 mr-2">Steg 2:</span>}
              Komponentbibliotek
            </h3>
            {step === 2 && <span className="animate-pulse w-2 h-2 rounded-full bg-blue-500" />}
          </div>
          {loading && <p className="text-sm text-slate-400">Laster komponenter...</p>}
          {!loading && components.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">Ingen komponenter funnet.</p>
              <button onClick={reloadAll} className="mt-2 text-xs text-blue-400 hover:underline">Prøv igjen</button>
            </div>
          )}
          <div className="space-y-3">
            {components.map((component) => (
              <div key={component.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 hover:border-slate-700 transition-colors">
                <p className="text-sm text-white font-bold">{component.title}</p>
                <p className="text-xs text-slate-400 mt-1">{component.description}</p>
                <p className="text-xs text-slate-500 mt-1">{component.id} · {component.type}</p>
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => addComponentToBuilder(component)}
                  className={`mt-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${
                    step === 1 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  Legg til i builder
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border ${step === 3 ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-800'} bg-slate-900/40 p-5 transition-all`}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">
              {step === 3 && <span className="text-emerald-400 mr-2">Steg 3:</span>}
              Manual Bot Builder
            </h3>
            {step === 3 && <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-500" />}
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Draft ID</label>
              <input
                value={builderId}
                onChange={(e) => setBuilderId(e.target.value)}
                disabled={step === 1}
                className="mt-1 w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2 disabled:opacity-50"
              />
            </div>
            {builderComponents.length === 0 && (
              <div className="py-8 text-center border border-dashed border-slate-800 rounded-lg">
                <p className="text-sm text-slate-500">
                  {step === 1 ? 'Opprett et skall først' : 'Legg til komponenter fra biblioteket'}
                </p>
              </div>
            )}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {builderComponents.map((component, idx) => (
                <div key={`${component.id}-${idx}`} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-slate-200 font-bold">{component.id}</p>
                    <button 
                      onClick={() => setBuilderComponents(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      ×
                    </button>
                  </div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider mt-2 block">Weight</label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={component.weight}
                    onChange={(e) => updateBuilderComponentWeight(idx, Number(e.target.value))}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2"
                  />
                  <div className="mt-2 space-y-2">
                    {Object.entries(component.params).map(([key, value]) => (
                      <div key={key}>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider">{key}</label>
                        {key === 'universe' ? (
                          <textarea
                            value={String(value)}
                            onChange={(e) => updateBuilderParam(idx, key, e.target.value)}
                            placeholder="XLK,XLE,XLF..."
                            className="mt-1 w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2 h-16 resize-none"
                          />
                        ) : (
                          <input
                            value={String(value)}
                            onChange={(e) => updateBuilderParam(idx, key, e.target.value)}
                            className="mt-1 w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {builderComponents.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Velg modus</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => publishBotDirectly(builderId)}
                    className="px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    Publiser til Command Center
                  </button>
                  <button
                    type="button"
                    onClick={() => sendDraftToFactory(builderId)}
                    className="px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    Send til Factory
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-3">Published & Draft botter</h3>
          <button
            type="button"
            onClick={reloadAll}
            className="mb-3 px-3 py-2 text-xs font-black uppercase tracking-wider rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Refresh
          </button>
          {statusMessage && <p className="text-sm text-blue-300 mb-2">{statusMessage}</p>}
          {loading && <p className="text-sm text-slate-400">Laster botter...</p>}
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {!loading && !error && (
            <>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Published</p>
              {publishedBots.length === 0 && <p className="text-xs text-slate-600 italic mb-4">Ingen publiserte botter enda.</p>}
              <ul className="space-y-2 text-sm text-slate-300 mb-4">
                {publishedBots.map((bot) => (
                  <li key={bot.id} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 flex justify-between items-center group">
                    <div>
                      <span className="font-mono text-slate-200">{bot.id}</span>
                      <span className="text-slate-500"> · v{bot.version}</span>
                      <div className="flex gap-1 mt-1">
                        {bot.tradingUniverse?.allowedCategories?.map(cat => (
                          <span key={cat} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">{cat}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => clonePublishedToDraft(bot.id)}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded bg-blue-700 hover:bg-blue-600 text-white transition-all"
                    >
                      Clone
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Drafts</p>
              {draftBots.length === 0 && <p className="text-xs text-slate-600 italic">Ingen drafts funnet.</p>}
              <ul className="space-y-2 text-sm text-slate-300">
                {draftBots.map((bot) => (
                  <li key={bot.id} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 flex justify-between items-center group">
                    <div>
                      <span className="font-mono text-slate-200">{bot.id}</span>
                      <span className="text-slate-500"> · v{bot.version}</span>
                      <div className="flex gap-1 mt-1">
                        {bot.tradingUniverse?.allowedCategories?.map(cat => (
                          <span key={cat} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">{cat}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => publishBotDirectly(bot.id)}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded bg-blue-700 hover:bg-blue-600 text-white transition-all ml-1"
                    >
                      Publiser
                    </button>
                    <button
                      type="button"
                      onClick={() => sendDraftToFactory(bot.id)}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded bg-emerald-700 hover:bg-emerald-600 text-white transition-all ml-1"
                    >
                      Send
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
