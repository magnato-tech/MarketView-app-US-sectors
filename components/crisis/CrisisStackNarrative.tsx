import React from 'react';
import { useCrisisEngine } from '../../contexts/CrisisEngineContext';

type Props = { isNo: boolean };

const LAYERS_NO = [
  { id: 'app', label: 'Applikasjoner og enheter', hint: 'Det markedet priser inn i hverdagen.' },
  { id: 'ai', label: 'AI-modeller', hint: 'Etterspørsel som presser data-senter og sjetongkapasitet.' },
  { id: 'dc', label: 'Data-senterinfrastruktur', hint: 'Kraftkrevende bygg som står på stabil strømpris og tilgang.' },
  { id: 'semi', label: 'Halvledere', hint: 'Wafer-fab, verktøy, minne — alt som krever uendelig ren energi og kjøling.' },
  { id: 'en', label: 'Energi (bunn av kaka)', hint: 'LNG, grid-reserve, helium-indirekte — det fysiske gulvet.' },
];

const LAYERS_EN = [
  { id: 'app', label: 'Applications & devices', hint: 'What markets price day to day.' },
  { id: 'ai', label: 'AI models', hint: 'Demand pressure on datacenters and die capacity.' },
  { id: 'dc', label: 'Datacenter infrastructure', hint: 'Power-hungry builds on stable electrons and price.' },
  { id: 'semi', label: 'Semiconductors', hint: 'Fabs, tools, memory — infinite clean power and cooling.' },
  { id: 'en', label: 'Energy (bottom of the stack)', hint: 'LNG, grid reserve, helium proxy — the physical floor.' },
];

export const CrisisStackNarrative: React.FC<Props> = ({ isNo }) => {
  const { heartbeatFresh } = useCrisisEngine();
  const layers = isNo ? LAYERS_NO : LAYERS_EN;

  return (
    <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/50 via-slate-950/80 to-slate-950 light:from-indigo-50 light:to-white light:border-indigo-200 overflow-hidden relative">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] light:opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(148,163,184,0.4) 2px, rgba(148,163,184,0.4) 3px)',
        }}
      />
      <div className="relative p-6 lg:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
          {isNo ? 'Verdikjeden' : 'Value chain'}
        </p>
        <h3 className="mt-2 text-xl lg:text-2xl font-black tracking-tight text-slate-100 light:text-slate-900 max-w-3xl">
          {isNo
            ? 'Når alt flyr sammen: narrativet bak «alt til himmels»'
            : 'When everything flies together: the “everything to the moon” narrative'}
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-slate-300 light:text-slate-700 max-w-3xl">
          {isNo
            ? 'AI og halvleder-CapEx har trukket hele kaken oppover: markeder priser toppen av stakken — applikasjoner, modeller og sjetonger — mens strømpris og fysisk kapasitet ofte behandles som en detalj. Når narrativet er sterkt, korrelerer risikoassetene opp samtidig fordi alle lag antar at energileddet «holder». Det er akkurat da ledende fysiske KPI-er (LNG, reserve, helium-proxy, FX-stress) er mest informative: de måler om bunnen faktisk bærer vekten.'
            : 'AI and semiconductor CapEx have lifted the whole stack: markets price the top — apps, models and silicon — while electrons and physical capacity are often treated as background. In strong narratives, risk assets rise together because every layer assumes the energy floor “holds”. That is when leading physical KPIs matter most: they measure whether the base actually carries the weight.'}
        </p>

        <div className="mt-8 grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-2">
            {layers.map((layer, idx) => {
              const isBase = layer.id === 'en';
              return (
                <div
                  key={layer.id}
                  className={`rounded-lg border px-4 py-3 transition-colors ${
                    isBase
                      ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_-6px_rgba(245,158,11,0.35)]'
                      : 'border-slate-700/80 bg-slate-900/40 light:bg-slate-50 light:border-slate-200'
                  }`}
                  style={{ marginLeft: idx * 6 }}
                >
                  <div className="flex justify-between gap-3 items-baseline">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-200 light:text-slate-800">
                      {layer.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{idx + 1}/5</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 light:text-slate-600 leading-snug">{layer.hint}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-rose-500/35 bg-rose-950/25 light:bg-rose-50 light:border-rose-200 p-5 space-y-3">
            <h4 className="text-sm font-black uppercase tracking-widest text-rose-300 light:text-rose-800">
              {isNo ? 'Spektakulær fare' : 'Spectacular risk'}
            </h4>
            <p className="text-sm leading-relaxed text-rose-100/90 light:text-rose-950/90">
              {isNo
                ? 'Hvis energileddet — bunnen av kaka — faller ut (strømlommer, LNG-stress, reserve under kritisk nivå, industriell gasspress), kollapser ikke bare «energiaksjer». Hele stakken over mister et konsistent fysisk fundament: fabs, minne og data-senter-CapEx kan ikke levere samme narrativ uten stabile elektroner og kjøling.'
                : 'If the energy layer — the bottom of the stack — fails (power gaps, LNG stress, reserves below critical bands, industrial gas pressure), it is not just “energy stocks”. Everything above loses a coherent physical foundation: fabs, memory and datacenter CapEx cannot sustain the same story without stable electrons and cooling.'}
            </p>
            <div className="rounded-lg border border-slate-600/50 bg-slate-950/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-1">
                {isNo ? 'Crisis Monitor heartbeat' : 'Crisis Monitor heartbeat'}
              </p>
              <p className="text-xs leading-relaxed text-slate-300 light:text-slate-700">
                {isNo
                  ? heartbeatFresh
                    ? 'En fersk heartbeat betyr at kinvest_monitor nettopp har skrevet fysiske KPI-er til skyen — du ser ikke bare priser, men at sensorene mot bunnen av kaka fortsatt leverer.'
                    : 'Uten fersk heartbeat ser du fortsatt gamle tall i UI: da vet du ikke om bunnen av kaka er målt nylig. Kjør monitor med Supabase service role slik at engine_status oppdateres jevnlig.'
                  : heartbeatFresh
                    ? 'A fresh heartbeat means kinvest_monitor just wrote physical KPIs to the cloud — you are not only seeing prices, but that sensors on the bottom of the stack are still reporting.'
                    : 'Without a fresh heartbeat the UI may show stale numbers: you cannot tell if the bottom of the stack was measured recently. Run the monitor with the Supabase service role so engine_status updates on schedule.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
