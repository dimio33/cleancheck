import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { query } from '../utils/db';

/**
 * Middleware that checks the authenticated user has one of the allowed roles.
 * Must be placed AFTER authenticate() in the middleware chain.
 */
export function requireRole(...roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await query<{ role: string }>(
        `SELECT role FROM users WHERE id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      const userRole = result.rows[0].role || 'user';

      if (!roles.includes(userRole)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (err) {
      console.error('Role check error:', err);
      res.status(500).json({ error: 'Failed to verify permissions' });
    }
  };
}

/**
 * Middleware that checks the authenticated user owns the restaurant.
 * Resolves restaurant ID from req.params.id or req.params.restaurantId.
 * Must be placed AFTER authenticate() in the middleware chain.
 */
export function requireRestaurantOwner() {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const restaurantId = req.params.restaurantId || req.params.id;

      if (!restaurantId) {
        res.status(400).json({ error: 'Restaurant ID required' });
        return;
      }

      const result = await query<{ owner_id: string | null }>(
        `SELECT owner_id FROM restaurants WHERE id = $1`,
        [restaurantId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }

      if (result.rows[0].owner_id !== req.user.id) {
        res.status(403).json({ error: 'You are not the owner of this restaurant' });
        return;
      }

      next();
    } catch (err) {
      console.error('Restaurant owner check error:', err);
      res.status(500).json({ error: 'Failed to verify restaurant ownership' });
    }
  };
}
