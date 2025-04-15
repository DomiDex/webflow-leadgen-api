import { Pool } from '../../deps.ts';
import { dotenvConfig } from '../../deps.ts';

const env = dotenvConfig({ export: true });
const DATABASE_URL = env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
  // Exit with error code 1
  // @ts-ignore - Deno global is available at runtime
  Deno.exit(1);
}

const POOL_CONNECTIONS = 5; // Adjust as needed

// Use lazy loading (true) which is often better for serverless or intermittent connections
export const pool = new Pool(DATABASE_URL, POOL_CONNECTIONS, true);

console.log('Database pool configured.');

// Track if the pool has already been closed to prevent double-closing
let poolClosed = false;

// Optional: Graceful shutdown
globalThis.addEventListener('unload', async () => {
  if (poolClosed) {
    console.log('Pool already closed, skipping additional pool.end() call.');
    return;
  }
  console.log('Closing database pool...');
  try {
    await pool.end();
    poolClosed = true;
    console.log('Database pool closed.');
  } catch (e) {
    console.error(
      'Error closing pool:',
      e instanceof Error ? e.message : String(e)
    );
  }
});

// Export a way to mark the pool as closed externally (useful for tests)
export function markPoolAsClosed() {
  poolClosed = true;
}
