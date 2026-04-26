import React from 'react';

type Props = { isNo: boolean };

/**
 * Statisk «AI-stil»-forklaring for besøkende som ikke kjenner KPI-ene.
 * (Ingen eksternt API-kall — alltid rask og konsistent.)
 */
export const CrisisAiPrimer: React.FC<Props> = ({ isNo }) => (
  <div className="rounded-xl border border-sky-500/25 bg-sky-950/30 light:bg-sky-50 light:border-sky-200 px-4 py-3 shadow-[0_0_20px_-10px_rgba(56,189,248,0.35)]">
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-400 light:text-sky-700">
      {isNo ? 'Kort AI-forklaring' : 'Short AI briefing'}
    </p>
    {isNo ? (
      <ul className="mt-2 space-y-1.5 text-sm text-slate-300 light:text-slate-700 leading-snug list-none">
        <li>
          <span className="font-bold text-slate-100 light:text-slate-900">Crisis Index:</span> 0–100, samlet fysisk
          stress — ikke aksjekurs. Høyere = flere røde flagg samtidig.
        </li>
        <li>
          <span className="font-bold text-slate-100 light:text-slate-900">Taiwan reserve %:</span> margin i
          strømnettet; lav verdi = fabs kan få det trangt før sjetongpriser reflekterer det.
        </li>
        <li>
          <span className="font-bold text-slate-100 light:text-slate-900">Helium (USD):</span> proxy for knappe
          industrigasser; veldig høy pris = flaskehals i forsyningskjeden.
        </li>
        <li>
          <span className="font-bold text-slate-100 light:text-slate-900">TWD/USD, JKM (LNG), Nasdaq-proxy:</span>{' '}
          valuta og energi/likviditet — fanger kapitalflukt og avvik mellom narrativ og fysikk.
        </li>
        <li>
          <span className="font-bold text-slate-100 light:text-slate-900">Heartbeat:</span> viser at nye målinger
          nylig ble lagret i skyen; gammel heartbeat = gamle tall, ikke nødvendigvis ro.
        </li>
      </ul>
    ) : (
      <ul className="mt-2 space-y-1.5 text-sm text-slate-300 light:text-slate-700 leading-snug list-none">
        <li>
          <span className="font-bold text-slate-100 light:text-slate-900">Crisis index:</span> 0–100 combined physical
          stress — not a stock price. Higher = more red flags at once.
        </li>
        <li>
          <span className="font-bold text-slate-100 light:text-slate-900">Taiwan reserve %:</span> spare grid margin;
          very low means fabs can tighten before chip prices fully reflect it.
        </li>
        <li>
          <span className="font-bold text-slate-100 light:text-slate-900">Helium (USD):</span> proxy for tight
          industrial gases; very high price signals a supply-chain choke point.
        </li>
        <li>
          <span className="font-bold text-slate-100 light:text-slate-900">TWD/USD + JKM + Nasdaq proxy:</span> FX plus
          energy/liquidity context — catches capital flight and story-vs-physics divergence.
        </li>
        <li>
          <span className="font-bold text-slate-100 light:text-slate-900">Heartbeat:</span> confirms fresh readings hit
          the cloud recently; stale heartbeat means stale numbers, not necessarily calm markets.
        </li>
      </ul>
    )}
  </div>
);
