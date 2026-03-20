import { skipDb } from './setup';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Ratings API', () => {
  // ----------------------------------------------------------------
  // POST /api/ratings
  // ----------------------------------------------------------------
  describe('POST /api/ratings', () => {
    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/ratings')
        .send({
          restaurant_id: 'fake-id',
          cleanliness: 3,
          smell: 3,
          supplies: 3,
          condition: 3,
          accessibility: 3,
        });
      expect(res.status).toBe(401);
    });

    it('rejects request with invalid token', async () => {
      const res = await request(app)
        .post('/api/ratings')
        .set('Authorization', 'Bearer bad-token')
        .send({
          restaurant_id: 'fake-id',
          cleanliness: 3,
          smell: 3,
          supplies: 3,
          condition: 3,
          accessibility: 3,
        });
      expect(res.status).toBe(401);
    });

    it.skipIf(skipDb)('requires geo headers (X-User-Lat / X-User-Lng)', async () => {
      // Register to get token
      const uniqueEmail = `rat_geo_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: `rg${Date.now()}`, email: uniqueEmail, password: 'testpass123' });
      const token = regRes.body.token;

      const res = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          restaurant_id: 'fake-id',
          cleanliness: 3,
          smell: 3,
          supplies: 3,
          condition: 3,
          accessibility: 3,
        });
      // Should fail because no geo headers
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Lat');
    });
  });

  // ----------------------------------------------------------------
  // POST /api/ratings/verify-location
  // ----------------------------------------------------------------
  describe('POST /api/ratings/verify-location', () => {
    it('requires restaurant_id and geo headers', async () => {
      const res = await request(app)
        .post('/api/ratings/verify-location')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rejects when only restaurant_id is provided (no headers)', async () => {
      const res = await request(app)
        .post('/api/ratings/verify-location')
        .send({ restaurant_id: 'test-id' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid (non-numeric) coordinates in headers', async () => {
      const res = await request(app)
        .post('/api/ratings/verify-location')
        .set('X-User-Lat', 'abc')
        .set('X-User-Lng', 'def')
        .send({ restaurant_id: 'test-id' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it.skipIf(skipDb)('returns 404 for non-existent restaurant', async () => {
      const res = await request(app)
        .post('/api/ratings/verify-location')
        .set('X-User-Lat', '48.7758')
        .set('X-User-Lng', '9.1829')
        .send({ restaurant_id: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(404);
    });
  });

  // ----------------------------------------------------------------
  // GET /api/ratings/user/:userId
  // ----------------------------------------------------------------
  describe('GET /api/ratings/user/:userId', () => {
    it.skipIf(skipDb)('returns empty array for non-existent user', async () => {
      const res = await request(app)
        .get('/api/ratings/user/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(200);
      expect(res.body.ratings).toBeDefined();
      expect(Array.isArray(res.body.ratings)).toBe(true);
      expect(res.body.ratings).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it.skipIf(skipDb)('supports limit and offset query params', async () => {
      const res = await request(app)
        .get('/api/ratings/user/00000000-0000-0000-0000-000000000000?limit=5&offset=0');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });
  });

  // ----------------------------------------------------------------
  // DELETE /api/ratings/:id
  // ----------------------------------------------------------------
  describe('DELETE /api/ratings/:id', () => {
    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .delete('/api/ratings/some-id');
      expect(res.status).toBe(401);
    });

    it('rejects invalid token', async () => {
      const res = await request(app)
        .delete('/api/ratings/some-id')
        .set('Authorization', 'Bearer bad-token');
      expect(res.status).toBe(401);
    });

    it.skipIf(skipDb)('returns 404 for non-existent rating', async () => {
      const uniqueEmail = `rat_del_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: `rd${Date.now()}`, email: uniqueEmail, password: 'testpass123' });
      const token = regRes.body.token;

      const res = await request(app)
        .delete('/api/ratings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ----------------------------------------------------------------
  // POST /api/ratings/:id/photos
  // ----------------------------------------------------------------
  describe('POST /api/ratings/:id/photos', () => {
    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/ratings/some-id/photos');
      expect(res.status).toBe(401);
    });

    it.skipIf(skipDb)('returns 404 for non-existent rating', async () => {
      const uniqueEmail = `rat_photo_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: `rp${Date.now()}`, email: uniqueEmail, password: 'testpass123' });
      const token = regRes.body.token;

      const res = await request(app)
        .post('/api/ratings/00000000-0000-0000-0000-000000000000/photos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
