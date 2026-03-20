import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';

const router = Router();

// GET /api/restaurants — search by location
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, radius, minScore } = req.query;

    if (!lat || !lng) {
      res.status(400).json({ error: 'lat and lng query parameters are required' });
      return;
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusKm = parseFloat((radius as string) || '5');
    const minCleanScore = parseFloat((minScore as string) || '0');

    if (isNaN(latitude) || isNaN(longitude)) {
      res.status(400).json({ error: 'Invalid lat or lng values' });
      return;
    }

    // Haversine formula to find restaurants within radius
    const result = await query(
      `SELECT *,
        (6371 * acos(
          cos(radians($1)) * cos(radians(lat)) *
          cos(radians(lng) - radians($2)) +
          sin(radians($1)) * sin(radians(lat))
        )) AS distance
       FROM restaurants
       WHERE (6371 * acos(
          cos(radians($1)) * cos(radians(lat)) *
          cos(radians(lng) - radians($2)) +
          sin(radians($1)) * sin(radians(lat))
        )) <= $3
        AND clean_score >= $4
       ORDER BY distance ASC
       LIMIT 100`,
      [latitude, longitude, radiusKm, minCleanScore]
    );

    res.json({ restaurants: result.rows });
  } catch (err) {
    console.error('Search restaurants error:', err);
    res.status(500).json({ error: 'Failed to search restaurants' });
  }
});

// GET /api/restaurants/:id — full restaurant details
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const restaurantResult = await query(
      `SELECT * FROM restaurants WHERE id = $1`,
      [id]
    );

    if (restaurantResult.rows.length === 0) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    const ratingsResult = await query(
      `SELECT r.*, u.username, u.avatar_url
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       WHERE r.restaurant_id = $1
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [id]
    );

    // Get photos for these ratings
    const ratingIds = ratingsResult.rows.map((r) => r.id);
    let photos: Record<string, unknown>[] = [];

    if (ratingIds.length > 0) {
      const photosResult = await query(
        `SELECT * FROM rating_photos WHERE rating_id = ANY($1)`,
        [ratingIds]
      );
      photos = photosResult.rows;
    }

    res.json({
      restaurant: restaurantResult.rows[0],
      ratings: ratingsResult.rows,
      photos,
    });
  } catch (err) {
    console.error('Get restaurant error:', err);
    res.status(500).json({ error: 'Failed to get restaurant' });
  }
});

// POST /api/restaurants — create restaurant (anonymous or authenticated)
router.post('/', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, address, lat, lng, city, cuisine_type, osm_id } = req.body;

    if (!name || lat === undefined || lng === undefined) {
      res.status(400).json({ error: 'name, lat, and lng are required' });
      return;
    }

    // Validate name length
    if (typeof name !== 'string' || name.length < 2 || name.length > 200) {
      res.status(400).json({ error: 'Name must be between 2 and 200 characters' });
      return;
    }

    // Validate lat/lng ranges
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      res.status(400).json({ error: 'Latitude must be between -90 and 90' });
      return;
    }

    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      res.status(400).json({ error: 'Longitude must be between -180 and 180' });
      return;
    }

    const result = await query(
      `INSERT INTO restaurants (name, address, lat, lng, city, cuisine_type, osm_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, address || null, lat, lng, city || null, cuisine_type || null, osm_id || null]
    );

    res.status(201).json({ restaurant: result.rows[0] });
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as Record<string, unknown>).code === '23505') {
      res.status(409).json({ error: 'Restaurant with this OSM ID already exists' });
      return;
    }
    console.error('Create restaurant error:', err);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

export default router;
