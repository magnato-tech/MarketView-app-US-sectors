import { getRepository } from '../../services/factory/repositories/RepositoryFactory';
import { BotDNA } from '../../types/bot-dna';
import { EvaluationSnapshot } from '../../types/simulation';
import {
  BotEvaluationResult,
  buildOllamaChallengePrompt,
} from './Evaluator';
import { OllamaClient } from './ollama/OllamaClient';
import {
  ChallengerParamProposal,
  RuleDefinition,
  runAlphaZeroChallengeCycle,
} from './index';

const GENESIS_BOT_ID = 'alpha-zero-genesis';
const OLLAMA_TIMEOUT_MS = 120_000;
const OLLAMA_MAX_RETRIES = 3;

export interface EvolutionCycleRequest {
  symbol?: string;
  period?: '1y' | '2y' | '5y';
  dataMode?: 'historical' | 'simulator';
  repositoryDir?: string;
}

export interface EvolutionCycleResult {
  usedFallback: boolean;
  reasoning: string;
  statuses: string[];
  appliedChanges: ChallengerParamProposal[];
  rejectedChanges: ChallengerParamProposal[];
  baseline: EvaluationSnapshot;
  challenger: EvaluationSnapshot;
}

const createGenesisBot = (): BotDNA => ({
  id: GENESIS_BOT_ID,
  version: '1.0.0',
  generation: 0,
  status: 'Candidate',
  tradingUniverse: {
    allowedCategories: ['ETF'],
    focusMode: 'LOCKED_SINGLE',
    preferredCategory: 'ETF',
  },
  components: [
    {
      id: 'ROTATION_MOMENTUM',
      type: 'signal',
      weight: 1.0,
      params: {
        lookbackPeriod: 12,
        rotationThresholdPct: 3.0,
        trailingStopLossPct: 10.0,
        universe: 'SMH,MOAT,GDX,RARE', // VanEck univers
      },
    },
  ],
});

const createGenesisRules = (): RuleDefinition[] => [
  {
    id: 'rule-rotation-lookback',
    logic_gate: 'CHALLENGEABLE',
    componentId: 'ROTATION_MOMENTUM',
    paramKey: 'lookbackPeriod',
    baselineValue: 12,
    min: 4,
    max: 26,
  },
  {
    id: 'rule-rotation-threshold',
    logic_gate: 'CHALLENGEABLE',
    componentId: 'ROTATION_MOMENTUM',
    paramKey: 'rotationThresholdPct',
    baselineValue: 3.0,
    min: 1.0,
    max: 10.0,
  },
];

const chooseMockMutation = (): ChallengerParamProposal => {
  const mutateLookback = Math.random() >= 0.5;
  if (mutateLookback) {
    const candidate = 8 + Math.floor(Math.random() * 8); // 8..15
    return {
      componentId: 'ROTATION_MOMENTUM',
      paramKey: 'lookbackPeriod',
      value: candidate === 12 ? 13 : candidate,
    };
  }

  let candidate = Number((2 + Math.random() * 2).toFixed(1)); // 2.0..4.0
  if (candidate === 3.0) candidate = 3.1;
  return {
    componentId: 'ROTATION_MOMENTUM',
    paramKey: 'rotationThresholdPct',
    value: candidate,
  };
};

const toBotEvaluationResult = (snapshot: EvaluationSnapshot, botId: string): BotEvaluationResult => ({
  botId,
  totalReturn: snapshot.metrics.totalReturn,
  sharpeRatio: snapshot.metrics.sharpeRatio,
  maxDrawdown: snapshot.metrics.maxDrawdown,
});

const getLatestEvaluation = async (
  repository: any,
  botId: string
): Promise<EvaluationSnapshot | null> => {
  const evaluations = await repository.listEvaluations(botId);
  if (evaluations.length === 0) return null;
  return [...evaluations].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
};

const splitLegalProposals = (
  proposals: ChallengerParamProposal[],
  rules: RuleDefinition[]
): { legal: ChallengerParamProposal[]; illegal: ChallengerParamProposal[] } => {
  const illegal: ChallengerParamProposal[] = [];
  const legal = proposals.filter((proposal) => {
    const matchedRule = rules.find(
      (rule) =>
        rule.componentId === proposal.componentId &&
        rule.paramKey === proposal.paramKey
    );
    if (!matchedRule) {
      illegal.push(proposal);
      return false;
    }
    if (matchedRule.logic_gate === 'STRICT') {
      illegal.push(proposal);
      return false;
    }
    // Reject no-op mutations that equal the enforced baseline value.
    if (proposal.value === matchedRule.baselineValue) {
      illegal.push(proposal);
      return false;
    }
    return true;
  });

  return { legal, illegal };
};

const classifyOllamaError = (error: unknown): string => {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (lower.includes('aborted') || lower.includes('timeout')) return `timeout: ${msg}`;
  if (lower.includes('json') || lower.includes('zod') || lower.includes('schema')) return `parse/schema: ${msg}`;
  if (lower.includes('http')) return `http: ${msg}`;
  return `runtime: ${msg}`;
};

const generateProposalWithFallback = async (
  repository: any,
  rules: RuleDefinition[],
  sourceBotId: string,
  statuses: string[]
): Promise<{
  proposals: ChallengerParamProposal[];
  reasoning: string;
  usedFallback: boolean;
}> => {
  const latestEval = await getLatestEvaluation(repository, sourceBotId);
  const baselineEval: BotEvaluationResult = latestEval
    ? toBotEvaluationResult(latestEval, sourceBotId)
    : { botId: sourceBotId, totalReturn: 0, sharpeRatio: 0, maxDrawdown: 0 };

  const prompt = buildOllamaChallengePrompt({
    baseline: baselineEval,
    challenger: baselineEval,
    appliedChanges: [],
  });

  const rulesSummary = rules
    .map(
      (rule) =>
        `${rule.componentId}.${rule.paramKey} gate=${rule.logic_gate}` +
        (rule.min != null || rule.max != null ? ` bounds=[${rule.min ?? '-inf'}, ${rule.max ?? '+inf'}]` : '')
    )
    .join('\n');

  const fullPrompt = [
    prompt,
    'Returner JSON med feltene reasoning og patch.',
    'Patch skal være et array med forslag: {componentId,paramKey,value}.',
    'Regelsett:',
    rulesSummary,
  ].join('\n');

  const ollamaClient = new OllamaClient(
    process.env.OLLAMA_HOST || 'http://localhost:11434',
    process.env.OLLAMA_MODEL || 'deepseek-r1'
  );

  // Health-check før dyre mutation-kall
  statuses.push('Checking Ollama health...');
  try {
    const health = await ollamaClient.generateMutation({
      prompt:
        'Return valid JSON with reasoning and patch. Use patch with one object: {"componentId":"TREND_SMA","paramKey":"fastPeriod","value":20}.',
      timeoutMs: 30_000,
    });
    if (health.proposals.length > 0) {
      statuses.push('Ollama health-check passed.');
    }
  } catch (error) {
    statuses.push(`Ollama health-check failed; retry path enabled. Cause: ${classifyOllamaError(error)}`);
  }

  let lastErrorMessage = 'unknown';
  for (let attempt = 1; attempt <= OLLAMA_MAX_RETRIES; attempt++) {
    try {
      statuses.push(`Ollama is analyzing crash data... (attempt ${attempt}/${OLLAMA_MAX_RETRIES})`);
      const aiResult = await ollamaClient.generateMutation({
        prompt: fullPrompt,
        timeoutMs: OLLAMA_TIMEOUT_MS,
      });

      const { legal, illegal } = splitLegalProposals(aiResult.proposals, rules);
      if (illegal.length > 0) {
        statuses.push(`Illegal Mutation forkastet (${illegal.length})`);
      }

      if (legal.length === 0) {
        statuses.push('No legal AI patch found in this attempt.');
      } else {
        return {
          proposals: legal.slice(0, 1),
          reasoning: aiResult.reasoning,
          usedFallback: false,
        };
      }
    } catch (error) {
      lastErrorMessage = classifyOllamaError(error);
      statuses.push(`Ollama attempt ${attempt} failed: ${lastErrorMessage}`);
      if (attempt < OLLAMA_MAX_RETRIES) {
        const backoffMs = attempt * 10_000;
        statuses.push(`Retrying in ${Math.round(backoffMs / 1000)}s...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  const fallback = chooseMockMutation();
  statuses.push('All Ollama attempts exhausted. Falling back to random mutation.');
  return {
    proposals: [fallback],
    reasoning: `Ollama feilet etter ${OLLAMA_MAX_RETRIES} forsøk (${lastErrorMessage}). Fallback til random mutasjon.`,
    usedFallback: true,
  };
};

export const runFactoryEvolutionCycle = async (
  request: EvolutionCycleRequest = {}
): Promise<EvolutionCycleResult> => {
  const statuses: string[] = ['Bootstrapping repository...'];
  const symbol = (request.symbol ?? 'SPY').toUpperCase();
  const period = request.period ?? '1y';
  const dataMode =
    request.dataMode ??
    ((process.env.FACTORY_DATA_MODE || 'historical').toLowerCase() === 'simulator'
      ? 'simulator'
      : 'historical');
  
  const repository = getRepository(request.repositoryDir);
  statuses.push(`Data mode: ${dataMode}.`);

  statuses.push('Ensuring Genesis bot exists...');
  let genesis = await repository.getBot(GENESIS_BOT_ID);
  if (!genesis) {
    genesis = createGenesisBot();
    await repository.saveBot(genesis);
    statuses.push('Genesis bot seeded.');
  } else {
    statuses.push('Genesis bot loaded.');
  }

  const rules = createGenesisRules();
  const mutation = await generateProposalWithFallback(repository, rules, GENESIS_BOT_ID, statuses);

  statuses.push('Running baseline vs challenger backtest...');
  const result = await runAlphaZeroChallengeCycle(repository, {
    sourceBotId: GENESIS_BOT_ID,
    rules,
    proposals: mutation.proposals,
    symbol,
    period,
    dataMode,
  });
  statuses.push('Cycle completed.');

  return {
    usedFallback: mutation.usedFallback,
    reasoning: mutation.reasoning,
    statuses,
    appliedChanges: result.appliedChanges,
    rejectedChanges: result.rejectedChanges,
    baseline: result.baselineEvaluation,
    challenger: result.challengerEvaluation,
  };
};
