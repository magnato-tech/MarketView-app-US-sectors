import { getRepository } from '../../services/factory/repositories/RepositoryFactory';
import { BotDNA, BotDNAComponent } from '../../types/bot-dna';

type VercelLikeRequest = {
  method?: string;
  body?: {
    id?: string;
    version?: string;
    generation?: number;
    components?: BotDNAComponent[];
  };
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
};

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  const repository = getRepository();

  if (req.method === 'GET') {
    const bots = await repository.listBots();
    res.status(200).json({ drafts: bots.filter((bot) => bot.status === 'Draft') });
    return;
  }

  if (req.method === 'POST') {
    const id = req.body?.id?.trim();
    const components = req.body?.components ?? [];
    if (!id) {
      res.status(400).json({ error: 'id is required.' });
      return;
    }
    if (!Array.isArray(components) || components.length === 0) {
      res.status(400).json({ error: 'components is required.' });
      return;
    }

    const draft: BotDNA = {
      id,
      version: req.body?.version || '1.0.0',
      generation: req.body?.generation ?? 0,
      status: 'Draft',
      components,
      tradingUniverse: {
        allowedCategories: ['MAIN_SECTOR'],
        focusMode: 'LOCKED_SINGLE',
        preferredCategory: 'MAIN_SECTOR',
      },
    };

    await repository.saveBot(draft);
    res.status(200).json({ draft });
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}

