
import React from 'react';
import { SummaryStats } from '../../types';
import { SelectedInstrumentBadges } from './SelectedInstrumentBadges';
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
  // Valgfri toolbar som rendres i header (f.eks. SMA/Kapitalstrøm)
  toolbar?: React.ReactNode;
}

export const RelativeAvkastningPanel: React.FC<RelativeAvkastningPanelProps> = ({
  title,
  subtitle,
  isFullscreen,
  onToggleFullscreen,
  summary,
  children,
  maxBadges = 3,
  toolbar
}) => {
  const { t } = useLanguage();

  if (isFullscreen) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-4 shadow-xl overflow-hidden transition-colors duration-300">
        <div className="flex justify-between items-center shrink-0 mb-4 gap-4">
          <div className="flex flex-col min-w-0">
             <h3 className="text-sm font-bold text-white dark:text-white light:text-slate-900 truncate">{title}</h3>
             <p className="text-[10px] text-slate-500 dark:text-slate-500 light:text-slate-400 truncate">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {toolbar}
            <div className="hidden sm:block">
              <SelectedInstrumentBadges
                summary={summary}
                maxItems={5}
                bubbleClassName="w-5 h-5 rounded-full border-2 border-slate-900 dark:border-slate-900 light:border-white shadow-lg"
                containerClassName="flex -space-x-2 shrink-0"
                labelClassName="text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-500 font-bold uppercase tracking-widest truncate"
              />
            </div>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 dark:bg-slate-800 light:bg-slate-200 border border-slate-600 dark:border-slate-600 light:border-slate-300 text-slate-200 dark:text-slate-200 light:text-slate-700 hover:bg-slate-700 dark:hover:bg-slate-700 light:hover:bg-slate-300 transition-colors whitespace-nowrap"
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
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white dark:text-white light:text-slate-900 truncate">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-500 light:text-slate-400 truncate">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end shrink-0">
          {toolbar}
          <div className="hidden md:block">
            <SelectedInstrumentBadges
              summary={summary}
              maxItems={maxBadges}
              bubbleClassName="w-6 h-6 rounded-full border-2 border-slate-900 dark:bg-slate-900 light:border-white shadow-lg"
            />
          </div>
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
