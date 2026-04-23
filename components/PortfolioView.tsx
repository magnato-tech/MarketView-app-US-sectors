import React, { useState, useMemo } from 'react';
import { useTrading } from '../contexts/TradingContext';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from './ui/Card';
import { TrendingUp, TrendingDown, Wallet, History, Cpu, RefreshCw, Zap, LayoutGrid, List, BarChart3, Info, Lock, Unlock } from 'lucide-react';
import { BotConfigurationCard } from './BotConfigurationCard';
import { StrategySandbox } from './StrategySandbox';
import { BotCreationWizard } from './BotCreationWizard';
import { findOptimalStopLoss } from '../services/analysisService';
import { BotState } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PortfolioStats } from './dashboard/PortfolioStats';
import { INITIAL_CASH, SANITY_CAP_NOK } from '../constants/trading';

export const PortfolioView: React.FC = () => {
  const {
    cash,
    positions,
    history,
    botConfigs,
    botStates,
    resetAll,
    runBacktest,
    backtestResults,
    publishedBots,
    deployments,
    weeklyPulse,
    deployPublishedBot,
    refreshPublishedBots,
    updateDeploymentStatus,
    rebalanceDeployment,
    toggleDeploymentLock,
    portfolioEquityCurve,
  } = useTrading();
  const { lastPrices, data, summary, setActiveTab } = useDashboard();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'overview' | 'bots'>('overview');
  const [showWizard, setShowWizard] = useState(false);
  const [isTestingBots, setIsTestingBots] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [selectedPublishedBotId, setSelectedPublishedBotId] = useState<string>('');
  const [allocationPct, setAllocationPct] = useState<number>(25);
  const [tradingInterval, setTradingInterval] = useState<'1d' | '1wk' | '1mo'>('1wk');
  const [isHistoricalTesting, setIsHistoricalTesting] = useState<Record<string, boolean>>({});
  const [deployStatus, setDeployStatus] = useState<string | null>(null);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>('');
  const [rebalanceNok, setRebalanceNok] = useState<number>(50000);

  // Finn optimal stop-loss basert på den mest aktive ticker (f.eks. SPY eller XLK)
  const optimizationData = useMemo(() => {
    if (!data || data.length < 20) return null;
    
    // Bruk XLK som proxy for teknologi-sektoren hvis den finnes, ellers første ticker
    const symbol = data[0].XLK ? 'XLK' : Object.keys(data[0]).find(k => k !== 'timestamp') || '';
    if (!symbol) return null;

    const prices = data.map(d => ({
      open: d[symbol] as number,
      high: (d[symbol] as number) * 1.01, // Mock high/low for demo
      low: (d[symbol] as number) * 0.99,
      close: d[symbol] as number
    })).filter(p => !isNaN(p.close));

    return findOptimalStopLoss(prices);
  }, [data]);

  const totalAllocatedToBots = useMemo(() => {
    return deployments
      .filter(d => d.status === 'Active')
      .reduce((acc, d) => acc + (d.allocatedCapitalNok || 0), 0);
  }, [deployments]);

  const availableCapital = cash - totalAllocatedToBots;

  const portfolioValue = useMemo(() => {
    const manualPositionsValue = positions.reduce((acc, pos) => {
      const price = lastPrices[pos.symbol] || pos.averagePrice;
      return acc + (price * pos.quantity);
    }, 0);

    const botPositionsValue = deployments
      .filter(d => d.status === 'Active')
      .reduce((acc, d) => acc + (d.liveBalanceNok || d.allocatedCapitalNok || 0), 0);

    const total = manualPositionsValue + botPositionsValue;
    // Sanity check: hvis verdien er absurd høy, er det en feil i dataene
    if (total > SANITY_CAP_NOK) return 0; 
    return total;
  }, [positions, lastPrices, deployments]);

  const totalValue = availableCapital + portfolioValue;
  const initialCapital = INITIAL_CASH;
  const totalReturn = ((totalValue - initialCapital) / initialCapital) * 100;
  const isPositive = totalReturn >= 0;
  const botStatesById = useMemo<Record<string, BotState>>(
    () =>
      botStates.reduce<Record<string, BotState>>((acc, state) => {
        acc[state.botId] = state;
        return acc;
      }, {}),
    [botStates]
  );

  const testSymbols = useMemo(() => {
    const symbols = summary.map((s) => s.symbol).filter(Boolean);
    return symbols.length > 0 ? symbols : ['SPY', 'XLK', 'XLE'];
  }, [summary]);

  const toggleSelectedBot = (botId: string) => {
    setSelectedBotIds((prev) =>
      prev.includes(botId) ? prev.filter((id) => id !== botId) : [...prev, botId]
    );
  };

  const handleTestSelectedBots = async () => {
    const targetIds = selectedBotIds.length > 0 ? selectedBotIds : botConfigs.slice(0, 2).map((b) => b.id);
    if (targetIds.length === 0) return;
    setIsTestingBots(true);
    setTestError(null);
    try {
      const selectedConfigs = botConfigs.filter((b) => targetIds.includes(b.id));
      await Promise.all(selectedConfigs.map((config) => runBacktest(config, testSymbols, '1y')));
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Backtest feilet.');
    } finally {
      setIsTestingBots(false);
    }
  };

  const comparisonChartData = useMemo(() => {
    if (selectedBotIds.length === 0) return [];
    const selectedResults = selectedBotIds
      .map((id) => ({ id, result: backtestResults[id] }))
      .filter((entry): entry is { id: string; result: NonNullable<typeof backtestResults[string]> } => Boolean(entry.result));
    if (selectedResults.length === 0) return [];

    const baseCurve = selectedResults[0].result.equityCurve;
    return baseCurve.map((point, idx) => {
      const row: Record<string, string | number> = {
        timestamp: point.timestamp.slice(0, 10),
        market: point.marketValue,
      };
      for (const entry of selectedResults) {
        row[entry.id] = entry.result.equityCurve[idx]?.botValue ?? null;
      }
      return row;
    });
  }, [backtestResults, selectedBotIds]);

  const selectedBotConfigs = useMemo(
    () => botConfigs.filter((bot) => selectedBotIds.includes(bot.id)),
    [botConfigs, selectedBotIds]
  );

  const linePalette = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444'];
  const selectedDeployment = useMemo(
    () => deployments.find((d) => d.id === selectedDeploymentId) ?? deployments[0],
    [deployments, selectedDeploymentId]
  );

  const handleDeploy = async () => {
    if (!selectedPublishedBotId) {
      setDeployStatus('Velg en Published bot først.');
      return;
    }
    try {
      setDeployStatus('Deploying...');
      // Calculate NOK value for initial simulation based on percentage of totalValue
      const calculatedNok = (totalValue * allocationPct) / 100;
      await deployPublishedBot(selectedPublishedBotId, calculatedNok, tradingInterval, allocationPct);
      setDeployStatus('Deployment opprettet.');
    } catch (error) {
      setDeployStatus(error instanceof Error ? error.message : 'Deployment feilet.');
    }
  };

  const handleUpdateDeploymentStatus = async (deploymentId: string, status: 'Active' | 'Paused' | 'Stopped') => {
    try {
      setDeployStatus('Oppdaterer deployment-status...');
      await updateDeploymentStatus(deploymentId, status);
      setDeployStatus(`Deployment satt til ${status}.`);
    } catch (error) {
      setDeployStatus(error instanceof Error ? error.message : 'Statusoppdatering feilet.');
    }
  };

  const handleRebalanceDeployment = async () => {
    if (!selectedDeployment) return;
    try {
      setDeployStatus('Rebalanserer deployment...');
      await rebalanceDeployment(selectedDeployment.id, rebalanceNok);
      setDeployStatus('Rebalansering fullført.');
    } catch (error) {
      setDeployStatus(error instanceof Error ? error.message : 'Rebalansering feilet.');
    }
  };

  const handleRunHistoricalTest = async (deploymentId: string) => {
    setIsHistoricalTesting(prev => ({ ...prev, [deploymentId]: true }));
    try {
      // For nå bruker vi rebalance-APIet for å trigge en ny simulering over 2 år
      // Dette lagrer backtestPerformance i deployments.json
      await rebalanceDeployment(deploymentId, deployments.find(d => d.id === deploymentId)?.allocatedCapitalNok || 50000);
      setDeployStatus('Historisk test fullført.');
    } catch (error) {
      setDeployStatus(error instanceof Error ? error.message : 'Historisk test feilet.');
    } finally {
      setIsHistoricalTesting(prev => ({ ...prev, [deploymentId]: false }));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header with View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-500" />
            Command Center
          </h1>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mt-1">Virtuell konto med deployede AI-agenter</p>
        </div>
        
        <div className="flex items-center bg-slate-900/80 p-1 rounded-2xl border border-slate-800 shadow-xl">
          <button 
            onClick={() => setViewMode('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Oversikt
          </button>
          <button
            onClick={() => setActiveTab('lab')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-500 hover:text-slate-300"
          >
            <Cpu className="w-3.5 h-3.5" />
            Gå til The Lab
          </button>
        </div>
      </div>

      {viewMode === 'overview' ? (
        <>
          <PortfolioStats 
            totalValue={totalValue}
            availableCapital={availableCapital}
            totalAllocatedToBots={totalAllocatedToBots}
            totalReturn={totalReturn}
            isPositive={isPositive}
          />

          {/* Portfolio Performance Chart */}
          <Card className="p-6 border-slate-800/60 bg-slate-900/20 backdrop-blur-md rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  Total Formueutvikling
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Kombinert verdi av cash, botter og manuelle posisjoner</p>
              </div>
            </div>
            
            <div className="h-72 w-full">
              {portfolioEquityCurve.length === 0 ? (
                <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 italic">Ingen historiske data ennå. Aktiver en bot for å starte sporing.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={portfolioEquityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fill: '#475569', fontSize: 10 }} 
                      axisLine={false}
                      tickLine={false}
                      minTickGap={30}
                      tickFormatter={(ts) => {
                        if (!ts || typeof ts !== 'string') return '';
                        if (ts === 'START' || ts === 'I DAG') return ts;
                        const date = new Date(ts);
                        return date.toLocaleDateString('no-NO', { month: 'short', year: '2-digit' });
                      }}
                    />
                    <YAxis 
                      tick={{ fill: '#475569', fontSize: 10 }} 
                      axisLine={false} 
                      tickLine={false}
                      domain={[0, 1500000]}
                      tickFormatter={(val) => {
                        if (typeof val !== 'number') return '';
                        return `NOK ${val >= 1000000 ? (val/1000000).toFixed(1) + 'M' : (val/1000).toFixed(0) + 'k'}`;
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="botValue" 
                      name="Total Verdi" 
                      stroke="#f59e0b" 
                      strokeWidth={3} 
                      dot={false} 
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Positions Table */}
            <div className="xl:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <List className="w-4 h-4 text-blue-500" />
                  Aktive Posisjoner
                </h2>
                <button 
                  onClick={() => { if(confirm('Nullstill porteføljen og alle botter?')) resetAll(); }}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset All
                </button>
              </div>
              
              <Card className="overflow-hidden border-slate-800/60 bg-slate-900/20 backdrop-blur-md rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-800/40 text-slate-500 uppercase text-[9px] font-black tracking-widest">
                        <th className="px-6 py-4">{t('portfolio.columns.symbol')}</th>
                        <th className="px-6 py-4 text-right">{t('portfolio.columns.quantity')}</th>
                        <th className="px-6 py-4 text-right">{t('portfolio.columns.avgPrice')}</th>
                        <th className="px-6 py-4 text-right">{t('portfolio.columns.lastPrice')}</th>
                        <th className="px-6 py-4 text-right">{t('portfolio.columns.marketValue')}</th>
                        <th className="px-6 py-4 text-right">{t('portfolio.columns.pl')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {positions.length === 0 && deployments.filter(d => d.status === 'Active').length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-600 font-mono italic">
                            {t('portfolio.emptyPositions')}
                          </td>
                        </tr>
                      ) : (
                        <>
                          {positions.map((pos) => {
                            const lastPrice = lastPrices[pos.symbol] || pos.averagePrice;
                            const marketValue = lastPrice * pos.quantity;
                            const costBasis = pos.averagePrice * pos.quantity;
                            const pl = marketValue - costBasis;
                            const plPct = (pl / costBasis) * 100;
                            
                            return (
                              <tr key={pos.symbol} className="hover:bg-slate-800/20 transition-colors group">
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-[10px] font-black text-blue-400 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                      {pos.symbol.substring(0, 2)}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-black text-white">{pos.symbol}</span>
                                      <span className="text-[8px] text-slate-500 uppercase">Manuell</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-right text-slate-400 font-mono">{pos.quantity}</td>
                                <td className="px-6 py-5 text-right text-slate-400 font-mono">${pos.averagePrice.toFixed(2)}</td>
                                <td className="px-6 py-5 text-right text-slate-400 font-mono">${lastPrice.toFixed(2)}</td>
                                <td className="px-6 py-5 text-right text-white font-black font-mono">${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className={`px-6 py-5 text-right font-black font-mono ${pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {pl >= 0 ? '+' : ''}{pl.toFixed(2)} ({plPct.toFixed(2)}%)
                                </td>
                              </tr>
                            );
                          })}
                          {deployments.filter(d => d.status === 'Active').map((d) => {
                            const lastTx = [...(d.transactions || [])].reverse().find(t => t.type === 'BUY');
                            const currentPrice = lastPrices[d.symbol || 'SPY'] || lastTx?.price || 0;
                            const marketValue = d.liveBalanceNok || d.allocatedCapitalNok;
                            const pl = marketValue - d.allocatedCapitalNok;
                            const plPct = (pl / d.allocatedCapitalNok) * 100;

                            return (
                              <tr key={d.id} className="hover:bg-blue-900/10 transition-colors group border-l-2 border-blue-500/30">
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-[10px] font-black text-blue-400 border border-blue-500/40">
                                      {d.botId.substring(0, 2)}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-black text-white">{d.botId}</span>
                                      <span className="text-[8px] text-blue-400 uppercase">AI Bot ({d.symbol})</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-right text-slate-400 font-mono">{lastTx?.quantity || '-'}</td>
                                <td className="px-6 py-5 text-right text-slate-400 font-mono">${lastTx?.price.toFixed(2) || '-'}</td>
                                <td className="px-6 py-5 text-right text-slate-400 font-mono">${currentPrice.toFixed(2)}</td>
                                <td className="px-6 py-5 text-right text-white font-black font-mono">NOK {marketValue.toLocaleString()}</td>
                                <td className={`px-6 py-5 text-right font-black font-mono ${pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {pl >= 0 ? '+' : ''}{pl.toFixed(2)} ({plPct.toFixed(2)}%)
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* History List */}
            <div className="space-y-4">
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                Siste Transaksjoner
              </h2>
              <Card className="border-slate-800/60 bg-slate-900/20 backdrop-blur-md rounded-2xl max-h-[600px] overflow-y-auto">
                <div className="divide-y divide-slate-800/40">
                  {history.length === 0 && deployments.every(d => (d.transactions?.length ?? 0) === 0) ? (
                    <div className="p-12 text-center text-slate-600 font-mono italic">
                      {t('portfolio.emptyHistory')}
                    </div>
                  ) : (
                    <>
                      {/* Manuelle transaksjoner */}
                      {history.map((tx) => (
                        <div key={tx.id} className="p-5 hover:bg-slate-800/20 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {tx.type}
                              </span>
                              <span className="font-black text-white text-sm">{tx.symbol}</span>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 uppercase">
                              {new Date(tx.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-500">{tx.quantity} @ ${tx.price.toFixed(2)}</span>
                            <span className="text-slate-300 font-black">${(tx.quantity * tx.price).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                      {/* Bot transaksjoner */}
                      {deployments.flatMap(d => (d.transactions || []).map(tx => ({ ...tx, botId: d.botId }))).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).map((tx) => (
                        <div key={tx.id} className="p-5 hover:bg-blue-900/10 transition-colors border-l-2 border-blue-500/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${tx.type === 'BUY' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {tx.type}
                              </span>
                              <span className="font-black text-white text-sm">{tx.botId}</span>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 uppercase">
                              {tx.timestamp.slice(0, 16).replace('T', ' ')}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-500">{tx.quantity} @ ${tx.price.toFixed(2)}</span>
                            <span className="text-blue-300 font-black">NOK {(tx.quantity * tx.price).toLocaleString()}</span>
                          </div>
                          <div className="mt-2 text-[8px] font-black text-blue-400/60 uppercase tracking-widest">
                            {tx.note || 'AI Auto-trade'}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>

          <Card className="p-6 border-slate-800/60 bg-slate-900/20 backdrop-blur-md rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Bot Kontrollpanel</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Aktiver eller deaktiver dine publiserte botter</p>
              </div>
              <button
                onClick={() => { refreshPublishedBots(); refreshDeployments(); }}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Oppdater
              </button>
            </div>

                <div className="space-y-3">
              {publishedBots.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-500 italic">Ingen publiserte botter funnet. Gå til The Lab for å lage din første bot.</p>
                </div>
              ) : (
                publishedBots.map((bot) => {
                  const deployment = deployments.find(d => d.botId === bot.id && d.status !== 'Stopped');
                  const isActive = !!deployment;
                  const isLocked = deployment?.isLocked || false;
                  
                  return (
                    <div 
                      key={bot.id} 
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isActive 
                          ? isLocked 
                            ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-900/20' 
                            : 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-900/10' 
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative flex items-center">
                          <button
                            disabled={isLocked}
                            onClick={() => {
                              if (isActive) {
                                if (confirm('Vil du stoppe live-handelen for denne botten?')) {
                                  handleUpdateDeploymentStatus(deployment.id, 'Stopped');
                                }
                              } else {
                                setSelectedPublishedBotId(bot.id);
                              }
                            }}
                            className={`w-12 h-6 rounded-full transition-all relative ${
                              isActive ? 'bg-blue-600' : 'bg-slate-700'
                            } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                              isActive ? 'left-7' : 'left-1'
                            }`} />
                          </button>
                          {isActive && (
                            <button
                              onClick={() => toggleDeploymentLock(deployment.id, !isLocked)}
                              className={`ml-3 p-1.5 rounded-lg transition-colors ${
                                isLocked ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                              title={isLocked ? 'Lås opp bot' : 'Lås bot (sikring)'}
                            >
                              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm uppercase tracking-tight">{bot.id}</span>
                            {isActive && (
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${isLocked ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-400 animate-pulse'}`}>
                                {isLocked ? 'Live Locked' : 'Live Active'}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {bot.tradingUniverse?.allowedCategories?.map(cat => (
                              <span key={cat} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">{cat}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {isActive && (
                          <div className="text-right hidden sm:block">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Status</p>
                            <p className={`text-xs font-mono font-black ${deployment.liveBalanceNok && deployment.liveBalanceNok > deployment.allocatedCapitalNok ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {deployment.liveBalanceNok ? `NOK ${deployment.liveBalanceNok.toLocaleString()}` : 'Venter på første tick'}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRunHistoricalTest(deployment?.id || '')}
                            disabled={isLocked || isHistoricalTesting[deployment?.id || '']}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              isActive 
                                ? isLocked 
                                  ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed' 
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                                : 'bg-blue-600 text-white hover:bg-blue-500'
                            }`}
                          >
                            {isHistoricalTesting[deployment?.id || ''] ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Kjør Test'}
                          </button>
                          <button
                            onClick={() => {
                              if (isActive) {
                                setSelectedDeploymentId(deployment.id);
                              } else {
                                setSelectedPublishedBotId(bot.id);
                              }
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              isActive 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {isActive ? 'Se Live' : 'Konfigurer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {deployStatus && (
              <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {deployStatus}
              </div>
            )}
          </Card>

          {/* Quick Deploy Modal/Section (only shown when a bot is selected but not active) */}
          {!deployments.find(d => d.botId === selectedPublishedBotId && d.status !== 'Stopped') && selectedPublishedBotId && (
            <Card className="p-6 border-blue-500/30 bg-blue-600/5 backdrop-blur-md rounded-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                Aktiver {selectedPublishedBotId}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allokering (%)</label>
                    <span className="text-[10px] font-mono text-blue-400 font-bold">{allocationPct}% (ca. NOK {((totalValue * allocationPct) / 100).toLocaleString()})</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={allocationPct}
                    onChange={(e) => setAllocationPct(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[8px] text-slate-600 font-black uppercase tracking-tighter">
                    <span>5%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hyppighet</label>
                  <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    {(['1d', '1wk', '1mo'] as const).map((int) => (
                      <button
                        key={int}
                        onClick={() => setTradingInterval(int)}
                        className={`flex-1 py-1 text-[10px] font-black uppercase rounded-md transition-all ${
                          tradingInterval === int ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {int === '1d' ? 'Daglig' : int === '1wk' ? 'Ukentlig' : 'Månedlig'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-end gap-2 md:col-span-2">
                  <button
                    onClick={handleDeploy}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Bekreft Aktivering
                  </button>
                  <button
                    onClick={() => setSelectedPublishedBotId('')}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            </Card>
          )}

          {selectedDeployment && (
            <>
              <Card className="p-6 border-slate-800/60 bg-slate-900/20 backdrop-blur-md rounded-2xl">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">The Sunday Pulse</h3>
                {!weeklyPulse[selectedDeployment.id] ? (
                  <p className="text-sm text-slate-500">Ingen ukentlig snapshot ennå. Snapshot opprettes automatisk ved app-open.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">
                      {new Date(weeklyPulse[selectedDeployment.id].weekStart).toLocaleDateString()} - {new Date(weeklyPulse[selectedDeployment.id].weekEnd).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-slate-200">{weeklyPulse[selectedDeployment.id].narrative}</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                        Bot: {weeklyPulse[selectedDeployment.id].weeklyReturnPct.toFixed(2)}%
                      </div>
                      <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                        Benchmark: {weeklyPulse[selectedDeployment.id].benchmarkWeeklyReturnPct.toFixed(2)}%
                      </div>
                      <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                        Delta: {weeklyPulse[selectedDeployment.id].relativeWeeklyDeltaPct.toFixed(2)}%
                      </div>
                      <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                        Fees: {weeklyPulse[selectedDeployment.id].weeklyFeesPaidNok} NOK
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6 border-slate-800/60 bg-slate-900/20 backdrop-blur-md rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">
                    {selectedDeployment.liveEquityCurve && selectedDeployment.liveEquityCurve.length > 0 ? 'Live Equity Curve' : 'Historical Backtest (2y)'}
                  </h3>
                  <div className="text-xs text-slate-400">
                    {selectedDeployment.botId} · {selectedDeployment.status} · {selectedDeployment.interval === '1d' ? 'Daglig' : selectedDeployment.interval === '1mo' ? 'Månedlig' : 'Ukentlig'}
                  </div>
                </div>
                {((selectedDeployment.liveEquityCurve?.length ?? 0) === 0 && (selectedDeployment.equityCurve?.length ?? 0) === 0) ? (
                  <p className="text-sm text-slate-500">Ingen data tilgjengelig.</p>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedDeployment.liveEquityCurve && selectedDeployment.liveEquityCurve.length > 0 ? selectedDeployment.liveEquityCurve : selectedDeployment.equityCurve}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="timestamp" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                          labelStyle={{ color: '#e2e8f0' }}
                        />
                        <Line type="monotone" dataKey="botValue" stroke="#3b82f6" dot={false} strokeWidth={2} name="Bot Value" />
                        <Line type="monotone" dataKey="benchmarkValue" stroke="#64748b" dot={false} strokeWidth={2} name="Benchmark Value" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {(selectedDeployment.liveBalanceNok != null || selectedDeployment.performance) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
                    <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                      {selectedDeployment.liveBalanceNok != null ? (
                        <>Live Balanse: NOK {selectedDeployment.liveBalanceNok.toLocaleString()}</>
                      ) : (
                        <>Bot Return: {selectedDeployment.performance?.totalReturnPct.toFixed(2)}%</>
                      )}
                    </div>
                    <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                      Benchmark: {selectedDeployment.performance?.benchmarkReturnPct.toFixed(2)}%
                    </div>
                    <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                      Delta: {selectedDeployment.performance?.relativeDeltaPct.toFixed(2)}%
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6 border-slate-800/60 bg-slate-900/20 backdrop-blur-md rounded-2xl">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Deployment Controls</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    onClick={() => handleUpdateDeploymentStatus('Active')}
                    className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleUpdateDeploymentStatus('Paused')}
                    className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-white"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => handleUpdateDeploymentStatus('Stopped')}
                    className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white"
                  >
                    Undeploy
                  </button>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rebalance NOK</label>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={rebalanceNok}
                      onChange={(e) => setRebalanceNok(Number(e.target.value))}
                      className="block mt-1 bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2"
                    />
                  </div>
                  <button
                    onClick={handleRebalanceDeployment}
                    className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    Rebalance
                  </button>
                </div>
              </Card>

              <Card className="p-6 border-slate-800/60 bg-slate-900/20 backdrop-blur-md rounded-2xl">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">
                  Transaction Log (incl. fee)
                </h3>
                {(selectedDeployment.transactions?.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-500">Ingen transaksjoner ennå.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {selectedDeployment.transactions?.map((tx) => (
                      <div key={tx.id} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className={tx.type === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {tx.type}
                          </span>
                          <span className="text-slate-500">{new Date(tx.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="text-slate-300 mt-1">
                          {tx.quantity} @ {tx.price.toFixed(2)} NOK · Fee: {tx.feeNok} NOK
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {botConfigs.map((config) => {
              const checked = selectedBotIds.includes(config.id);
              return (
                <div key={config.id} className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 font-mono px-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelectedBot(config.id)}
                      className="accent-blue-500"
                    />
                    Sammenlign {config.name}
                  </label>
                  <BotConfigurationCard
                    config={config}
                    state={botStatesById[config.id]}
                  />
                </div>
              );
            })}
            
            {/* Add Bot Placeholder */}
            <Card 
              onClick={() => setShowWizard(true)}
              className="p-6 border-dashed border-slate-800 bg-slate-900/10 flex flex-col items-center justify-center text-center group hover:border-blue-500/50 transition-colors cursor-pointer min-h-[300px]"
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <Cpu className="w-6 h-6 text-slate-500 group-hover:text-blue-400" />
              </div>
              <h3 className="font-black text-slate-500 group-hover:text-slate-300 uppercase tracking-widest text-xs">Opprett ny bot</h3>
              <p className="text-[10px] text-slate-600 mt-2 max-w-[150px]">Lås opp flere plasser ved å oppgradere strategien din</p>
            </Card>
          </div>

          {showWizard && <BotCreationWizard onClose={() => setShowWizard(false)} />}

          {/* Sandbox Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <StrategySandbox 
              curve={optimizationData?.curve || []} 
              optimalSL={optimizationData?.optimalSL || 0.15} 
            />
            
            <Card className="p-8 bg-blue-600/5 border-blue-500/20 rounded-3xl relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Zap className="w-32 h-32 text-blue-500" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-black text-white uppercase tracking-widest">Strategy Sandbox</h2>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  I Bot Arena kan du konfigurere opptil 5 uavhengige trading-agenter. Hver bot bruker en unik kombinasjon av 
                  <span className="text-white font-bold"> VIX-filtre</span>, 
                  <span className="text-white font-bold"> SMA-trendbekreftelse</span> og 
                  <span className="text-white font-bold"> Dynamic Stop-Loss</span>. 
                  AI-motoren kjører backtester i bakgrunnen for å foreslå optimale innstillinger basert på de siste 12 månedene med markedsdata.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <button
                    onClick={handleTestSelectedBots}
                    disabled={isTestingBots}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {isTestingBots ? 'Tester botter...' : 'Test valgte botter'}
                  </button>
                  <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                    Last ned CSV Logg
                  </button>
                </div>
                {testError && (
                  <p className="mt-4 text-xs text-rose-300">{testError}</p>
                )}
              </div>
            </Card>
          </div>

          <Card className="p-6 border-slate-800/60 bg-slate-900/20 backdrop-blur-md rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Utvikling per bot</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                {selectedBotConfigs.length > 0 ? `${selectedBotConfigs.length} valgt` : 'Velg botter for sammenligning'}
              </p>
            </div>

            {comparisonChartData.length === 0 ? (
              <p className="text-sm text-slate-500">
                Kjør test på valgte botter for å vise kurver.
              </p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timestamp" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="market"
                      stroke="#64748b"
                      dot={false}
                      strokeWidth={2}
                      name="Benchmark"
                    />
                    {selectedBotConfigs.map((bot, idx) => (
                      <Line
                        key={bot.id}
                        type="monotone"
                        dataKey={bot.id}
                        stroke={linePalette[idx % linePalette.length]}
                        dot={false}
                        strokeWidth={2}
                        name={bot.name}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
