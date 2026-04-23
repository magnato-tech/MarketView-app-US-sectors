import { BotDNA } from './bot-dna';

export interface EvaluationSnapshot {
  id: string;
  botId: string;
  createdAt: string;
  period: '1y' | '2y' | '5y';
  metrics: {
    totalReturn: number;
    marketReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    tradeCount: number;
    finalFitness?: number;
  };
}

export interface EvolutionEvent {
  id: string;
  createdAt: string;
  cycleNumber: number;
  type: 'spawn' | 'retire' | 'mutate' | 'crossover' | 'promote';
  botId: string;
  sourceBotIds?: string[];
  notes?: string;
}

export interface FactoryState {
  cycleNumber: number;
  activeBotIds: string[];
  lastRunAt?: string;
  settings: {
    maxPopulation: number;
    cycleIntervalHours: number;
    ollamaEnabled: boolean;
    ollamaModel?: string;
  };
}

export interface FactoryStore {
  bots: BotDNA[];
  evaluations: EvaluationSnapshot[];
  evolutionLog: EvolutionEvent[];
  state: FactoryState;
}

export type DeploymentStatus = 'Active' | 'Paused' | 'Stopped';

export interface Deployment {
  id: string;
  botId: string;
  botVersion: string;
  allocatedCapitalNok: number;
  status: DeploymentStatus;
  createdAt: string;
  updatedAt: string;
}
