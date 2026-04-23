import { BaseBot } from '../../lib/factory/BaseBot';
import { LiveTradingEngine } from '../../lib/factory/LiveTradingEngine';
import { IBotRepository } from '../../services/factory/repositories/IBotRepository';
import { BotDNA } from '../../types/bot-dna';
import { Deployment } from '../../types/simulation';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { INITIAL_CASH } from '../../constants/trading';

// Mock repository
class MockRepository implements Partial<IBotRepository> {
  private deployments: Deployment[] = [];
  private bots: Record<string, BotDNA> = {};

  async listDeployments() { return this.deployments; }
  async getBot(id: string) { return this.bots[id]; }
  async saveDeployment(d: Deployment) {
    const idx = this.deployments.findIndex(item => item.id === d.id);
    if (idx >= 0) this.deployments[idx] = d;
    else this.deployments.push(d);
  }

  // Helper for tests
  setup(bot: BotDNA, deployment: Deployment) {
    this.bots[bot.id] = bot;
    this.deployments = [deployment];
  }
}

// Mock market data service
vi.mock('../../services/marketDataService', () => ({
  fetchMarketData: vi.fn()
}));

import { fetchMarketData } from '../../services/marketDataService';

describe('LiveTradingEngine - Integration Test', () => {
  let repository: MockRepository;
  let engine: LiveTradingEngine;

  beforeEach(() => {
    repository = new MockRepository();
    engine = new LiveTradingEngine(repository as any);
    vi.clearAllMocks();
  });

  it('should process a weekly tick and update balance for a rotation bot', async () => {
    const botDNA: BotDNA = {
      id: 'test-bot',
      version: '1.0.0',
      generation: 1,
      status: 'Published',
      components: [
        {
          id: 'ROTATION_MOMENTUM',
          type: 'signal',
          weight: 1.0,
          params: { universe: 'AAPL,MSFT', lookbackPeriod: 2, rotationThresholdPct: 1.0 }
        }
      ]
    };

    const deployment: Deployment = {
      id: 'dep-1',
      botId: 'test-bot',
      botVersion: '1.0.0',
      allocatedCapitalNok: INITIAL_CASH,
      status: 'Active',
      symbol: 'AAPL',
      benchmarkSymbol: '^GSPC',
      interval: '1wk',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    repository.setup(botDNA, deployment);

    // Mock market data: AAPL is rising, MSFT is flat
    const mockData = [
      { timestamp: '2026-04-01', AAPL: 100, MSFT: 100, '^GSPC': 5000 },
      { timestamp: '2026-04-08', AAPL: 110, MSFT: 100, '^GSPC': 5050 }, // AAPL +10%
      { timestamp: '2026-04-15', AAPL: 121, MSFT: 100, '^GSPC': 5100 }, // AAPL +10% again
    ];

    (fetchMarketData as any).mockResolvedValue({ data: mockData });

    // Run engine
    await engine.processActiveDeployments();

    const updatedDep = (await repository.listDeployments())[0];
    
    // Check results
    expect(updatedDep.lastProcessedAt).toBe('2026-04-15');
    expect(updatedDep.liveBalanceNok).toBeDefined();
    expect(updatedDep.transactions?.length).toBeGreaterThan(0);
    expect(updatedDep.transactions?.[0].type).toBe('BUY');
    expect(updatedDep.transactions?.[0].note).toContain('AAPL');
    
    console.log('Test Passed: Live Engine correctly processed weekly data and executed trades.');
  });

  it('should respect the interval setting (1d vs 1wk)', async () => {
    const botDNA: BotDNA = { id: 'test-bot', version: '1.0.0', generation: 1, status: 'Published', components: [] };
    const deployment: Deployment = {
      id: 'dep-daily',
      botId: 'test-bot',
      botVersion: '1.0.0',
      allocatedCapitalNok: INITIAL_CASH,
      status: 'Active',
      interval: '1d', // Daily
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    repository.setup(botDNA, deployment);
    (fetchMarketData as any).mockResolvedValue({ data: [{ timestamp: '2026-04-22' }, { timestamp: '2026-04-23' }] });

    await engine.processActiveDeployments();

    expect(fetchMarketData).toHaveBeenCalledWith(expect.anything(), expect.anything(), '1d', true);
  });
});
