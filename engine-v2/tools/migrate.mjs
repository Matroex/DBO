import {readdir,readFile} from 'node:fs/promises';
import pg from 'pg';

if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  throw Error('Set DATABASE_URL or PostgreSQL connection variables before migrating.');
}
const directory = new URL('../migrations/',import.meta.url);
const files = (await readdir(directory)).filter(name=>/^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
if (!files.length || new Set(files.map(name=>name.slice(0,3))).size!==files.length) {
  throw Error('Missing or duplicate migration numbers.');
}
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000,max:1});
try {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(21472026)');
    await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const {rows} = await db.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map(row=>row.version));
    for (const file of files) {
      const version = file.slice(0,-4);
      if (applied.has(version)) continue;
      await db.query(await readFile(new URL(file,directory),'utf8'));
      await db.query('INSERT INTO schema_migrations(version) VALUES($1)',[version]);
      process.stdout.write('Applied '+version+'\n');
    }
    await db.query('COMMIT');
  } catch(error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
} finally { await pool.end(); }
