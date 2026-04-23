export type BotComponentType = 'signal' | 'filter' | 'risk';
export type BotLifecycleStatus = 'Draft' | 'Candidate' | 'Published' | 'Deployed';

export type TradingCategory = 'MAIN_SECTOR' | 'ETF' | 'STOCK';

export type CategoryFocusMode = 'LOCKED_SINGLE' | 'PREFER_SINGLE_ACTIVE';

export interface TradingUniverseConfig {
  allowedCategories: TradingCategory[];
  focusMode: CategoryFocusMode;
  preferredCategory?: TradingCategory;
}

export interface BotDNAComponent {
  type: BotComponentType;
  id: string;
  weight: number; // 0..1
  params: Record<string, number | string | boolean>;
}

export interface BotDNA {
  id: string;
  version: string;
  generation: number;
  status: BotLifecycleStatus;
  components: BotDNAComponent[];
  tradingUniverse?: TradingUniverseConfig;
}
