import { skipDb } from './setup';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

const TEST_USER = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@cleancheck.test`,
  password: 'testpass123',
};

describe('Auth API', () => {
  // ----------------------------------------------------------------
  // POST /api/auth/register
  // ----------------------------------------------------------------
  describe('POST /api/auth/register', () => {
    it.skipIf(skipDb)('creates a new user and returns token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(TEST_USER);

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user.username).toBe(TEST_USER.username);
      expect(res.body.user.email).toBe(TEST_USER.email.toLowerCase());
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.created_at).toBeDefined();
    });

    it.skipIf(skipDb)('rejects duplicate email/username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(TEST_USER);

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });

    it('rejects missing fields — no username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'a@b.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rejects missing fields — no email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'someone', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('rejects missing fields — no password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'someone', email: 'a@b.com' });

      expect(res.status).toBe(400);
    });

    it('rejects missing fields — empty body', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects short password (< 6 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'x', email: 'x@x.com', password: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('6');
    });

    it('accepts exactly 6 character password (with DB)', async () => {
      // This is a boundary test — only works with DB
      if (skipDb) return;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `boundary_${Date.now()}`,
          email: `boundary_${Date.now()}@test.com`,
          password: '123456',
        });
      expect(res.status).toBe(201);
    });
  });

  // ----------------------------------------------------------------
  // POST /api/auth/login
  // ----------------------------------------------------------------
  describe('POST /api/auth/login', () => {
    it.skipIf(skipDb)('returns token for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user.email).toBe(TEST_USER.email.toLowerCase());
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.username).toBe(TEST_USER.username);
    });

    it.skipIf(skipDb)('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it.skipIf(skipDb)('rejects non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'whatever' });

      expect(res.status).toBe(401);
    });

    it('rejects missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'testpass123' });

      expect(res.status).toBe(400);
    });

    it('rejects missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });

    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ----------------------------------------------------------------
  // GET /api/auth/me
  // ----------------------------------------------------------------
  describe('GET /api/auth/me', () => {
    it('rejects unauthenticated request (no header)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('rejects invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here');
      expect(res.status).toBe(401);
    });

    it('rejects malformed Authorization header (no Bearer prefix)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Token some-token');
      expect(res.status).toBe(401);
    });

    it.skipIf(skipDb)('returns user for valid token', async () => {
      // Login to get a valid token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const token = loginRes.body.token;
      expect(token).toBeDefined();

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(TEST_USER.email.toLowerCase());
      expect(res.body.user.username).toBe(TEST_USER.username);
      // Should not expose password_hash
      expect(res.body.user.password_hash).toBeUndefined();
    });
  });
});
