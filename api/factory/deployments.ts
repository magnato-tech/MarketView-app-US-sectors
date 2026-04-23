import { LocalFileBotRepository } from '../../services/factory/repositories/LocalFileBotRepository';
import { Deployment } from '../../types/simulation';

type VercelLikeRequest = {
  method?: string;
  body?: {
    botId?: string;
    allocatedCapitalNok?: number;
  };
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
};

const createDeploymentId = (): string =>
  `dep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  const repository = new LocalFileBotRepository();

  if (req.method === 'GET') {
    try {
      const deployments = await repository.listDeployments();
      res.status(200).json({ deployments });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown list deployment error',
      });
    }
    return;
  }

  if (req.method === 'POST') {
    const botId = req.body?.botId;
    const allocatedCapitalNok = Number(req.body?.allocatedCapitalNok ?? 0);
    if (!botId) {
      res.status(400).json({ error: 'botId is required.' });
      return;
    }
    if (!Number.isFinite(allocatedCapitalNok) || allocatedCapitalNok <= 0) {
      res.status(400).json({ error: 'allocatedCapitalNok must be > 0.' });
      return;
    }

    try {
      const bot = await repository.getBot(botId);
      if (!bot) {
        res.status(404).json({ error: `Bot not found: ${botId}` });
        return;
      }
      if (bot.status !== 'Published') {
        res.status(400).json({ error: `Bot ${botId} is not Published and cannot be deployed.` });
        return;
      }

      const now = new Date().toISOString();
      const deployment: Deployment = {
        id: createDeploymentId(),
        botId: bot.id,
        botVersion: bot.version,
        allocatedCapitalNok,
        status: 'Active',
        createdAt: now,
        updatedAt: now,
      };

      await repository.saveDeployment(deployment);
      res.status(200).json({ deployment });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown create deployment error',
      });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
