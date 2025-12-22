import { Knex } from 'knex';
import * as fs from 'fs';
import { getDataPath } from '../db-connection';

interface ProCTCAEItem {
  item_code: string;
  symptom_category: string;
  attribute: string;
  question_text: string;
  response_type: string;
  response_options: Array<{ value: number; label: string }>;
}

export async function importProCTCAE(db: Knex): Promise<void> {
  const filePath = getDataPath('proctcae-library-full.json');

  if (!fs.existsSync(filePath)) {
    throw new Error(`PRO-CTCAE library file not found at: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log(`   Loading ${data.items.length} symptom terms (${data.total_items} items total)...`);

  // Flatten all items from all symptom terms
  const allItems: ProCTCAEItem[] = [];
  for (const symptomTerm of data.items) {
    for (const item of symptomTerm.items) {
      allItems.push(item);
    }
  }

  console.log(`   Found ${allItems.length} total PRO-CTCAE items`);

  // Check if data already exists
  const existingCount = await db('proctcae_items').count('* as count').first();
  if (existingCount && Number(existingCount.count) > 0) {
    // If we have less than 100 items, it's the old curated subset - delete and reimport
    if (Number(existingCount.count) < 100) {
      console.log(`   ⚠️  Found old library with ${existingCount.count} items. Deleting and reimporting full library...`);
      await db('proctcae_items').del();
    } else {
      console.log(`   ✓ Full library already exists with ${existingCount.count} items. Skipping import.`);
      return;
    }
  }

  // Insert all items
  let imported = 0;
  for (const item of allItems) {
    await db('proctcae_items').insert({
      item_code: item.item_code,
      symptom_category: item.symptom_category,
      attribute: item.attribute,
      question_text: item.question_text,
      response_type: item.response_type,
      response_options: JSON.stringify(item.response_options),
      applicable_populations: null,
      ctcae_mapping: null,
    });
    imported++;
  }

  console.log(`   ✅ Imported ${imported} PRO-CTCAE items`);
}
