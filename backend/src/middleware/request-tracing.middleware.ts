import { Request, Response, NextFunction } from 'express';

type Trace = {
  route: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
};

const traces: Trace[] = [];

export function requestTracer(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    traces.push({
      route: req.originalUrl,
      method: req.method,
      duration,
      status: res.statusCode,
      timestamp: Date.now(),
    });

    // keep last 1000 only
    if (traces.length > 1000) traces.shift();
  });

  next();
}

export function getTraces() {
  return traces;
}
