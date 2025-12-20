#!/usr/bin/env node

/**
 * Refresh Demo Patient Data for Current Date
 *
 * This script updates all patient dates relative to the current date while preserving
 * their intended treatment day, phase, and demo purpose.
 *
 * Example: P001 is designed to be on Day 6 (recovery phase).
 *          On any demo date, this script ensures P001's last_infusion_date is set
 *          such that they are still on Day 6 relative to today.
 *
 * Usage: npm run refresh-demo-patients
 *        or: node dist/refresh-demo-patients.js
 */

import { getDbConnection } from './db-connection';

/**
 * Patient configuration with intended treatment day for demo purposes
 * This defines what each patient is meant to demonstrate
 */
const PATIENT_DEMO_CONFIG = [
  // AC-T Regimen
  {
    medical_record_number: 'P001',
    intended_treatment_day: 6,  // Recovery phase (Day 4-6)
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'Post-session/Recovery phase, minimal symptoms'
  },
  {
    medical_record_number: 'P002',
    intended_treatment_day: 13,  // Nadir phase (Day 7-12) transitioning to inter_cycle
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'Nadir phase, emerging neuropathy'
  },
  {
    medical_record_number: 'P003',
    intended_treatment_day: 26,  // Inter_cycle, past due for next infusion
    cycle_length_days: 21,
    has_planned_next_infusion: false,  // Treatment delay due to toxicity
    demo_purpose: 'Grade 2 dose-limiting neuropathy, treatment delay'
  },
  {
    medical_record_number: 'P016',
    intended_treatment_day: 45,  // Pre-session (approaching next cycle after long gap)
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    days_until_next_infusion: 6,  // Pre-session window
    demo_purpose: 'Pre-session clearance assessment'
  },

  // TC Regimen
  {
    medical_record_number: 'P004',
    intended_treatment_day: 4,  // Recovery phase
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'Recovery phase, Grade 2 myalgia (docetaxel-associated)'
  },
  {
    medical_record_number: 'P005',
    intended_treatment_day: 15,  // Inter_cycle, post-nadir
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'Cardiac comorbidity, edema monitoring'
  },
  {
    medical_record_number: 'P006',
    intended_treatment_day: 6,  // Recovery phase
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'First cycle, no symptoms (shortest questionnaire)'
  },
  {
    medical_record_number: 'P017',
    intended_treatment_day: 45,  // Pre-session
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    days_until_next_infusion: 6,
    demo_purpose: 'Pre-session with established history'
  },

  // T-DM1 Regimen
  {
    medical_record_number: 'P007',
    intended_treatment_day: 4,  // Recovery phase
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'Late cycle tolerance (Cycle 5)'
  },
  {
    medical_record_number: 'P008',
    intended_treatment_day: 10,  // Nadir phase (T-DM1 nadir Days 7-14)
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'CRITICAL - Thrombocytopenia risk, bleeding symptom in nadir'
  },
  {
    medical_record_number: 'P009',
    intended_treatment_day: 19,  // Inter_cycle, late cycle
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'Long-term treatment success (Cycle 8)'
  },

  // Capecitabine Regimen
  {
    medical_record_number: 'P010',
    intended_treatment_day: 5,  // Recovery phase (Days 1-14 "on" period)
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'Oral chemo GI toxicity'
  },
  {
    medical_record_number: 'P011',
    intended_treatment_day: 8,  // Nadir phase (Days 1-14 "on" period)
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'Emerging HFS at Cycle 4 (classic timing)'
  },
  {
    medical_record_number: 'P012',
    intended_treatment_day: 19,  // Inter_cycle (Days 15-21 "off" period, peak HFS timing)
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    days_until_next_infusion: 2,  // Should be delayed for HFS management
    demo_purpose: 'ENHANCED - Grade 2 HFS dose-limiting, treatment delay needed'
  },

  // Pembrolizumab Regimen
  {
    medical_record_number: 'P013',
    intended_treatment_day: 4,  // Recovery phase
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'Early irAE (rash), combination immunotherapy-chemotherapy'
  },
  {
    medical_record_number: 'P014',
    intended_treatment_day: 15,  // Inter_cycle
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    demo_purpose: 'CRITICAL - COPD with worsening cough (pneumonitis risk)'
  },
  {
    medical_record_number: 'P015',
    intended_treatment_day: 20,  // Inter_cycle, approaching next cycle
    cycle_length_days: 21,
    has_planned_next_infusion: true,
    days_until_next_infusion: 1,  // Next day (should be held for irAE)
    demo_purpose: 'PRIMARY DEMO CASE - Grade 3->4 fatigue irAE, RED alert'
  },
];

async function refreshDemoPatients() {
  console.log('🔄 Refreshing Demo Patient Data for Current Date\n');
  console.log('=' .repeat(70) + '\n');

  const db = getDbConnection();
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);  // Normalize to midnight for consistency

  console.log(`📅 Current Demo Date: ${currentDate.toISOString().split('T')[0]}\n`);

  try {
    let updatedCount = 0;

    for (const config of PATIENT_DEMO_CONFIG) {
      console.log(`\n📋 Processing ${config.medical_record_number}...`);
      console.log(`   Intended Treatment Day: ${config.intended_treatment_day}`);
      console.log(`   Demo Purpose: ${config.demo_purpose}`);

      // Get patient from database
      const patient = await db('patients')
        .where('medical_record_number', config.medical_record_number)
        .first();

      if (!patient) {
        console.log(`   ⚠️  Patient ${config.medical_record_number} not found in database, skipping`);
        continue;
      }

      // Get patient treatment
      const treatment = await db('patient_treatments')
        .where('patient_id', patient.patient_id)
        .first();

      if (!treatment) {
        console.log(`   ⚠️  No treatment found for ${config.medical_record_number}, skipping`);
        continue;
      }

      // Calculate new last_infusion_date
      // Formula: last_infusion_date = current_date - (intended_treatment_day - 1)
      const daysToSubtract = config.intended_treatment_day - 1;
      const newLastInfusionDate = new Date(currentDate);
      newLastInfusionDate.setDate(currentDate.getDate() - daysToSubtract);

      console.log(`   Old Last Infusion: ${treatment.start_date ? new Date(treatment.start_date).toISOString().split('T')[0] : 'N/A'}`);
      console.log(`   New Last Infusion: ${newLastInfusionDate.toISOString().split('T')[0]}`);

      // Calculate planned_next_infusion if applicable
      let newPlannedNextInfusion: Date | null = null;
      if (config.has_planned_next_infusion) {
        if (config.days_until_next_infusion !== undefined) {
          // Specific days until next infusion (e.g., pre-session patients)
          newPlannedNextInfusion = new Date(currentDate);
          newPlannedNextInfusion.setDate(currentDate.getDate() + config.days_until_next_infusion);
        } else {
          // Standard cycle length
          newPlannedNextInfusion = new Date(newLastInfusionDate);
          newPlannedNextInfusion.setDate(newLastInfusionDate.getDate() + config.cycle_length_days);
        }
        console.log(`   New Next Infusion: ${newPlannedNextInfusion.toISOString().split('T')[0]}`);
      } else {
        console.log(`   Next Infusion: None (treatment delay)`);
      }

      // Update patient_treatments.start_date
      await db('patient_treatments')
        .where('treatment_id', treatment.treatment_id)
        .update({
          start_date: newLastInfusionDate,
          updated_at: new Date(),
        });

      // Update treatment_cycles
      const cycle = await db('treatment_cycles')
        .where('treatment_id', treatment.treatment_id)
        .orderBy('cycle_number', 'desc')
        .first();

      if (cycle) {
        await db('treatment_cycles')
          .where('cycle_id', cycle.cycle_id)
          .update({
            infusion_date: newLastInfusionDate,
            planned_next_infusion: newPlannedNextInfusion,
          });
        console.log(`   ✅ Updated Cycle ${cycle.cycle_number} dates`);
      }

      updatedCount++;
      console.log(`   ✅ ${config.medical_record_number} refreshed successfully`);
    }

    console.log('\n' + '=' .repeat(70));
    console.log(`\n✅ Demo Patient Refresh Complete!`);
    console.log(`   Updated ${updatedCount} patients`);
    console.log(`   Demo Date: ${currentDate.toISOString().split('T')[0]}`);
    console.log(`\n📊 Verification:`);
    console.log(`   Run: npm run test-complete-system`);
    console.log(`   Expected: All patients should be in their intended phases/days\n`);

  } catch (error) {
    console.error('\n❌ Refresh failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the refresh
refreshDemoPatients()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
