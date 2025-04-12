import { Pool } from '../../deps.ts';
import { dotenvConfig } from '../../deps.ts';

const env = dotenvConfig({ export: true });
const DATABASE_URL = env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
  Deno.exit(1);
}

const POOL_CONNECTIONS = 5; // Adjust as needed

// Use lazy loading (true) which is often better for serverless or intermittent connections
export const pool = new Pool(DATABASE_URL, POOL_CONNECTIONS, true);

console.log('Database pool configured.');

// Optional: Graceful shutdown
globalThis.addEventListener('unload', async () => {
  console.log('Closing database pool...');
  await pool.end();
  console.log('Database pool closed.');
});
