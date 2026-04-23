import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TradingProvider, useTrading } from '../../contexts/TradingContext';
import { INITIAL_CASH } from '../../constants/trading';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('TradingContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TradingProvider>{children}</TradingProvider>
  );

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTrading(), { wrapper });
    expect(result.current.cash).toBe(INITIAL_CASH);
    expect(result.current.positions).toEqual([]);
    expect(result.current.botConfigs.length).toBeGreaterThan(0);
  });

  it('should handle buying assets', () => {
    const { result } = renderHook(() => useTrading(), { wrapper });
    
    act(() => {
      const success = result.current.buy('AAPL', 150, 10);
      expect(success).toBe(true);
    });

    expect(result.current.cash).toBe(INITIAL_CASH - (150 * 10));
    expect(result.current.positions.length).toBe(1);
    expect(result.current.positions[0]).toEqual({
      symbol: 'AAPL',
      quantity: 10,
      averagePrice: 150
    });
    expect(result.current.history.length).toBe(1);
    expect(result.current.history[0].type).toBe('BUY');
  });

  it('should handle selling assets', () => {
    const { result } = renderHook(() => useTrading(), { wrapper });
    
    act(() => {
      result.current.buy('AAPL', 100, 10);
    });

    act(() => {
      const success = result.current.sell('AAPL', 120, 5);
      expect(success).toBe(true);
    });

    expect(result.current.cash).toBe(INITIAL_CASH - (100 * 10) + (120 * 5));
    expect(result.current.positions[0].quantity).toBe(5);
    expect(result.current.history.length).toBe(2);
    expect(result.current.history[0].type).toBe('SELL');
  });

  it('should prevent buying without enough cash', () => {
    const { result } = renderHook(() => useTrading(), { wrapper });
    
    act(() => {
      const success = result.current.buy('GOOGL', INITIAL_CASH * 2, 1);
      expect(success).toBe(false);
    });

    expect(result.current.cash).toBe(INITIAL_CASH);
    expect(result.current.positions.length).toBe(0);
  });

  it('should reset all state', () => {
    const { result } = renderHook(() => useTrading(), { wrapper });
    
    act(() => {
      result.current.buy('AAPL', 100, 10);
      result.current.resetAll();
    });

    expect(result.current.cash).toBe(INITIAL_CASH);
    expect(result.current.positions.length).toBe(0);
    expect(result.current.history.length).toBe(0);
  });
});
