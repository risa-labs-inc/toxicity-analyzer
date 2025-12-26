/**
 * Cleanup script to remove duplicate responses
 *
 * This script finds and removes duplicate responses where the same
 * questionnaire_id + item_id combination has multiple responses.
 * It keeps only the most recent response (by created_at).
 */

import { getDb } from './src/db/connection';

async function cleanupDuplicates() {
  const db = getDb();

  try {
    console.log('Starting duplicate response cleanup...');

    // Find duplicates: questionnaire_id + item_id combinations with > 1 response
    const duplicates = await db.raw(`
      SELECT questionnaire_id, item_id, COUNT(*) as count
      FROM questionnaire_responses
      GROUP BY questionnaire_id, item_id
      HAVING COUNT(*) > 1
    `);

    console.log(`Found ${duplicates.rows.length} duplicate combinations`);

    if (duplicates.rows.length === 0) {
      console.log('No duplicates found. Database is clean!');
      process.exit(0);
    }

    // For each duplicate combination, delete all but the most recent
    let totalDeleted = 0;
    for (const dup of duplicates.rows) {
      console.log(`\nProcessing questionnaire_id: ${dup.questionnaire_id}, item_id: ${dup.item_id}`);
      console.log(`  Found ${dup.count} responses`);

      // Get all responses for this combination, ordered by created_at DESC
      const responses = await db('questionnaire_responses')
        .where({
          questionnaire_id: dup.questionnaire_id,
          item_id: dup.item_id,
        })
        .orderBy('created_at', 'desc')
        .select('response_id', 'response_label', 'created_at');

      console.log('  Responses:');
      responses.forEach((r: any, idx: number) => {
        console.log(`    ${idx + 1}. ${r.response_label} (${r.created_at}) ${idx === 0 ? '← KEEPING' : '← DELETING'}`);
      });

      // Delete all except the first (most recent) one
      const idsToDelete = responses.slice(1).map((r: any) => r.response_id);

      if (idsToDelete.length > 0) {
        const deleted = await db('questionnaire_responses')
          .whereIn('response_id', idsToDelete)
          .delete();

        console.log(`  Deleted ${deleted} old responses`);
        totalDeleted += deleted;
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} duplicate responses.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupDuplicates();
