import { BotDNAComponent } from '../../../types/bot-dna';
import { CrisisComponent } from './CrisisComponent';
import { FactoryComponent } from './types';
import { TrendComponent } from './TrendComponent';
import { RotationMomentumComponent } from './RotationMomentum';
import { VixRiskManager } from './VixRiskManager';
import { RSIFilterComponent } from './RSIFilterComponent';

const registry: Record<string, FactoryComponent> = {
  [TrendComponent.id]: TrendComponent,
  [CrisisComponent.id]: CrisisComponent,
  [RotationMomentumComponent.id]: RotationMomentumComponent,
  [VixRiskManager.id]: VixRiskManager,
  [RSIFilterComponent.id]: RSIFilterComponent,
};

export const getFactoryComponent = (componentId: string): FactoryComponent | null => {
  return registry[componentId] ?? null;
};

export const hasFactoryComponent = (component: BotDNAComponent): boolean => {
  return Boolean(registry[component.id]);
};

export const listFactoryComponents = (): FactoryComponent[] => Object.values(registry);
