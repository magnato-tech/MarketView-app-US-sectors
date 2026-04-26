import React, { useMemo } from 'react';
import { useCrisisEngine } from '../../contexts/CrisisEngineContext';
import { HELIUM_PRICE_CRITICAL_USD, twdPerOneUsd } from '../../services/crisisEngineRules';
import { newestCrisisLogRow } from '../../services/crisisChartData';

type CardTone = 'cyan' | 'violet' | 'danger';

type Card = {
  id: string;
  title: string;
  value: string;
  sub: string;
  tone: CardTone;
};

type Props = { isNo: boolean };

export const CrisisKpiHighlightCards: React.FC<Props> = ({ isNo }) => {
  const { engineRow, crisisLogRows } = useCrisisEngine();

  const cards = useMemo((): Card[] => {
    const latest = newestCrisisLogRow(crisisLogRows);
    const fmt = (n: number | null | undefined, d = 2) =>
      n != null && Number.isFinite(n) ? n.toFixed(d) : '—';
    const roc = (v: number | null | undefined) =>
      v != null && Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—';

    const twdStrain = twdPerOneUsd(engineRow?.twd_usd ?? null);
    const hel = engineRow?.helium_price_usd ?? null;
    const helSub =
      hel != null && hel > HELIUM_PRICE_CRITICAL_USD
        ? isNo
          ? `Over kritisk referanse (${HELIUM_PRICE_CRITICAL_USD} USD).`
          : `Above critical reference (${HELIUM_PRICE_CRITICAL_USD} USD).`
        : isNo
          ? `ROC 24t: ${roc(latest?.helium_roc_24h_pct ?? null)} · ROC 7d: ${roc(latest?.helium_roc_7d_pct ?? null)}`
          : `ROC 24h: ${roc(latest?.helium_roc_24h_pct ?? null)} · ROC 7d: ${roc(latest?.helium_roc_7d_pct ?? null)}`;

    const idx = engineRow?.crisis_index;
    const idxTone: CardTone =
      idx != null && Number(idx) > 75 ? 'danger' : idx != null && Number(idx) > 50 ? 'violet' : 'cyan';

    return [
      {
        id: 'ci',
        title: isNo ? 'Crisis Index' : 'Crisis Index',
        value: idx != null ? Number(idx).toFixed(1) : '—',
        sub:
          idx != null && Number(idx) > 75
            ? isNo
              ? 'Sterk aggregert stress — vurder kill-switch-regler.'
              : 'Elevated aggregate stress — review kill-switch rules.'
            : isNo
              ? 'Samlet penalitet fra strøm, gass, FX og helium.'
              : 'Combined penalty from power, gas, FX and helium.',
        tone: idxTone,
      },
      {
        id: 'he',
        title: isNo ? 'Helium NE Asia' : 'Helium NE Asia',
        value: fmt(hel, 2) + (hel != null ? ' USD' : ''),
        sub: helSub,
        tone: hel != null && hel > HELIUM_PRICE_CRITICAL_USD ? 'danger' : 'cyan',
      },
      {
        id: 'tw',
        title: isNo ? 'Taiwan nettreserve' : 'Taiwan grid reserve',
        value: fmt(engineRow?.taiwan_reserve_pct, 1) + (engineRow?.taiwan_reserve_pct != null ? '%' : ''),
        sub:
          engineRow?.taiwan_reserve_pct != null && engineRow.taiwan_reserve_pct < 6
            ? isNo
              ? 'Under 6 % — kritisk sone for fysisk kapasitet.'
              : 'Below 6% — critical physical capacity band.'
            : isNo
              ? 'Primær ledende indikator for wafer-fab strøm.'
              : 'Primary leading indicator for wafer-fab power stress.',
        tone:
          engineRow?.taiwan_reserve_pct != null && engineRow.taiwan_reserve_pct < 6 ? 'danger' : 'violet',
      },
      {
        id: 'fx',
        title: isNo ? 'TWD / USD' : 'TWD / USD',
        value: fmt(engineRow?.twd_usd, 5),
        sub:
          twdStrain != null
            ? isNo
              ? `TWD per 1 USD ≈ ${twdStrain.toFixed(2)} · ROC 24t ${roc(latest?.twd_roc_24h_pct ?? null)}`
              : `TWD per 1 USD ≈ ${twdStrain.toFixed(2)} · ROC 24h ${roc(latest?.twd_roc_24h_pct ?? null)}`
            : isNo
              ? 'Venter på FX-oppdatering.'
              : 'Awaiting FX update.',
        tone: 'cyan',
      },
    ];
  }, [engineRow, crisisLogRows, isNo]);

  const border = (tone: CardTone) => {
    if (tone === 'danger') return 'border-rose-500/55 shadow-[0_0_28px_-6px_rgba(244,63,94,0.45)]';
    if (tone === 'violet') return 'border-violet-500/45 shadow-[0_0_24px_-8px_rgba(167,139,250,0.35)]';
    return 'border-cyan-500/40 shadow-[0_0_24px_-8px_rgba(34,211,238,0.3)]';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {cards.map(c => (
        <div
          key={c.id}
          className={`relative overflow-hidden rounded-2xl border bg-slate-950/70 light:bg-white p-5 ${border(c.tone)} ${
            i === 0 ? 'sm:col-span-2' : ''
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{c.title}</p>
          <p className="mt-2 font-mono text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-slate-50 light:text-slate-900">
            {c.value}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400 light:text-slate-600">{c.sub}</p>
        </div>
      ))}
    </div>
  );
};
