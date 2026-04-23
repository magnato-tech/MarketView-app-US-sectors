import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BotConfig, BotState, Trade } from '../types';
import { DEFAULT_BOT_CONFIGS } from '../services/quantEngineService';
import { BacktestResult, runBacktest as executeBacktest } from '../services/backtestService';
import { Position, TradeSource, TradeType, Transaction } from '../types/trading';
import { BotDNA } from '../types/bot-dna';
import { Deployment } from '../types/simulation';

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
  refreshPublishedBots: () => Promise<void>;
  refreshDeployments: () => Promise<void>;
  deployPublishedBot: (botId: string, allocatedCapitalNok: number) => Promise<void>;
  resetAll: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const STORAGE_KEY = 'marketview.trading';
const BOT_STORAGE_KEY = 'marketview.bots';
const INITIAL_CASH = 100000;

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

  const deployPublishedBot = useCallback(async (botId: string, allocatedCapitalNok: number) => {
    const response = await fetch('/api/factory/deployments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId, allocatedCapitalNok }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || `Deploy failed with HTTP ${response.status}`);
    }
    await refreshDeployments();
  }, [refreshDeployments]);

  const resetAll = () => {
    resetPortfolio();
    setBotStates(botConfigs.map(config => ({
      botId: config.id,
      balance: INITIAL_CASH,
      positions: [],
      history: [],
      performance: { totalReturn: 0, dailyReturns: [], sharpeRatio: 0, maxDrawdown: 0 }
    })));
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
      refreshPublishedBots,
      refreshDeployments,
      deployPublishedBot,
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
