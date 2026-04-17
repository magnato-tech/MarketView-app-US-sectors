import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import { RangeSummaryRow } from '../../services/analysisService';
import { InfoIcon } from '../ui/InfoIcon';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

interface OpportunityMatrixProps {
  summary: RangeSummaryRow[];
}

export const OpportunityMatrix: React.FC<OpportunityMatrixProps> = ({ summary }) => {
  const { isDarkMode } = useDashboard();

  // Filtrer ut benchmark og VIX
  // Vi er nå mer tolerante: Vi viser alt unntatt benchmark og VIX
  const filtered = summary.filter(s => !s.isBenchmark && s.symbol !== '^VIX');

  if (filtered.length === 0) {
    return (
      <Card title="Opportunity Matrix" subtitle="Relativ Styrke vs. Volum-momentum">
        <EmptyState 
          title="Ingen data å sammenligne" 
          description="Velg minst to sektorer i sidebaren for å se hvordan de beveger seg i forhold til hverandre."
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
          }
        />
      </Card>
    );
  }

  // Finn ytterpunkter for skalering
  const maxRS = Math.max(...filtered.map(s => Math.abs(s.metrics?.relativeStrength || 0)), 5);
  const maxFlow = Math.max(...filtered.map(s => Math.abs(s.metrics?.flowScore || 0)), 20);

  // Helper for å plotte posisjon (0-100%)
  const getPos = (val: number, max: number) => {
    const percent = (val / (max * 1.2)) * 50 + 50;
    return Math.min(Math.max(percent, 5), 95);
  };

  return (
    <Card 
      title="Opportunity Matrix" 
      subtitle="Relativ Styrke vs. Volum-momentum"
      headerAction={<span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-black">Beta</span>}
    >
      <div className="relative aspect-video lg:aspect-[21/9] w-full border border-slate-800/50 dark:border-slate-800/50 light:border-slate-200 rounded-xl overflow-hidden bg-slate-950/20 dark:bg-slate-950/20 light:bg-slate-50">
        {/* Quadrant Labels */}
        <div className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-tighter text-emerald-500/40 pointer-events-none">Leaders (Strong)</div>
        <div className="absolute top-4 left-4 text-[10px] font-black uppercase tracking-tighter text-indigo-500/40 pointer-events-none">Improving (Accumulation?)</div>
        <div className="absolute bottom-4 right-4 text-[10px] font-black uppercase tracking-tighter text-amber-500/40 pointer-events-none">Weakening (Distribution?)</div>
        <div className="absolute bottom-4 left-4 text-[10px] font-black uppercase tracking-tighter text-rose-500/40 pointer-events-none">Laggards (Avoid)</div>

        {/* Axes */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-px bg-slate-800 dark:bg-slate-800 light:bg-slate-200"></div>
          <div className="h-full w-px bg-slate-800 dark:bg-slate-800 light:bg-slate-200"></div>
        </div>

        {/* Axis Labels */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-600 dark:text-slate-600 light:text-slate-400 uppercase tracking-widest flex items-center">
          Relativ Styrke (RS)
          <InfoIcon title="Hvor mye instrumentet har slått indeksen (S&P 500) i perioden" />
        </div>
        <div className="absolute left-2 top-1/2 -rotate-90 -translate-y-1/2 text-[9px] font-bold text-slate-600 dark:text-slate-600 light:text-slate-400 uppercase tracking-widest flex items-center">
          Volum-momentum
          <InfoIcon title="Endring i handelsverdi i % mot starten av perioden" />
        </div>

        {/* Data Points */}
        {filtered.map(s => {
          const rs = s.metrics?.relativeStrength || 0;
          const flow = s.metrics?.flowScore || 0;
          const x = getPos(rs, maxRS);
          const y = 100 - getPos(flow, maxFlow);

          return (
            <div 
              key={s.symbol}
              className="absolute transition-all duration-700 ease-out group"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div 
                className="w-4 h-4 rounded-full border-2 border-slate-900 dark:border-slate-900 light:border-white shadow-lg cursor-pointer transition-transform group-hover:scale-150 relative z-10"
                style={{ backgroundColor: s.color }}
              ></div>
              
              <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 dark:bg-slate-900/90 light:bg-white px-2 py-0.5 rounded text-[9px] font-black text-white dark:text-white light:text-slate-900 border border-slate-800 dark:border-slate-800 light:border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                {s.name} (RS: {rs > 0 ? '+' : ''}{rs.toFixed(1)}, Flow: {flow > 0 ? '+' : ''}{flow.toFixed(0)}%)
              </div>
              
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-400 dark:text-slate-400 light:text-slate-500 pointer-events-none">
                {s.symbol}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
          <div className="text-[10px] font-black text-emerald-500 uppercase mb-1">Leaders</div>
          <div className="text-[11px] text-slate-400 leading-tight">Sterk prisutvikling bekreftet av høyt volum. Kjøpsstyrke.</div>
        </div>
        <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
          <div className="text-[10px] font-black text-indigo-500 uppercase mb-1">Improving</div>
          <div className="text-[11px] text-slate-400 leading-tight">Volumet øker før prisen. Potensiell akkumulering.</div>
        </div>
        <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
          <div className="text-[10px] font-black text-amber-500 uppercase mb-1">Weakening</div>
          <div className="text-[11px] text-slate-400 leading-tight">Prisen stiger på lavt volum. Fare for trendskifte.</div>
        </div>
        <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10">
          <div className="text-[10px] font-black text-rose-500 uppercase mb-1">Laggards</div>
          <div className="text-[11px] text-slate-400 leading-tight">Svak pris og manglende interesse. Selgers marked.</div>
        </div>
      </div>
    </Card>
  );
};
