import { describe, expect, it } from 'vitest';
import { RotationMomentumComponent } from '../../lib/factory/components/RotationMomentum';
import { ComponentContext } from '../../lib/factory/components/types';

describe('RotationMomentumComponent', () => {
  const params = {
    lookbackPeriod: 3,
    rotationThresholdPct: 2.0,
    trailingStopLossPct: 5.0,
    universe: 'A,B,C'
  };

  it('returns 0 if universe is empty', () => {
    const context: ComponentContext = {
      prices: [],
      latestPrice: 0,
      allSymbolsData: {},
      state: {}
    };
    const score = RotationMomentumComponent.compute(context, { ...params, universe: '' });
    expect(score).toBe(0);
  });

  it('selects the leader with highest momentum', () => {
    const state = {};
    const context: ComponentContext = {
      prices: [100, 101, 102],
      latestPrice: 102,
      allSymbolsData: {
        'A': [100, 101, 105], // +5%
        'B': [100, 101, 110], // +10% (Leader)
        'C': [100, 101, 102]  // +2%
      },
      state
    };

    const score = RotationMomentumComponent.compute(context, params);
    expect(score).toBe(1.0);
    expect((state as any).currentSymbol).toBe('B');
  });

  it('switches only when threshold is met', () => {
    const state: any = { currentSymbol: 'A', highestPriceSinceEntry: 105 };
    const context: ComponentContext = {
      prices: [100, 101, 105],
      latestPrice: 105,
      allSymbolsData: {
        'A': [100, 101, 105], // +5%
        'B': [100, 101, 106], // +6% (Challenger, but only 1% better, threshold is 2%)
        'C': [100, 101, 102]
      },
      state
    };

    RotationMomentumComponent.compute(context, params);
    expect(state.currentSymbol).toBe('A'); // No switch

    // Now make B much better
    context.allSymbolsData!['B'] = [100, 101, 110]; // +10% (> 5% + 2%)
    RotationMomentumComponent.compute(context, params);
    expect(state.currentSymbol).toBe('B'); // Switch!
  });

  it('triggers trailing stop loss', () => {
    const state: any = { currentSymbol: 'A', highestPriceSinceEntry: 110 };
    const context: ComponentContext = {
      prices: [100, 110, 104], // 104 is > 5% drop from 110 (110 * 0.95 = 104.5)
      latestPrice: 104,
      allSymbolsData: {
        'A': [100, 110, 104],
        'B': [100, 101, 102],
        'C': [100, 101, 102]
      },
      state
    };

    const score = RotationMomentumComponent.compute(context, params);
    expect(score).toBe(0);
    expect(state.currentSymbol).toBe(null);
  });
});
