import React from 'react';
import { Card } from '../ui/Card';
import { Wallet, TrendingUp, BarChart3, Zap } from 'lucide-react';

interface PortfolioStatsProps {
  totalValue: number;
  availableCapital: number;
  totalAllocatedToBots: number;
  totalReturn: number;
  isPositive: boolean;
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({
  totalValue,
  availableCapital,
  totalAllocatedToBots,
  totalReturn,
  isPositive
}) => {
  const denom = totalValue > 0 ? totalValue : 1;
  const availablePct = (availableCapital / denom) * 100;
  const allocatedPct = (totalAllocatedToBots / denom) * 100;
  const botExposurePct = totalValue > 0 ? (totalAllocatedToBots / totalValue) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-5 border-slate-800/40 bg-slate-900/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Wallet className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Verdi</span>
        </div>
        <p className="text-2xl font-mono font-black text-white">NOK {totalValue.toLocaleString()}</p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{totalReturn.toFixed(2)}%
          </span>
          <span className="text-[10px] text-slate-600 uppercase font-bold tracking-tighter">Siden start</span>
        </div>
      </Card>

      <Card className="p-5 border-slate-800/40 bg-slate-900/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tilgjengelig</span>
        </div>
        <p className="text-2xl font-mono font-black text-white">NOK {availableCapital.toLocaleString()}</p>
        <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500" 
            style={{ width: `${Math.min(100, Math.max(0, availablePct))}%` }}
          />
        </div>
      </Card>

      <Card className="p-5 border-slate-800/40 bg-slate-900/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Allokert til Botter</span>
        </div>
        <p className="text-2xl font-mono font-black text-white">NOK {totalAllocatedToBots.toLocaleString()}</p>
        <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-500" 
            style={{ width: `${Math.min(100, Math.max(0, allocatedPct))}%` }}
          />
        </div>
      </Card>

      <Card className="p-5 border-slate-800/40 bg-slate-900/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bot Eksponering</span>
        </div>
        <p className="text-2xl font-mono font-black text-white">
          {botExposurePct.toFixed(1)}%
        </p>
        <p className="mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-tighter italic">
          Andel av total kapital i markedet
        </p>
      </Card>
    </div>
  );
};
