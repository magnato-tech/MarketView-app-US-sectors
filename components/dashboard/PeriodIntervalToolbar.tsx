import React from 'react';
import { PERIODS, INTERVALS } from '../../constants';
import type { Interval, Period } from '../../types';
import type { ChartToolbarProps } from './types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { LayoutDashboard, Briefcase, FlaskConical, Wrench } from 'lucide-react';

export function PeriodIntervalToolbar({
  period,
  interval,
  onPeriodChange,
  onIntervalChange,
}: ChartToolbarProps) {
  const { t } = useLanguage();
  const { activeTab, setActiveTab } = useDashboard();

  const tabs = [
    { id: 'dashboard', label: t('dashboard.tabs.dashboard'), icon: LayoutDashboard },
    { id: 'commandCenter', label: 'Command Center', icon: Briefcase },
    { id: 'lab', label: 'The Lab', icon: FlaskConical },
    { id: 'factory', label: 'Factory', icon: Wrench },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {/* Tab Switcher */}
      <div className="flex bg-slate-900/60 backdrop-blur border border-slate-800 p-1 rounded-2xl w-full lg:w-fit self-center lg:self-start shadow-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                active 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-slate-900/60 dark:bg-slate-900/60 light:bg-white backdrop-blur border border-slate-800 dark:border-slate-800 light:border-slate-200 p-2 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 px-4 shadow-inner transition-colors duration-300">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 light:text-slate-400 uppercase tracking-widest hidden lg:block">{t('periodToolbar.period')}</span>
          <div className="flex bg-slate-950/50 dark:bg-slate-950/50 light:bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPeriodChange(p as Period)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  period === p
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'text-slate-500 dark:text-slate-500 light:text-slate-400 hover:text-slate-300 dark:hover:text-slate-300 light:hover:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-800 dark:border-slate-800 light:border-slate-200 pt-4 sm:pt-0 sm:pl-6">
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 light:text-slate-400 uppercase tracking-widest hidden lg:block">{t('periodToolbar.interval')}</span>
          <div className="flex bg-slate-950/50 dark:bg-slate-950/50 light:bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            {INTERVALS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => onIntervalChange(i as Interval)}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  interval === i
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                    : 'text-slate-500 dark:text-slate-500 light:text-slate-400 hover:text-slate-300 dark:hover:text-slate-300 light:hover:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-200'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
