import knex, { Knex } from 'knex';
import knexConfig from '../knexfile';

let dbInstance: Knex | null = null;

/**
 * Get database connection instance
 *
 * Creates a singleton connection to PostgreSQL database.
 * Reuses existing connection if already initialized.
 *
 * @returns Knex database instance
 */
export function getDb(): Knex {
  if (!dbInstance) {
    const env = process.env.NODE_ENV || 'development';
    const config = knexConfig[env];

    if (!config) {
      throw new Error(`No Knex configuration found for environment: ${env}`);
    }

    dbInstance = knex(config);
  }

  return dbInstance;
}

/**
 * Close database connection
 *
 * Used for graceful shutdown and testing.
 */
export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}

/**
 * Test database connection
 *
 * Verifies database is reachable and credentials are valid.
 *
 * @returns True if connection successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const db = getDb();
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
