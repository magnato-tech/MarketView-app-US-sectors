import { runFactoryEvolutionCycle } from '../../lib/factory/EvolutionCycle';

type VercelLikeRequest = {
  method?: string;
  body?: {
    symbol?: string;
    period?: '1y' | '2y' | '5y';
    dataMode?: 'historical' | 'simulator';
  };
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
};

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const result = await runFactoryEvolutionCycle({
      symbol: req.body?.symbol,
      period: req.body?.period,
      dataMode: req.body?.dataMode,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown factory run error',
    });
  }
}
