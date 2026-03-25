import { Request, Response, NextFunction, RequestHandler } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Create a rate limiter middleware with configurable window and max requests.
 * Uses in-memory storage keyed by client IP + user ID (if authenticated).
 */
export function createRateLimiter(windowMs: number, maxRequests: number): RequestHandler {
  const storeKey = `${windowMs}:${maxRequests}`;

  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());

    // Periodic cleanup of expired entries every 5 minutes
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const store = stores.get(storeKey);
      if (store) {
        for (const [key, entry] of store) {
          if (now > entry.resetAt) {
            store.delete(key);
          }
        }
      }
    }, 5 * 60 * 1000);
    cleanupInterval.unref();
  }

  const store = stores.get(storeKey)!;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as any).user?.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = userId ? `user:${userId}` : `ip:${ip}`;
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
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

/** Registration: 5 requests per 15 minutes */
export const registerLimiter = createRateLimiter(15 * 60 * 1000, 5);

/** Login: 10 requests per 15 minutes */
export const loginLimiter = createRateLimiter(15 * 60 * 1000, 10);

/** General API endpoints: 100 requests per 15 minutes */
export const apiLimiter = createRateLimiter(15 * 60 * 1000, 100);

/** Rating endpoints: 10 requests per 1 minute */
export const ratingLimiter = createRateLimiter(60 * 1000, 10);
