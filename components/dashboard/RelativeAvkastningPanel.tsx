
import React from 'react';
import { SummaryStats } from '../../types';
import { SelectedInstrumentBadges } from './SelectedInstrumentBadges';
import { useDashboard, DashboardTab } from '../../contexts/DashboardContext';
import { useLanguage } from '../../contexts/LanguageContext';

export interface RelativeAvkastningPanelProps {
  title: string;
  subtitle: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  summary: SummaryStats[];
  children: React.ReactNode;
  // Optional customizations for the badges
  maxBadges?: number;
}

export const RelativeAvkastningPanel: React.FC<RelativeAvkastningPanelProps> = ({
  title,
  subtitle,
  isFullscreen,
  onToggleFullscreen,
  summary,
  children,
  maxBadges = 3
}) => {
  const { activeTab, setActiveTab } = useDashboard();
  const { t } = useLanguage();

  const TabButton = ({ tab, label }: { tab: DashboardTab; label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
        activeTab === tab
          ? 'bg-blue-600 text-white border border-blue-500'
          : 'bg-slate-800 dark:bg-slate-800 light:bg-slate-200 border border-slate-700 dark:border-slate-700 light:border-slate-300 text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-700 light:hover:bg-slate-300'
      }`}
    >
      {label}
    </button>
  );

  if (isFullscreen) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-4 shadow-xl overflow-hidden transition-colors duration-300">
        <div className="flex justify-between items-center shrink-0 mb-2 gap-2">
          <div className="flex flex-col">
             <h3 className="text-sm font-bold text-white dark:text-white light:text-slate-900">{title}</h3>
             <p className="text-[10px] text-slate-500 dark:text-slate-500 light:text-slate-400">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-950/50 dark:bg-slate-950/50 light:bg-slate-100 p-1 rounded-xl border border-slate-800/50 dark:border-slate-800/50 light:border-slate-200 gap-1">
              <TabButton tab="dashboard" label={t('dashboard.tabs.dashboard')} />
              <TabButton tab="analysis" label={t('dashboard.tabs.analysis')} />
            </div>
            <SelectedInstrumentBadges
              summary={summary}
              maxItems={5}
              bubbleClassName="w-5 h-5 rounded-full border-2 border-slate-900 dark:border-slate-900 light:border-white shadow-lg"
              containerClassName="flex -space-x-2 shrink-0"
              labelClassName="text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-500 font-bold uppercase tracking-widest truncate"
            />
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 dark:bg-slate-800 light:bg-slate-200 border border-slate-600 dark:border-slate-600 light:border-slate-300 text-slate-200 dark:text-slate-200 light:text-slate-700 hover:bg-slate-700 dark:hover:bg-slate-700 light:hover:bg-slate-300 transition-colors"
            >
              {t('panel.exitFullscreen')}
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 w-full">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h3 className="text-lg font-bold text-white dark:text-white light:text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-500 light:text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950/50 dark:bg-slate-950/50 light:bg-slate-100 p-1 rounded-xl border border-slate-800/50 dark:border-slate-800/50 light:border-slate-200 gap-1">
            <TabButton tab="dashboard" label={t('dashboard.tabs.dashboard')} />
            <TabButton tab="analysis" label={t('dashboard.tabs.analysis')} />
          </div>
          <SelectedInstrumentBadges
            summary={summary}
            maxItems={maxBadges}
            bubbleClassName="w-6 h-6 rounded-full border-2 border-slate-900 dark:border-slate-900 light:border-white shadow-lg"
          />
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 dark:bg-slate-800 light:bg-slate-200 border border-slate-600 dark:border-slate-600 light:border-slate-300 text-slate-200 dark:text-slate-200 light:text-slate-700 hover:bg-slate-700 dark:hover:bg-slate-700 light:hover:bg-slate-300 transition-colors whitespace-nowrap"
          >
            {t('panel.enterFullscreen')}
          </button>
        </div>
      </div>
      <div className="h-[450px] w-full">
        {children}
      </div>
    </div>
  );
};
