import { getRepository } from '../../services/factory/repositories/RepositoryFactory';

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

  const repository = getRepository();
  const bot = await repository.getBot(botId);
  if (!bot) {
    res.status(404).json({ error: `Bot not found: ${botId}` });
    return;
  }
  if (bot.status !== 'Draft') {
    res.status(400).json({ error: `Only Draft bots can be sent to Factory. Current status: ${bot.status}` });
    return;
  }

  const candidate = { ...bot, status: 'Candidate' as const };
  await repository.saveBot(candidate);
  res.status(200).json({ bot: candidate });
}

