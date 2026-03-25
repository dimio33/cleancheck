import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import ratingRoutes from './routes/ratings';
import userRoutes from './routes/users';
import qrRoutes from './routes/qr';
import { initModeration, getModerationStatus } from './services/moderationService';
import { apiLimiter, ratingLimiter } from './middleware/rateLimiter';
import { query } from './utils/db';

// ============================================================
// Env validation
// ============================================================

if (process.env.NODE_ENV !== 'test') {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
}

// ============================================================
// App setup
// ============================================================

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Trust proxy (Railway runs behind reverse proxy)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'https://cleancheck.e-findo.de'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiters (auth rate limits applied per-route in auth.ts)
app.use('/api', apiLimiter);
app.use('/api/ratings', ratingLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/qr', qrRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  const moderation = getModerationStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    moderation: {
      nsfw: moderation.nsfw.ready ? 'active' : 'unavailable',
      nsfw_error: moderation.nsfw.error,
      vision: moderation.vision.ready ? 'active' : 'not configured',
      vision_error: moderation.vision.error,
    },
  });
});

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback — serve index.html for non-API routes
app.get('{*path}', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API route not found' });
    return;
  }
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`CleanCheck API running on port ${PORT}`);

    // Ensure indexes exist (idempotent)
    try {
      await query('CREATE INDEX IF NOT EXISTS idx_ratings_user_created ON ratings(user_id, created_at DESC)');
      await query('CREATE INDEX IF NOT EXISTS idx_ratings_visited_at ON ratings(visited_at)');
      await query('CREATE INDEX IF NOT EXISTS idx_rating_photos_rating ON rating_photos(rating_id)');
      console.log('Database indexes verified');
    } catch (err) {
      console.warn('Index creation skipped:', (err as Error).message);
    }

    // Pre-load content moderation model (non-blocking)
    try {
      await initModeration();
      console.log('Content moderation ready');
    } catch (err) {
      console.warn('Content moderation failed to initialize — uploads will still work but without NSFW scanning');
    }
  });
}

export default app;
