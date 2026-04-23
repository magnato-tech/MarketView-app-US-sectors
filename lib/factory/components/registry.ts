import { BotDNAComponent } from '../../../types/bot-dna';
import { CrisisComponent } from './CrisisComponent';
import { FactoryComponent } from './types';
import { TrendComponent } from './TrendComponent';

const registry: Record<string, FactoryComponent> = {
  [TrendComponent.id]: TrendComponent,
  [CrisisComponent.id]: CrisisComponent,
};

export const getFactoryComponent = (componentId: string): FactoryComponent | null => {
  return registry[componentId] ?? null;
};

export const hasFactoryComponent = (component: BotDNAComponent): boolean => {
  return Boolean(registry[component.id]);
};

export const listFactoryComponents = (): FactoryComponent[] => Object.values(registry);
