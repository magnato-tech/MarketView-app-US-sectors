import { describe, expect, it } from 'vitest';
import { RuleEngine, type RuleDefinition } from '../../lib/factory/RuleEngine';
import type { BotDNA } from '../../types/bot-dna';

describe('RuleEngine', () => {
  it('blocks STRICT mutations and accepts CHALLENGEABLE ones', () => {
    const bot: BotDNA = {
      id: 'seed',
      version: '1.0.0',
      generation: 0,
      status: 'Draft',
      components: [
        {
          type: 'signal',
          id: 'TREND_SMA',
          weight: 0.6,
          params: { fastPeriod: 20, slowPeriod: 60 },
        },
      ],
    };

    const rules: RuleDefinition[] = [
      {
        id: 'strict-slow',
        logic_gate: 'STRICT',
        componentId: 'TREND_SMA',
        paramKey: 'slowPeriod',
        baselineValue: 60,
        min: 30,
        max: 120,
      },
      {
        id: 'challenge-fast',
        logic_gate: 'CHALLENGEABLE',
        componentId: 'TREND_SMA',
        paramKey: 'fastPeriod',
        baselineValue: 20,
        min: 10,
        max: 40,
      },
    ];

    const engine = new RuleEngine();
    engine.setRules(rules);

    const result = engine.generateAlphaZeroChallengeBots(bot, [
      { componentId: 'TREND_SMA', paramKey: 'slowPeriod', value: 80 },
      { componentId: 'TREND_SMA', paramKey: 'fastPeriod', value: 24 },
    ]);

    expect(result.rejectedChanges).toHaveLength(1);
    expect(result.appliedChanges).toHaveLength(1);
    const trend = result.challengerBot.components.find((c) => c.id === 'TREND_SMA');
    expect(trend?.params.fastPeriod).toBe(24);
    expect(trend?.params.slowPeriod).toBe(60);
  });

  it('rejects bot DNA that allows all three trading categories', () => {
    const bot: BotDNA = {
      id: 'invalid-universe',
      version: '1.0.0',
      generation: 0,
      status: 'Draft',
      tradingUniverse: {
        allowedCategories: ['MAIN_SECTOR', 'ETF', 'STOCK'],
        focusMode: 'PREFER_SINGLE_ACTIVE',
      },
      components: [],
    };

    const engine = new RuleEngine();
    engine.setRules([]);

    expect(() => engine.generateAlphaZeroChallengeBots(bot, [])).toThrow(
      /max two trading categories|Invalid tradingUniverse/
    );
  });
});
