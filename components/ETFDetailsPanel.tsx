import React, { useEffect, useState } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTrading } from '../contexts/TradingContext';
import { ETFDetails, fetchETFDetails } from '../services/etfService';
import { ShoppingCart, Wallet, CheckCircle2, AlertCircle, Info, TrendingUp, BarChart3, PieChart } from 'lucide-react';

const KPICard: React.FC<{ label: string; value: string | number; isDarkMode: boolean; color?: string }> = ({ label, value, isDarkMode, color }) => (
  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
      {label}
    </p>
    <p className={`text-lg font-mono font-black ${color || 'text-blue-500'}`}>{value}</p>
  </div>
);

export const ETFDetailsPanel: React.FC = () => {
  const {
    detailContext,
    setDetailContext,
    isDarkMode,
    lastPrices,
    drilldownETF,
    openEtfDrilldown,
    closeEtfDrilldown,
    summary,
    setDrilldownSector,
    drilldownSector,
  } = useDashboard();
  const { t, language } = useLanguage();
  const { cash, positions, buy, sell } = useTrading();
  const [details, setDetails] = useState<ETFDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trading state
  const [tradeQty, setTradeQty] = useState<number>(1);
  const [tradeStatus, setTradeStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const symbol = detailContext?.symbol;
  const type = detailContext?.type;
  const currentPrice = symbol ? lastPrices[symbol] || 0 : 0;
  const currentPosition = positions.find(p => p.symbol === symbol);
  const canSell = currentPosition && currentPosition.quantity >= tradeQty;
  const canBuy = cash >= currentPrice * tradeQty;

  const itemSummary = summary.find(s => s.symbol === symbol);

  useEffect(() => {
    if (tradeStatus) {
      const timer = setTimeout(() => setTradeStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [tradeStatus]);

  const handleTrade = (tradeType: 'BUY' | 'SELL') => {
    if (tradeQty <= 0 || !symbol) return;
    
    const success = tradeType === 'BUY' 
      ? buy(symbol, currentPrice, tradeQty)
      : sell(symbol, currentPrice, tradeQty);

    if (success) {
      setTradeStatus({ type: 'success', msg: t('portfolio.trade.success') });
    } else {
      setTradeStatus({ 
        type: 'error', 
        msg: tradeType === 'BUY' ? t('portfolio.trade.insufficientFunds') : t('portfolio.trade.insufficientQuantity') 
      });
    }
  };

  useEffect(() => {
    if (!symbol || type !== 'etf') {
      setDetails(null);
      return;
    }

    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchETFDetails(symbol, language);
        setDetails(data);
      } catch (err) {
        setError('Kunne ikke laste detaljer.');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [symbol, type, language]);

  // Koble panel-åpning til ETF-drilldown-modus hvis vi åpner en ETF
  useEffect(() => {
    if (type === 'etf' && symbol) {
      openEtfDrilldown(symbol);
    } else if (type === 'sector' && symbol) {
      setDrilldownSector(symbol);
    }
  }, [symbol, type]);

  const handleClose = () => {
    if (type === 'etf') {
      closeEtfDrilldown();
    } else if (type === 'sector') {
      setDrilldownSector(null);
    }
    setDetailContext(null);
  };

  const isOpen = detailContext !== null;

  return (
    <aside
      aria-hidden={!isOpen}
      className={`fixed top-0 right-0 h-full z-40 w-full lg:w-[420px] xl:w-[460px] shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      } ${
        isDarkMode
          ? 'bg-slate-900 text-white border-l border-slate-800'
          : 'bg-white text-slate-900 border-l border-slate-200'
      }`}
    >
      {symbol && (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg">
              {symbol.substring(0, 1)}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{symbol}</h2>
              <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {type === 'etf' ? (details?.name || t('common.loading')) : (itemSummary?.name || symbol)}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
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
              <button onClick={() => setDetailContext(detailContext)} className="mt-4 text-xs font-black uppercase text-rose-500 hover:underline">
                {t('common.retry')}
              </button>
            </div>
          ) : (
            <>
              {/* Sektor-spesifikke KPI-er */}
              {type === 'sector' && itemSummary && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Momentum & Styrke</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <KPICard label={t('leaderboard.metrics.relStrength')} value={`${itemSummary.percentChange >= 0 ? '+' : ''}${itemSummary.percentChange}%`} isDarkMode={isDarkMode} color={itemSummary.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                    <KPICard label={t('leaderboard.metrics.volume')} value={itemSummary.volume ? (itemSummary.volume / 1000000).toFixed(1) + 'M' : '-'} isDarkMode={isDarkMode} />
                  </div>
                </section>
              )}

              {/* Trading Section - Only for ETF */}
              {type === 'etf' && (
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
              )}

              {/* KPI Grid - Only for ETF */}
              {type === 'etf' && details && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PieChart className="w-4 h-4 text-blue-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">ETF Nøkkeltall</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <KPICard label={t('leaderboard.etfDetails.kpi.expenseRatio')} value={`${details.expenseRatio.toFixed(2)}%`} isDarkMode={isDarkMode} />
                    <KPICard label={t('leaderboard.etfDetails.kpi.dividendYield')} value={`${details.dividendYield.toFixed(2)}%`} isDarkMode={isDarkMode} />
                    <KPICard label={t('leaderboard.etfDetails.kpi.beta')} value={details.beta.toFixed(2)} isDarkMode={isDarkMode} />
                    <KPICard label={t('leaderboard.etfDetails.kpi.peRatio')} value={details.peRatio.toFixed(2)} isDarkMode={isDarkMode} />
                    {details.aum && <KPICard label={t('leaderboard.metrics.aum')} value={`$${(details.aum / 1000).toFixed(1)}B`} isDarkMode={isDarkMode} />}
                    {details.holdingsCount && <KPICard label={t('leaderboard.metrics.holdingsCount')} value={details.holdingsCount} isDarkMode={isDarkMode} />}
                  </div>
                </section>
              )}

              {/* Description / Info */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-blue-500">
                  {type === 'etf' ? t('leaderboard.etfDetails.about') : t('common.info')}
                </h3>
                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {type === 'etf' ? (details?.description || 'Ingen beskrivelse tilgjengelig.') : (
                    itemSummary ? `Markedsdata for ${itemSummary.name} (${itemSummary.symbol}).` : 'Ingen informasjon tilgjengelig.'
                  )}
                </p>
              </section>

              {/* Stock Specific Info */}
              {type === 'stock' && itemSummary && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aksje Nøkkeltall</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <KPICard label={t('marketSummaryFull.lastPrice')} value={`$${itemSummary.lastPrice.toLocaleString()}`} isDarkMode={isDarkMode} />
                    <KPICard label={t('marketSummaryFull.changePct')} value={`${itemSummary.percentChange > 0 ? '+' : ''}${itemSummary.percentChange}%`} isDarkMode={isDarkMode} color={itemSummary.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                    {itemSummary.peRatio && <KPICard label={t('leaderboard.metrics.peRatio')} value={itemSummary.peRatio.toFixed(1)} isDarkMode={isDarkMode} />}
                    {itemSummary.psRatio && <KPICard label={t('leaderboard.metrics.psRatio')} value={itemSummary.psRatio.toFixed(1)} isDarkMode={isDarkMode} />}
                    {itemSummary.marketCap && <KPICard label={t('leaderboard.metrics.marketCap')} value={`$${(itemSummary.marketCap / 1000000000).toFixed(1)}B`} isDarkMode={isDarkMode} />}
                    {itemSummary.dividendYield && <KPICard label={t('leaderboard.metrics.dividendYield')} value={`${(itemSummary.dividendYield * 100).toFixed(2)}%`} isDarkMode={isDarkMode} />}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {itemSummary.high52w && <KPICard label={t('leaderboard.metrics.high52w')} value={`$${itemSummary.high52w.toLocaleString()}`} isDarkMode={isDarkMode} />}
                    {itemSummary.low52w && <KPICard label={t('leaderboard.metrics.low52w')} value={`$${itemSummary.low52w.toLocaleString()}`} isDarkMode={isDarkMode} />}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
      )}
    </aside>
  );
};
