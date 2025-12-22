import { Knex } from 'knex';

/**
 * Migration: Add full_name column to patients table
 *
 * Purpose: Store patient full name for display in patient dashboard
 * and clinician views. This field is optional to maintain backward
 * compatibility with existing data.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('patients', (table) => {
    table.string('full_name', 100);
  });

  console.log('✅ Added full_name column to patients table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('patients', (table) => {
    table.dropColumn('full_name');
  });

  console.log('✅ Removed full_name column from patients table');
}
