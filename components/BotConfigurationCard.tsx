import React, { useState } from 'react';
import { useTrading } from '../contexts/TradingContext';
import { useDashboard } from '../contexts/DashboardContext';
import { Card } from './ui/Card';
import { Settings, Play, Pause, RefreshCw, Zap, ShieldAlert, BarChart3, Info, Activity } from 'lucide-react';
import { BotConfig } from '../types';
import { BacktestResultModal } from './BacktestResultModal';

interface BotCardProps {
  config: BotConfig;
  state: any;
}

export const BotConfigurationCard: React.FC<BotCardProps> = ({ config, state }) => {
  const { updateBotConfig, runBacktest, backtestResults } = useTrading();
  const { summary } = useDashboard();
  const [isEditing, setIsEditing] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [backtestPeriod, setBacktestPeriod] = useState<'1y' | '2y' | '5y'>('1y');
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    updateBotConfig(localConfig);
    setIsEditing(false);
  };

  const handleBacktest = async () => {
    setIsBacktesting(true);
    try {
      // Bruk alle tilgjengelige sektorer/instrumenter for backtest
      const symbols = summary.map(s => s.symbol);
      await runBacktest(localConfig, symbols, backtestPeriod);
      setShowResult(true);
    } catch (err) {
      console.error('Backtest failed:', err);
    } finally {
      setIsBacktesting(false);
    }
  };

  const handleChange = (path: string, value: any) => {
    const newConfig = { ...localConfig };
    const parts = path.split('.');
    let current: any = newConfig;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setLocalConfig(newConfig);
  };

  const isPositive = state.performance.totalReturn >= 0;

  return (
    <Card className={`p-5 border-slate-800 transition-all ${localConfig.enabled ? 'bg-slate-900/60' : 'bg-slate-950/40 opacity-75'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${localConfig.enabled ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-white tracking-tight">{localConfig.name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">v{localConfig.version}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${localConfig.mode === 'Advanced' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {localConfig.mode}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={backtestPeriod}
            onChange={(e) => setBacktestPeriod(e.target.value as any)}
            className="bg-slate-800 border-none text-[9px] font-black text-slate-400 rounded-lg px-2 py-1 uppercase tracking-widest focus:ring-0 cursor-pointer hover:text-white transition-colors"
          >
            <option value="1y">1 År</option>
            <option value="2y">2 År</option>
            <option value="5y">5 År</option>
          </select>
          <button 
            onClick={handleBacktest}
            disabled={isBacktesting}
            className={`p-2 rounded-lg transition-colors ${isBacktesting ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-400 hover:text-blue-400'}`}
            title={`Kjør Backtest (${backtestPeriod})`}
          >
            <Activity className={`w-4 h-4 ${isBacktesting ? 'animate-pulse' : ''}`} />
          </button>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleChange('enabled', !localConfig.enabled)}
            className={`p-2 rounded-lg transition-colors ${localConfig.enabled ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'}`}
          >
            {localConfig.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Performance Mini-Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Return</p>
          <p className={`text-lg font-mono font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{state.performance.totalReturn.toFixed(2)}%
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Balance</p>
          <p className="text-lg font-mono font-black text-white">
            ${(state.balance / 1000).toFixed(1)}k
          </p>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-5 animate-in slide-in-from-top-2 duration-200">
          {/* VIX Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> VIX Threshold
              </label>
              <span className="text-[10px] font-mono font-bold text-blue-400">{localConfig.entryLogic.vixThreshold}</span>
            </div>
            <input 
              type="range" min="15" max="40" step="0.5"
              value={localConfig.entryLogic.vixThreshold}
              onChange={(e) => handleChange('entryLogic.vixThreshold', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* SMA Filter */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> SMA Filter
              </label>
              <span className="text-[10px] font-mono font-bold text-blue-400">{localConfig.entryLogic.primarySma}d</span>
            </div>
            <select 
              value={localConfig.entryLogic.primarySma}
              onChange={(e) => handleChange('entryLogic.primarySma', parseInt(e.target.value))}
              className="w-full bg-slate-800 border-slate-700 text-xs text-white rounded-lg p-2 focus:ring-blue-500"
            >
              <option value="20">20-day (Fast)</option>
              <option value="50">50-day (Medium)</option>
              <option value="200">200-day (Slow)</option>
            </select>
          </div>

          {/* Stop Loss */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" /> Stop Loss %
              </label>
              <span className="text-[10px] font-mono font-bold text-rose-400">{(localConfig.stopLossModule.currentOptimalSl * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" min="0.05" max="0.50" step="0.01"
              value={localConfig.stopLossModule.currentOptimalSl}
              onChange={(e) => handleChange('stopLossModule.currentOptimalSl', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          <button 
            onClick={handleSave}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-blue-900/20"
          >
            Save Configuration
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Strategy</span>
            <span className="text-slate-300 font-mono">{localConfig.entryLogic.primarySma}d SMA + VIX {localConfig.entryLogic.vixThreshold}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Risk</span>
            <span className="text-slate-300 font-mono">{localConfig.riskManagement.maxRiskPerTradePercent}% Per Trade</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Active Positions</span>
            <span className="text-blue-400 font-mono font-bold">{state.positions.length}</span>
          </div>
          
          <div className="pt-3 flex gap-2">
            <div className="flex -space-x-2 overflow-hidden">
              {state.positions.slice(0, 3).map((p: any) => (
                <div key={p.symbol} className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-black text-white">
                  {p.symbol.substring(0, 2)}
                </div>
              ))}
              {state.positions.length > 3 && (
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-black text-slate-400">
                  +{state.positions.length - 3}
                </div>
              )}
            </div>
            {state.positions.length === 0 && (
              <span className="text-[10px] text-slate-600 italic">No active positions</span>
            )}
          </div>
        </div>
      )}

      {showResult && backtestResults[config.id] && (
        <BacktestResultModal 
          result={backtestResults[config.id]} 
          onClose={() => setShowResult(false)} 
        />
      )}
    </Card>
  );
};
