#!/usr/bin/env node

/**
 * Update existing regimens with complete toxicity_profile
 *
 * This script reads from regimen-toxicity-map.json and updates
 * existing regimen records with the complete toxicity_profile,
 * including high_risk, moderate, low, and phase_priorities fields.
 */

import { getDbConnection, getDataPath } from './db-connection';
import * as fs from 'fs';

interface RegimenData {
  regimen_code: string;
  toxicity_profile: {
    high_risk: string[];
    moderate: string[];
    low: string[];
    phase_priorities?: {
      pre_session: string[];
      post_session: string[];
      recovery: string[];
      nadir: string[];
      inter_cycle: string[];
    };
  };
}

async function updateRegimenToxicityProfiles() {
  console.log('🔄 Updating regimen toxicity profiles...\n');

  const db = getDbConnection();

  try {
    // Read regimen data
    const dataPath = getDataPath('regimen-toxicity-map.json');
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);

    console.log(`📋 Found ${data.regimens.length} regimens in source file\n`);

    for (const regimenData of data.regimens) {
      const { regimen_code, toxicity_profile } = regimenData;

      // Get existing regimen
      const existing = await db('regimens')
        .where({ regimen_code })
        .first();

      if (!existing) {
        console.log(`⚠️  ${regimen_code}: Not found in database, skipping`);
        continue;
      }

      // Replace entire toxicity_profile with data from JSON
      // Update the record
      await db('regimens')
        .where({ regimen_code })
        .update({
          toxicity_profile: JSON.stringify(toxicity_profile)
        });

      console.log(`✅ ${regimen_code}: Updated toxicity profile`);
      console.log(`   - high_risk: ${toxicity_profile.high_risk.length} categories - ${JSON.stringify(toxicity_profile.high_risk)}`);
      if (toxicity_profile.phase_priorities) {
        console.log(`   - phase_priorities:`);
        console.log(`      - pre_session: ${toxicity_profile.phase_priorities.pre_session.length} categories`);
        console.log(`      - post_session: ${toxicity_profile.phase_priorities.post_session.length} categories`);
        console.log(`      - recovery: ${toxicity_profile.phase_priorities.recovery.length} categories`);
        console.log(`      - nadir: ${toxicity_profile.phase_priorities.nadir.length} categories`);
        console.log(`      - inter_cycle: ${toxicity_profile.phase_priorities.inter_cycle.length} categories`);
      }
      console.log('');
    }

    console.log('✅ All regimens updated successfully!');

  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the update
updateRegimenToxicityProfiles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
