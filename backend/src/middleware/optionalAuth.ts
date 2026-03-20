import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser, AuthRequest } from './auth';

/**
 * Like authenticate(), but doesn't reject if no token is present.
 * Sets req.user if a valid token exists, otherwise leaves it undefined.
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.substring(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      next();
      return;
    }
    const decoded = jwt.verify(token, secret) as AuthUser;
    req.user = decoded;
  } catch {
    // Invalid token — treat as anonymous
  }

  next();
}
