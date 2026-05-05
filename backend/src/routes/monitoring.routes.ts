import { Router, Request, Response } from 'express';
import { getTraces } from '../middleware/request-tracing.middleware';

const router = Router();

router.get("/performance", (req: Request, res: Response) => {
  const traces = getTraces();

  const avg =
    traces.reduce((a, t) => a + t.duration, 0) / (traces.length || 1);

  const slow = traces.filter(t => t.duration > 300).length;

  res.json({
    totalRequests: traces.length,
    avgResponseTime: Math.round(avg),
    slowRequests: slow,
  });
});

export default router;
