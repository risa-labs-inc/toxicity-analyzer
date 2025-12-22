import { getDb } from './connection';

/**
 * Run database migrations
 *
 * Executes all pending Knex migrations.
 * Safe to run multiple times - only runs pending migrations.
 */
export async function runMigrations(): Promise<void> {
  const db = getDb();

  try {
    console.log('🔄 Running database migrations...');

    const [batchNo, migrations] = await db.migrate.latest();

    if (migrations.length === 0) {
      console.log('✅ Database is already up to date');
    } else {
      console.log(`✅ Ran ${migrations.length} migrations in batch ${batchNo}:`);
      migrations.forEach((migration: string) => {
        console.log(`   - ${migration}`);
      });
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
