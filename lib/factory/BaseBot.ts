import { BotDNA, BotDNAComponent } from '../../types/bot-dna';
import { getFactoryComponent } from './components/registry';
import { clampScore, extractPriceSeries } from './components/types';

const clampWeight = (weight: number): number => {
  if (!Number.isFinite(weight)) return 0;
  return Math.max(0, Math.min(1, weight));
};

export class BaseBot {
  private readonly dna: BotDNA;
  private readonly components: BotDNAComponent[];
  private readonly componentStates: Record<string, Record<string, any>> = {};

  constructor(dna: BotDNA) {
    this.dna = dna;
    this.components = Array.isArray(dna.components) ? dna.components : [];
  }

  getDNA(): BotDNA {
    return this.dna;
  }

  getComponentState(stateKey: string): Record<string, any> | null {
    return this.componentStates[stateKey] || null;
  }

  processTick(priceData: any, allSymbolsData?: Record<string, number[]>): number {
    const prices = extractPriceSeries(priceData);
    if (prices.length === 0 && !allSymbolsData) {
      return 0;
    }

    const latestPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
    let weightedScoreSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < this.components.length; i++) {
      const componentConfig = this.components[i];
      const component = getFactoryComponent(componentConfig.id);
      if (!component) continue;

      const weight = clampWeight(componentConfig.weight);
      if (weight === 0) continue;

      // Initialize state for this specific component instance if needed
      const stateKey = `${componentConfig.id}-${i}`;
      if (!this.componentStates[stateKey]) {
        this.componentStates[stateKey] = {};
      }

      const score = clampScore(
        component.compute(
          { 
            prices, 
            latestPrice, 
            allSymbolsData,
            state: this.componentStates[stateKey]
          },
          componentConfig.params ?? {}
        )
      );

      weightedScoreSum += score * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) return 0;
    return clampScore(weightedScoreSum / totalWeight);
  }
}
