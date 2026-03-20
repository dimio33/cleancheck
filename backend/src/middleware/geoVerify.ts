import { Request, Response, NextFunction, RequestHandler } from 'express';
import { query } from '../utils/db';

// ============================================================
// Types
// ============================================================

export interface GeoVerifyOptions {
  maxDistanceMeters: number; // default 200
}

// ============================================================
// Haversine distance (meters)
// ============================================================

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================
// Middleware factory
// ============================================================

export function geoVerify(options?: GeoVerifyOptions): RequestHandler {
  const maxDistance = options?.maxDistanceMeters ?? 200;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userLatStr = req.headers['x-user-lat'] as string | undefined;
      const userLngStr = req.headers['x-user-lng'] as string | undefined;

      // Geo headers are required when this middleware is used
      if (!userLatStr || !userLngStr) {
        res.status(400).json({ error: 'X-User-Lat and X-User-Lng headers are required' });
        return;
      }

      const userLat = parseFloat(userLatStr);
      const userLng = parseFloat(userLngStr);

      if (isNaN(userLat) || isNaN(userLng)) {
        res.status(400).json({ error: 'Invalid location coordinates' });
        return;
      }

      // Get restaurant_id from body
      const restaurantId = req.body?.restaurant_id;
      if (!restaurantId) {
        res.status(400).json({ error: 'restaurant_id is required for geo verification' });
        return;
      }

      // Look up restaurant location
      const result = await query<{ lat: number; lng: number }>(
        `SELECT lat, lng FROM restaurants WHERE id = $1`,
        [restaurantId]
      );

      if (result.rows.length === 0) {
        // Restaurant not found — let the route handler return 404
        next();
        return;
      }

      const restaurant = result.rows[0];
      const distance = calculateDistance(userLat, userLng, restaurant.lat, restaurant.lng);

      if (distance > maxDistance) {
        res.status(403).json({
          error: 'Du musst in der Naehe des Restaurants sein um zu bewerten / You must be near the restaurant to rate',
          distance: Math.round(distance),
          maxDistance,
        });
        return;
      }

      next();
    } catch (err) {
      console.error('Geo-verify error:', err);
      res.status(500).json({ error: 'Location verification failed' });
    }
  };
}
