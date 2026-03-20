import { skipDb } from './setup';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Users API', () => {
  // ----------------------------------------------------------------
  // GET /api/users/:id/profile
  // ----------------------------------------------------------------
  describe('GET /api/users/:id/profile', () => {
    it.skipIf(skipDb)('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000/profile');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it.skipIf(skipDb)('returns user profile with stats and badges', async () => {
      // Register a user first
      const uniqueEmail = `prof_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: `prof${Date.now()}`, email: uniqueEmail, password: 'testpass123' });

      const userId = regRes.body.user.id;

      const res = await request(app)
        .get(`/api/users/${userId}/profile`);
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(userId);
      expect(res.body.badges).toBeDefined();
      expect(Array.isArray(res.body.badges)).toBe(true);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.total_ratings).toBe(0);
      expect(typeof res.body.stats.avg_score).toBe('number');
      expect(typeof res.body.stats.cities_visited).toBe('number');
      // Should not expose sensitive fields
      expect(res.body.user.password_hash).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // GET /api/users/badges
  // ----------------------------------------------------------------
  describe('GET /api/users/badges', () => {
    it.skipIf(skipDb)('returns list of all badges', async () => {
      const res = await request(app).get('/api/users/badges');
      expect(res.status).toBe(200);
      expect(res.body.badges).toBeDefined();
      expect(Array.isArray(res.body.badges)).toBe(true);
    });
  });
});
