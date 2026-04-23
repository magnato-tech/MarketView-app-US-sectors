import { FactoryComponent, ComponentContext, toNumber } from './types';

export const VixRiskManager: FactoryComponent = {
  id: 'VIX_RISK_MANAGER',
  compute(context: ComponentContext, params: Record<string, number | string | boolean>): number {
    const threshold = toNumber(params.threshold, 25);
    const exitMultiplier = toNumber(params.exitMultiplier, 1.5); // Hvor aggressivt vi skal gå ut
    
    // Vi trenger VIX-data fra context.allSymbolsData eller context.prices hvis det er VIX-boten
    const vixPrices = context.allSymbolsData?.['^VIX'];
    if (!vixPrices || vixPrices.length === 0) return 1.0; // Ingen data, ingen risiko detektert

    const currentVix = vixPrices[vixPrices.length - 1];
    
    if (currentVix >= threshold) {
      // Jo høyere over threshold, jo lavere score (ned mot 0 eller -1)
      const excess = (currentVix - threshold) / threshold;
      return Math.max(-1.0, 1.0 - (excess * exitMultiplier));
    }

    return 1.0; // Trygt
  },
};
