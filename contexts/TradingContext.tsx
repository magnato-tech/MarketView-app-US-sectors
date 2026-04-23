import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BotConfig, BotState, Trade } from '../types';
import { DEFAULT_BOT_CONFIGS } from '../services/quantEngineService';
import { BacktestResult, runBacktest as executeBacktest } from '../services/backtestService';
import { Position, TradeSource, TradeType, Transaction } from '../types/trading';
import { BotDNA } from '../types/bot-dna';
import { INITIAL_CASH } from '../constants/trading';

interface TradingContextType {
  cash: number;
  positions: Position[];
  history: Transaction[];
  isAutoPilot: boolean;
  setIsAutoPilot: (val: boolean) => void;
  buy: (symbol: string, price: number, quantity: number, source?: TradeSource, reason?: string) => boolean;
  sell: (symbol: string, price: number, quantity: number, source?: TradeSource, reason?: string) => boolean;
  resetPortfolio: () => void;
  // Bot Arena støtte
  botConfigs: BotConfig[];
  botStates: BotState[];
  updateBotConfig: (config: BotConfig) => void;
  addBot: (config: BotConfig) => void;
  runBacktest: (config: BotConfig, symbols: string[], period?: '1y' | '2y' | '5y') => Promise<BacktestResult>;
  backtestResults: Record<string, BacktestResult>;
  publishedBots: BotDNA[];
  deployments: Deployment[];
  weeklyPulse: Record<string, WeeklyPulseSnapshot>;
  refreshPublishedBots: () => Promise<void>;
  refreshDeployments: () => Promise<void>;
  deployPublishedBot: (botId: string, allocatedCapitalNok: number, interval?: '1d' | '1wk' | '1mo') => Promise<void>;
  updateDeploymentStatus: (deploymentId: string, status: Deployment['status']) => Promise<void>;
  rebalanceDeployment: (deploymentId: string, allocatedCapitalNok: number) => Promise<void>;
  portfolioEquityCurve: { timestamp: string; botValue: number; benchmarkValue: number }[];
  resetAll: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const STORAGE_KEY = 'marketview.trading';
const BOT_STORAGE_KEY = 'marketview.bots';
const WEEKLY_PULSE_STORAGE_KEY = 'marketview.weeklyPulse';

export const TradingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cash, setCash] = useState(INITIAL_CASH);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [isAutoPilot, setIsAutoPilot] = useState(false);

  // Bot Arena state
  const [botConfigs, setBotConfigs] = useState<BotConfig[]>(DEFAULT_BOT_CONFIGS);
  const [backtestResults, setBacktestResults] = useState<Record<string, BacktestResult>>({});
  const [publishedBots, setPublishedBots] = useState<BotDNA[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [portfolioEquityCurve, setPortfolioEquityCurve] = useState<{ timestamp: string; botValue: number; benchmarkValue: number }[]>([]);
  const [weeklyPulse, setWeeklyPulse] = useState<Record<string, WeeklyPulseSnapshot>>({});
  const [botStates, setBotStates] = useState<BotState[]>(() => 
    DEFAULT_BOT_CONFIGS.map(config => ({
      botId: config.id,
      balance: INITIAL_CASH,
      positions: [],
      history: [],
      performance: { totalReturn: 0, dailyReturns: [], sharpeRatio: 0, maxDrawdown: 0 }
    }))
  );

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCash(parsed.cash ?? INITIAL_CASH);
        setPositions(parsed.positions ?? []);
        setHistory(parsed.history ?? []);
        setIsAutoPilot(parsed.isAutoPilot ?? false);
      } catch (e) {
        console.error('Failed to load trading state', e);
      }
    }

    const savedBots = localStorage.getItem(BOT_STORAGE_KEY);
    if (savedBots) {
      try {
        const parsed = JSON.parse(savedBots);
        if (parsed.configs) {
          // Merge default configs with saved ones to ensure new defaults are present
          const mergedConfigs = [...DEFAULT_BOT_CONFIGS];
          parsed.configs.forEach((savedConfig: BotConfig) => {
            const index = mergedConfigs.findIndex(c => c.id === savedConfig.id);
            if (index !== -1) {
              mergedConfigs[index] = savedConfig;
            } else {
              mergedConfigs.push(savedConfig);
            }
          });
          setBotConfigs(mergedConfigs);
        }
        if (parsed.states) setBotStates(parsed.states);
      } catch (e) {
        console.error('Failed to load bot state', e);
      }
    }
  }, []);

  useEffect(() => {
    const savedPulse = localStorage.getItem(WEEKLY_PULSE_STORAGE_KEY);
    if (!savedPulse) return;
    try {
      const parsed = JSON.parse(savedPulse) as Record<string, WeeklyPulseSnapshot>;
      setWeeklyPulse(parsed);
    } catch {
      // Ignore malformed stored pulse data.
    }
  }, []);

  const refreshPublishedBots = useCallback(async () => {
    try {
      const response = await fetch('/api/factory/published');
      const payload = (await response.json().catch(() => ({}))) as { bots?: BotDNA[] };
      if (!response.ok) return;
      setPublishedBots(payload.bots ?? []);
    } catch {
      // Best effort for UI.
    }
  }, []);

  const refreshDeployments = useCallback(async () => {
    try {
      const response = await fetch('/api/factory/deployments');
      const payload = (await response.json().catch(() => ({}))) as { deployments?: Deployment[] };
      if (!response.ok) return;
      setDeployments(payload.deployments ?? []);
    } catch {
      // Best effort for UI.
    }
  }, []);

  useEffect(() => {
    void refreshPublishedBots();
    void refreshDeployments();
  }, [refreshPublishedBots, refreshDeployments]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cash, positions, history, isAutoPilot }));
  }, [cash, positions, history, isAutoPilot]);

  useEffect(() => {
    localStorage.setItem(BOT_STORAGE_KEY, JSON.stringify({ configs: botConfigs, states: botStates }));
  }, [botConfigs, botStates]);

  useEffect(() => {
    localStorage.setItem(WEEKLY_PULSE_STORAGE_KEY, JSON.stringify(weeklyPulse));
  }, [weeklyPulse]);

  useEffect(() => {
    const activeDeployments = deployments.filter(d => d.status === 'Active');
    
    // Fallback: Hvis ingen botter er aktive, vis en rett linje på 1 mill
    const showInitialLine = () => {
      setPortfolioEquityCurve([
        { timestamp: 'START', botValue: INITIAL_CASH, benchmarkValue: INITIAL_CASH },
        { timestamp: 'I DAG', botValue: INITIAL_CASH, benchmarkValue: INITIAL_CASH }
      ]);
    };

    if (activeDeployments.length === 0) {
      showInitialLine();
      return;
    }

    // Finn alle unike tidsstempler på tvers av alle aktive botter
    const allTimestamps = new Set<string>();
    activeDeployments.forEach(d => {
      // VIKTIG: Bruk KUN liveEquityCurve for den totale formueutviklingen.
      const curve = d.liveEquityCurve;
      if (curve && curve.length > 0) {
        curve.forEach(p => allTimestamps.add(p.timestamp));
      }
    });

    if (allTimestamps.size === 0) {
      showInitialLine();
      return;
    }

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
    
    const combinedCurve = sortedTimestamps.map(ts => {
      let activeBotsValue = 0;
      let totalBenchmarkValue = 0;
      let activeCount = 0;

      activeDeployments.forEach(d => {
        const curve = d.liveEquityCurve;
        const point = curve?.find(p => p.timestamp === ts);
        if (point) {
          activeBotsValue += (point.botValue || 0);
          totalBenchmarkValue += (point.benchmarkValue || 0);
          activeCount++;
        }
      });

      return {
        timestamp: ts,
        botValue: cash + activeBotsValue,
        benchmarkValue: activeCount > 0 ? totalBenchmarkValue / activeCount : INITIAL_CASH
      };
    });

    setPortfolioEquityCurve(combinedCurve);
  }, [deployments, cash]);

  useEffect(() => {
    if (deployments.length === 0) return;
    const now = new Date();
    setWeeklyPulse((prev) => {
      const next = { ...prev };
      for (const deployment of deployments) {
        const curve = deployment.equityCurve ?? [];
        if (curve.length < 8) continue;

        const existing = next[deployment.id];
        const existingAt = existing ? Date.parse(existing.createdAt) : 0;
        const daysSince = existing ? (now.getTime() - existingAt) / (1000 * 60 * 60 * 24) : Infinity;
        if (daysSince < 7) continue;

        const weekEndPoint = curve[curve.length - 1];
        const weekStartPoint = curve[Math.max(0, curve.length - 8)];
        const weeklyReturnPct = ((weekEndPoint.botValue - weekStartPoint.botValue) / Math.max(weekStartPoint.botValue, 1)) * 100;
        const benchmarkWeeklyReturnPct =
          ((weekEndPoint.benchmarkValue - weekStartPoint.benchmarkValue) / Math.max(weekStartPoint.benchmarkValue, 1)) * 100;
        const relativeWeeklyDeltaPct = weeklyReturnPct - benchmarkWeeklyReturnPct;

        const txInWindow = (deployment.transactions ?? []).filter((tx) => {
          const ts = Date.parse(tx.timestamp);
          return Number.isFinite(ts) && ts >= Date.parse(weekStartPoint.timestamp);
        });
        const weeklyFeesPaidNok = txInWindow.reduce((sum, tx) => sum + tx.feeNok, 0);

        const narrative =
          relativeWeeklyDeltaPct >= 0
            ? `Denne uken slo botten benchmark med ${relativeWeeklyDeltaPct.toFixed(2)}%. Gebyrer: ${weeklyFeesPaidNok} NOK.`
            : `Denne uken underperformet botten benchmark med ${Math.abs(relativeWeeklyDeltaPct).toFixed(2)}%. Gebyrer: ${weeklyFeesPaidNok} NOK.`;

        next[deployment.id] = {
          deploymentId: deployment.id,
          weekStart: weekStartPoint.timestamp,
          weekEnd: weekEndPoint.timestamp,
          weeklyReturnPct,
          benchmarkWeeklyReturnPct,
          relativeWeeklyDeltaPct,
          weeklyFeesPaidNok,
          narrative,
          createdAt: now.toISOString(),
        };
      }
      return next;
    });
  }, [deployments]);

  const buy = useCallback((symbol: string, price: number, quantity: number, source: TradeSource = 'MANUAL', reason?: string) => {
    const totalCost = price * quantity;
    if (cash < totalCost) return false;

    setCash(prev => prev - totalCost);
    setPositions(prev => {
      const existing = prev.find(p => p.symbol === symbol);
      if (existing) {
        const newQty = existing.quantity + quantity;
        const newAvg = (existing.averagePrice * existing.quantity + totalCost) / newQty;
        return prev.map(p => p.symbol === symbol ? { ...p, quantity: newQty, averagePrice: newAvg } : p);
      }
      return [...prev, { symbol, quantity, averagePrice: price }];
    });

    const transaction: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      symbol,
      type: 'BUY',
      price,
      quantity,
      source,
      reason
    };
    setHistory(prev => [transaction, ...prev]);
    return true;
  }, [cash]);

  const sell = useCallback((symbol: string, price: number, quantity: number, source: TradeSource = 'MANUAL', reason?: string) => {
    const existing = positions.find(p => p.symbol === symbol);
    if (!existing || existing.quantity < quantity) return false;

    const totalCredit = price * quantity;
    setCash(prev => prev + totalCredit);
    setPositions(prev => {
      const updated = prev.map(p => {
        if (p.symbol === symbol) {
          return { ...p, quantity: p.quantity - quantity };
        }
        return p;
      }).filter(p => p.quantity > 0);
      return updated;
    });

    const transaction: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      symbol,
      type: 'SELL',
      price,
      quantity,
      source,
      reason
    };
    setHistory(prev => [transaction, ...prev]);
    return true;
  }, [positions]);

  const resetPortfolio = useCallback(() => {
    setCash(INITIAL_CASH);
    setPositions([]);
    setHistory([]);
  }, []);

  const updateBotConfig = (config: BotConfig) => {
    setBotConfigs(prev => prev.map(c => c.id === config.id ? config : c));
  };

  const addBot = (config: BotConfig) => {
    setBotConfigs(prev => [...prev, config]);
    setBotStates(prev => [...prev, {
      botId: config.id,
      balance: INITIAL_CASH,
      positions: [],
      history: [],
      performance: { totalReturn: 0, dailyReturns: [], sharpeRatio: 0, maxDrawdown: 0 }
    }]);
  };

  const runBacktest = async (config: BotConfig, symbols: string[], period: '1y' | '2y' | '5y' = '1y') => {
    const result = await executeBacktest(config, symbols, period);
    setBacktestResults(prev => ({ ...prev, [config.id]: result }));
    return result;
  };

  const deployPublishedBot = useCallback(async (botId: string, allocatedCapitalNok: number, interval?: '1d' | '1wk' | '1mo', allocatedPct?: number) => {
    const response = await fetch('/api/factory/deployments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId, allocatedCapitalNok, interval, allocatedPct }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || `Deploy failed with HTTP ${response.status}`);
    }
    await refreshDeployments();
  }, [refreshDeployments]);

  const updateDeploymentStatus = useCallback(async (deploymentId: string, status: Deployment['status']) => {
    const response = await fetch('/api/factory/deployments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deploymentId, status }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || `Update deployment failed with HTTP ${response.status}`);
    }
    await refreshDeployments();
  }, [refreshDeployments]);

  const toggleDeploymentLock = useCallback(async (deploymentId: string, isLocked: boolean) => {
    const response = await fetch('/api/factory/deployments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deploymentId, isLocked }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || `Toggle lock failed with HTTP ${response.status}`);
    }
    await refreshDeployments();
  }, [refreshDeployments]);

  const rebalanceDeployment = useCallback(async (deploymentId: string, allocatedCapitalNok: number) => {
    const response = await fetch('/api/factory/deployments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deploymentId, allocatedCapitalNok }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || `Rebalance failed with HTTP ${response.status}`);
    }
    await refreshDeployments();
  }, [refreshDeployments]);

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BOT_STORAGE_KEY);
    localStorage.removeItem(WEEKLY_PULSE_STORAGE_KEY);
    setCash(INITIAL_CASH);
    setPositions([]);
    setHistory([]);
    setBotStates(botConfigs.map(config => ({
      botId: config.id,
      balance: INITIAL_CASH,
      positions: [],
      history: [],
      performance: { totalReturn: 0, dailyReturns: [], sharpeRatio: 0, maxDrawdown: 0 }
    })));
    window.location.reload(); // Tving reload for å tømme alt minne
  };

  return (
    <TradingContext.Provider value={{
      cash,
      positions,
      history,
      isAutoPilot,
      setIsAutoPilot,
      buy,
      sell,
      resetPortfolio,
      botConfigs,
      botStates,
      updateBotConfig,
      addBot,
      runBacktest,
      backtestResults,
      publishedBots,
      deployments,
      weeklyPulse,
      refreshPublishedBots,
      refreshDeployments,
      deployPublishedBot,
      updateDeploymentStatus,
      rebalanceDeployment,
      toggleDeploymentLock,
      portfolioEquityCurve,
      resetAll
    }}>
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within a TradingProvider');
  return ctx;
};
