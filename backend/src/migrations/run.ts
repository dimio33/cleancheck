import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import pool from '../utils/db';

async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname);
  const sqlFiles = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) {
    console.log('No migration files found.');
    process.exit(0);
  }

  const client = await pool.connect();

  try {
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Running migration: ${file}`);
      await client.query(sql);
      console.log(`Completed: ${file}`);
    }
    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
