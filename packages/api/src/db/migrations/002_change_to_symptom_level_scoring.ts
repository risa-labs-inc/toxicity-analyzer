import { Knex } from 'knex';

/**
 * Migration: Change from Category-Level to Symptom-Level Scoring
 *
 * This migration implements CTCAE v5.0 standard by scoring each individual symptom
 * (e.g., nausea, vomiting, diarrhea) separately instead of aggregating by category
 * (e.g., gastrointestinal).
 *
 * Changes:
 * - Truncates existing toxicity_scores (category-level data no longer valid)
 * - Renames symptom_category → symptom_term
 * - Updates indexes
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Migrating to symptom-level scoring (CTCAE v5.0)...');

  // Delete existing category-level toxicity scores and alerts
  // Use raw SQL with CASCADE to handle foreign key constraints
  console.log('  - Truncating toxicity_scores and alerts tables...');
  await knex.raw('TRUNCATE TABLE alerts, toxicity_scores RESTART IDENTITY CASCADE');

  // Rename column in toxicity_scores table
  console.log('  - Renaming symptom_category to symptom_term in toxicity_scores...');
  await knex.schema.alterTable('toxicity_scores', (table) => {
    table.renameColumn('symptom_category', 'symptom_term');
  });

  // Rename column in alerts table
  console.log('  - Renaming symptom_category to symptom_term in alerts...');
  await knex.schema.alterTable('alerts', (table) => {
    table.renameColumn('symptom_category', 'symptom_term');
  });

  // Update indexes
  // Skip dropping old index since it might not exist with that name
  // The column rename will keep existing indexes functional
  console.log('  - Creating new symptom_term index...');
  try {
    await knex.schema.alterTable('toxicity_scores', (table) => {
      table.index(['patient_id', 'symptom_term', 'calculated_at'], 'idx_toxicity_scores_symptom_term');
    });
  } catch (error: any) {
    // Index might already exist if migration was partially run
    if (!error.message?.includes('already exists')) {
      throw error;
    }
    console.log('    (index already exists, skipping)');
  }

  // Add column comments
  await knex.raw(`
    COMMENT ON COLUMN toxicity_scores.symptom_term IS
    'Specific symptom per CTCAE v5.0 (e.g., nausea, vomiting, diarrhea).
     Each symptom is scored individually, not aggregated by category.';

    COMMENT ON COLUMN alerts.symptom_term IS
    'Specific symptom per CTCAE v5.0 (e.g., nausea, vomiting, diarrhea).
     Alerts are generated for individual symptoms, not aggregated categories.';
  `);

  console.log('✅ Migration to symptom-level scoring complete!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Reverting to category-level scoring...');

  // Remove column comments
  await knex.raw('COMMENT ON COLUMN toxicity_scores.symptom_term IS NULL');
  await knex.raw('COMMENT ON COLUMN alerts.symptom_term IS NULL');

  // Rename columns back
  await knex.schema.alterTable('toxicity_scores', (table) => {
    table.renameColumn('symptom_term', 'symptom_category');
  });

  await knex.schema.alterTable('alerts', (table) => {
    table.renameColumn('symptom_term', 'symptom_category');
  });

  // Truncate data (old category-level data is gone)
  await knex.raw('TRUNCATE TABLE alerts, toxicity_scores RESTART IDENTITY CASCADE');

  console.log('✅ Reverted to category-level scoring');
}
