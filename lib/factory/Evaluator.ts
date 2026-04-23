import { ChallengerParamProposal } from './RuleEngine';

export interface BotEvaluationResult {
  botId: string;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown?: number;
}

export interface ChallengeEvaluationInput {
  baseline: BotEvaluationResult;
  challenger: BotEvaluationResult;
  appliedChanges: ChallengerParamProposal[];
}

const formatChange = (change: ChallengerParamProposal): string =>
  `${change.componentId}.${change.paramKey}=${String(change.value)}`;

export const buildChallengeReport = (input: ChallengeEvaluationInput): string => {
  const improvement = input.challenger.totalReturn - input.baseline.totalReturn;
  const winnerLabel = improvement >= 0 ? 'challenger-bot' : 'baseline-bot';
  const absoluteImprovement = Math.abs(improvement).toFixed(2);
  const changesText =
    input.appliedChanges.length > 0
      ? input.appliedChanges.map(formatChange).join(', ')
      : 'ingen parameterendringer';

  return [
    `Resultat: ${winnerLabel} vant med ${absoluteImprovement} prosentpoeng i total avkastning.`,
    `Baseline avkastning: ${input.baseline.totalReturn.toFixed(2)}% (Sharpe ${input.baseline.sharpeRatio.toFixed(2)}).`,
    `Challenger avkastning: ${input.challenger.totalReturn.toFixed(2)}% (Sharpe ${input.challenger.sharpeRatio.toFixed(2)}).`,
    `Aktive endringer: ${changesText}.`,
  ].join(' ');
};

export const buildOllamaChallengePrompt = (input: ChallengeEvaluationInput): string => {
  const report = buildChallengeReport(input);
  const changesText =
    input.appliedChanges.length > 0
      ? input.appliedChanges.map(formatChange).join(', ')
      : 'ingen';

  return [
    `${report}`,
    `Forklar hvorfor utfordreren gjorde det ${input.challenger.totalReturn >= input.baseline.totalReturn ? 'bedre' : 'dårligere'} i dagens marked.`,
    `Fokuser på disse endringene: ${changesText}.`,
    'Svar kort med 3-5 konkrete punkter knyttet til trend, volatilitet og risikostyring.',
  ].join(' ');
};
