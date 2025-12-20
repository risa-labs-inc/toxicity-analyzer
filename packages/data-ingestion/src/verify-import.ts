#!/usr/bin/env node

import { getDbConnection } from './db-connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyImport() {
  console.log('🔍 Verifying database imports...\n');

  const db = getDbConnection();

  try {
    // Check PRO-CTCAE items
    const proctcaeCount = await db('proctcae_items').count('* as count').first();
    const proctcaeTotal = Number(proctcaeCount?.count || 0);
    console.log(`✓ PRO-CTCAE Items: ${proctcaeTotal} items`);

    if (proctcaeTotal > 0) {
      // Show sample items
      const sampleItems = await db('proctcae_items')
        .select('item_code', 'symptom_category', 'attribute')
        .limit(3);
      console.log('  Sample items:');
      sampleItems.forEach(item => {
        console.log(`    - ${item.item_code} (${item.symptom_category}/${item.attribute})`);
      });
    }

    console.log('');

    // Check regimens
    const regimenCount = await db('regimens').count('* as count').first();
    const regimenTotal = Number(regimenCount?.count || 0);
    console.log(`✓ Regimens: ${regimenTotal} regimens`);

    if (regimenTotal > 0) {
      const regimens = await db('regimens')
        .select('regimen_code', 'regimen_name', 'standard_cycle_length_days');
      console.log('  Regimens:');
      regimens.forEach(r => {
        console.log(`    - ${r.regimen_code}: ${r.regimen_name} (${r.standard_cycle_length_days} days)`);
      });
    }

    console.log('');

    // Check patients
    const patientCount = await db('patients').count('* as count').first();
    const patientTotal = Number(patientCount?.count || 0);
    console.log(`✓ Patients: ${patientTotal} patients`);

    if (patientTotal > 0) {
      // Show sample patients with their treatments
      const patientsWithTreatments = await db('patients as p')
        .join('patient_treatments as pt', 'p.patient_id', 'pt.patient_id')
        .join('regimens as r', 'pt.regimen_id', 'r.regimen_id')
        .select(
          'p.firebase_uid',
          'r.regimen_code',
          'pt.current_cycle',
          'pt.total_planned_cycles',
          'pt.status'
        )
        .limit(5);

      console.log('  Sample patients:');
      patientsWithTreatments.forEach(p => {
        console.log(`    - ${p.firebase_uid}: ${p.regimen_code} (Cycle ${p.current_cycle}/${p.total_planned_cycles}) - ${p.status}`);
      });
    }

    console.log('');

    // Check treatment cycles
    const cycleCount = await db('treatment_cycles').count('* as count').first();
    const cycleTotal = Number(cycleCount?.count || 0);
    console.log(`✓ Treatment Cycles: ${cycleTotal} cycles`);

    console.log('');

    // Verify relationships
    console.log('🔗 Verifying relationships...');

    const orphanedTreatments = await db('patient_treatments as pt')
      .leftJoin('patients as p', 'pt.patient_id', 'p.patient_id')
      .leftJoin('regimens as r', 'pt.regimen_id', 'r.regimen_id')
      .whereNull('p.patient_id')
      .orWhereNull('r.regimen_id')
      .count('* as count')
      .first();

    if (Number(orphanedTreatments?.count || 0) === 0) {
      console.log('  ✓ All patient treatments properly linked');
    } else {
      console.log(`  ⚠️  Found ${orphanedTreatments?.count} orphaned treatments`);
    }

    const orphanedCycles = await db('treatment_cycles as tc')
      .leftJoin('patient_treatments as pt', 'tc.treatment_id', 'pt.treatment_id')
      .whereNull('pt.treatment_id')
      .count('* as count')
      .first();

    if (Number(orphanedCycles?.count || 0) === 0) {
      console.log('  ✓ All treatment cycles properly linked');
    } else {
      console.log(`  ⚠️  Found ${orphanedCycles?.count} orphaned cycles`);
    }

    console.log('');

    // Summary
    const isComplete = proctcaeTotal > 0 && regimenTotal === 5 && patientTotal === 15;

    if (isComplete) {
      console.log('✅ Database import verification PASSED');
      console.log('');
      console.log('Expected data:');
      console.log('  - PRO-CTCAE Items: ~50 items ✓');
      console.log('  - Regimens: 5 regimens ✓');
      console.log('  - Patients: 15 patients ✓');
    } else {
      console.log('⚠️  Database import incomplete');
      console.log('');
      console.log('Expected vs Actual:');
      console.log(`  - PRO-CTCAE Items: ~50 items (found ${proctcaeTotal})`);
      console.log(`  - Regimens: 5 regimens (found ${regimenTotal})`);
      console.log(`  - Patients: 15 patients (found ${patientTotal})`);
      console.log('');
      console.log('Run: npm run dev all');
    }

    await db.destroy();
    process.exit(isComplete ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    await db.destroy();
    process.exit(1);
  }
}

verifyImport();
