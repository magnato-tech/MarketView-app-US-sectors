import React, { useState, useMemo } from 'react';
import { useTrading } from '../contexts/TradingContext';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from './ui/Card';
import { TrendingUp, TrendingDown, Wallet, History, Cpu, RefreshCw, Zap, LayoutGrid, List, BarChart3, Info } from 'lucide-react';
import { BotConfigurationCard } from './BotConfigurationCard';
import { StrategySandbox } from './StrategySandbox';
import { BotCreationWizard } from './BotCreationWizard';
import { findOptimalStopLoss } from '../services/analysisService';

export const PortfolioView: React.FC = () => {
  const { cash, positions, history, isAutoPilot, setIsAutoPilot, resetPortfolio, botConfigs, botStates, resetAll } = useTrading();
  const { lastPrices, data } = useDashboard();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'overview' | 'bots'>('overview');
  const [showWizard, setShowWizard] = useState(false);

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

  const portfolioValue = positions.reduce((acc, pos) => {
    const price = lastPrices[pos.symbol] || pos.averagePrice;
    return acc + (price * pos.quantity);
  }, 0);

  const totalValue = cash + portfolioValue;
  const initialCapital = 100000;
  const totalReturn = ((totalValue - initialCapital) / initialCapital) * 100;
  const isPositive = totalReturn >= 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header with View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-500" />
            Portefølje & Bot Arena
          </h1>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mt-1">Styr din kapital og dine AI-agenter</p>
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
            onClick={() => setViewMode('bots')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'bots' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Bot Arena
          </button>
        </div>
      </div>

      {viewMode === 'overview' ? (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-slate-900/40 border-slate-800/50 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wallet className="w-24 h-24 text-blue-500" />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('portfolio.cash')}</p>
              <p className="text-3xl font-mono font-black text-white">${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${(cash / totalValue) * 100}%` }} />
                </div>
                <span className="text-[10px] font-mono text-slate-500">{((cash / totalValue) * 100).toFixed(0)}%</span>
              </div>
            </Card>

            <Card className="p-6 bg-slate-900/40 border-slate-800/50 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <BarChart3 className="w-24 h-24 text-purple-500" />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('portfolio.totalValue')}</p>
              <p className="text-3xl font-mono font-black text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${(portfolioValue / totalValue) * 100}%` }} />
                </div>
                <span className="text-[10px] font-mono text-slate-500">{((portfolioValue / totalValue) * 100).toFixed(0)}%</span>
              </div>
            </Card>

            <Card className="p-6 bg-slate-900/40 border-slate-800/50 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                {isPositive ? <TrendingUp className="w-24 h-24 text-emerald-500" /> : <TrendingDown className="w-24 h-24 text-rose-500" />}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('portfolio.totalReturn')}</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-3xl font-mono font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{totalReturn.toFixed(2)}%
                </p>
                <span className={`text-xs font-bold ${isPositive ? 'text-emerald-500/50' : 'text-rose-500/50'}`}>
                  vs. S&P 500
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className={`h-1.5 flex-1 rounded-full overflow-hidden bg-slate-800`}>
                  <div className={`h-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.abs(totalReturn) * 5)}%` }} />
                </div>
              </div>
            </Card>
          </div>

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
                      {positions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-600 font-mono italic">
                            {t('portfolio.emptyPositions')}
                          </td>
                        </tr>
                      ) : (
                        positions.map((pos) => {
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
                                  <span className="font-black text-white">{pos.symbol}</span>
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
                        })
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
                  {history.length === 0 ? (
                    <div className="p-12 text-center text-slate-600 font-mono italic">
                      {t('portfolio.emptyHistory')}
                    </div>
                  ) : (
                    history.map((tx) => (
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
                        {tx.source === 'AI' && (
                          <div className="mt-3 flex items-center gap-2 text-[9px] font-black text-blue-400 bg-blue-500/5 border border-blue-500/10 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                            <Cpu className="w-3 h-3" />
                            AI: {tx.reason}
                          </div>
                        )}
                        {tx.source === 'BOT' && (
                          <div className="mt-3 flex items-center gap-2 text-[9px] font-black text-purple-400 bg-purple-500/5 border border-purple-500/10 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                            <Zap className="w-3 h-3" />
                            BOT {tx.botId}: {tx.reason}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {botConfigs.map((config, idx) => (
              <BotConfigurationCard 
                key={config.id} 
                config={config} 
                state={botStates[idx]} 
              />
            ))}
            
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
                  <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Kjør Rolling Optimization
                  </button>
                  <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                    Last ned CSV Logg
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
