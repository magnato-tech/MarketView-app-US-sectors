import React, { useState } from 'react';
import { useTrading } from '../contexts/TradingContext';
import { useDashboard } from '../contexts/DashboardContext';
import { BotConfig } from '../types';
import { Card } from './ui/Card';
import { X, ArrowRight, ArrowLeft, Zap, ShieldAlert, BarChart3, CheckCircle2, Cpu, RefreshCw, Search, Activity } from 'lucide-react';
import { findOptimalStopLoss } from '../services/analysisService';
import { BacktestResultModal } from './BacktestResultModal';

interface BotCreationWizardProps {
  onClose: () => void;
}

export const BotCreationWizard: React.FC<BotCreationWizardProps> = ({ onClose }) => {
  const { addBot, runBacktest, backtestResults } = useTrading();
  const { data, summary } = useDashboard();
  const [step, setStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [config, setConfig] = useState<BotConfig>({
    id: `bot-${Date.now()}`,
    name: '',
    version: '3.0',
    mode: 'Simple',
    enabled: true,
    entryLogic: {
      vixFilterEnabled: true,
      vixThreshold: 25.0,
      primarySma: 50,
      secondarySma: 200,
      momentumPeriodDays: 21,
      minRelativeStrengthScore: 70,
      kpiWeights: { momentum: 0.6, rsi: 0.2, pe: 0.2 }
    },
    stopLossModule: {
      type: 'Dynamic_Excel_Optimizer',
      optimizationRange: [0.01, 0.80],
      stepInterval: 0.01,
      lookbackPeriodMonths: 12,
      currentOptimalSl: 0.15
    },
    swapLogic: {
      enabled: true,
      alphaBufferPercent: 10.0,
      rebalanceDay: 'Monday'
    },
    riskManagement: {
      maxRiskPerTradePercent: 5.0,
      maxPortfolioDrawdown: 15.0,
      emergencyExitEnabled: true
    }
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSave = () => {
    addBot(config);
    onClose();
  };

  const handleRunBacktest = async () => {
    setIsCalculating(true);
    try {
      // Bruk alle sektorer for en bred backtest, eller de som er relevante
      const symbols = summary.map(s => s.symbol);
      await runBacktest(config, symbols);
    } catch (err) {
      console.error('Backtest failed:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const updateConfig = (path: string, value: any) => {
    const newConfig = { ...config };
    const parts = path.split('.');
    let current: any = newConfig;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setConfig(newConfig);
  };

  const handleAutoOptimize = () => {
    if (!selectedTicker || !data || data.length < 20) return;

    setIsCalculating(true);
    
    // Simuler beregningstid for bedre UX
    setTimeout(() => {
      const prices = data.map(d => ({
        open: d[selectedTicker] as number,
        high: (d[selectedTicker] as number) * 1.01,
        low: (d[selectedTicker] as number) * 0.99,
        close: d[selectedTicker] as number
      })).filter(p => !isNaN(p.close));

      const { optimalSL } = findOptimalStopLoss(prices);
      updateConfig('stopLossModule.currentOptimalSl', optimalSL);
      setIsCalculating(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-xl bg-slate-900 border-slate-800 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Opprett Ny Bot</h2>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Steg {step} av 4</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-slate-800">
          <div 
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px]">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Bot Navn</label>
                <input 
                  type="text"
                  placeholder="f.eks. Alpha Hunter"
                  className="w-full bg-slate-800 border-slate-700 text-white rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                  value={config.name}
                  onChange={(e) => updateConfig('name', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Strategi Modus</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => updateConfig('mode', 'Simple')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${config.mode === 'Simple' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
                  >
                    <h4 className="font-black text-white text-sm mb-1 uppercase tracking-tight">Simple</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Ferdig optimaliserte innstillinger for nybegynnere.</p>
                  </button>
                  <button 
                    onClick={() => updateConfig('mode', 'Advanced')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${config.mode === 'Advanced' ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
                  >
                    <h4 className="font-black text-white text-sm mb-1 uppercase tracking-tight">Advanced</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Full kontroll over alle parametere og vekting.</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-blue-400" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VIX Filter (Markedsfrykt)</label>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400">{config.entryLogic.vixThreshold}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Boten slutter å handle hvis VIX (fryktindeksen) går over denne verdien. 25-30 regnes som høy frykt.
                </p>
                <input 
                  type="range" min="15" max="40" step="0.5"
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  value={config.entryLogic.vixThreshold}
                  onChange={(e) => updateConfig('entryLogic.vixThreshold', parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trend Filter (SMA)</label>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Boten vil kun kjøpe hvis prisen er over det valgte glidende gjennomsnittet.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[20, 50, 200].map(sma => (
                    <button
                      key={sma}
                      onClick={() => updateConfig('entryLogic.primarySma', sma)}
                      className={`py-3 rounded-xl font-mono text-xs font-black transition-all ${config.entryLogic.primarySma === sma ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                    >
                      {sma}d
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-rose-400" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stop Loss %</label>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-400">{(config.stopLossModule.currentOptimalSl * 100).toFixed(0)}%</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Hvor mye kan en aksje falle fra toppen før boten selger automatisk for å beskytte kapitalen din?
                </p>
                
                {/* Auto-optimaliseringseksjon */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">AI Optimalisering</span>
                    <div className="flex items-center gap-1 text-[8px] text-slate-500 uppercase font-mono">
                      <Search className="w-2.5 h-2.5" /> 6mnd historikk
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select 
                      value={selectedTicker}
                      onChange={(e) => setSelectedTicker(e.target.value)}
                      className="flex-1 bg-slate-900 border-slate-700 text-[10px] text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Velg instrument...</option>
                      {summary.map(s => (
                        <option key={s.symbol} value={s.symbol}>{s.name} ({s.symbol})</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAutoOptimize}
                      disabled={!selectedTicker || isCalculating}
                      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${!selectedTicker || isCalculating ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'}`}
                    >
                      {isCalculating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Beregn Optimal SL
                    </button>
                  </div>
                </div>

                <input 
                  type="range" min="0.05" max="0.50" step="0.01"
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  value={config.stopLossModule.currentOptimalSl}
                  onChange={(e) => updateConfig('stopLossModule.currentOptimalSl', parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maks Risiko Per Handel</label>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">{config.riskManagement.maxRiskPerTradePercent}%</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Hvor stor del av din totale kapital skal boten bruke på én enkelt investering?
                </p>
                <input 
                  type="range" min="1" max="20" step="1"
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  value={config.riskManagement.maxRiskPerTradePercent}
                  onChange={(e) => updateConfig('riskManagement.maxRiskPerTradePercent', parseInt(e.target.value))}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight italic">Klar til aktivering!</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Gå gjennom konfigurasjonen for {config.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Strategi</p>
                  <p className="text-xs font-bold text-white uppercase">{config.mode} Modus</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">VIX Terskel</p>
                  <p className="text-xs font-bold text-blue-400">{config.entryLogic.vixThreshold}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Stop Loss</p>
                  <p className="text-xs font-bold text-rose-400">{(config.stopLossModule.currentOptimalSl * 100).toFixed(0)}%</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Maks Risiko</p>
                  <p className="text-xs font-bold text-emerald-400">{config.riskManagement.maxRiskPerTradePercent}%</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 mt-4">
                <p className="text-[10px] text-blue-400 leading-relaxed text-center italic">
                  "Ved å aktivere denne boten vil den automatisk begynne å handle med din virtuelle kapital basert på valgte regler."
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleRunBacktest}
                  disabled={isCalculating}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 flex items-center justify-center gap-3 transition-all group"
                >
                  <Activity className={`w-5 h-5 text-blue-400 ${isCalculating ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-widest">Kjør Backtest Nå</p>
                    <p className="text-[9px] text-slate-500 font-mono">Sjekk historisk ytelse før aktivering</p>
                  </div>
                  {isCalculating && <RefreshCw className="w-4 h-4 animate-spin ml-auto mr-4 text-slate-500" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <button 
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Tilbake
          </button>

          {step < 4 ? (
            <button 
              onClick={handleNext}
              disabled={step === 1 && !config.name}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${step === 1 && !config.name ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500'}`}
            >
              Neste Steg <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all"
            >
              Aktiver Bot <Zap className="w-4 h-4" />
            </button>
          )}
        </div>
      </Card>

      {backtestResults[config.id] && (
        <BacktestResultModal 
          result={backtestResults[config.id]} 
          onClose={() => {
            // Vi sletter ikke resultatet her, bare lukker modalen
            // Dette lar brukeren se resultatet igjen hvis de trykker på knappen på nytt
          }} 
        />
      )}
    </div>
  );
};
