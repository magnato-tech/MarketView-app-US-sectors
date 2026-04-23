import { LocalFileBotRepository } from '../../services/factory/repositories/LocalFileBotRepository';

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

  try {
    const repository = new LocalFileBotRepository();
    const published = await repository.publishBot(botId);
    res.status(200).json({ bot: published });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown publish error',
    });
  }
}
