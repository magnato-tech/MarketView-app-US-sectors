import { clampScore, ComponentContext, FactoryComponent, toNumber } from './types';

export const RotationMomentumComponent: FactoryComponent = {
  id: 'ROTATION_MOMENTUM',
  compute(context: ComponentContext, params: Record<string, number | string | boolean>): number {
    const lookbackPeriod = Math.max(2, Math.floor(toNumber(params.lookbackPeriod, 20)));
    const rotationThresholdPct = toNumber(params.rotationThresholdPct, 3.0);
    const trailingStopLossPct = toNumber(params.trailingStopLossPct, 5.0);
    const universeStr = String(params.universe || '');
    const universe = universeStr.split(',').map(s => s.trim()).filter(Boolean);

    if (universe.length === 0 || !context.allSymbolsData) return 0;

    // Initialize state if not present
    if (!context.state) {
      // This should ideally be handled by BaseBot, but we guard here
      return 0; 
    }

    const state = context.state;
    // state.currentSymbol: string | null
    // state.highestPriceSinceEntry: number

    // 1. Calculate momentum for all symbols in universe
    const momentumMap: Record<string, number> = {};
    for (const symbol of universe) {
      const prices = context.allSymbolsData[symbol];
      if (!prices || prices.length < lookbackPeriod) continue;

      const currentPrice = prices[prices.length - 1];
      const oldPrice = prices[prices.length - lookbackPeriod];
      
      // FIX: Ensure we have valid prices and handle zero/negative
      if (oldPrice <= 0 || currentPrice <= 0) continue;

      const returnPct = ((currentPrice - oldPrice) / oldPrice) * 100;
      momentumMap[symbol] = returnPct;
    }

    const availableSymbols = Object.keys(momentumMap);
    if (availableSymbols.length === 0) return 0;

    // Find the leader
    let leaderSymbol = availableSymbols[0];
    let leaderMomentum = momentumMap[leaderSymbol];

    for (const sym of availableSymbols) {
      if (momentumMap[sym] > leaderMomentum) {
        leaderSymbol = sym;
        leaderMomentum = momentumMap[sym];
      }
    }

    const currentSymbol = state.currentSymbol as string | null;
    const currentPrice = currentSymbol ? (context.allSymbolsData[currentSymbol]?.slice(-1)[0] || 0) : 0;

    // 2. Check Trailing Stop Loss
    if (currentSymbol && currentPrice > 0) {
      state.highestPriceSinceEntry = Math.max(state.highestPriceSinceEntry || 0, currentPrice);
      const dropFromPeak = ((state.highestPriceSinceEntry - currentPrice) / state.highestPriceSinceEntry) * 100;
      
      if (dropFromPeak >= trailingStopLossPct) {
        // Exit due to stop loss
        state.currentSymbol = null;
        state.highestPriceSinceEntry = 0;
        return 0; 
      }
    }

    // 3. Rotation Logic
    if (!currentSymbol) {
      // Entry: Only if leader has positive momentum
      if (leaderMomentum > 0) {
        state.currentSymbol = leaderSymbol;
        state.highestPriceSinceEntry = context.allSymbolsData[leaderSymbol]?.slice(-1)[0] || 0;
        return 1.0;
      }
    } else {
      // Already in a position
      if (currentSymbol === leaderSymbol) {
        return 1.0;
      }

      // Check if challenger is significantly better (threshold)
      const currentMomentum = momentumMap[currentSymbol] ?? -999;
      if (leaderMomentum > currentMomentum + rotationThresholdPct) {
        // Switch!
        state.currentSymbol = leaderSymbol;
        state.highestPriceSinceEntry = context.allSymbolsData[leaderSymbol]?.slice(-1)[0] || 0;
        
        // Log the switch for debugging/UI
        if (state.switches) {
          state.switches.push({
            from: currentSymbol,
            to: leaderSymbol,
            at: context.prices.length
          });
        } else {
          state.switches = [{ from: currentSymbol, to: leaderSymbol, at: context.prices.length }];
        }

        return 1.0;
      }

      return 1.0; // Stay in current
    }

    return 0;
  },
};
