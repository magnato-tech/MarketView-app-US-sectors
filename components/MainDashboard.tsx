
import React from 'react';
import { 
  ResponsiveContainer 
} from 'recharts';
import { useDashboard } from '../contexts/DashboardContext';
import { ChartTooltip } from './dashboard/ChartTooltip';
import { PeriodIntervalToolbar } from './dashboard/PeriodIntervalToolbar';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { AIInsightPanel } from './dashboard/AIInsightPanel';
import { MarketSummaryTable } from './dashboard/MarketSummaryTable';
import { MainLineChart } from './dashboard/MainLineChart';
import { RelativeAvkastningPanel } from './dashboard/RelativeAvkastningPanel';
import type { RechartsTooltipPayloadItem } from './dashboard/types';
import { ErrorBoundary } from './ErrorBoundary';
import { AnalysisBoard } from './AnalysisBoard';

interface DashboardProps {
  chartLayoutFullscreen: boolean;
  onEnterMainFullscreen: () => void;
  onExitMainFullscreen: () => void;
}

const MainDashboard: React.FC<DashboardProps> = ({ 
  chartLayoutFullscreen, onEnterMainFullscreen, onExitMainFullscreen,
}) => {
  const { 
    data, summary, loading, aiInsight, 
    period, onPeriodChange, interval, onIntervalChange,
    activeTickers, activeTab 
  } = useDashboard();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-[50vh] lg:min-h-0">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium animate-pulse">Analyserer Markedsdata...</p>
        </div>
      </div>
    );
  }

  const periodIntervalBar = (
    <PeriodIntervalToolbar
      period={period}
      interval={interval}
      onPeriodChange={onPeriodChange}
      onIntervalChange={onIntervalChange}
    />
  );

  const renderTooltip = (props: { active?: boolean; payload?: RechartsTooltipPayloadItem[]; label?: string | number }) => (
    <ChartTooltip
      active={props.active}
      payload={props.payload}
      label={props.label}
      data={data}
      anchorIndex={null}
    />
  );

  const lineChart = (
    <MainLineChart 
      data={data} 
      activeTickers={activeTickers} 
      onTooltipContent={renderTooltip} 
    />
  );

  if (chartLayoutFullscreen) {
    return (
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-slate-950 p-3 lg:p-4 overflow-hidden">
        <div className="shrink-0 flex flex-col gap-3 mb-3">
          {periodIntervalBar}
        </div>
        <ErrorBoundary title="Kunne ikke laste innholdet">
          <RelativeAvkastningPanel
            title={activeTab === 'dashboard' ? "Relativ Avkastning" : "Teknisk Analyse"}
            subtitle={activeTab === 'dashboard' ? "Fullskjerm — sidefelt til venstre" : "Fullskjerm — teknisk dykk"}
            isFullscreen={true}
            onToggleFullscreen={onExitMainFullscreen}
            summary={summary}
          >
            {activeTab === 'dashboard' ? (
              <ResponsiveContainer width="100%" height="100%">
                {lineChart}
              </ResponsiveContainer>
            ) : (
              <AnalysisBoard />
            )}
          </RelativeAvkastningPanel>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:overflow-hidden">
    <div className="flex-1 p-4 lg:p-8 bg-slate-950 overflow-y-auto min-h-screen lg:min-h-0 lg:overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <ErrorBoundary title="Kunne ikke laste header">
          <DashboardHeader summary={summary} />
        </ErrorBoundary>

        {periodIntervalBar}

        {activeTab === 'dashboard' ? (
          <>
            <ErrorBoundary title="Kunne ikke laste AI-innsikt">
              <AIInsightPanel aiInsight={aiInsight} period={period} />
            </ErrorBoundary>

            {/* Main Chart */}
            <ErrorBoundary title="Kunne ikke laste grafen">
              <RelativeAvkastningPanel
                title="Relativ Avkastning"
                subtitle="Benchmark-sammenligning (0% ved start)"
                isFullscreen={false}
                onToggleFullscreen={onEnterMainFullscreen}
                summary={summary}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {lineChart}
                </ResponsiveContainer>
              </RelativeAvkastningPanel>
            </ErrorBoundary>

            <ErrorBoundary title="Kunne ikke laste tabellen">
              <MarketSummaryTable summary={summary} />
            </ErrorBoundary>
          </>
        ) : (
          <ErrorBoundary title="Kunne ikke laste analyseboardet">
            <RelativeAvkastningPanel
              title="Analyseboard"
              subtitle="Teknisk dykk og sektorstatistikk"
              isFullscreen={false}
              onToggleFullscreen={onEnterMainFullscreen}
              summary={summary}
            >
              <AnalysisBoard />
            </RelativeAvkastningPanel>
          </ErrorBoundary>
        )}
      </div>
    </div>
    </div>
  );
};

export default MainDashboard;
