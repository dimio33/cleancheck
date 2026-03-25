import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../utils/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { registerLimiter, loginLimiter } from '../middleware/rateLimiter';

const router = Router();

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function generateAccessToken(user: { id: string; username: string; email: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    secret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createRefreshToken(userId: string): Promise<string> {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return refreshToken;
}

// POST /api/auth/register
router.post('/register', registerLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required' });
      return;
    }

    // Validate email format and length
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Sanitize username: strip HTML tags to prevent XSS
    const sanitizedUsername = username.replace(/<[^>]*>/g, '').trim();
    if (sanitizedUsername.length < 3 || sanitizedUsername.length > 50) {
      res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
      return;
    }

    // Check existing
    const existing = await query(
      `SELECT id FROM users WHERE email = $1 OR username = $2`,
      [email.toLowerCase(), sanitizedUsername]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Username or email already taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query<{ id: string; username: string; email: string; created_at: Date }>(
      `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [sanitizedUsername, email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    const token = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    console.log(JSON.stringify({
      action: 'user_registered',
      user_id: user.id,
      timestamp: new Date().toISOString(),
    }));

    res.status(201).json({
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await query<{
      id: string;
      username: string;
      email: string;
      password_hash: string;
      avatar_url: string | null;
      total_ratings: number;
      locale: string;
      created_at: Date;
    }>(
      `SELECT id, username, email, password_hash, avatar_url, total_ratings, locale, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    console.log(JSON.stringify({
      action: 'user_login',
      user_id: user.id,
      timestamp: new Date().toISOString(),
    }));

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        total_ratings: user.total_ratings,
        locale: user.locale,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh — Token rotation
router.post('/refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const tokenHash = hashToken(refreshToken);

    // Find the refresh token and associated user
    const result = await query<{
      id: string;
      user_id: string;
      expires_at: Date;
    }>(
      `SELECT rt.id, rt.user_id, rt.expires_at
       FROM refresh_tokens rt
       WHERE rt.token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const storedToken = result.rows[0];

    // Check expiry
    if (new Date(storedToken.expires_at) < new Date()) {
      // Delete expired token
      await query(`DELETE FROM refresh_tokens WHERE id = $1`, [storedToken.id]);
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    // Delete the old refresh token (rotation: one-time use)
    await query(`DELETE FROM refresh_tokens WHERE id = $1`, [storedToken.id]);

    // Get user data
    const userResult = await query<{
      id: string;
      username: string;
      email: string;
      avatar_url: string | null;
      total_ratings: number;
      locale: string;
      created_at: Date;
    }>(
      `SELECT id, username, email, avatar_url, total_ratings, locale, created_at
       FROM users WHERE id = $1`,
      [storedToken.user_id]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await createRefreshToken(user.id);

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        total_ratings: user.total_ratings,
        locale: user.locale,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// POST /api/auth/logout — Revoke refresh token
router.post('/logout', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [tokenHash]);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await query<{
      id: string;
      username: string;
      email: string;
      avatar_url: string | null;
      total_ratings: number;
      locale: string;
      created_at: Date;
    }>(
      `SELECT id, username, email, avatar_url, total_ratings, locale, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
