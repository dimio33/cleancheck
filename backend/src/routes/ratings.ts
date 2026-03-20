import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { query } from '../utils/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';
import { calculateOverallScore, recalculateRestaurantScore } from '../services/scoreService';
import { checkAndAwardBadges } from '../services/badgeService';
import { geoVerify, calculateDistance } from '../middleware/geoVerify';
import { validateImageFile, moderateImage, generateImageHash } from '../services/moderationService';
import { uploadPhoto, isR2Configured } from '../services/storageService';

function generateAnonymousId(req: Request): string {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const hash = crypto.createHash('sha256').update(`${ip}-${ua}`).digest('hex').substring(0, 16);
  return `anon-${hash}`;
}

const router = Router();

// ============================================================
// Multer setup for photo uploads (memoryStorage for R2 + moderation)
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// POST /api/ratings/verify-location — check if user is close enough
router.post('/verify-location', async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurant_id } = req.body;
    const userLatStr = req.headers['x-user-lat'] as string | undefined;
    const userLngStr = req.headers['x-user-lng'] as string | undefined;
    const maxDistance = 500;

    if (!restaurant_id || !userLatStr || !userLngStr) {
      res.status(400).json({ error: 'restaurant_id, X-User-Lat, and X-User-Lng are required' });
      return;
    }

    const userLat = parseFloat(userLatStr);
    const userLng = parseFloat(userLngStr);

    if (isNaN(userLat) || isNaN(userLng)) {
      res.status(400).json({ error: 'Invalid coordinates' });
      return;
    }

    const result = await query<{ lat: number; lng: number }>(
      `SELECT lat, lng FROM restaurants WHERE id = $1`,
      [restaurant_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    const restaurant = result.rows[0];
    const distance = Math.round(
      calculateDistance(userLat, userLng, restaurant.lat, restaurant.lng)
    );

    res.json({
      allowed: distance <= maxDistance,
      distance,
      maxDistance,
    });
  } catch (err) {
    console.error('Verify location error:', err);
    res.status(500).json({ error: 'Failed to verify location' });
  }
});

// POST /api/ratings — create rating (anonymous or authenticated, geo-verified)
router.post('/', optionalAuth, geoVerify({ maxDistanceMeters: 500 }), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurant_id, cleanliness, smell, supplies, condition, accessibility, comment, visited_at } = req.body;

    if (!restaurant_id || !cleanliness || !smell || !supplies || !condition || !accessibility) {
      res.status(400).json({ error: 'restaurant_id and all rating categories are required' });
      return;
    }

    // Validate comment length
    if (comment && typeof comment === 'string' && comment.length > 1000) {
      res.status(400).json({ error: 'Comment must be 1000 characters or fewer' });
      return;
    }

    // Validate ranges
    const scores = [cleanliness, smell, supplies, condition, accessibility];
    for (const score of scores) {
      if (score < 1 || score > 5 || !Number.isInteger(score)) {
        res.status(400).json({ error: 'All scores must be integers between 1 and 5' });
        return;
      }
    }

    // Check restaurant exists
    const restaurantCheck = await query(
      `SELECT id FROM restaurants WHERE id = $1`,
      [restaurant_id]
    );

    if (restaurantCheck.rows.length === 0) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    const isAnonymous = !req.user;
    const userId = req.user?.id || null;
    const anonymousId = isAnonymous ? generateAnonymousId(req) : null;

    // Duplicate rating check — one rating per user/anonymous per restaurant per day
    const visitDate = visited_at || new Date().toISOString().split('T')[0];

    if (isAnonymous) {
      const dupCheck = await query(
        `SELECT id FROM ratings WHERE anonymous_id = $1 AND restaurant_id = $2 AND visited_at = $3`,
        [anonymousId, restaurant_id, visitDate]
      );
      if (dupCheck.rows.length > 0) {
        res.status(409).json({ error: 'You already rated this restaurant today' });
        return;
      }
    } else {
      const duplicateCheck = await query(
        `SELECT id FROM ratings WHERE user_id = $1 AND restaurant_id = $2 AND visited_at = $3`,
        [userId, restaurant_id, visitDate]
      );
      if (duplicateCheck.rows.length > 0) {
        res.status(409).json({ error: 'You already rated this restaurant today' });
        return;
      }
    }

    const overall_score = calculateOverallScore({ cleanliness, smell, supplies, condition, accessibility });

    const result = await query(
      `INSERT INTO ratings (user_id, anonymous_id, restaurant_id, cleanliness, smell, supplies, condition, accessibility, overall_score, comment, visited_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId,
        anonymousId,
        restaurant_id,
        cleanliness,
        smell,
        supplies,
        condition,
        accessibility,
        overall_score,
        comment || null,
        visitDate,
      ]
    );

    // Recalculate restaurant clean_score
    const newScore = await recalculateRestaurantScore(restaurant_id);

    // Check for new badges (only for authenticated users)
    let newBadges: any[] = [];
    if (req.user) {
      newBadges = await checkAndAwardBadges(req.user.id);
    }

    res.status(201).json({
      rating: result.rows[0],
      restaurant_score: newScore,
      new_badges: newBadges,
    });
  } catch (err) {
    console.error('Create rating error:', err);
    res.status(500).json({ error: 'Failed to create rating' });
  }
});

// POST /api/ratings/:id/photos — upload photo for a rating (auth required)
router.post('/:id/photos', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;

    // Check the rating exists and belongs to the authenticated user
    const ratingResult = await query<{ user_id: string }>(
      `SELECT user_id FROM ratings WHERE id = $1`,
      [id]
    );

    if (ratingResult.rows.length === 0) {
      res.status(404).json({ error: 'Rating not found' });
      return;
    }

    if (ratingResult.rows[0].user_id !== req.user.id) {
      res.status(403).json({ error: 'You can only upload photos for your own ratings' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No photo file provided' });
      return;
    }

    // Validate image file
    const validation = validateImageFile({
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    if (!validation.valid) {
      res.status(400).json({ error: validation.reason || 'Invalid image file' });
      return;
    }

    const buffer = req.file.buffer;

    // Run content moderation
    const moderationResult = await moderateImage(buffer, req.file.mimetype);
    if (!moderationResult.allowed) {
      res.status(400).json({ error: 'Image did not pass content moderation', reason: moderationResult.reason });
      return;
    }

    // Upload to R2 or save locally
    let photoUrl: string;
    if (isR2Configured()) {
      photoUrl = await uploadPhoto(buffer, req.file.mimetype, id as string);
    } else {
      // Local fallback for development
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const ext = req.file.mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const filename = `${id}-${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    // Store in rating_photos table
    const photoResult = await query(
      `INSERT INTO rating_photos (rating_id, url, hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, photoUrl, await generateImageHash(buffer)]
    );

    res.status(201).json({ photo: photoResult.rows[0] });
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// GET /api/ratings/user/:userId — get user's ratings
router.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const offset = parseInt((req.query.offset as string) || '0', 10);

    const result = await query(
      `SELECT r.*, rest.name as restaurant_name, rest.city as restaurant_city
       FROM ratings r
       JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ratings WHERE user_id = $1`,
      [userId]
    );

    res.json({
      ratings: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
    });
  } catch (err) {
    console.error('Get user ratings error:', err);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
});

// DELETE /api/ratings/:id — delete own rating (auth required)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;

    // Check ownership
    const ratingResult = await query<{ user_id: string; restaurant_id: string }>(
      `SELECT user_id, restaurant_id FROM ratings WHERE id = $1`,
      [id]
    );

    if (ratingResult.rows.length === 0) {
      res.status(404).json({ error: 'Rating not found' });
      return;
    }

    if (ratingResult.rows[0].user_id !== req.user.id) {
      res.status(403).json({ error: 'You can only delete your own ratings' });
      return;
    }

    const restaurantId = ratingResult.rows[0].restaurant_id;

    await query(`DELETE FROM ratings WHERE id = $1`, [id]);

    // Recalculate restaurant score
    await recalculateRestaurantScore(restaurantId);

    res.json({ message: 'Rating deleted' });
  } catch (err) {
    console.error('Delete rating error:', err);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
});

export default router;
