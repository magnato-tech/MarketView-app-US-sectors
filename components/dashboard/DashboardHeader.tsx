import React from 'react';
import type { DashboardHeaderProps } from './types';
import { getTrendColorClass } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ summary }) => {
  const { t } = useLanguage();
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-white dark:text-white light:text-slate-900 tracking-tight transition-colors uppercase">{t('header.title')}<span className="text-blue-500">{t('header.titleAccent')}</span></h2>
        <p className="text-slate-400 dark:text-slate-400 light:text-slate-500 text-sm font-medium transition-colors">{t('header.subtitle')}</p>
      </div>
      <div className="flex flex-wrap gap-3">
         {summary.slice(0, 4).map(s => (
           <div key={s.symbol} className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 p-3 rounded-xl min-w-[130px] transition-all hover:scale-[1.02] shadow-sm">
             <div className="text-[10px] text-slate-500 dark:text-slate-500 light:text-slate-400 uppercase font-black mb-1">{s.name}</div>
             <div className="flex items-baseline gap-2">
               <span className="text-lg font-bold text-white dark:text-white light:text-slate-900">{s.lastPrice.toLocaleString()}</span>
               <span className={`text-[10px] font-bold px-1 rounded ${getTrendColorClass(s.percentChange)} ${s.percentChange >= 0 ? 'bg-emerald-400/10' : 'bg-rose-400/10'}`}>
                 {s.percentChange >= 0 ? '▲' : '▼'} {Math.abs(s.percentChange)}%
               </span>
             </div>
           </div>
         ))}
      </div>
    </header>
  );
};
