import { Request, Response, NextFunction, RequestHandler } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Create a rate limiter middleware with configurable window and max requests.
 * Uses in-memory storage keyed by client IP.
 */
export function createRateLimiter(windowMs: number, maxRequests: number): RequestHandler {
  const storeKey = `${windowMs}:${maxRequests}`;

  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }

  const store = stores.get(storeKey)!;

  // Periodic cleanup of expired entries every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: 'Too many requests, please try again later',
        retryAfter: retryAfterSec,
      });
      return;
    }

    next();
  };
}

/** Auth endpoints: 15 requests per 15 minutes */
export const authLimiter = createRateLimiter(15 * 60 * 1000, 15);

/** General API endpoints: 100 requests per 15 minutes */
export const apiLimiter = createRateLimiter(15 * 60 * 1000, 100);

/** Rating endpoints: 10 requests per 1 minute */
export const ratingLimiter = createRateLimiter(60 * 1000, 10);
