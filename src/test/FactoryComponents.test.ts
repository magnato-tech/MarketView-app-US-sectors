import { describe, expect, it } from 'vitest';
import { BaseBot } from '../../lib/factory/BaseBot';
import type { BotDNA } from '../../types/bot-dna';

describe('Factory components + BaseBot', () => {
  it('produces positive score when trend is up', () => {
    const dna: BotDNA = {
      id: 'test-trend-up',
      version: '1.0.0',
      generation: 1,
      status: 'Draft',
      components: [
        {
          type: 'signal',
          id: 'TREND_SMA',
          weight: 1,
          params: { fastPeriod: 5, slowPeriod: 20, intensity: 10 },
        },
      ],
    };

    const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 0.8);
    const score = new BaseBot(dna).processTick(prices);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('produces crisis score on sharp multi-day drop', () => {
    const dna: BotDNA = {
      id: 'test-crisis',
      version: '1.0.0',
      generation: 1,
      status: 'Draft',
      components: [
        {
          type: 'filter',
          id: 'CRISIS_DROP',
          weight: 1,
          params: { lookbackDays: 3, minDropPct: 3.5, intensity: 3 },
        },
      ],
    };

    const prices = [120, 118, 114, 109, 104, 101];
    const score = new BaseBot(dna).processTick(prices);
    expect(score).toBeGreaterThan(0);
  });
});
