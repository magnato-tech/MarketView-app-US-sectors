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

export interface DeploymentEquityPoint {
  timestamp: string;
  botValue: number;
  benchmarkValue: number;
}

export interface DeploymentTransaction {
  id: string;
  timestamp: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  feeNok: number;
  note?: string;
}

export interface DeploymentPerformance {
  totalReturnPct: number;
  benchmarkReturnPct: number;
  relativeDeltaPct: number;
  maxDrawdownPct: number;
  feesPaidNok: number;
}

export interface WeeklyPulseSnapshot {
  deploymentId: string;
  weekStart: string;
  weekEnd: string;
  weeklyReturnPct: number;
  benchmarkWeeklyReturnPct: number;
  relativeWeeklyDeltaPct: number;
  weeklyFeesPaidNok: number;
  narrative: string;
  createdAt: string;
}

export interface Deployment {
  id: string;
  botId: string;
  botVersion: string;
  allocatedCapitalNok: number; // Snapshot of capital at deployment or rebalance
  allocatedPct?: number;       // Percentage of total portfolio capital (0-100)
  isLocked?: boolean;          // Safety lock for live mode
  symbol?: string;
  benchmarkSymbol?: string;
  status: DeploymentStatus;
  performance?: DeploymentPerformance;
  equityCurve?: DeploymentEquityPoint[];
  transactions?: DeploymentTransaction[];
  weeklyPulse?: WeeklyPulseSnapshot;
  liveBalanceNok?: number;      // Current live balance
  liveEquityCurve?: DeploymentEquityPoint[]; // Equity curve starting from activation
  lastProcessedAt?: string;    // Last time the weekly engine ran
  backtestPerformance?: DeploymentPerformance; // Store the 2y test separately
  interval?: '1d' | '1wk' | '1mo'; // Trading frequency
  createdAt: string;
  updatedAt: string;
}
