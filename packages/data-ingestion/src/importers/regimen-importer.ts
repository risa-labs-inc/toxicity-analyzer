import { Knex } from 'knex';
import * as fs from 'fs';
import { getDataPath } from '../db-connection';

export async function importRegimens(db: Knex): Promise<void> {
  const filePath = getDataPath('regimen-toxicity-map.json');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Regimen mapping file not found at: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log(`   Loading ${data.regimens.length} regimens...`);

  // Check if data already exists
  const existingCount = await db('regimens').count('* as count').first();
  if (existingCount && Number(existingCount.count) > 0) {
    console.log(`   ⚠️  ${existingCount.count} regimens already exist. Skipping import.`);
    return;
  }

  // Insert all regimens
  let imported = 0;
  for (const regimen of data.regimens) {
    await db('regimens').insert({
      regimen_code: regimen.regimen_code,
      regimen_name: regimen.regimen_name,
      description: `${regimen.regimen_name} - Breast cancer treatment protocol`,
      drug_components: JSON.stringify(regimen.drug_components),
      standard_cycle_length_days: regimen.cycle_length_days,
      total_cycles: null, // Patient-specific
      toxicity_profile: JSON.stringify(regimen.toxicity_profile),
      nadir_window_start: regimen.nadir_window.start,
      nadir_window_end: regimen.nadir_window.end,
    });
    imported++;
    console.log(`   ✓ ${regimen.regimen_code}: ${regimen.regimen_name}`);
  }

  console.log(`   ✅ Imported ${imported} regimens`);
}
