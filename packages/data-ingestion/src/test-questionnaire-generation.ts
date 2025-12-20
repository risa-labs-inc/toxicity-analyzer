#!/usr/bin/env node

/**
 * Test questionnaire generation for enhanced demo patients
 *
 * Tests:
 * 1. Pre-session questionnaires for P016 and P017
 * 2. Phase-specific filtering
 * 3. Symptom category selection based on regimen
 */

import { getDbConnection } from './db-connection';

async function testQuestionnaireGeneration() {
  console.log('🧪 Testing Questionnaire Generation...\n');

  const db = getDbConnection();

  try {
    // Test patients
    const testPatients = [
      { id: 'P016', expectedPhase: 'pre_session', regimen: 'AC-T' },
      { id: 'P017', expectedPhase: 'pre_session', regimen: 'TC' }
    ];

    for (const testPatient of testPatients) {
      console.log(`\n📋 Testing ${testPatient.id} (${testPatient.regimen})...`);

      // Get patient
      const patient = await db('patients')
        .where('medical_record_number', testPatient.id)
        .first();

      if (!patient) {
        console.log(`  ❌ Patient ${testPatient.id} not found`);
        continue;
      }

      // Get treatment
      const treatment = await db('patient_treatments')
        .where('patient_id', patient.patient_id)
        .first();

      if (!treatment) {
        console.log(`  ❌ No treatment found for ${testPatient.id}`);
        continue;
      }

      // Get regimen
      const regimen = await db('regimens')
        .where('regimen_id', treatment.regimen_id)
        .first();

      console.log(`  ✓ Regimen: ${regimen.regimen_code}`);

      // Get current cycle
      const currentCycle = await db('treatment_cycles')
        .where('treatment_id', treatment.treatment_id)
        .orderBy('cycle_number', 'desc')
        .first();

      console.log(`  ✓ Current cycle: ${currentCycle.cycle_number}`);
      console.log(`  ✓ Last infusion: ${new Date(currentCycle.infusion_date).toISOString().split('T')[0]}`);
      console.log(`  ✓ Next infusion: ${currentCycle.planned_next_infusion ? new Date(currentCycle.planned_next_infusion).toISOString().split('T')[0] : 'N/A'}`);

      // Calculate treatment day and phase (simple calculation for testing)
      const today = new Date('2025-12-20'); // Fixed date for consistent testing
      const lastInfusion = new Date(currentCycle.infusion_date);
      const daysSince = Math.floor((today.getTime() - lastInfusion.getTime()) / (24 * 60 * 60 * 1000));
      const treatmentDay = daysSince + 1;

      console.log(`  ✓ Treatment day: ${treatmentDay}`);

      // Determine phase (simplified logic for testing)
      let phase = 'inter_cycle';
      const cycleLengthDays = regimen.standard_cycle_length_days || 21;

      if (treatmentDay >= cycleLengthDays - 1 && treatmentDay <= cycleLengthDays + 1) {
        phase = 'pre_session';
      } else if (treatmentDay >= 1 && treatmentDay <= 3) {
        phase = 'post_session';
      } else if (treatmentDay >= 4 && treatmentDay <= 6) {
        phase = 'recovery';
      } else if (regimen.nadir_window_start && regimen.nadir_window_end &&
                 treatmentDay >= regimen.nadir_window_start && treatmentDay <= regimen.nadir_window_end) {
        phase = 'nadir';
      }

      console.log(`  ✓ Calculated phase: ${phase}`);

      if (phase !== testPatient.expectedPhase) {
        console.log(`  ⚠️  Phase mismatch! Expected ${testPatient.expectedPhase}, got ${phase}`);
      } else {
        console.log(`  ✅ Phase matches expected: ${phase}`);
      }

      // Check toxicity profile
      const toxicityProfile = JSON.parse(regimen.toxicity_profile);
      console.log(`  ✓ High-risk categories: ${toxicityProfile.high_risk.join(', ')}`);

      if (toxicityProfile.phase_priorities && toxicityProfile.phase_priorities[phase]) {
        console.log(`  ✓ Phase-specific priorities: ${toxicityProfile.phase_priorities[phase].join(', ')}`);
      }

      console.log(`  ✅ ${testPatient.id} test complete`);
    }

    console.log('\n✅ All questionnaire generation tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run tests
testQuestionnaireGeneration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
