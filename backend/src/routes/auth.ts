import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto, { createPublicKey } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../utils/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { registerLimiter, loginLimiter } from '../middleware/rateLimiter';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    // Social-login users have no password — they must sign in via their provider
    if (!user.password_hash) {
      res.status(401).json({ error: 'This account uses social login. Please sign in with Google or Apple.' });
      return;
    }

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

// Helper: build user response object
function userResponse(user: any) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar_url: user.avatar_url,
    total_ratings: user.total_ratings,
    locale: user.locale,
  };
}

// Helper: ensure unique username
async function ensureUniqueUsername(desiredUsername: string): Promise<string> {
  let username = desiredUsername.replace(/<[^>]*>/g, '').trim().substring(0, 50);
  if (username.length < 1) username = 'user';
  const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) {
    username = `${username.substring(0, 44)}_${Math.random().toString(36).substring(2, 6)}`;
  }
  return username;
}

// POST /api/auth/google — Sign in with Google
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_token } = req.body;
    if (!id_token) {
      res.status(400).json({ error: 'id_token is required' });
      return;
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    const { email, sub: googleId, name, picture } = payload;

    // Check if user exists with this email
    const userResult = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    let user;
    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      // Link Google provider if not already linked
      if (!user.provider_id || user.auth_provider === 'email') {
        await query(
          'UPDATE users SET auth_provider = $2, provider_id = $3, avatar_url = COALESCE(avatar_url, $4) WHERE id = $1',
          [user.id, 'google', googleId, picture || null]
        );
        user.auth_provider = 'google';
        user.provider_id = googleId;
        if (!user.avatar_url && picture) user.avatar_url = picture;
      }
    } else {
      // Create new user
      const username = await ensureUniqueUsername(name || email.split('@')[0]);

      const result = await query(
        `INSERT INTO users (username, email, auth_provider, provider_id, avatar_url)
         VALUES ($1, $2, 'google', $3, $4) RETURNING *`,
        [username, email.toLowerCase(), googleId, picture || null]
      );
      user = result.rows[0];
    }

    const token = generateAccessToken(user as { id: string; username: string; email: string });
    const refreshToken = await createRefreshToken(user.id);

    console.log(JSON.stringify({
      action: 'social_login',
      provider: 'google',
      user_id: user.id,
      timestamp: new Date().toISOString(),
    }));

    res.json({
      token,
      refreshToken,
      user: userResponse(user),
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// POST /api/auth/apple — Sign in with Apple
router.post('/apple', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_token, user: appleUser } = req.body;
    if (!id_token) {
      res.status(400).json({ error: 'id_token is required' });
      return;
    }

    // Fetch Apple's public keys and verify the JWT
    const appleKeysResponse = await fetch('https://appleid.apple.com/auth/keys');
    const appleKeys = await appleKeysResponse.json() as { keys: any[] };

    // Decode the token header to find the matching key
    const tokenHeader = JSON.parse(Buffer.from(id_token.split('.')[0], 'base64url').toString());
    const appleKey = appleKeys.keys.find((k: any) => k.kid === tokenHeader.kid);

    if (!appleKey) {
      res.status(401).json({ error: 'Invalid Apple token - key not found' });
      return;
    }

    // Convert JWK to PEM for jwt.verify
    const publicKey = createPublicKey({ key: appleKey, format: 'jwk' });

    const decoded = jwt.verify(id_token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: process.env.APPLE_CLIENT_ID || 'com.efindo.cleancheck',
    }) as any;

    const { sub: appleId, email } = decoded;

    if (!email && !appleId) {
      res.status(400).json({ error: 'Invalid Apple token payload' });
      return;
    }

    // Apple only sends email on FIRST login — after that only sub
    // So we need to find by provider_id OR email
    let userResult;
    if (email) {
      userResult = await query(
        'SELECT * FROM users WHERE email = $1 OR (auth_provider = $2 AND provider_id = $3)',
        [email.toLowerCase(), 'apple', appleId]
      );
    } else {
      userResult = await query(
        'SELECT * FROM users WHERE auth_provider = $1 AND provider_id = $2',
        ['apple', appleId]
      );
    }

    let user;
    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      // Link Apple provider if not already
      if (user.auth_provider !== 'apple') {
        await query(
          'UPDATE users SET auth_provider = $2, provider_id = $3 WHERE id = $1',
          [user.id, 'apple', appleId]
        );
        user.auth_provider = 'apple';
        user.provider_id = appleId;
      }
    } else {
      // Create new user — Apple may provide name only on first auth
      const firstName = appleUser?.name?.firstName || '';
      const lastName = appleUser?.name?.lastName || '';
      const desiredName = `${firstName} ${lastName}`.trim() || (email ? email.split('@')[0] : `user_${appleId.substring(0, 8)}`);
      const username = await ensureUniqueUsername(desiredName);

      const userEmail = email || `${appleId}@privaterelay.appleid.com`;

      const result = await query(
        `INSERT INTO users (username, email, auth_provider, provider_id)
         VALUES ($1, $2, 'apple', $3) RETURNING *`,
        [username, userEmail.toLowerCase(), appleId]
      );
      user = result.rows[0];
    }

    const token = generateAccessToken(user as { id: string; username: string; email: string });
    const refreshToken = await createRefreshToken(user.id);

    console.log(JSON.stringify({
      action: 'social_login',
      provider: 'apple',
      user_id: user.id,
      timestamp: new Date().toISOString(),
    }));

    res.json({
      token,
      refreshToken,
      user: userResponse(user),
    });
  } catch (err) {
    console.error('Apple auth error:', err);
    res.status(401).json({ error: 'Apple authentication failed' });
  }
});

export default router;
