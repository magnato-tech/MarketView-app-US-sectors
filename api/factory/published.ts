import { LocalFileBotRepository } from '../../services/factory/repositories/LocalFileBotRepository';

type VercelLikeRequest = {
  method?: string;
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
};

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const repository = new LocalFileBotRepository();
    const bots = await repository.listPublishedBots();
    res.status(200).json({ bots });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown list published error',
    });
  }
}
