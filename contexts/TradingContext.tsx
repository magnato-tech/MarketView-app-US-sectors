import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type TradeType = 'BUY' | 'SELL';
export type TradeSource = 'MANUAL' | 'AI';

export interface AISignal {
  symbol: string;
  type: TradeType;
  quantity: number;
  reason: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
}

export interface Transaction {
  id: string;
  timestamp: number;
  symbol: string;
  type: TradeType;
  price: number;
  quantity: number;
  source: TradeSource;
  reason?: string;
}

interface TradingContextType {
  cash: number;
  positions: Position[];
  history: Transaction[];
  isAutoPilot: boolean;
  setIsAutoPilot: (val: boolean) => void;
  buy: (symbol: string, price: number, quantity: number, source?: TradeSource, reason?: string) => boolean;
  sell: (symbol: string, price: number, quantity: number, source?: TradeSource, reason?: string) => boolean;
  resetPortfolio: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const STORAGE_KEY = 'marketview.trading';
const INITIAL_CASH = 100000;

export const TradingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cash, setCash] = useState(INITIAL_CASH);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [isAutoPilot, setIsAutoPilot] = useState(false);

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
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cash, positions, history, isAutoPilot }));
  }, [cash, positions, history, isAutoPilot]);

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

  return (
    <TradingContext.Provider value={{
      cash,
      positions,
      history,
      isAutoPilot,
      setIsAutoPilot,
      buy,
      sell,
      resetPortfolio
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
