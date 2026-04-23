import { z } from 'zod';
import { ChallengerParamProposal } from '../RuleEngine';

const ollamaPatchSchema = z.object({
  reasoning: z.string().min(10),
  patch: z.array(
    z.object({
      componentId: z.string().min(1),
      paramKey: z.string().min(1),
      value: z.union([z.number(), z.string(), z.boolean()]),
    })
  ).min(1),
});

export type OllamaPatchResponse = z.infer<typeof ollamaPatchSchema>;

export interface OllamaMutationRequest {
  prompt: string;
  model?: string;
  timeoutMs?: number;
}

export interface OllamaMutationResult {
  reasoning: string;
  proposals: ChallengerParamProposal[];
  rawText: string;
}

export class OllamaClient {
  private readonly host: string;
  private readonly defaultModel: string;

  constructor(host = 'http://localhost:11434', defaultModel = process.env.OLLAMA_MODEL || 'deepseek-r1') {
    this.host = host.replace(/\/+$/, '');
    this.defaultModel = defaultModel;
  }

  async generateMutation(request: OllamaMutationRequest): Promise<OllamaMutationResult> {
    const timeoutMs = request.timeoutMs ?? 45_000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const model = request.model ?? this.defaultModel;

    const systemPrompt = [
      'You are a Senior Quant Researcher specialized in Crisis Alpha.',
      'Prioritize Sharpe ratio and max drawdown stability over raw return.',
      'Return ONLY valid JSON with keys: reasoning, patch.',
      'The patch must be an array of parameter mutations with componentId, paramKey, value.',
      'Do not include markdown code fences.',
    ].join(' ');

    try {
      const response = await fetch(`${this.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          format: 'json',
          stream: false,
          system: systemPrompt,
          prompt: request.prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { response?: string };
      const rawText = payload.response?.trim();
      if (!rawText) {
        throw new Error('Ollama returned an empty response.');
      }
      const sanitizedText = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(sanitizedText);
      } catch {
        throw new Error('Ollama response was not valid JSON.');
      }

      const parsed = ollamaPatchSchema.parse(parsedJson);
      return {
        reasoning: parsed.reasoning,
        proposals: parsed.patch,
        rawText: sanitizedText,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Compatibility alias used by manual smoke-test scripts.
   */
  async mutate(request: OllamaMutationRequest): Promise<OllamaMutationResult> {
    return this.generateMutation(request);
  }
}
