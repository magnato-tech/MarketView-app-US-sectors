import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { runFactoryEvolutionCycle } from '../../lib/factory/EvolutionCycle';
import { OllamaClient } from '../../lib/factory/ollama/OllamaClient';

describe('Factory end-to-end (A-Å)', () => {
  const symbol = 'XLK';
  const period = '1y' as const;
  const testRoot = path.join(process.cwd(), 'data', 'factory-test-e2e');
  const marketDataDir = path.join(process.cwd(), 'data', 'factory', 'market-data');
  const marketDataFile = path.join(marketDataDir, `${symbol}_${period}.json`);

  beforeEach(() => {
    mkdirSync(testRoot, { recursive: true });
    mkdirSync(marketDataDir, { recursive: true });
    const closes = Array.from({ length: 260 }, (_, i) => {
      if (i < 120) return 100 + i * 0.2;
      if (i < 125) return 124 - (i - 119) * 4.5;
      return 101 + (i - 125) * 0.08;
    });
    writeFileSync(marketDataFile, JSON.stringify({ closes }, null, 2), 'utf-8');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(testRoot, { recursive: true, force: true });
    rmSync(marketDataFile, { force: true });
  });

  it('runs full evolution cycle and produces baseline + challenger metrics', async () => {
    vi.spyOn(OllamaClient.prototype, 'generateMutation').mockResolvedValue({
      reasoning: 'test reasoning for mutation',
      proposals: [{ componentId: 'TREND_SMA', paramKey: 'fastPeriod', value: 22 }],
      rawText:
        '{"reasoning":"test reasoning for mutation","patch":[{"componentId":"TREND_SMA","paramKey":"fastPeriod","value":22}]}',
    });

    const result = await runFactoryEvolutionCycle({
      symbol,
      period,
      dataMode: 'simulator',
      repositoryDir: testRoot,
    });

    expect(result.usedFallback).toBe(false);
    expect(result.reasoning).toContain('reasoning');
    expect(result.statuses.some((s) => s.includes('Cycle completed'))).toBe(true);
    expect(result.baseline.metrics.tradeCount).toBeGreaterThan(0);
    expect(result.challenger.metrics.tradeCount).toBeGreaterThan(0);
    expect(Number.isFinite(result.baseline.metrics.sharpeRatio)).toBe(true);
    expect(Number.isFinite(result.challenger.metrics.maxDrawdown)).toBe(true);
    expect(result.appliedChanges.length).toBeGreaterThan(0);
  });
});
