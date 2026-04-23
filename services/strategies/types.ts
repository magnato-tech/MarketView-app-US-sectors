import { BotConfig, BotState, SummaryStats, Trade } from '../../types';

export interface StrategyStepInput {
  config: BotConfig;
  state: BotState;
  marketSummary: SummaryStats[];
  vixValue: number;
}

export interface StrategyStepResult {
  newState: BotState;
  trades: Trade[];
}

export interface ITradingStrategy {
  id: string;
  step(input: StrategyStepInput): StrategyStepResult;
}
