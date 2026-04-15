import React from 'react';
import type { AIInsightPanelProps } from './types';

export const AIInsightPanel: React.FC<AIInsightPanelProps> = ({ aiInsight, period }) => {
  const raw = (aiInsight || '').trim();
  const commentMatch = raw.match(/(?:Analytikerkonsensus|Markedskommentar):\s*([\s\S]*?)(?:\n\s*(?:Sektoranbefaling nå|Utsikter for neste periode):|$)/i);
  const outlookMatch = raw.match(/(?:Sektoranbefaling nå|Utsikter for neste periode):\s*([\s\S]*)$/i);
  const fallbackParts = raw.split('\n').filter(Boolean);
  const commentText = (commentMatch?.[1] || fallbackParts[0] || '').trim();
  const outlookText = (outlookMatch?.[1] || fallbackParts.slice(1).join(' ') || '').trim();

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative bg-slate-900/80 dark:bg-slate-900/80 light:bg-white backdrop-blur-xl border border-white/5 dark:border-white/5 light:border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-start transition-colors duration-300">
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400 dark:text-blue-400 light:text-blue-600 border border-blue-500/20 dark:border-blue-500/20 light:border-blue-200 shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Aktiv Analyse</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 dark:border-white/5 light:border-slate-100 pb-3">
            <h4 className="text-sm font-black text-white dark:text-white light:text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              Gemini AS <span className="text-blue-500">Markedsrapport</span>
            </h4>
            <span className="text-[10px] text-slate-500 dark:text-slate-500 light:text-slate-400 font-bold bg-slate-950 dark:bg-slate-950 light:bg-slate-100 px-2 py-1 rounded">Periode: {period}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 light:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                Analytikerkonsensus
              </div>
              <p className="text-slate-300 dark:text-slate-300 light:text-slate-700 text-sm leading-relaxed font-medium">
                {commentText || "Genererer analyse av nåværende markedssituasjon..."}
              </p>
            </div>
            <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/5 dark:border-white/5 light:border-slate-100 pt-4 md:pt-0 md:pl-6">
              <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 light:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                Sektoranbefaling nå
              </div>
              <p className="text-slate-400 dark:text-slate-400 light:text-slate-600 text-sm leading-relaxed italic">
                {outlookText || "Vurderer makroøkonomiske utsikter..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
