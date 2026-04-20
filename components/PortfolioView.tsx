import React from 'react';
import { useTrading } from '../contexts/TradingContext';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from './ui/Card';
import { TrendingUp, TrendingDown, Wallet, History, Cpu, RefreshCw } from 'lucide-react';

export const PortfolioView: React.FC = () => {
  const { cash, positions, history, isAutoPilot, setIsAutoPilot, resetPortfolio } = useTrading();
  const { lastPrices } = useDashboard();
  const { t } = useLanguage();

  const portfolioValue = positions.reduce((acc, pos) => {
    const price = lastPrices[pos.symbol] || pos.averagePrice;
    return acc + (price * pos.quantity);
  }, 0);

  const totalValue = cash + portfolioValue;
  const initialCapital = 100000;
  const totalReturn = ((totalValue - initialCapital) / initialCapital) * 100;
  const isPositive = totalReturn >= 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-900/50 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">{t('portfolio.cash')}</p>
              <p className="text-2xl font-bold text-white">${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-full">
              <Wallet className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-900/50 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">{t('portfolio.totalValue')}</p>
              <p className="text-2xl font-bold text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-900/50 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">{t('portfolio.totalReturn')}</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{totalReturn.toFixed(2)}%
                </p>
                {isPositive ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-rose-400" />}
              </div>
            </div>
            <div className={`p-3 rounded-full ${isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
              <RefreshCw className={`w-6 h-6 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Auto-pilot Toggle */}
      <Card className="p-4 bg-slate-900/50 border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${isAutoPilot ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{t('portfolio.autoPilot')}</h3>
            <p className="text-sm text-slate-400">{t('portfolio.autoPilotDesc')}</p>
          </div>
        </div>
        <button
          onClick={() => setIsAutoPilot(!isAutoPilot)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isAutoPilot ? 'bg-indigo-600' : 'bg-slate-700'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoPilot ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Positions Table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              {t('portfolio.positions')}
            </h2>
            <button 
              onClick={() => { if(confirm('Reset portfolio?')) resetPortfolio(); }}
              className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
            >
              Reset
            </button>
          </div>
          
          <Card className="overflow-hidden border-slate-800 bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3 font-medium">{t('portfolio.columns.symbol')}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('portfolio.columns.quantity')}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('portfolio.columns.avgPrice')}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('portfolio.columns.lastPrice')}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('portfolio.columns.marketValue')}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('portfolio.columns.pl')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500 italic">
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
                        <tr key={pos.symbol} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-4 font-bold text-indigo-400">{pos.symbol}</td>
                          <td className="px-4 py-4 text-right text-slate-300">{pos.quantity}</td>
                          <td className="px-4 py-4 text-right text-slate-300">${pos.averagePrice.toFixed(2)}</td>
                          <td className="px-4 py-4 text-right text-slate-300">${lastPrice.toFixed(2)}</td>
                          <td className="px-4 py-4 text-right text-white font-medium">${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className={`px-4 py-4 text-right font-bold ${pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            {t('portfolio.history')}
          </h2>
          <Card className="border-slate-800 bg-slate-900/40 max-h-[600px] overflow-y-auto">
            <div className="divide-y divide-slate-800">
              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic">
                  {t('portfolio.emptyHistory')}
                </div>
              ) : (
                history.map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {tx.type}
                        </span>
                        <span className="font-bold text-white">{tx.symbol}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(tx.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{tx.quantity} @ ${tx.price.toFixed(2)}</span>
                      <span className="text-slate-300">${(tx.quantity * tx.price).toLocaleString()}</span>
                    </div>
                    {tx.source === 'AI' && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                        <Cpu className="w-3 h-3" />
                        AI: {tx.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
