import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import { query } from '../utils/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';
import { calculateOverallScore, recalculateRestaurantScore } from '../services/scoreService';
import { checkAndAwardBadges } from '../services/badgeService';
import { awardXp, updateStreak, getStreakBonus } from '../services/xpService';
import { updateLeaderboard } from '../services/leaderboardService';
import { updateContestEntry } from '../services/contestService';
import { geoVerify, calculateDistance } from '../middleware/geoVerify';
import { validateImageFile, moderateImage, generateImageHash } from '../services/moderationService';
import { uploadPhoto, isR2Configured } from '../services/storageService';
import { isValidUuid } from '../utils/validate';

function generateAnonymousId(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
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
    const maxDistance = Infinity; // TODO: reset to 500 after testing

    if (!restaurant_id || !userLatStr || !userLngStr) {
      res.status(400).json({ error: 'restaurant_id, X-User-Lat, and X-User-Lng are required' });
      return;
    }

    if (!isValidUuid(restaurant_id)) {
      res.status(400).json({ error: 'Invalid restaurant_id format' });
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
router.post('/', optionalAuth, geoVerify({ maxDistanceMeters: Infinity }), async (req: AuthRequest, res: Response): Promise<void> => { // TODO: reset to 500 after testing
  try {
    const { restaurant_id, cleanliness, smell, supplies, condition, accessibility, comment, visited_at, _website, _loaded_at } = req.body;

    // Anti-spam: Honeypot field — bots fill hidden fields, humans don't
    if (_website) {
      console.warn('[Anti-Spam] Honeypot triggered, rejecting');
      res.status(429).json({ error: 'Spam detected' });
      return;
    }

    // Anti-spam: Minimum interaction time (3 seconds)
    // Only reject if elapsed is positive AND under threshold (handles client/server clock skew)
    if (_loaded_at && typeof _loaded_at === 'number') {
      const elapsed = Date.now() - _loaded_at;
      if (elapsed >= 0 && elapsed < 3000) {
        console.warn(`[Anti-Spam] Rating blocked: elapsed=${elapsed}ms`);
        res.status(429).json({ error: 'Please wait before submitting' });
        return;
      }
    }

    if (!restaurant_id || cleanliness == null || smell == null || supplies == null || condition == null || accessibility == null) {
      res.status(400).json({ error: 'restaurant_id and all rating categories are required' });
      return;
    }

    // Validate restaurant_id format
    if (!isValidUuid(restaurant_id)) {
      res.status(400).json({ error: 'Invalid restaurant_id format' });
      return;
    }

    // Sanitize comment: strip HTML tags
    const sanitizedComment = comment && typeof comment === 'string'
      ? comment.replace(/<[^>]*>/g, '').trim()
      : comment;

    // Validate comment length
    if (sanitizedComment && typeof sanitizedComment === 'string' && sanitizedComment.length > 1000) {
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

    // Anti-spam: Duplicate comment detection (same user/anonymous + same comment within 24h)
    if (sanitizedComment && typeof sanitizedComment === 'string') {
      if (req.user) {
        const dupCommentCheck = await query(
          `SELECT id FROM ratings WHERE user_id = $1 AND comment = $2 AND created_at > NOW() - INTERVAL '24 hours'`,
          [req.user.id, sanitizedComment]
        );
        if (dupCommentCheck.rows.length > 0) {
          res.status(409).json({ error: 'You already submitted this comment recently' });
          return;
        }
      } else {
        const anonId = generateAnonymousId(req);
        const dupCommentCheck = await query(
          `SELECT id FROM ratings WHERE anonymous_id = $1 AND comment = $2 AND created_at > NOW() - INTERVAL '24 hours'`,
          [anonId, sanitizedComment]
        );
        if (dupCommentCheck.rows.length > 0) {
          res.status(409).json({ error: 'You already submitted this comment recently' });
          return;
        }
      }
    }

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

    // Insert rating
    const result = await query(
      `INSERT INTO ratings (user_id, anonymous_id, restaurant_id, cleanliness, smell, supplies, condition, accessibility, overall_score, comment, visited_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, anonymousId, restaurant_id, cleanliness, smell, supplies, condition, accessibility, overall_score, sanitizedComment || null, visitDate]
    );

    // Recalculate restaurant score
    const newScore = await recalculateRestaurantScore(restaurant_id);

    // Update user total_ratings (atomic increment) + check badges + gamification
    let newBadges: any[] = [];
    let xpResult: any = null;
    let streak = 0;
    if (req.user) {
      await query(`UPDATE users SET total_ratings = total_ratings + 1 WHERE id = $1`, [req.user.id]);
      try {
        newBadges = await checkAndAwardBadges(req.user.id);
      } catch (badgeErr) {
        console.error('Badge check failed (non-fatal):', badgeErr);
      }

      // Gamification: streak, XP, leaderboard, first rater, contest
      try {
        const ratingId = result.rows[0]?.id;
        streak = await updateStreak(req.user.id);
        const streakBonus = getStreakBonus(streak);
        const commentBonus = (sanitizedComment && sanitizedComment.length > 0) ? 10 : 0;
        const xpAmount = 50 + streakBonus + commentBonus;
        xpResult = await awardXp(req.user.id, xpAmount, 'rating', ratingId);

        // Get restaurant city for leaderboard
        const restResult = await query<{ city: string | null }>(
          `SELECT city FROM restaurants WHERE id = $1`,
          [restaurant_id]
        );
        const restaurantCity = restResult.rows[0]?.city || null;

        await updateLeaderboard(req.user.id, restaurantCity);

        // First rater
        await query(
          `INSERT INTO first_raters (restaurant_id, user_id, rated_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
          [restaurant_id, req.user.id]
        );

        // Contest entry
        if (restaurantCity) {
          await updateContestEntry(req.user.id, restaurantCity);
        }
      } catch (xpErr) {
        console.error('Gamification failed (non-fatal):', xpErr);
      }
    }

    console.log(JSON.stringify({
      action: 'rating_created',
      rating_id: result.rows[0]?.id,
      restaurant_id,
      user_id: userId || anonymousId,
      score: overall_score,
      timestamp: new Date().toISOString(),
    }));

    res.status(201).json({
      rating: result.rows?.[0],
      restaurant_score: newScore,
      new_badges: newBadges,
      xp: xpResult,
      streak,
    });
  } catch (err) {
    console.error('Create rating error:', err);
    res.status(500).json({ error: 'Failed to create rating' });
  }
});

// POST /api/ratings/:id/photos — upload photo for a rating (auth required)
router.post('/:id/photos', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isValidUuid(req.params.id as string)) {
      res.status(400).json({ error: 'Invalid rating ID format' });
      return;
    }
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
      if (!fsSync.existsSync(uploadsDir)) await fs.mkdir(uploadsDir, { recursive: true });
      const ext = req.file.mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const filename = `${id}-${Date.now()}.${ext}`;
      await fs.writeFile(path.join(uploadsDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    // Store in rating_photos table
    const photoResult = await query(
      `INSERT INTO rating_photos (rating_id, photo_url)
       VALUES ($1, $2)
       RETURNING *`,
      [id, photoUrl]
    );

    // Award 20 XP for photo upload
    let photoXpResult: any = null;
    try {
      photoXpResult = await awardXp(req.user.id, 20, 'photo', id as string);
    } catch (xpErr) {
      console.error('Photo XP award failed (non-fatal):', xpErr);
    }

    console.log(JSON.stringify({
      action: 'photo_uploaded',
      photo_id: photoResult.rows[0]?.id,
      rating_id: id,
      user_id: req.user.id,
      timestamp: new Date().toISOString(),
    }));

    res.status(201).json({ photo: photoResult.rows[0], xp: photoXpResult });
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// GET /api/ratings/user/:userId — get user's ratings
router.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!isValidUuid(userId as string)) {
      res.status(400).json({ error: 'Invalid user ID format' });
      return;
    }
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt((req.query.offset as string) || '0', 10) || 0, 0);

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
    if (!isValidUuid(req.params.id as string)) {
      res.status(400).json({ error: 'Invalid rating ID format' });
      return;
    }
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

    // Update user total_ratings (atomic decrement)
    await query(`UPDATE users SET total_ratings = GREATEST(total_ratings - 1, 0) WHERE id = $1`, [req.user.id]);

    console.log(JSON.stringify({
      action: 'rating_deleted',
      rating_id: id,
      restaurant_id: restaurantId,
      user_id: req.user.id,
      timestamp: new Date().toISOString(),
    }));

    res.json({ message: 'Rating deleted' });
  } catch (err) {
    console.error('Delete rating error:', err);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
});

// POST /api/ratings/:id/report — report a rating
router.post('/:id/report', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidUuid(id)) {
      res.status(400).json({ error: 'Invalid rating ID format' });
      return;
    }
    const { reason, details } = req.body;

    if (!reason || !['spam', 'offensive', 'incorrect', 'other'].includes(reason)) {
      res.status(400).json({ error: 'Valid reason required: spam, offensive, incorrect, or other' });
      return;
    }

    // Check rating exists
    const ratingCheck = await query(`SELECT id FROM ratings WHERE id = $1`, [id]);
    if (ratingCheck.rows.length === 0) {
      res.status(404).json({ error: 'Rating not found' });
      return;
    }

    // Rate limit: max 5 reports per IP per day
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const reportCount = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM rating_reports WHERE reporter_ip = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [ip]
    );
    if (parseInt(reportCount.rows[0].count, 10) >= 5) {
      res.status(429).json({ error: 'Too many reports. Please try again later.' });
      return;
    }

    // Check duplicate report
    const dupCheck = await query(
      `SELECT id FROM rating_reports WHERE rating_id = $1 AND reporter_ip = $2`,
      [id, ip]
    );
    if (dupCheck.rows.length > 0) {
      res.status(409).json({ error: 'You already reported this rating' });
      return;
    }

    await query(
      `INSERT INTO rating_reports (rating_id, reporter_ip, reason, details) VALUES ($1, $2, $3, $4)`,
      [id, ip, reason, (details && typeof details === 'string') ? details.slice(0, 500) : null]
    );

    res.status(201).json({ message: 'Report submitted' });
  } catch (err) {
    console.error('Report rating error:', err);
    res.status(500).json({ error: 'Failed to report rating' });
  }
});

export default router;
