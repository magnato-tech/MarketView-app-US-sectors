import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { calculateMaxDrawdown } from '../../services/analysisService';
import { fetchMarketData } from '../../services/marketDataService';
import { BotDNA } from '../../types/bot-dna';
import { EvaluationSnapshot, EvolutionEvent } from '../../types/simulation';
import { IBotRepository } from '../../services/factory/repositories/IBotRepository';
import { BaseBot } from './BaseBot';
import {
  buildOllamaChallengePrompt,
  BotEvaluationResult,
} from './Evaluator';
import {
  ChallengerParamProposal,
  RuleDefinition,
  RuleEngine,
} from './RuleEngine';
import { assertSymbolAllowedForBot, assertValidBotUniverse } from './tradingUniverse';

export interface RunChallengeOptions {
  sourceBotId: string;
  rules: RuleDefinition[];
  proposals: ChallengerParamProposal[];
  symbol?: string;
  period?: '1y' | '2y' | '5y';
  dataMode?: 'historical' | 'simulator';
}

export interface ChallengeRunResult {
  baselineBot: BotDNA;
  challengerBot: BotDNA;
  baselineEvaluation: EvaluationSnapshot;
  challengerEvaluation: EvaluationSnapshot;
  appliedChanges: ChallengerParamProposal[];
  rejectedChanges: ChallengerParamProposal[];
  ollamaPrompt: string;
}

const INITIAL_CAPITAL = 100000;
const TRANSACTION_FEE = 100;

const createId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const loadLocalMarketData = (symbol: string, period: '1y' | '2y' | '5y'): number[] => {
  const filePath = path.join(process.cwd(), 'data', 'factory', 'market-data', `${symbol}_${period}.json`);
  if (!existsSync(filePath)) return [];

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { closes?: unknown };
    if (!Array.isArray(parsed.closes)) return [];
    return parsed.closes.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  } catch {
    return [];
  }
};

const calculateSharpeRatio = (dailyReturns: number[], annualRiskFreeRate = 0.02): number => {
  if (dailyReturns.length < 2) return 0;
  const dailyRiskFree = annualRiskFreeRate / 252;
  const avg = dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
    (dailyReturns.length - 1);
  const stdDev = Math.sqrt(variance);
  if (!Number.isFinite(stdDev) || stdDev === 0) return 0;
  const sharpe = ((avg - dailyRiskFree) / stdDev) * Math.sqrt(252);
  return Number.isFinite(sharpe) ? sharpe : 0;
};

const toBotEvaluationResult = (snapshot: EvaluationSnapshot): BotEvaluationResult => ({
  botId: snapshot.botId,
  totalReturn: snapshot.metrics.totalReturn,
  sharpeRatio: snapshot.metrics.sharpeRatio,
  maxDrawdown: snapshot.metrics.maxDrawdown,
});

const evaluateBotDNA = async (
  bot: BotDNA,
  symbol: string,
  period: '1y' | '2y' | '5y',
  dataMode: 'historical' | 'simulator'
): Promise<EvaluationSnapshot> => {
  assertValidBotUniverse(bot);
  assertSymbolAllowedForBot(bot, symbol);

  const closes =
    dataMode === 'historical'
      ? (await fetchMarketData([symbol], '2y', '1d', true)).data
          .map((row) => row[symbol])
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      : loadLocalMarketData(symbol, period);

  if (closes.length === 0) {
    throw new Error(
      dataMode === 'historical'
        ? `Could not load 2y historical data for ${symbol}. Set FACTORY_DATA_MODE=simulator to use local synthetic data.`
        : `Missing local market data for ${symbol}_${period}. Expected file in data/factory/market-data/.`
    );
  }

  if (closes.length < 3) {
    return {
      id: createId(),
      botId: bot.id,
      createdAt: new Date().toISOString(),
      period,
      metrics: {
        totalReturn: 0,
        marketReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        winRate: 0,
        tradeCount: 0,
      },
    };
  }

  const runtimeBot = new BaseBot(bot);
  const equityCurve: number[] = [INITIAL_CAPITAL];
  const dailyReturns: number[] = [];
  let wins = 0;
  let losses = 0;
  let previousExposure = 0;
  let feeAdjustedEquity = INITIAL_CAPITAL;

  for (let i = 1; i < closes.length; i++) {
    const historySlice = closes.slice(0, i);
    const actionScore = runtimeBot.processTick(historySlice);
    const exposure = Math.max(0, actionScore); // long-only, 0..1 eksponering
    const assetReturn = (closes[i] - closes[i - 1]) / closes[i - 1];
    const strategyReturn = exposure * assetReturn;

    const didChangePosition = (previousExposure === 0 && exposure > 0) || (previousExposure > 0 && exposure === 0);
    const feeReturn = didChangePosition ? TRANSACTION_FEE / Math.max(feeAdjustedEquity, 1) : 0;
    const netStrategyReturn = strategyReturn - feeReturn;

    if (netStrategyReturn > 0) wins += 1;
    if (netStrategyReturn < 0) losses += 1;

    dailyReturns.push(netStrategyReturn);
    feeAdjustedEquity = feeAdjustedEquity * (1 + netStrategyReturn);
    equityCurve.push(feeAdjustedEquity);
    previousExposure = exposure;
  }

  const finalValue = equityCurve[equityCurve.length - 1];
  const totalReturn = ((finalValue - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
  const marketReturn = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
  const maxDrawdown = calculateMaxDrawdown(equityCurve);
  const sharpeRatio = calculateSharpeRatio(dailyReturns);
  const tradeCount = wins + losses;
  const winRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;

  return {
    id: createId(),
    botId: bot.id,
    createdAt: new Date().toISOString(),
    period,
    metrics: {
      totalReturn,
      marketReturn,
      maxDrawdown,
      sharpeRatio,
      winRate,
      tradeCount,
    },
  };
};

export const runAlphaZeroChallengeCycle = async (
  repository: IBotRepository,
  options: RunChallengeOptions
): Promise<ChallengeRunResult> => {
  const period = options.period ?? '1y';
  const symbol = options.symbol ?? 'SPY';
  const dataMode = options.dataMode ?? 'historical';
  const sourceBot = await repository.getBot(options.sourceBotId);
  if (!sourceBot) {
    throw new Error(`Could not find source bot: ${options.sourceBotId}`);
  }

  const ruleEngine = new RuleEngine();
  ruleEngine.setRules(options.rules);
  const challenge = ruleEngine.generateAlphaZeroChallengeBots(sourceBot, options.proposals);

  const baselineEvaluation = await evaluateBotDNA(challenge.baselineBot, symbol, period, dataMode);
  const challengerEvaluation = await evaluateBotDNA(challenge.challengerBot, symbol, period, dataMode);

  await repository.saveBot(challenge.baselineBot);
  await repository.saveBot(challenge.challengerBot);
  await repository.saveEvaluation(baselineEvaluation);
  await repository.saveEvaluation(challengerEvaluation);

  const event: EvolutionEvent = {
    id: createId(),
    createdAt: new Date().toISOString(),
    cycleNumber: (await repository.loadFactoryState()).cycleNumber + 1,
    type: 'mutate',
    botId: challenge.challengerBot.id,
    sourceBotIds: [challenge.baselineBot.id],
    notes: `Applied ${challenge.appliedChanges.length} changes, rejected ${challenge.rejectedChanges.length}.`,
  };
  await repository.appendEvolutionEvent(event);

  const state = await repository.loadFactoryState();
  const activeBotIds = Array.from(new Set([...state.activeBotIds, challenge.baselineBot.id, challenge.challengerBot.id]));
  await repository.saveFactoryState({
    ...state,
    cycleNumber: event.cycleNumber,
    lastRunAt: event.createdAt,
    activeBotIds,
  });

  const ollamaPrompt = buildOllamaChallengePrompt({
    baseline: toBotEvaluationResult(baselineEvaluation),
    challenger: toBotEvaluationResult(challengerEvaluation),
    appliedChanges: challenge.appliedChanges,
  });

  return {
    baselineBot: challenge.baselineBot,
    challengerBot: challenge.challengerBot,
    baselineEvaluation,
    challengerEvaluation,
    appliedChanges: challenge.appliedChanges,
    rejectedChanges: challenge.rejectedChanges,
    ollamaPrompt,
  };
};
