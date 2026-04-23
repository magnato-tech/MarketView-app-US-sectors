import { BotDNA } from '../../../types/bot-dna';
import { Deployment, EvaluationSnapshot, EvolutionEvent, FactoryState } from '../../../types/simulation';

export interface IBotRepository {
  listBots(): Promise<BotDNA[]>;
  listPublishedBots(): Promise<BotDNA[]>;
  getBot(id: string): Promise<BotDNA | null>;
  saveBot(bot: BotDNA): Promise<void>;
  publishBot(id: string): Promise<BotDNA>;
  deleteBot(id: string): Promise<void>;

  listEvaluations(botId?: string): Promise<EvaluationSnapshot[]>;
  saveEvaluation(evaluation: EvaluationSnapshot): Promise<void>;

  listDeployments(): Promise<Deployment[]>;
  saveDeployment(deployment: Deployment): Promise<void>;

  listEvolutionEvents(): Promise<EvolutionEvent[]>;
  appendEvolutionEvent(event: EvolutionEvent): Promise<void>;

  loadFactoryState(): Promise<FactoryState>;
  saveFactoryState(state: FactoryState): Promise<void>;
}
