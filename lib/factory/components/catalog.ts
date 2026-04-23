import { BotComponentType } from '../../../types/bot-dna';

export interface ComponentCatalogItem {
  id: string;
  type: BotComponentType;
  title: string;
  description: string;
  defaultWeight: number;
  defaultParams: Record<string, number | string | boolean>;
}

export const FACTORY_COMPONENT_CATALOG: ComponentCatalogItem[] = [
  {
    id: 'ROTATION_MOMENTUM',
    type: 'signal',
    title: 'Rotation Momentum',
    description: 'Roterer mellom de beste symbolene i et univers basert på momentum.',
    defaultWeight: 1.0,
        defaultParams: {
          lookbackPeriod: 20,
          rotationThresholdPct: 3.0,
          trailingStopLossPct: 5.0,
          universe: 'SMH,MOAT,GDX,RARE', // VanEck: Semiconductors, Wide Moat, Gold Miners, Rare Earth
        },
  },
];

