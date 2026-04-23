import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BotDNA } from '../../../types/bot-dna';
import { Deployment, EvaluationSnapshot, EvolutionEvent, FactoryState } from '../../../types/simulation';
import { IBotRepository } from './IBotRepository';

type JsonValue = BotDNA[] | EvaluationSnapshot[] | EvolutionEvent[] | FactoryState | Deployment[];

const DEFAULT_FACTORY_STATE: FactoryState = {
  cycleNumber: 0,
  activeBotIds: [],
  settings: {
    maxPopulation: 10,
    cycleIntervalHours: 48,
    ollamaEnabled: false,
  },
};

export class LocalFileBotRepository implements IBotRepository {
  private readonly baseDir: string;
  private readonly botsFile: string;
  private readonly evaluationsFile: string;
  private readonly deploymentsFile: string;
  private readonly evolutionLogFile: string;
  private readonly stateFile: string;

  constructor(baseDir = path.join(process.cwd(), 'data', 'factory')) {
    this.baseDir = baseDir;
    this.botsFile = path.join(baseDir, 'bots.json');
    this.evaluationsFile = path.join(baseDir, 'evaluations.json');
    this.deploymentsFile = path.join(baseDir, 'deployments.json');
    this.evolutionLogFile = path.join(baseDir, 'evolution-log.json');
    this.stateFile = path.join(baseDir, 'factory-state.json');
  }

  async listBots(): Promise<BotDNA[]> {
    return this.readJsonFile<BotDNA[]>(this.botsFile, []);
  }

  async listPublishedBots(): Promise<BotDNA[]> {
    const bots = await this.listBots();
    return bots.filter((bot) => bot.status === 'Published');
  }

  async getBot(id: string): Promise<BotDNA | null> {
    const bots = await this.listBots();
    return bots.find((bot) => bot.id === id) ?? null;
  }

  async saveBot(bot: BotDNA): Promise<void> {
    const bots = await this.listBots();
    const idx = bots.findIndex((item) => item.id === bot.id);
    if (idx >= 0 && bots[idx].status === 'Published') {
      const unchanged = JSON.stringify(bots[idx]) === JSON.stringify(bot);
      if (!unchanged) {
        throw new Error(`Bot ${bot.id} is Published and immutable. Create a new version to modify.`);
      }
    }
    if (idx >= 0) {
      bots[idx] = bot;
    } else {
      bots.push(bot);
    }
    await this.writeJsonFileAtomic(this.botsFile, bots);
  }

  async publishBot(id: string): Promise<BotDNA> {
    const bots = await this.listBots();
    const idx = bots.findIndex((item) => item.id === id);
    if (idx < 0) {
      throw new Error(`Could not publish bot ${id}: bot not found.`);
    }

    const current = bots[idx];
    const published: BotDNA = { ...current, status: 'Published' };
    bots[idx] = published;
    await this.writeJsonFileAtomic(this.botsFile, bots);
    return published;
  }

  async deleteBot(id: string): Promise<void> {
    const bots = await this.listBots();
    await this.writeJsonFileAtomic(
      this.botsFile,
      bots.filter((bot) => bot.id !== id)
    );
  }

  async listEvaluations(botId?: string): Promise<EvaluationSnapshot[]> {
    const all = await this.readJsonFile<EvaluationSnapshot[]>(this.evaluationsFile, []);
    if (!botId) return all;
    return all.filter((evaluation) => evaluation.botId === botId);
  }

  async saveEvaluation(evaluation: EvaluationSnapshot): Promise<void> {
    const evaluations = await this.readJsonFile<EvaluationSnapshot[]>(this.evaluationsFile, []);
    evaluations.push(evaluation);
    await this.writeJsonFileAtomic(this.evaluationsFile, evaluations);
  }

  async listDeployments(): Promise<Deployment[]> {
    return this.readJsonFile<Deployment[]>(this.deploymentsFile, []);
  }

  async saveDeployment(deployment: Deployment): Promise<void> {
    const deployments = await this.listDeployments();
    const idx = deployments.findIndex((item) => item.id === deployment.id);
    if (idx >= 0) {
      deployments[idx] = deployment;
    } else {
      deployments.push(deployment);
    }
    await this.writeJsonFileAtomic(this.deploymentsFile, deployments);
  }

  async listEvolutionEvents(): Promise<EvolutionEvent[]> {
    return this.readJsonFile<EvolutionEvent[]>(this.evolutionLogFile, []);
  }

  async appendEvolutionEvent(event: EvolutionEvent): Promise<void> {
    const log = await this.listEvolutionEvents();
    log.push(event);
    await this.writeJsonFileAtomic(this.evolutionLogFile, log);
  }

  async loadFactoryState(): Promise<FactoryState> {
    return this.readJsonFile<FactoryState>(this.stateFile, DEFAULT_FACTORY_STATE);
  }

  async saveFactoryState(state: FactoryState): Promise<void> {
    await this.writeJsonFileAtomic(this.stateFile, state);
  }

  private async ensureBaseDir(): Promise<void> {
    mkdirSync(this.baseDir, { recursive: true });
  }

  private async readJsonFile<T extends JsonValue>(filePath: string, fallback: T): Promise<T> {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private async writeJsonFileAtomic(filePath: string, data: JsonValue): Promise<void> {
    await this.ensureBaseDir();
    const serialized = JSON.stringify(data, null, 2);
    writeFileSync(filePath, serialized, 'utf-8');
  }
}
