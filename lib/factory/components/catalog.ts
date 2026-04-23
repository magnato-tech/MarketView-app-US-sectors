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
  {
    id: 'VIX_RISK_MANAGER',
    type: 'risk',
    title: 'VIX Risk Manager',
    description: 'Reduserer eksponering når VIX (fryktindeksen) stiger over et visst nivå.',
    defaultWeight: 0.5,
    defaultParams: {
      threshold: 25.0,
      exitMultiplier: 1.5,
    },
  },
  {
    id: 'RSI_FILTER',
    type: 'filter',
    title: 'RSI Filter',
    description: 'Bruker Relative Strength Index for å identifisere overkjøpte eller oversolgte tilstander.',
    defaultWeight: 0.3,
    defaultParams: {
      period: 14,
      overbought: 70,
      oversold: 30,
      mode: 'TREND',
    },
  },
];

