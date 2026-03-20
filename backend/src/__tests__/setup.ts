/**
 * Test setup — sets NODE_ENV to 'test' and provides helpers.
 *
 * Import this file at the top of every test file, or rely on vitest
 * globalSetup if preferred.
 */

// Ensure test environment
process.env.NODE_ENV = 'test';

// Provide a dummy JWT_SECRET so the auth middleware works for token
// generation / validation even without a real .env file.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
}

export const skipDb = !process.env.DATABASE_URL;
