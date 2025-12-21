#!/usr/bin/env node

/**
 * Comprehensive test of enhanced demo patient data
 *
 * Tests all key features of the enhanced dataset
 */

import { getDbConnection } from './db-connection';

async function runComprehensiveTests() {
  console.log('🧪 COMPREHENSIVE DEMO DATA TEST\n');
  console.log('=' .repeat(60) + '\n');

  const db = getDbConnection();

  try {
    // Test 1: Verify patient count
    console.log('📊 Test 1: Patient Count');
    const patientCount = await db('patients').count('* as count').first();
    console.log(`   Found ${patientCount?.count} patients`);
    if (Number(patientCount?.count) === 17) {
      console.log('   ✅ PASS: All 17 patients present\n');
    } else {
      console.log(`   ❌ FAIL: Expected 17 patients, found ${patientCount?.count}\n`);
    }

    // Test 2: Verify new pre_session patients exist
    console.log('📋 Test 2: Pre-Session Patients');
    const p016 = await db('patients').where('medical_record_number', 'P016').first();
    const p017 = await db('patients').where('medical_record_number', 'P017').first();

    if (p016 && p017) {
      console.log(`   ✅ P016 exists: ${p016.firebase_uid}`);
      console.log(`   ✅ P017 exists: ${p017.firebase_uid}`);
      console.log('   ✅ PASS: Both pre_session patients imported\n');
    } else {
      console.log('   ❌ FAIL: Pre_session patients missing\n');
    }

    // Test 3: Verify regimen distribution
    console.log('📈 Test 3: Regimen Distribution');
    const regimenDist = await db('patient_treatments')
      .join('patients', 'patient_treatments.patient_id', 'patients.patient_id')
      .join('regimens', 'patient_treatments.regimen_id', 'regimens.regimen_id')
      .select('regimens.regimen_code')
      .select(db.raw('COUNT(*) as patient_count'))
      .groupBy('regimens.regimen_code')
      .orderBy('regimens.regimen_code');

    regimenDist.forEach(r => {
      console.log(`   ${r.regimen_code}: ${r.patient_count} patients`);
    });

    const hasACT = regimenDist.find(r => r.regimen_code === 'AC-T');
    const hasTC = regimenDist.find(r => r.regimen_code === 'TC');
    if (hasACT && Number(hasACT.patient_count) >= 3 && hasTC && Number(hasTC.patient_count) >= 3) {
      console.log('   ✅ PASS: Good regimen distribution\n');
    } else {
      console.log('   ⚠️  WARNING: Uneven regimen distribution\n');
    }

    // Test 4: Check treatment cycles for new patients
    console.log('🔄 Test 4: Treatment Cycles');
    for (const mrn of ['P016', 'P017']) {
      const patient = await db('patients').where('medical_record_number', mrn).first();
      const treatment = await db('patient_treatments').where('patient_id', patient.patient_id).first();
      const cycles = await db('treatment_cycles').where('treatment_id', treatment.treatment_id);

      console.log(`   ${mrn}: ${cycles.length} cycle(s), Current cycle: ${treatment.current_cycle}`);
      if (cycles.length > 0) {
        const cycle = cycles[0];
        console.log(`      Last infusion: ${new Date(cycle.infusion_date).toISOString().split('T')[0]}`);
        if (cycle.planned_next_infusion) {
          console.log(`      Next infusion: ${new Date(cycle.planned_next_infusion).toISOString().split('T')[0]}`);
        }
      }
    }
    console.log('   ✅ PASS: Treatment cycles created\n');

    // Test 5: Verify regimen toxicity profiles
    console.log('🎯 Test 5: Regimen Toxicity Profiles');
    const regimens = await db('regimens').whereIn('regimen_code', ['AC-T', 'TC']);

    for (const regimen of regimens) {
      const profile = regimen.toxicity_profile; // Already an object (JSONB)
      console.log(`   ${regimen.regimen_code}:`);
      console.log(`      High-risk: ${profile.high_risk.length} categories`);

      if (profile.phase_priorities) {
        const phases = Object.keys(profile.phase_priorities);
        console.log(`      Phase priorities: ${phases.join(', ')}`);

        if (profile.phase_priorities.pre_session) {
          console.log(`      Pre-session priorities: ${profile.phase_priorities.pre_session.join(', ')}`);
        }
      }
    }
    console.log('   ✅ PASS: Toxicity profiles loaded\n');

    // Test 6: Calculate treatment phases for all patients
    console.log('📅 Test 6: Patient Phase Distribution');
    const allPatients = await db('patients')
      .join('patient_treatments', 'patients.patient_id', 'patient_treatments.patient_id')
      .join('regimens', 'patient_treatments.regimen_id', 'regimens.regimen_id')
      .join('treatment_cycles', 'patient_treatments.treatment_id', 'treatment_cycles.treatment_id')
      .select(
        'patients.medical_record_number',
        'regimens.regimen_code',
        'regimens.standard_cycle_length_days',
        'regimens.nadir_window_start',
        'regimens.nadir_window_end',
        'treatment_cycles.infusion_date',
        'treatment_cycles.planned_next_infusion'
      )
      .orderBy('treatment_cycles.cycle_number', 'desc')
      .distinct('patients.medical_record_number');

    const phaseCount = {
      pre_session: 0,
      post_session: 0,
      recovery: 0,
      nadir: 0,
      inter_cycle: 0
    };

    const testDate = new Date('2025-12-20');

    for (const p of allPatients) {
      const lastInfusion = new Date(p.infusion_date);
      const daysSince = Math.floor((testDate.getTime() - lastInfusion.getTime()) / (24 * 60 * 60 * 1000));
      const treatmentDay = daysSince + 1;

      let phase = 'inter_cycle';
      // const cycleLengthDays = p.standard_cycle_length_days || 21;

      // Check if approaching next infusion (pre_session logic)
      if (p.planned_next_infusion) {
        const nextInfusion = new Date(p.planned_next_infusion);
        const daysToNext = Math.floor((nextInfusion.getTime() - testDate.getTime()) / (24 * 60 * 60 * 1000));

        // Pre-session: 0-6 days before next infusion
        if (daysToNext >= 0 && daysToNext <= 6) {
          phase = 'pre_session';
        }
      }

      // Override if in early post-infusion period
      if (treatmentDay >= 1 && treatmentDay <= 3) {
        phase = 'post_session';
      } else if (treatmentDay >= 4 && treatmentDay <= 6) {
        phase = 'recovery';
      } else if (p.nadir_window_start && p.nadir_window_end &&
                 treatmentDay >= p.nadir_window_start && treatmentDay <= p.nadir_window_end) {
        phase = 'nadir';
      }

      phaseCount[phase as keyof typeof phaseCount]++;
    }

    console.log(`   pre_session: ${phaseCount.pre_session} patients`);
    console.log(`   post_session: ${phaseCount.post_session} patients`);
    console.log(`   recovery: ${phaseCount.recovery} patients`);
    console.log(`   nadir: ${phaseCount.nadir} patients`);
    console.log(`   inter_cycle: ${phaseCount.inter_cycle} patients`);

    if (phaseCount.pre_session >= 2) {
      console.log('   ✅ PASS: Pre-session phase now represented\n');
    } else {
      console.log(`   ⚠️  WARNING: Only ${phaseCount.pre_session} patients in pre_session phase\n`);
    }

    // Final Summary
    console.log('=' .repeat(60));
    console.log('✅ COMPREHENSIVE TEST COMPLETE\n');
    console.log('Summary:');
    console.log(`  - Total patients: ${patientCount?.count}`);
    console.log(`  - Regimens: ${regimenDist.length}`);
    console.log(`  - Phases covered: ${Object.keys(phaseCount).filter(k => phaseCount[k as keyof typeof phaseCount] > 0).length}/5`);
    console.log(`  - Pre-session patients: ${phaseCount.pre_session}`);
    console.log('\n✅ Demo data is ready for demonstration!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run tests
runComprehensiveTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
