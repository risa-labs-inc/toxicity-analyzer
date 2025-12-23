import { Knex } from 'knex';

/**
 * Migration: Add triage tracking to questionnaires table
 *
 * Purpose: Track which questionnaires have been triaged by clinicians,
 * enabling separation between active queue and triaged cases.
 * Triage tracking is at the questionnaire level because each completion
 * represents a distinct triage event.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('questionnaires', (table) => {
    table.boolean('triaged').defaultTo(false).notNullable();
    table.timestamp('triaged_at').nullable();
    table.string('triaged_by', 128).nullable();
  });

  // Add composite index for efficient querying of triaged/untriaged questionnaires
  await knex.raw(`
    CREATE INDEX idx_questionnaires_triaged
    ON questionnaires(triaged, status, completed_at DESC);
  `);

  console.log('✅ Added triage tracking columns and index to questionnaires table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_questionnaires_triaged;');

  await knex.schema.table('questionnaires', (table) => {
    table.dropColumn('triaged');
    table.dropColumn('triaged_at');
    table.dropColumn('triaged_by');
  });

  console.log('✅ Removed triage tracking columns and index from questionnaires table');
}
