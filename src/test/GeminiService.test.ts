import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMarketInsights } from '../../services/geminiService';

describe('GeminiService quality gates', () => {
  const mockSummary = [
    { symbol: '^NDX', name: 'Nasdaq 100', percentChange: 2.5, color: '#000' },
    { symbol: 'XLE', name: 'Energy', percentChange: -1.2, color: '#000' }
  ];

  const recentData = [
    { timestamp: '2026-04-10', '^NDX': 18000, XLE: 90 },
    { timestamp: '2026-04-11', '^NDX': 18120, XLE: 88.5 }
  ];

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });

  const setupFetchMock = (mode: 'generic' | 'rich' | 'fallback') => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/yahoo/v8/finance/chart/%5EVIX')) {
        return jsonResponse({
          chart: {
            result: [
              {
                indicators: { quote: [{ close: [22, 23, 24, 26] }] }
              }
            ]
          }
        });
      }

      if (mode === 'fallback') {
        if (url.includes('/v1beta/models/gemini-3.1-flash')) {
          return jsonResponse({ error: { message: 'model not found' } }, 404);
        }
        return jsonResponse({
          candidates: [
            {
              content: {
                parts: [{
                  text: 'Markedskommentar:\nMomentum holder seg positivt med noe stress i volatilitet.\n\nUtsikter for neste periode:\nFølg VIX nøye for brudd opp.'
                }]
              }
            }
          ]
        });
      }

      if (mode === 'generic') {
        return jsonResponse({
          candidates: [
            {
              content: {
                parts: [{ text: 'Markedskommentar:\nMarkedet har de siste\n\nUtsikter for neste periode:\nMarkedet har de siste' }]
              }
            }
          ]
        });
      }

      return jsonResponse({
        candidates: [
          {
            content: {
              parts: [{
                text: 'Markedskommentar:\nRisk-on fortsetter, men bredde svekkes og VIX stiger marginalt.\nDet tyder på latent stress selv om indeksen holder seg nær toppnivå.\n\nUtsikter for neste periode:\nBase case er sidelengs oppgang, mens risk case er VIX-brudd over 25 med rask akselerasjon.'
              }]
            }
          }
        ]
      });
    });
    return fetchMock;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('DOMParser', undefined as unknown as typeof DOMParser);
    vi.stubEnv('VITE_GEMINI_API_KEY', 'unit-test-key');
  });

  it('replaces generic AI output with meaningful fallback analysis', async () => {
    setupFetchMock('generic');

    const result = await getMarketInsights(mockSummary, '6mo', recentData);

    expect(result).toContain('Analytikerkonsensus:');
    expect(result).toContain('Sektoranbefaling nå:');
    expect(result.toLowerCase()).toContain('sektoranbefaling');
    expect(result.toLowerCase()).not.toContain('markedet har de siste\n\nutsikter for neste periode:\nmarkedet har de siste');
  });

  it('keeps rich structured analysis from model when quality is good', async () => {
    setupFetchMock('rich');

    const result = await getMarketInsights(mockSummary, '6mo', recentData);

    expect(result).toContain('Riskon fortsetter');
    expect(result).toContain('VIXbrudd over 25');
  });

  it('falls back to next model when first model is not found', async () => {
    const fetchMock = setupFetchMock('fallback');

    const result = await getMarketInsights(mockSummary, '6mo', recentData);

    expect(result).toContain('Analytikerkonsensus:');
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('injects concrete turning points into prompt context', async () => {
    const fetchMock = setupFetchMock('rich');
    const turningData = [
      { timestamp: '2026-03-22', '^NDX': 100, XLE: 100 },
      { timestamp: '2026-03-23', '^NDX': 97, XLE: 110 },
      { timestamp: '2026-03-27', '^NDX': 95, XLE: 90 },
      { timestamp: '2026-03-30', '^NDX': 110, XLE: 88 }
    ];

    await getMarketInsights(mockSummary, '6mo', turningData);

    const geminiCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('generateContent')
    );
    const body = JSON.parse(String((geminiCall?.[1] as RequestInit | undefined)?.body ?? '{}'));
    const prompt = body?.contents?.[0]?.parts?.[0]?.text ?? '';

    expect(prompt).toContain('Viktige vendingstidspunkter i kurvene');
    expect(prompt).toContain('2026-03-27');
    expect(prompt).toContain('2026-03-30');
  });

  it('detects and injects divergence signals into prompt context', async () => {
    const fetchMock = setupFetchMock('rich');
    const divergenceSummary = [
      { symbol: 'XLB', name: 'Materialer', percentChange: 5.0, color: '#000' },
      { symbol: 'XLE', name: 'Energi', percentChange: -2.5, color: '#000' }
    ];

    await getMarketInsights(divergenceSummary, '1mo', recentData);

    const geminiCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('generateContent')
    );
    const body = JSON.parse(String((geminiCall?.[1] as RequestInit | undefined)?.body ?? '{}'));
    const prompt = body?.contents?.[0]?.parts?.[0]?.text ?? '';

    expect(prompt).toContain('Divergens- og regimesignaler');
    expect(prompt).toContain('Råvarer stiger kraftig mens energi faller');
  });

  it('triggers fallback if AI ignores required turning point dates', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/yahoo/v8/finance/chart/%5EVIX')) {
        return jsonResponse({ chart: { result: [{ indicators: { quote: [{ close: [20, 21] }] } }] } });
      }
      return jsonResponse({
        candidates: [{
          content: {
            parts: [{
              text: 'Analytikerkonsensus:\nMarkedet er sterkt nå. Alt ser bra ut.\n\nSektoranbefaling nå:\nKjøp teknologi.'
            }]
          }
        }]
      });
    });

    const turningData = [
      { timestamp: '2026-03-22', '^NDX': 100 },
      { timestamp: '2026-03-23', '^NDX': 90 },
      { timestamp: '2026-03-27', '^NDX': 110 }
    ];
    const summary = [{ symbol: '^NDX', name: 'Nasdaq', percentChange: 10, color: '#000' }];

    const result = await getMarketInsights(summary, '1mo', turningData);

    // Skal ha brukt fallback fordi 2026-03-27 mangler i AI-svaret
    expect(result).toContain('Oppsummert fra dagens markedskommentarer');
  });
});
