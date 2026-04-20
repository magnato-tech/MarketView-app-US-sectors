import React, { useEffect, useState } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTrading } from '../contexts/TradingContext';
import { ETFDetails, fetchETFDetails } from '../services/etfService';
import { ShoppingCart, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';

export const ETFDetailsPanel: React.FC = () => {
  const { selectedETFSymbol, setSelectedETFSymbol, isDarkMode, lastPrices } = useDashboard();
  const { t, language } = useLanguage();
  const { cash, positions, buy, sell } = useTrading();
  const [details, setDetails] = useState<ETFDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trading state
  const [tradeQty, setTradeQty] = useState<number>(1);
  const [tradeStatus, setTradeStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const currentPrice = selectedETFSymbol ? lastPrices[selectedETFSymbol] || 0 : 0;
  const currentPosition = positions.find(p => p.symbol === selectedETFSymbol);
  const canSell = currentPosition && currentPosition.quantity >= tradeQty;
  const canBuy = cash >= currentPrice * tradeQty;

  useEffect(() => {
    if (tradeStatus) {
      const timer = setTimeout(() => setTradeStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [tradeStatus]);

  const handleTrade = (type: 'BUY' | 'SELL') => {
    if (tradeQty <= 0) return;
    
    const success = type === 'BUY' 
      ? buy(selectedETFSymbol!, currentPrice, tradeQty)
      : sell(selectedETFSymbol!, currentPrice, tradeQty);

    if (success) {
      setTradeStatus({ type: 'success', msg: t('portfolio.trade.success') });
    } else {
      setTradeStatus({ 
        type: 'error', 
        msg: type === 'BUY' ? t('portfolio.trade.insufficientFunds') : t('portfolio.trade.insufficientQuantity') 
      });
    }
  };

  useEffect(() => {
    if (!selectedETFSymbol) {
      setDetails(null);
      return;
    }

    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchETFDetails(selectedETFSymbol, language);
        setDetails(data);
      } catch (err) {
        setError('Kunne ikke laste detaljer.');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [selectedETFSymbol, language]);

  if (!selectedETFSymbol) return null;

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${selectedETFSymbol ? 'bg-black/40 backdrop-blur-sm' : 'pointer-events-none opacity-0'}`} onClick={() => setSelectedETFSymbol(null)}>
      <div 
        className={`w-full max-w-lg h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${selectedETFSymbol ? 'translate-x-0' : 'translate-x-full'} ${
          isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg">
              {selectedETFSymbol.substring(0, 1)}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{selectedETFSymbol}</h2>
              <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {details?.name || t('common.loading')}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setSelectedETFSymbol(null)}
            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold animate-pulse text-blue-500 uppercase tracking-widest">{t('common.loading')}</p>
            </div>
          ) : error ? (
            <div className="text-center p-10 bg-rose-500/10 rounded-2xl border border-rose-500/20">
              <p className="text-rose-500 font-bold">{error}</p>
              <button onClick={() => setSelectedETFSymbol(selectedETFSymbol)} className="mt-4 text-xs font-black uppercase text-rose-500 hover:underline">
                {t('common.retry')}
              </button>
            </div>
          ) : details && (
            <>
              {/* Trading Section */}
              <section className={`p-6 rounded-3xl border-2 ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-6 shadow-xl`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-500" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">{t('portfolio.trade.buy')} / {t('portfolio.trade.sell')}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-slate-800/40 px-2 py-1 rounded-lg">
                    <Wallet className="w-3 h-3" />
                    ${cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('portfolio.trade.quantity')}</label>
                    <input 
                      type="number" 
                      min="1"
                      value={tradeQty}
                      onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`w-full bg-transparent border-2 rounded-xl p-3 font-mono font-black text-xl transition-all focus:ring-0 focus:outline-none ${
                        isDarkMode ? 'border-slate-800 focus:border-blue-500 text-white' : 'border-slate-200 focus:border-blue-500 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('portfolio.trade.total')}</p>
                    <p className="text-2xl font-black text-blue-500 font-mono">${(currentPrice * tradeQty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleTrade('BUY')}
                    disabled={!canBuy}
                    className={`p-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
                      canBuy 
                        ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/40 active:scale-95' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {t('portfolio.trade.buy')}
                  </button>
                  <button 
                    onClick={() => handleTrade('SELL')}
                    disabled={!canSell}
                    className={`p-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
                      canSell 
                        ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-900/40 active:scale-95' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {t('portfolio.trade.sell')}
                  </button>
                </div>

                {tradeStatus && (
                  <div className={`p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
                    tradeStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {tradeStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <p className="text-xs font-bold">{tradeStatus.msg}</p>
                  </div>
                )}

                {currentPosition && (
                  <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>{t('portfolio.positions')}: {currentPosition.quantity}</span>
                    <span>{t('portfolio.columns.avgPrice')}: ${currentPosition.averagePrice.toFixed(2)}</span>
                  </div>
                )}
              </section>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: t('leaderboard.etfDetails.kpi.expenseRatio'), value: `${details.expenseRatio.toFixed(2)}%` },
                  { label: t('leaderboard.etfDetails.kpi.dividendYield'), value: `${details.dividendYield.toFixed(2)}%` },
                  { label: t('leaderboard.etfDetails.kpi.beta'), value: details.beta.toFixed(2) },
                  { label: t('leaderboard.etfDetails.kpi.peRatio'), value: details.peRatio.toFixed(2) },
                ].map((kpi, i) => (
                  <div key={i} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {kpi.label}
                    </p>
                    <p className="text-lg font-mono font-black text-blue-500">{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-blue-500">{t('leaderboard.etfDetails.about')}</h3>
                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {details.description || 'Ingen beskrivelse tilgjengelig.'}
                </p>
              </section>

              {/* Top Holdings */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-blue-500">{t('leaderboard.etfDetails.holdings')}</h3>
                <div className="space-y-3">
                  {details.holdings.map((h, i) => (
                    <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isDarkMode ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-700">
                          {h.symbol.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold truncate max-w-[200px]">{h.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{h.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-500">{h.weight.toFixed(2)}%</p>
                        <div className="w-20 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-blue-600" style={{ width: `${h.weight}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
