import { afterEach, describe, expect, it, vi } from 'vitest';
import { OllamaClient } from '../../lib/factory/ollama/OllamaClient';

describe('OllamaClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sanitizes <think> tags and parses JSON patch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          response:
            '<think>internal reasoning</think>{"reasoning":"valid explanation text","patch":[{"componentId":"TREND_SMA","paramKey":"fastPeriod","value":21}]}',
        }),
      }))
    );

    const client = new OllamaClient('http://localhost:11434', 'deepseek-r1');
    const result = await client.generateMutation({ prompt: 'test', timeoutMs: 1000 });

    expect(result.reasoning).toContain('valid explanation');
    expect(result.proposals[0]).toEqual({
      componentId: 'TREND_SMA',
      paramKey: 'fastPeriod',
      value: 21,
    });
    expect(result.rawText).not.toContain('<think>');
  });
});
