import { skipDb } from './setup';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Restaurants API', () => {
  // ----------------------------------------------------------------
  // GET /api/restaurants
  // ----------------------------------------------------------------
  describe('GET /api/restaurants', () => {
    it('requires lat and lng parameters', async () => {
      const res = await request(app).get('/api/restaurants');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('lat');
    });

    it('rejects when only lat is provided', async () => {
      const res = await request(app).get('/api/restaurants?lat=48.77');
      expect(res.status).toBe(400);
    });

    it('rejects when only lng is provided', async () => {
      const res = await request(app).get('/api/restaurants?lng=9.18');
      expect(res.status).toBe(400);
    });

    it('rejects non-numeric lat', async () => {
      const res = await request(app).get('/api/restaurants?lat=abc&lng=9.18');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('rejects non-numeric lng', async () => {
      const res = await request(app).get('/api/restaurants?lat=48.77&lng=xyz');
      expect(res.status).toBe(400);
    });

    it.skipIf(skipDb)('returns restaurants array for valid coordinates', async () => {
      const res = await request(app)
        .get('/api/restaurants?lat=48.7758&lng=9.1829&radius=5');
      expect(res.status).toBe(200);
      expect(res.body.restaurants).toBeDefined();
      expect(Array.isArray(res.body.restaurants)).toBe(true);
    });

    it.skipIf(skipDb)('respects radius parameter', async () => {
      const res = await request(app)
        .get('/api/restaurants?lat=48.7758&lng=9.1829&radius=0.001');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.restaurants)).toBe(true);
    });

    it.skipIf(skipDb)('respects minScore parameter', async () => {
      const res = await request(app)
        .get('/api/restaurants?lat=48.7758&lng=9.1829&minScore=4');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.restaurants)).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // GET /api/restaurants/:id
  // ----------------------------------------------------------------
  describe('GET /api/restaurants/:id', () => {
    it.skipIf(skipDb)('returns 404 for non-existent restaurant', async () => {
      const res = await request(app)
        .get('/api/restaurants/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // POST /api/restaurants
  // ----------------------------------------------------------------
  describe('POST /api/restaurants', () => {
    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/restaurants')
        .send({ name: 'Test Restaurant', lat: 48.77, lng: 9.18 });
      expect(res.status).toBe(401);
    });

    it('rejects request with invalid token', async () => {
      const res = await request(app)
        .post('/api/restaurants')
        .set('Authorization', 'Bearer bad-token')
        .send({ name: 'Test Restaurant', lat: 48.77, lng: 9.18 });
      expect(res.status).toBe(401);
    });

    it.skipIf(skipDb)('rejects name shorter than 2 characters', async () => {
      // Register to get token
      const uniqueEmail = `rest_name_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: `rn${Date.now()}`, email: uniqueEmail, password: 'testpass123' });
      const token = regRes.body.token;

      const res = await request(app)
        .post('/api/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'A', lat: 48.77, lng: 9.18 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Name');
    });

    it.skipIf(skipDb)('rejects name longer than 200 characters', async () => {
      const uniqueEmail = `rest_long_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: `rl${Date.now()}`, email: uniqueEmail, password: 'testpass123' });
      const token = regRes.body.token;

      const res = await request(app)
        .post('/api/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X'.repeat(201), lat: 48.77, lng: 9.18 });
      expect(res.status).toBe(400);
    });

    it.skipIf(skipDb)('rejects latitude out of range (> 90)', async () => {
      const uniqueEmail = `rest_lat_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: `rlat${Date.now()}`, email: uniqueEmail, password: 'testpass123' });
      const token = regRes.body.token;

      const res = await request(app)
        .post('/api/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Valid Name', lat: 100, lng: 9.18 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Latitude');
    });

    it.skipIf(skipDb)('rejects longitude out of range (> 180)', async () => {
      const uniqueEmail = `rest_lng_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: `rlng${Date.now()}`, email: uniqueEmail, password: 'testpass123' });
      const token = regRes.body.token;

      const res = await request(app)
        .post('/api/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Valid Name', lat: 48.77, lng: 200 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Longitude');
    });

    it.skipIf(skipDb)('rejects missing required fields (no name)', async () => {
      const uniqueEmail = `rest_noname_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: `rnn${Date.now()}`, email: uniqueEmail, password: 'testpass123' });
      const token = regRes.body.token;

      const res = await request(app)
        .post('/api/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({ lat: 48.77, lng: 9.18 });
      expect(res.status).toBe(400);
    });

    it.skipIf(skipDb)('creates restaurant with valid data', async () => {
      const uniqueEmail = `rest_ok_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: `rok${Date.now()}`, email: uniqueEmail, password: 'testpass123' });
      const token = regRes.body.token;

      const res = await request(app)
        .post('/api/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Restaurant',
          lat: 48.7758,
          lng: 9.1829,
          address: '123 Test St',
          city: 'Stuttgart',
          cuisine_type: 'German',
        });
      expect(res.status).toBe(201);
      expect(res.body.restaurant).toBeDefined();
      expect(res.body.restaurant.name).toBe('Test Restaurant');
      expect(res.body.restaurant.id).toBeDefined();
    });
  });
});
