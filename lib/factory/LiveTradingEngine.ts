import { BaseBot } from './BaseBot';
import { IBotRepository } from '../../services/factory/repositories/IBotRepository';
import { fetchMarketData } from '../../services/marketDataService';
import { Deployment, DeploymentTransaction } from '../../types/simulation';

import { TRANSACTION_FEE } from '../../constants/trading';

export class LiveTradingEngine {
  constructor(private readonly repository: IBotRepository) {}

  async processActiveDeployments(): Promise<void> {
    const deployments = await this.repository.listDeployments();
    const activeDeployments = deployments.filter((d) => d.status === 'Active');

    if (activeDeployments.length === 0) {
      console.log('No active deployments to process.');
      return;
    }

    console.log(`Processing ${activeDeployments.length} active deployments...`);

    for (const deployment of activeDeployments) {
      try {
        await this.processDeployment(deployment);
      } catch (error) {
        console.error(`Failed to process deployment ${deployment.id}:`, error);
      }
    }
  }

  private async processDeployment(deployment: Deployment): Promise<void> {
    const bot = await this.repository.getBot(deployment.botId);
    if (!bot) throw new Error(`Bot ${deployment.botId} not found.`);

    // 1. Identify all symbols needed
    const rotationComponents = bot.components.filter(c => c.id === 'ROTATION_MOMENTUM');
    const symbolsToFetch = new Set<string>([deployment.symbol || 'SPY', deployment.benchmarkSymbol || '^GSPC']);
    
    if (rotationComponents.length > 0) {
      rotationComponents.forEach(c => {
        const universe = String(c.params.universe || '').split(',').map(s => s.trim()).filter(Boolean);
        universe.forEach(s => symbolsToFetch.add(s));
      });
    }

    // 2. Fetch latest data based on deployment interval
    const interval = deployment.interval || '1wk';
    const { data } = await fetchMarketData(Array.from(symbolsToFetch), '2y', interval, true);
    if (data.length < 2) return;

    const latestTick = data[data.length - 1];
    const timestamp = String(latestTick.timestamp);

    // Skip if already processed this week
    if (deployment.lastProcessedAt === timestamp) {
      console.log(`Deployment ${deployment.id} already processed for ${timestamp}.`);
      return;
    }

    // 3. Initialize Live State if missing
    if (deployment.liveBalanceNok === undefined) {
      // If we have a percentage, we should ideally know the total portfolio value.
      // For now, we use the allocatedCapitalNok which was set at deployment time
      // based on the percentage of totalValue then.
      deployment.liveBalanceNok = deployment.allocatedCapitalNok;
      deployment.liveEquityCurve = [];
    }

    // 4. Run Bot Logic
    const runtimeBot = new BaseBot(bot);
    
    // To support stateful components like RotationMomentum, we would ideally 
    // need to reconstruct the state from previous ticks. 
    // For now, we process the full history to let the bot reach its current state.
    const allSymbolsData: Record<string, number[]> = {};
    for (const sym of symbolsToFetch) {
      allSymbolsData[sym] = data.map(row => row[sym]).filter((v): v is number => typeof v === 'number' && isFinite(v));
    }

    const mainCloses = allSymbolsData[deployment.symbol || 'SPY'];
    let actionScore = 0;
    
    // We simulate the bot over the history to maintain its internal state
    for (let i = 0; i < data.length; i++) {
      const historySlice = mainCloses.slice(0, i + 1);
      const allSymbolsSlice: Record<string, number[]> = {};
      for (const sym in allSymbolsData) {
        allSymbolsSlice[sym] = allSymbolsData[sym].slice(0, i + 1);
      }
      actionScore = runtimeBot.processTick(historySlice, allSymbolsSlice);
    }

    // 5. Handle Transactions & Balance
    const rotationState = runtimeBot.getComponentState('ROTATION_MOMENTUM-0');
    const currentSymbol = rotationState?.currentSymbol || deployment.symbol || 'SPY';
    const currentPrice = latestTick[currentSymbol] as number;
    
    // Simple logic: if actionScore > 0.5 we are "In", else "Out"
    const wantsLong = actionScore > 0.5;
    const hasPosition = (deployment.transactions?.filter(t => t.type === 'BUY').length ?? 0) > 
                        (deployment.transactions?.filter(t => t.type === 'SELL').length ?? 0);

    const newTransactions: DeploymentTransaction[] = [];

    if (wantsLong && !hasPosition) {
      // BUY
      const fee = TRANSACTION_FEE;
      deployment.liveBalanceNok -= fee;
      newTransactions.push({
        id: `live-${Date.now()}-buy`,
        timestamp,
        type: 'BUY',
        price: currentPrice,
        quantity: Math.floor(deployment.liveBalanceNok / currentPrice),
        feeNok: fee,
        note: `Live Buy: ${currentSymbol}`
      });
    } else if (!wantsLong && hasPosition) {
      // SELL
      const fee = TRANSACTION_FEE;
      const lastBuy = [...(deployment.transactions || [])].reverse().find(t => t.type === 'BUY');
      if (lastBuy) {
        const profit = (currentPrice - lastBuy.price) * lastBuy.quantity;
        deployment.liveBalanceNok += profit - fee;
        newTransactions.push({
          id: `live-${Date.now()}-sell`,
          timestamp,
          type: 'SELL',
          price: currentPrice,
          quantity: lastBuy.quantity,
          feeNok: fee,
          note: `Live Sell: ${currentSymbol}`
        });
      }
    }

    // 6. Update Equity Curve
    const benchmarkPrice = latestTick[deployment.benchmarkSymbol || '^GSPC'] as number;
    const initialBenchmarkPrice = data[0][deployment.benchmarkSymbol || '^GSPC'] as number;
    const benchmarkValue = deployment.allocatedCapitalNok * (benchmarkPrice / initialBenchmarkPrice);

    deployment.liveEquityCurve = deployment.liveEquityCurve || [];
    deployment.liveEquityCurve.push({
      timestamp,
      botValue: deployment.liveBalanceNok,
      benchmarkValue
    });

    deployment.transactions = [...(deployment.transactions || []), ...newTransactions];
    deployment.lastProcessedAt = timestamp;
    deployment.updatedAt = new Date().toISOString();

    await this.repository.saveDeployment(deployment);
    console.log(`Processed deployment ${deployment.id} for ${timestamp}. New balance: ${deployment.liveBalanceNok}`);
  }
}
