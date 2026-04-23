import { getRepository } from '../../services/factory/repositories/RepositoryFactory';
import { Deployment } from '../../types/simulation';
import { simulateDeployment } from '../../lib/factory/DeploymentSimulator';

type VercelLikeRequest = {
  method?: string;
  body?: {
    deploymentId?: string;
    botId?: string;
    allocatedCapitalNok?: number;
    interval?: '1d' | '1wk' | '1mo';
    status?: 'Active' | 'Paused' | 'Stopped';
    symbol?: string;
    benchmarkSymbol?: string;
    allocatedPct?: number;
    isLocked?: boolean;
  };
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
};

const createDeploymentId = (): string =>
  `dep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  const repository = getRepository();

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
      const symbol = req.body?.symbol || 'SPY';
      const benchmarkSymbol = req.body?.benchmarkSymbol || '^GSPC';
      const interval = req.body?.interval || '1wk';
      const allocatedPct = req.body?.allocatedPct;
      const simulation = await simulateDeployment(bot, allocatedCapitalNok, symbol, benchmarkSymbol);
      const deployment: Deployment = {
        id: createDeploymentId(),
        botId: bot.id,
        botVersion: bot.version,
        allocatedCapitalNok,
        allocatedPct,
        symbol,
        benchmarkSymbol,
        interval,
        status: 'Active',
        performance: simulation.performance,
        equityCurve: simulation.equityCurve,
        transactions: simulation.transactions,
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

  if (req.method === 'PATCH') {
    const deploymentId = req.body?.deploymentId;
    if (!deploymentId) {
      res.status(400).json({ error: 'deploymentId is required.' });
      return;
    }

    try {
      const deployments = await repository.listDeployments();
      const existing = deployments.find((item) => item.id === deploymentId);
      if (!existing) {
        res.status(404).json({ error: `Deployment not found: ${deploymentId}` });
        return;
      }

      let next: Deployment = { ...existing, updatedAt: new Date().toISOString() };
      if (req.body?.status) {
        next.status = req.body.status;
      }

      if (req.body?.isLocked !== undefined) {
        next.isLocked = req.body.isLocked;
      }

      if (req.body?.allocatedCapitalNok != null) {
        const allocatedCapitalNok = Number(req.body.allocatedCapitalNok);
        if (!Number.isFinite(allocatedCapitalNok) || allocatedCapitalNok <= 0) {
          res.status(400).json({ error: 'allocatedCapitalNok must be > 0.' });
          return;
        }

        const bot = await repository.getBot(existing.botId);
        if (!bot) {
          res.status(404).json({ error: `Bot not found: ${existing.botId}` });
          return;
        }

        const simulation = await simulateDeployment(
          bot,
          allocatedCapitalNok,
          existing.symbol || 'SPY',
          existing.benchmarkSymbol || '^GSPC'
        );
        next = {
          ...next,
          allocatedCapitalNok,
          performance: simulation.performance,
          equityCurve: simulation.equityCurve,
          transactions: simulation.transactions,
        };
      }

      await repository.saveDeployment(next);
      res.status(200).json({ deployment: next });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown update deployment error',
      });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
