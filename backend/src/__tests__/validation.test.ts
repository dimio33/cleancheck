import { skipDb } from './setup';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Input Validation & Middleware', () => {
  // ----------------------------------------------------------------
  // Rate limiting — basic sanity
  // ----------------------------------------------------------------
  describe('Rate Limiting', () => {
    it('health endpoint is accessible (not blocked by rate limiter)', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    });

    it('multiple rapid requests are not immediately blocked', async () => {
      // The API rate limiter allows 100 requests per 15 minutes
      // so a handful of requests should be fine
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          request(app).get('/api/health')
        )
      );
      for (const res of results) {
        expect(res.status).toBe(200);
      }
    });
  });

  // ----------------------------------------------------------------
  // CORS
  // ----------------------------------------------------------------
  describe('CORS Headers', () => {
    it('returns Access-Control-Allow-Origin for allowed origin', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });

    it('returns CORS headers on regular GET request', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // Security headers (Helmet)
  // ----------------------------------------------------------------
  describe('Security Headers (Helmet)', () => {
    it('sets X-Content-Type-Options header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('sets X-Frame-Options or Content-Security-Policy', async () => {
      const res = await request(app).get('/api/health');
      // Helmet v5+ uses CSP frame-ancestors instead of X-Frame-Options
      const hasFrameProtection =
        res.headers['x-frame-options'] !== undefined ||
        res.headers['content-security-policy'] !== undefined;
      expect(hasFrameProtection).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // JSON parsing
  // ----------------------------------------------------------------
  describe('JSON Body Parsing', () => {
    it('accepts valid JSON body on register (validation only, no DB)', async () => {
      // Use register with short password — triggers validation before any DB call
      const res = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ username: 'x', email: 'x@x.com', password: '123' }));
      // Should be 400 (password too short) — proves JSON was parsed correctly
      expect(res.status).toBe(400);
    });

    it('handles empty JSON body gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{}');
      expect(res.status).toBe(400);
    });
  });

  // ----------------------------------------------------------------
  // Auth middleware edge cases
  // ----------------------------------------------------------------
  describe('Auth Middleware Edge Cases', () => {
    it('rejects empty Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ');
      expect(res.status).toBe(401);
    });

    it('rejects Bearer with spaces', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer   ');
      expect(res.status).toBe(401);
    });

    it('rejects random string without Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'random-string');
      expect(res.status).toBe(401);
    });

    it('rejects Basic auth', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Basic dXNlcjpwYXNz');
      expect(res.status).toBe(401);
    });
  });
});
