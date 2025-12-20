import knex, { Knex } from 'knex';

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
    dbInstance = knex({
      client: 'postgresql',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'toxicity_analyzer_dev',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      },
      pool: {
        min: 2,
        max: 10,
      },
      // Enable debug mode in development
      debug: process.env.NODE_ENV === 'development' && process.env.DEBUG === 'true',
    });
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
