export type TradeType = 'BUY' | 'SELL';
export type TradeSource = 'MANUAL' | 'AI' | 'BOT';

export interface AISignal {
  symbol: string;
  type: TradeType;
  quantity: number;
  reason: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
}

export interface Transaction {
  id: string;
  timestamp: number;
  symbol: string;
  type: TradeType;
  price: number;
  quantity: number;
  source: TradeSource;
  reason?: string;
  botId?: string;
}
