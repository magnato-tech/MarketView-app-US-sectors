import 'dotenv/config';
import { OllamaClient } from '../../lib/factory/ollama/OllamaClient';
import { buildOllamaChallengePrompt } from '../../lib/factory/Evaluator';
import { BotDNA } from '../../types/bot-dna';

const dummyDna: BotDNA = {
  id: 'dummy-bot-ollama-test',
  version: '1.0.0',
  generation: 1,
  status: 'Candidate',
  components: [
    {
      type: 'signal',
      id: 'TREND_SMA',
      weight: 0.6,
      params: {
        fastPeriod: 50,
        slowPeriod: 200,
        intensity: 8,
      },
    },
    {
      type: 'filter',
      id: 'CRISIS_DROP',
      weight: 0.4,
      params: {
        lookbackDays: 3,
        minDropPct: 5,
        intensity: 3,
      },
    },
  ],
};

const main = async (): Promise<void> => {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'qwen2.5-coder';
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);

  const report = buildOllamaChallengePrompt({
    baseline: { botId: dummyDna.id, totalReturn: 4.2, sharpeRatio: 0.73, maxDrawdown: 12.1 },
    challenger: { botId: `${dummyDna.id}-challenger`, totalReturn: 6.8, sharpeRatio: 0.95, maxDrawdown: 9.4 },
    appliedChanges: [{ componentId: 'TREND_SMA', paramKey: 'fastPeriod', value: 48 }],
  });

  const prompt = [
    'Manual Ollama smoke test for JSON mutation output.',
    'Return a JSON object with keys: reasoning, patch.',
    `Dummy DNA: ${JSON.stringify(dummyDna)}`,
    `Mini report: ${report}`,
  ].join('\n');

  const payloadPreview = {
    endpoint: `${host.replace(/\/+$/, '')}/api/generate`,
    model,
    temperature: 0.2,
    format: 'json',
    stream: false,
    timeoutMs,
    prompt,
  };

  console.log('--- OLLAMA REQUEST PAYLOAD ---');
  console.log(JSON.stringify(payloadPreview, null, 2));

  try {
    const client = new OllamaClient(host, model);
    const mutation = await client.mutate({ prompt, timeoutMs, model });

    console.log('\n--- OLLAMA RAW RESPONSE (sanitized) ---');
    console.log(mutation.rawText);

    console.log('\n--- PARSED PATCH RESULT ---');
    console.log(
      JSON.stringify(
        {
          reasoning: mutation.reasoning,
          patch: mutation.proposals,
        },
        null,
        2
      )
    );

    console.log('\nOllama smoke test completed successfully.');
  } catch (error) {
    console.error('\nOllama smoke test failed.');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
};

void main();
