import { Knex } from 'knex';

/**
 * Migration to add unique constraint on questionnaire_responses
 * to prevent duplicate responses for the same questionnaire + item combination
 */
export async function up(knex: Knex): Promise<void> {
  // First, remove any existing duplicates before adding the constraint
  await knex.raw(`
    DELETE FROM questionnaire_responses
    WHERE response_id IN (
      SELECT response_id
      FROM (
        SELECT response_id,
               ROW_NUMBER() OVER (
                 PARTITION BY questionnaire_id, item_id
                 ORDER BY created_at DESC
               ) as rn
        FROM questionnaire_responses
      ) t
      WHERE t.rn > 1
    )
  `);

  // Add unique constraint on (questionnaire_id, item_id)
  await knex.schema.alterTable('questionnaire_responses', (table) => {
    table.unique(['questionnaire_id', 'item_id'], {
      indexName: 'questionnaire_responses_questionnaire_item_unique',
    });
  });

  console.log('✅ Added unique constraint on questionnaire_responses (questionnaire_id, item_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('questionnaire_responses', (table) => {
    table.dropUnique(['questionnaire_id', 'item_id'], 'questionnaire_responses_questionnaire_item_unique');
  });

  console.log('✅ Dropped unique constraint on questionnaire_responses');
}
