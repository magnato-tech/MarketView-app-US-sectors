import { LocalFileBotRepository } from '../../services/factory/repositories/LocalFileBotRepository';
import { BotDNA } from '../../types/bot-dna';

type VercelLikeRequest = {
  method?: string;
  body?: {
    botId?: string;
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

  const botId = req.body?.botId;
  if (!botId) {
    res.status(400).json({ error: 'botId is required.' });
    return;
  }

  const repository = new LocalFileBotRepository();
  const source = await repository.getBot(botId);
  if (!source) {
    res.status(404).json({ error: `Bot not found: ${botId}` });
    return;
  }

  const cloned: BotDNA = {
    ...source,
    id: `${source.id}-draft-${Date.now().toString(36)}`,
    status: 'Draft',
    components: source.components.map((component) => ({
      ...component,
      params: { ...component.params },
    })),
  };

  await repository.saveBot(cloned);
  res.status(200).json({ draft: cloned });
}

