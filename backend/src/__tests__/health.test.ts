import './setup';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Health Check', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/health returns a valid ISO timestamp', async () => {
    const res = await request(app).get('/api/health');
    const ts = new Date(res.body.timestamp);
    expect(ts.getTime()).not.toBeNaN();
  });

  it('GET /api/nonexistent returns 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
