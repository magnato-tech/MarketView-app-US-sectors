import { TICKERS } from '../../constants';
import {
  BotDNA,
  CategoryFocusMode,
  TradingCategory,
  TradingUniverseConfig,
} from '../../types/bot-dna';

const CATEGORY_SET = new Set<TradingCategory>(['MAIN_SECTOR', 'ETF', 'STOCK']);
const FOCUS_SET = new Set<CategoryFocusMode>(['LOCKED_SINGLE', 'PREFER_SINGLE_ACTIVE']);

const normalizeAllowedCategories = (categories: TradingCategory[]): TradingCategory[] =>
  Array.from(new Set(categories));

const classifyFromTickerCatalog = (symbol: string): TradingCategory | null => {
  const ticker = TICKERS.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase());
  if (!ticker) return null;
  if (ticker.category === 'Sector') return 'MAIN_SECTOR';
  if (ticker.category === 'ETF') return 'ETF';
  return 'STOCK';
};

export const classifySymbolCategory = (symbol: string): TradingCategory =>
  classifyFromTickerCatalog(symbol) ?? 'STOCK';

export const getEffectiveTradingUniverse = (bot: BotDNA): TradingUniverseConfig => {
  if (!bot.tradingUniverse) {
    // Backward-compatible default: allow all existing bots to run.
    return { allowedCategories: ['MAIN_SECTOR', 'ETF', 'STOCK'], focusMode: 'PREFER_SINGLE_ACTIVE' };
  }
  return {
    allowedCategories: normalizeAllowedCategories(bot.tradingUniverse.allowedCategories),
    focusMode: bot.tradingUniverse.focusMode,
    preferredCategory: bot.tradingUniverse.preferredCategory,
  };
};

export const validateTradingUniverseConfig = (config: TradingUniverseConfig): string[] => {
  const errors: string[] = [];
  const allowed = normalizeAllowedCategories(config.allowedCategories ?? []);

  if (!FOCUS_SET.has(config.focusMode)) {
    errors.push(`Invalid focusMode: ${String(config.focusMode)}`);
  }

  if (allowed.length === 0) {
    errors.push('allowedCategories must include at least one category.');
  }
  if (allowed.length > 2) {
    errors.push('allowedCategories may contain maximum two categories.');
  }
  if (allowed.length === 3) {
    errors.push('Bots are not allowed to trade all three categories simultaneously.');
  }

  for (const category of allowed) {
    if (!CATEGORY_SET.has(category)) {
      errors.push(`Invalid trading category: ${category}`);
    }
  }

  if (config.focusMode === 'LOCKED_SINGLE' && allowed.length !== 1) {
    errors.push('LOCKED_SINGLE requires exactly one allowed category.');
  }

  if (config.preferredCategory && !allowed.includes(config.preferredCategory)) {
    errors.push('preferredCategory must be included in allowedCategories.');
  }

  return errors;
};

export const assertValidBotUniverse = (bot: BotDNA): void => {
  if (!bot.tradingUniverse) return;
  const errors = validateTradingUniverseConfig(getEffectiveTradingUniverse(bot));
  if (errors.length > 0) {
    throw new Error(`Invalid tradingUniverse for bot ${bot.id}: ${errors.join(' ')}`);
  }
};

export const assertSymbolAllowedForBot = (bot: BotDNA, symbol: string): void => {
  const universe = getEffectiveTradingUniverse(bot);
  const symbolCategory = classifySymbolCategory(symbol);
  if (!universe.allowedCategories.includes(symbolCategory)) {
    throw new Error(
      `Hard block: bot ${bot.id} is not allowed to trade ${symbol} (${symbolCategory}). Allowed categories: ${universe.allowedCategories.join(', ')}.`
    );
  }
};
