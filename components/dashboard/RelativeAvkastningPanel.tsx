
import React from 'react';
import { SummaryStats } from '../../types';
import { SelectedInstrumentBadges } from './SelectedInstrumentBadges';
import { useDashboard, DashboardTab } from '../../contexts/DashboardContext';

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

  const TabButton = ({ tab, label }: { tab: DashboardTab; label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
        activeTab === tab
          ? 'bg-blue-600 text-white border border-blue-500'
          : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );

  if (isFullscreen) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl overflow-hidden">
        <div className="flex justify-between items-center shrink-0 mb-2 gap-2">
          <div className="flex flex-col">
             <h3 className="text-sm font-bold text-white">{title}</h3>
             <p className="text-[10px] text-slate-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-950/50 p-1 rounded-xl border border-slate-800/50 gap-1">
              <TabButton tab="dashboard" label="Dashboard" />
              <TabButton tab="analysis" label="Analyse" />
            </div>
            <SelectedInstrumentBadges
              summary={summary}
              maxItems={5}
              bubbleClassName="w-5 h-5 rounded-full border-2 border-slate-900 shadow-lg"
              containerClassName="flex -space-x-2 shrink-0"
              labelClassName="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate"
            />
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              Avslutt fullskjerm
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950/50 p-1 rounded-xl border border-slate-800/50 gap-1">
            <TabButton tab="dashboard" label="Dashboard" />
            <TabButton tab="analysis" label="Analyse" />
          </div>
          <SelectedInstrumentBadges
            summary={summary}
            maxItems={maxBadges}
            bubbleClassName="w-6 h-6 rounded-full border-2 border-slate-900 shadow-lg"
          />
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 whitespace-nowrap"
          >
            Fullskjerm graf
          </button>
        </div>
      </div>
      <div className="h-[450px] w-full">
        {children}
      </div>
    </div>
  );
};
