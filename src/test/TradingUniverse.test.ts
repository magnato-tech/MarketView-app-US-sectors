import { describe, expect, it } from 'vitest';
import {
  assertSymbolAllowedForBot,
  classifySymbolCategory,
  validateTradingUniverseConfig,
} from '../../lib/factory/tradingUniverse';
import type { BotDNA } from '../../types/bot-dna';

describe('Trading universe constraints', () => {
  it('classifies symbols into MAIN_SECTOR / ETF / STOCK', () => {
    expect(classifySymbolCategory('XLK')).toBe('MAIN_SECTOR');
    expect(classifySymbolCategory('SOXX')).toBe('ETF');
    expect(classifySymbolCategory('AAPL')).toBe('STOCK');
  });

  it('rejects configs that include all three categories', () => {
    const errors = validateTradingUniverseConfig({
      allowedCategories: ['MAIN_SECTOR', 'ETF', 'STOCK'],
      focusMode: 'PREFER_SINGLE_ACTIVE',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('hard-blocks symbols outside allowed categories', () => {
    const bot: BotDNA = {
      id: 'bot-main-sector-only',
      version: '1.0.0',
      generation: 0,
      status: 'Draft',
      tradingUniverse: {
        allowedCategories: ['MAIN_SECTOR'],
        focusMode: 'LOCKED_SINGLE',
        preferredCategory: 'MAIN_SECTOR',
      },
      components: [],
    };

    expect(() => assertSymbolAllowedForBot(bot, 'XLK')).not.toThrow();
    expect(() => assertSymbolAllowedForBot(bot, 'SOXX')).toThrow(/Hard block/);
    expect(() => assertSymbolAllowedForBot(bot, 'AAPL')).toThrow(/Hard block/);
  });
});
