
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
import { AnalysisToolbar } from './dashboard/AnalysisToolbar';
import { ChartTickerLegend } from './dashboard/ChartTickerLegend';
import { Leaderboard } from './dashboard/Leaderboard';
import { AIChat } from './dashboard/AIChat';
import type { RechartsTooltipPayloadItem } from './dashboard/types';
import { ErrorBoundary } from './ErrorBoundary';
import { PortfolioView } from './PortfolioView';
import { TICKERS } from '../constants';
import { getEtfHoldings, fetchETFDetailsSync } from '../services/etfService';

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
  aiChat: 'errors.parts.aiChat',
  table: 'errors.parts.table',
  leaderboard: 'errors.parts.leaderboard',
} as const;

const MainDashboard: React.FC<DashboardProps> = ({
  chartLayoutFullscreen, onEnterMainFullscreen, onExitMainFullscreen,
}) => {
  const {
    data, summary, loading, aiInsight, aiSignals,
    period, onPeriodChange, interval, onIntervalChange,
    activeTickers, activeTab, isDarkMode, drilldownSector, activeDrilldownTickers, lastPrices,
    analysisSettings,
    drilldownETF, activeEtfStockTickers, detailContext, setDetailContext, closeEtfDrilldown,
    toggleEtfStockTicker, toggleDrilldownTicker, setDrilldownSector
  } = useDashboard();

  // Når detalj-panelet er åpent, reserver vi plass på høyre side
  // slik at innholdet ikke havner under panelet på store skjermer.
  const panelOffset = detailContext ? 'lg:pr-[420px] xl:pr-[460px]' : '';
  const { isAutoPilot, buy, sell } = useTrading();
  const { t } = useLanguage();

  const handleRowClick = (symbol: string, type: 'sector' | 'etf' | 'stock') => {
    setDetailContext({ symbol, type });
  };

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

  const etfDrilldownBanner = drilldownETF ? (
    <div
      className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 ${
        isDarkMode
          ? 'bg-blue-600/10 border-blue-500/40 text-blue-100'
          : 'bg-blue-50 border-blue-300 text-blue-900'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-2 h-8 bg-blue-500 rounded-full shrink-0"></div>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-blue-500">
            {t('etfDrilldown.badge')}
          </div>
          <div className="text-sm font-bold truncate">
            <span className="font-mono">{drilldownETF}</span>
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
              {activeEtfStockTickers.length === 0
                ? ` · ${t('etfDrilldown.noSiblings')}`
                : ` · ${t('etfDrilldown.siblingsCount', { n: String(activeEtfStockTickers.length) })}`}
            </span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          closeEtfDrilldown();
          setDetailContext(null);
        }}
        className={`shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
          isDarkMode
            ? 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
        }`}
      >
        {t('etfDrilldown.exit')}
      </button>
    </div>
  ) : null;

  if (activeTab === 'portfolio') {
    return (
      <div className={`flex-1 p-4 lg:p-8 overflow-y-auto transition-[padding] duration-300 ${
        isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'
      } ${panelOffset}`}>
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
        payload={props.payload as RechartsTooltipPayloadItem[] | undefined}
        label={props.label}
        data={data}
        anchorIndex={props.anchorIndex ?? null}
        rangeSelection={props.rangeSelection}
        showLiquidityFlow={analysisSettings.showLiquidityFlow}
      />
    );
  };

  const lineChart = (
    <MainLineChart
      data={data}
      activeTickers={activeTickers}
      onTooltipContent={renderTooltip}
      showSMA={analysisSettings.showSMA}
      smaWindow={analysisSettings.smaWindow}
      showLiquidityFlow={analysisSettings.showLiquidityFlow}
    />
  );

  if (chartLayoutFullscreen) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 min-w-0 p-3 lg:p-4 overflow-hidden transition-[padding] duration-300 ${
        isDarkMode ? 'bg-slate-950' : 'bg-slate-50'
      } ${panelOffset}`}>
        <div className="shrink-0 flex flex-col gap-3 mb-3">
          {etfDrilldownBanner}
          {periodIntervalBar}
        </div>
        <ErrorBoundary title={eb('content')}>
          <RelativeAvkastningPanel
            title={t('panel.titleRelative')}
            subtitle={t('panel.subtitleFullscreenDashboard')}
            isFullscreen={true}
            onToggleFullscreen={onExitMainFullscreen}
            summary={summary}
            toolbar={<AnalysisToolbar />}
          >
            <div className="flex flex-col h-full gap-2">
              <ChartTickerLegend />
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  {lineChart}
                </ResponsiveContainer>
              </div>
            </div>
          </RelativeAvkastningPanel>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className={`flex-1 min-h-0 flex flex-col lg:overflow-hidden transition-[padding] duration-300 ${panelOffset}`}>
    <div className={`flex-1 p-4 lg:p-8 overflow-y-auto min-h-screen lg:min-h-0 lg:overflow-y-auto transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-950' : 'bg-slate-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">

        <ErrorBoundary title={eb('header')}>
          <DashboardHeader summary={summary} />
        </ErrorBoundary>

        {etfDrilldownBanner}
        {periodIntervalBar}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <ErrorBoundary title={eb('aiInsight')}>
              <AIInsightPanel aiInsight={aiInsight} period={period} />
            </ErrorBoundary>

            {/* Main Chart med SMA + Kapitalstrøm kontroller i header */}
            <ErrorBoundary title={eb('chart')}>
              <RelativeAvkastningPanel
                title={t('panel.titleRelative')}
                subtitle={t('panel.subtitleRelative')}
                isFullscreen={false}
                onToggleFullscreen={onEnterMainFullscreen}
                summary={summary}
                toolbar={<AnalysisToolbar />}
              >
                <div className="flex flex-col h-full gap-2">
                  <ChartTickerLegend />
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      {lineChart}
                    </ResponsiveContainer>
                  </div>
                </div>
              </RelativeAvkastningPanel>
            </ErrorBoundary>

            {drilldownSector && (
              <ErrorBoundary title={eb('table')}>
                <MarketSummaryTable 
                  title={`${t('drilldownTable.titlePrefix')}: ${drilldownSector}`}
                  summary={summary.filter(s => {
                    const childTickers = TICKERS.filter(t => t.parentSymbol === drilldownSector);
                    const allDrilldownSymbols = [drilldownSector, ...childTickers.map(ct => ct.symbol)];
                    return allDrilldownSymbols.includes(s.symbol);
                  })}
                  showCheckboxes={true}
                  activeCheckboxes={activeDrilldownTickers}
                  onCheckboxToggle={toggleDrilldownTicker}
                  onRowClick={handleRowClick}
                  onExitDrilldown={() => {
                    setDrilldownSector(null);
                    setDetailContext(null);
                  }}
                />
              </ErrorBoundary>
            )}

            {!drilldownSector && !drilldownETF && (
              <ErrorBoundary title={eb('table')}>
                <MarketSummaryTable 
                  summary={summary} 
                  onRowClick={handleRowClick}
                />
              </ErrorBoundary>
            )}

            {drilldownETF && (
              <ErrorBoundary title={eb('table')}>
                <MarketSummaryTable 
                  title={`${t('leaderboard.etfDetails.title')}: ${drilldownETF}`}
                  summary={summary.filter(s => {
                    const holdings = getEtfHoldings(drilldownETF);
                    return s.symbol === drilldownETF || holdings.includes(s.symbol);
                  })}
                  showCheckboxes={true}
                  activeCheckboxes={activeEtfStockTickers}
                  onCheckboxToggle={toggleEtfStockTicker}
                  onRowClick={handleRowClick}
                  onExitDrilldown={() => {
                    closeEtfDrilldown();
                    setDetailContext(null);
                  }}
                  holdingsWeights={(() => {
                    const details = fetchETFDetailsSync(drilldownETF);
                    const weights: Record<string, number> = {};
                    details?.holdings.forEach(h => {
                      weights[h.symbol] = h.weight;
                    });
                    return weights;
                  })()}
                />
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
