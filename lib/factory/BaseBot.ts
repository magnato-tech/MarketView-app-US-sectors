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

  constructor(dna: BotDNA) {
    this.dna = dna;
    this.components = Array.isArray(dna.components) ? dna.components : [];
  }

  getDNA(): BotDNA {
    return this.dna;
  }

  processTick(priceData: any): number {
    const prices = extractPriceSeries(priceData);
    if (prices.length === 0 || this.components.length === 0) {
      return 0;
    }

    const latestPrice = prices[prices.length - 1];
    let weightedScoreSum = 0;
    let totalWeight = 0;

    for (const componentConfig of this.components) {
      const component = getFactoryComponent(componentConfig.id);
      if (!component) continue;

      const weight = clampWeight(componentConfig.weight);
      if (weight === 0) continue;

      const score = clampScore(
        component.compute(
          { prices, latestPrice },
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
