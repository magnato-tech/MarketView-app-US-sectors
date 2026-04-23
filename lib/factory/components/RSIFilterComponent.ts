import { FactoryComponent, ComponentContext, toNumber } from './types';

export const RSIFilterComponent: FactoryComponent = {
  id: 'RSI_FILTER',
  compute(context: ComponentContext, params: Record<string, number | string | boolean>): number {
    const period = Math.max(2, Math.floor(toNumber(params.period, 14)));
    const overbought = toNumber(params.overbought, 70);
    const oversold = toNumber(params.oversold, 30);
    const mode = String(params.mode || 'TREND'); // 'TREND' eller 'MEAN_REVERSION'

    const prices = context.prices;
    if (prices.length < period + 1) return 0.5; // Nøytral

    // Beregn RSI
    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    if (losses === 0) return mode === 'TREND' ? 1.0 : -1.0;
    
    const rs = gains / losses;
    const rsi = 100 - (100 / (1 + rs));

    if (mode === 'TREND') {
      // I trend-modus: RSI > 50 er bra, RSI > 70 er veldig bra (momentum)
      if (rsi > overbought) return 1.0;
      if (rsi < oversold) return -1.0;
      return (rsi - 50) / 25; // Skalerer mellom -0.8 og 0.8
    } else {
      // I mean reversion-modus: RSI < 30 er kjøp, RSI > 70 er selg
      if (rsi < oversold) return 1.0;
      if (rsi > overbought) return -1.0;
      return (50 - rsi) / 25; // Invertert skala
    }
  },
};
