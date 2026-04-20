
import React, { useEffect } from 'react';
import { 
  ResponsiveContainer 
} from 'recharts';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTrading } from '../contexts/TradingContext';
import { ChartTooltip } from './dashboard/ChartTooltip';
import { PeriodIntervalToolbar } from './dashboard/PeriodIntervalToolbar';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { AIInsightPanel } from './dashboard/AIInsightPanel';
import { MarketSummaryTable } from './dashboard/MarketSummaryTable';
import { MainLineChart } from './dashboard/MainLineChart';
import { RelativeAvkastningPanel } from './dashboard/RelativeAvkastningPanel';
import { DrilldownTable } from './DrilldownTable';
import { Leaderboard } from './dashboard/Leaderboard';
import { AIChat } from './dashboard/AIChat';
import type { RechartsTooltipPayloadItem } from './dashboard/types';
import { ErrorBoundary } from './ErrorBoundary';
import { AnalysisBoard } from './AnalysisBoard';
import { PortfolioView } from './PortfolioView';

interface DashboardProps {
  chartLayoutFullscreen: boolean;
  onEnterMainFullscreen: () => void;
  onExitMainFullscreen: () => void;
}

const partKeys = {
  content: 'errors.parts.content',
  header: 'errors.parts.header',
  aiInsight: 'errors.parts.aiInsight',
  chart: 'errors.parts.chart',
  drilldownTable: 'errors.parts.drilldownTable',
  table: 'errors.parts.table',
  leaderboard: 'errors.parts.leaderboard',
  aiChat: 'errors.parts.aiChat',
  analysisBoard: 'errors.parts.analysisBoard',
} as const;

const MainDashboard: React.FC<DashboardProps> = ({ 
  chartLayoutFullscreen, onEnterMainFullscreen, onExitMainFullscreen,
}) => {
  const { 
    data, summary, loading, aiInsight, aiSignals, 
    period, onPeriodChange, interval, onIntervalChange,
    activeTickers, activeTab, isDarkMode, drilldownSector, setActiveTab, lastPrices 
  } = useDashboard();
  const { isAutoPilot, buy, sell } = useTrading();
  const { t } = useLanguage();

  // AI Auto-pilot logic
  useEffect(() => {
    if (isAutoPilot && aiSignals.length > 0 && !loading) {
      aiSignals.forEach(signal => {
        const currentPrice = lastPrices[signal.symbol];
        if (!currentPrice) return;

        if (signal.type === 'BUY') {
          buy(signal.symbol, currentPrice, signal.quantity, 'AI', signal.reason);
        } else if (signal.type === 'SELL') {
          sell(signal.symbol, currentPrice, signal.quantity, 'AI', signal.reason);
        }
      });
    }
  }, [aiSignals, isAutoPilot, loading, lastPrices, buy, sell]);

  const eb = (part: keyof typeof partKeys) => t('errors.couldNotLoad', { what: t(partKeys[part]) });

  const periodIntervalBar = (
    <PeriodIntervalToolbar
      period={period}
      interval={interval}
      onPeriodChange={onPeriodChange}
      onIntervalChange={onIntervalChange}
    />
  );

  if (activeTab === 'portfolio') {
    return (
      <div className={`flex-1 p-4 lg:p-8 overflow-y-auto transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'
      }`}>
        <div className="max-w-7xl mx-auto space-y-6">
          {periodIntervalBar}
          <PortfolioView />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center min-h-[50vh] lg:min-h-0 transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-950' : 'bg-slate-50'
      }`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className={`font-medium animate-pulse ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.loadingMarketData')}</p>
        </div>
      </div>
    );
  }

  const renderTooltip = (props: any) => {
    return (
      <ChartTooltip
        active={props.active}
        payload={props.payload}
        label={props.label}
        data={data}
        anchorIndex={props.anchorIndex ?? null}
        rangeSelection={props.rangeSelection}
      />
    );
  };

  const lineChart = (
    <MainLineChart 
      data={data} 
      activeTickers={activeTickers} 
      onTooltipContent={renderTooltip} 
    />
  );

  if (chartLayoutFullscreen) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 min-w-0 p-3 lg:p-4 overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-950' : 'bg-slate-50'
      }`}>
        <div className="shrink-0 flex flex-col gap-3 mb-3">
          {periodIntervalBar}
        </div>
        <ErrorBoundary title={eb('content')}>
          <RelativeAvkastningPanel
            title={activeTab === 'dashboard' ? t('panel.titleRelative') : t('panel.titleTechnical')}
            subtitle={activeTab === 'dashboard' ? t('panel.subtitleFullscreenDashboard') : t('panel.subtitleFullscreenAnalysis')}
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
    <div className={`flex-1 p-4 lg:p-8 overflow-y-auto min-h-screen lg:min-h-0 lg:overflow-y-auto transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-950' : 'bg-slate-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        <ErrorBoundary title={eb('header')}>
          <DashboardHeader summary={summary} />
        </ErrorBoundary>

        {periodIntervalBar}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {activeTab === 'dashboard' ? (
              <>
                <ErrorBoundary title={eb('aiInsight')}>
                  <AIInsightPanel aiInsight={aiInsight} period={period} />
                </ErrorBoundary>

                {/* Main Chart */}
                <ErrorBoundary title={eb('chart')}>
                  <RelativeAvkastningPanel
                    title={t('panel.titleRelative')}
                    subtitle={t('panel.subtitleRelative')}
                    isFullscreen={false}
                    onToggleFullscreen={onEnterMainFullscreen}
                    summary={summary}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      {lineChart}
                    </ResponsiveContainer>
                  </RelativeAvkastningPanel>
                </ErrorBoundary>

                {drilldownSector && (
                  <ErrorBoundary title={eb('drilldownTable')}>
                    <DrilldownTable />
                  </ErrorBoundary>
                )}

                {!drilldownSector && (
                  <ErrorBoundary title={eb('table')}>
                    <MarketSummaryTable summary={summary} />
                  </ErrorBoundary>
                )}
              </>
            ) : (
              <ErrorBoundary title={eb('analysisBoard')}>
                <RelativeAvkastningPanel
                  title={t('panel.titleAnalysis')}
                  subtitle={t('panel.subtitleAnalysis')}
                  isFullscreen={false}
                  onToggleFullscreen={onEnterMainFullscreen}
                  summary={summary}
                >
                  <AnalysisBoard />
                </RelativeAvkastningPanel>
              </ErrorBoundary>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <ErrorBoundary title={eb('leaderboard')}>
              <Leaderboard />
            </ErrorBoundary>
            <ErrorBoundary title={eb('aiChat')}>
              <AIChat />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default MainDashboard;
