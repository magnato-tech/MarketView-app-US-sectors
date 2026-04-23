import { BotDNA, BotDNAComponent } from '../../types/bot-dna';
import { assertValidBotUniverse } from './tradingUniverse';

export type LogicGate = 'STRICT' | 'CHALLENGEABLE' | 'EXPERIMENTAL';

export interface RuleDefinition {
  id: string;
  logic_gate: LogicGate;
  componentId: string;
  paramKey: string;
  baselineValue: number | string | boolean;
  min?: number;
  max?: number;
}

export interface ChallengerParamProposal {
  componentId: string;
  paramKey: string;
  value: number | string | boolean;
}

export interface ChallengeBuildResult {
  baselineBot: BotDNA;
  challengerBot: BotDNA;
  appliedChanges: ChallengerParamProposal[];
  rejectedChanges: ChallengerParamProposal[];
}

const deepCloneDna = (dna: BotDNA): BotDNA => ({
  ...dna,
  components: dna.components.map((component) => ({
    ...component,
    params: { ...component.params },
  })),
});

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isValueWithinBounds = (rule: RuleDefinition, proposedValue: number | string | boolean): boolean => {
  if (rule.min == null && rule.max == null) return true;
  const asNumber = toFiniteNumber(proposedValue);
  if (asNumber == null) return false;
  if (rule.min != null && asNumber < rule.min) return false;
  if (rule.max != null && asNumber > rule.max) return false;
  return true;
};

const findComponent = (components: BotDNAComponent[], componentId: string): BotDNAComponent | null =>
  components.find((component) => component.id === componentId) ?? null;

export class RuleEngine {
  private rules: RuleDefinition[] = [];

  private assertMaxTwoTradingCategories(bot: BotDNA): void {
    const categories = bot.tradingUniverse?.allowedCategories ?? [];
    if (categories.length > 2) {
      throw new Error(`Bot ${bot.id} violates RuleEngine category cap: max two trading categories.`);
    }
  }

  loadRulesFromJson(rawJson: string): RuleDefinition[] {
    const parsed = JSON.parse(rawJson) as RuleDefinition[];
    this.validateRules(parsed);
    this.rules = parsed;
    return this.rules;
  }

  setRules(rules: RuleDefinition[]): void {
    this.validateRules(rules);
    this.rules = [...rules];
  }

  getRules(): RuleDefinition[] {
    return [...this.rules];
  }

  generateAlphaZeroChallengeBots(
    sourceBot: BotDNA,
    proposals: ChallengerParamProposal[]
  ): ChallengeBuildResult {
    this.assertMaxTwoTradingCategories(sourceBot);
    assertValidBotUniverse(sourceBot);
    const baselineBot = this.buildBaselineBot(sourceBot);
    const challengerBot = deepCloneDna(baselineBot);
    const appliedChanges: ChallengerParamProposal[] = [];
    const rejectedChanges: ChallengerParamProposal[] = [];

    for (const proposal of proposals) {
      const rule = this.rules.find(
        (candidate) =>
          candidate.componentId === proposal.componentId && candidate.paramKey === proposal.paramKey
      );

      if (!rule) {
        rejectedChanges.push(proposal);
        continue;
      }

      if (rule.logic_gate === 'STRICT') {
        rejectedChanges.push(proposal);
        continue;
      }

      if (!isValueWithinBounds(rule, proposal.value)) {
        rejectedChanges.push(proposal);
        continue;
      }

      const target = findComponent(challengerBot.components, proposal.componentId);
      if (!target) {
        rejectedChanges.push(proposal);
        continue;
      }

      target.params[proposal.paramKey] = proposal.value;
      appliedChanges.push(proposal);
    }

    challengerBot.id = `${baselineBot.id}-challenger`;
    challengerBot.generation = baselineBot.generation + 1;
    challengerBot.status = 'Candidate';
    assertValidBotUniverse(challengerBot);

    return { baselineBot, challengerBot, appliedChanges, rejectedChanges };
  }

  private buildBaselineBot(sourceBot: BotDNA): BotDNA {
    const baselineBot = deepCloneDna(sourceBot);

    for (const rule of this.rules) {
      const component = findComponent(baselineBot.components, rule.componentId);
      if (!component) continue;
      component.params[rule.paramKey] = rule.baselineValue;
    }

    baselineBot.id = `${sourceBot.id}-baseline`;
    baselineBot.status = 'Candidate';
    return baselineBot;
  }

  private validateRules(rules: RuleDefinition[]): void {
    if (!Array.isArray(rules)) {
      throw new Error('RuleEngine expected an array of rules.');
    }

    for (const rule of rules) {
      if (!rule.id || !rule.componentId || !rule.paramKey) {
        throw new Error('Each rule must define id, componentId and paramKey.');
      }
      if (!['STRICT', 'CHALLENGEABLE', 'EXPERIMENTAL'].includes(rule.logic_gate)) {
        throw new Error(`Invalid logic_gate for rule ${rule.id}.`);
      }
    }
  }
}
