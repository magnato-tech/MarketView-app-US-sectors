import { FACTORY_COMPONENT_CATALOG } from '../../lib/factory/components/catalog';

type VercelLikeRequest = { method?: string };
type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
};

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  res.status(200).json({ components: FACTORY_COMPONENT_CATALOG });
}

