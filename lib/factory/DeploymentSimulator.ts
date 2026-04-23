import { BaseBot } from './BaseBot';
import { BotDNA } from '../../types/bot-dna';
import {
  DeploymentEquityPoint,
  DeploymentPerformance,
  DeploymentTransaction,
} from '../../types/simulation';
import { fetchMarketData } from '../../services/marketDataService';
import { calculateMaxDrawdown } from '../../services/analysisService';

import { TRANSACTION_FEE } from '../../constants/trading';

export interface DeploymentSimulationResult {
  performance: DeploymentPerformance;
  equityCurve: DeploymentEquityPoint[];
  transactions: DeploymentTransaction[];
}

export const simulateDeployment = async (
  bot: BotDNA,
  allocatedCapitalNok: number,
  symbol = 'SPY',
  benchmarkSymbol = '^GSPC'
): Promise<DeploymentSimulationResult> => {
  const initialCapital = Math.max(allocatedCapitalNok, 1);
  
  // Prepare multi-symbol data if needed (e.g. for RotationMomentum)
  const rotationComponents = bot.components.filter(c => c.id === 'ROTATION_MOMENTUM');
  const symbolsToFetch = new Set<string>([symbol, benchmarkSymbol]);
  
  if (rotationComponents.length > 0) {
    rotationComponents.forEach(c => {
      const universe = String(c.params.universe || '').split(',').map(s => s.trim()).filter(Boolean);
      universe.forEach(s => symbolsToFetch.add(s));
    });
  }

  const { data } = await fetchMarketData(Array.from(symbolsToFetch), '2y', '1d', true);
  if (data.length < 3) {
    throw new Error(`Not enough market data for deployment simulation.`);
  }

  const closes = data
    .map((row) => row[symbol])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const benchmarkCloses = data
    .map((row) => row[benchmarkSymbol])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  // Prepare allSymbolsData for the bot
  const allSymbolsData: Record<string, number[]> = {};
  for (const sym of symbolsToFetch) {
    allSymbolsData[sym] = data
      .map(row => row[sym])
      .filter((v): v is number => typeof v === 'number' && isFinite(v));
  }

  if (closes.length < 3 || benchmarkCloses.length < 3) {
    throw new Error(`Missing usable closes for ${symbol} or ${benchmarkSymbol}.`);
  }

  const runtimeBot = new BaseBot(bot);
  let cash = initialCapital;
  let units = 0;
  let feesPaidNok = 0;
  const equityCurve: DeploymentEquityPoint[] = [];
  const transactions: DeploymentTransaction[] = [];

  for (let i = 1; i < closes.length; i++) {
    // Prepare slice for all symbols
    const allSymbolsSlice: Record<string, number[]> = {};
    for (const sym in allSymbolsData) {
      allSymbolsSlice[sym] = allSymbolsData[sym].slice(0, i + 1);
    }

    const price = closes[i];
    const score = runtimeBot.processTick(closes.slice(0, i + 1), allSymbolsSlice);
    const wantsLong = score > 0.5;
    const hasPosition = units > 0;
    const timestamp = String(data[i].timestamp);

    if (wantsLong && !hasPosition && cash > TRANSACTION_FEE) {
      const buyPower = Math.max(cash - TRANSACTION_FEE, 0);
      const quantity = Math.floor(buyPower / price);
      if (quantity > 0) {
        const cost = quantity * price + TRANSACTION_FEE;
        cash -= cost;
        units += quantity;
        feesPaidNok += TRANSACTION_FEE;
        
        // Get the actual symbol being bought (it might be a rotation)
        const actualSymbol = runtimeBot.getComponentState('ROTATION_MOMENTUM-0')?.currentSymbol || symbol;

        transactions.push({
          id: `tx-${i}-buy`,
          timestamp,
          type: 'BUY',
          price,
          quantity,
          feeNok: TRANSACTION_FEE,
          note: `Bought ${actualSymbol}`,
        });
      }
    } else if (!wantsLong && hasPosition) {
      const credit = units * price - TRANSACTION_FEE;
      cash += credit;
      feesPaidNok += TRANSACTION_FEE;
      
      const actualSymbol = runtimeBot.getComponentState('ROTATION_MOMENTUM-0')?.currentSymbol || symbol;

      transactions.push({
        id: `tx-${i}-sell`,
        timestamp,
        type: 'SELL',
        price,
        quantity: units,
        feeNok: TRANSACTION_FEE,
        note: `Sold ${actualSymbol}`,
      });
      units = 0;
    }
    
    // NEW: Handle rotation switch (SELL old, BUY new in same tick)
    const rotationState = runtimeBot.getComponentState('ROTATION_MOMENTUM-0');
    if (hasPosition && rotationState?.switches?.some((s: any) => s.at === i + 1)) {
      const lastSwitch = rotationState.switches[rotationState.switches.length - 1];
      
      // 1. Sell old
      const sellCredit = units * price - TRANSACTION_FEE;
      cash += sellCredit;
      feesPaidNok += TRANSACTION_FEE;
      transactions.push({
        id: `tx-${i}-rotate-sell`,
        timestamp,
        type: 'SELL',
        price,
        quantity: units,
        feeNok: TRANSACTION_FEE,
        note: `Rotate: Sold ${lastSwitch.from}`,
      });

      // 2. Buy new
      const buyPower = Math.max(cash - TRANSACTION_FEE, 0);
      const newPrice = allSymbolsData[lastSwitch.to][i];
      const quantity = Math.floor(buyPower / newPrice);
      if (quantity > 0) {
        const cost = quantity * newPrice + TRANSACTION_FEE;
        cash -= cost;
        units = quantity;
        feesPaidNok += TRANSACTION_FEE;
        transactions.push({
          id: `tx-${i}-rotate-buy`,
          timestamp,
          type: 'BUY',
          price: newPrice,
          quantity,
          feeNok: TRANSACTION_FEE,
          note: `Rotate: Bought ${lastSwitch.to}`,
        });
      }
    }

    const botValue = cash + units * price;
    const benchmarkValue = initialCapital * (benchmarkCloses[i] / benchmarkCloses[0]);
    
    // Add current holding info to the equity point for better debugging/UI
    const currentHolding = runtimeBot.getComponentState('ROTATION_MOMENTUM-0')?.currentSymbol || (units > 0 ? symbol : 'CASH');

    // FIX: Sanity check to prevent astronomical numbers if price data is corrupted
    const sanitizedBotValue = Number.isFinite(botValue) && botValue < initialCapital * 1000 ? botValue : initialCapital;

    equityCurve.push({
      timestamp,
      botValue: sanitizedBotValue,
      benchmarkValue,
      holding: currentHolding,
    } as any);
  }

  const final = equityCurve[equityCurve.length - 1];
  const totalReturnPct = ((final.botValue - initialCapital) / initialCapital) * 100;
  const benchmarkReturnPct = ((final.benchmarkValue - initialCapital) / initialCapital) * 100;
  const relativeDeltaPct = totalReturnPct - benchmarkReturnPct;
  const maxDrawdownPct = calculateMaxDrawdown(equityCurve.map((point) => point.botValue));

  return {
    performance: {
      totalReturnPct,
      benchmarkReturnPct,
      relativeDeltaPct,
      maxDrawdownPct,
      feesPaidNok,
    },
    equityCurve,
    transactions,
  };
};

