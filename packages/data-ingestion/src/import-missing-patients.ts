#!/usr/bin/env node

/**
 * Import missing patients from demo-patients.json
 *
 * This script imports only patients that don't already exist in the database.
 */

import { getDbConnection, getDataPath } from './db-connection';
import * as fs from 'fs';
import * as crypto from 'crypto';

interface DemoPatient {
  patient_id: string;
  profile: {
    age: number;
    bmi: number;
    comorbidities: string[];
  };
  regimen: {
    name: string;
    current_phase?: string;
    drugs: string[];
    cycle_number: number;
    last_infusion_date: string;
    planned_next_infusion?: string;
  };
  symptom_history: Array<{
    symptom: string;
    last_grade: number;
    trend: string;
  }>;
  functional_status: {
    ecog: number;
  };
}

async function importMissingPatients() {
  console.log('🔄 Importing missing patients...\\n');

  const db = getDbConnection();

  try {
    // Read demo patients file
    const dataPath = getDataPath('demo-patients.json');
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);

    console.log(`📋 Found ${data.patients.length} patients in demo-patients.json\\n`);

    // Get existing patients
    const existingPatients = await db('patients')
      .select('medical_record_number')
      .orderBy('medical_record_number');

    const existingMRNs = new Set(existingPatients.map(p => p.medical_record_number));
    console.log(`💾 Found ${existingMRNs.size} existing patients in database`);
    console.log(`   Existing: ${Array.from(existingMRNs).join(', ')}\\n`);

    // Filter to only new patients
    const newPatients = data.patients.filter((p: DemoPatient) => {
      return !existingMRNs.has(p.patient_id);
    });

    if (newPatients.length === 0) {
      console.log('✅ All patients already imported. Nothing to do.\\n');
      return;
    }

    console.log(`📦 Importing ${newPatients.length} new patients...\\n`);

    for (const patientData of newPatients) {
      const patientId = patientData.patient_id;

      console.log(`Processing ${patientId}...`);

      // Generate Firebase UID (demo mode)
      const firebaseUid = patientId;

      // Insert patient
      const [insertedPatient] = await db('patients')
        .insert({
          firebase_uid: firebaseUid,
          medical_record_number: patientId,
          gender: 'female',
          comorbidities: JSON.stringify(patientData.profile.comorbidities),
          ecog_baseline: patientData.functional_status.ecog,
          enrollment_date: new Date('2025-01-01'),
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      console.log(`  ✓ Created patient record`);

      // Get regimen
      const regimen = await db('regimens')
        .where('regimen_code', patientData.regimen.name)
        .first();

      if (!regimen) {
        console.log(`  ⚠️  Regimen ${patientData.regimen.name} not found, skipping treatment`);
        continue;
      }

      // Insert treatment
      const lastInfusionDate = new Date(patientData.regimen.last_infusion_date);
      const plannedNextInfusion = patientData.regimen.planned_next_infusion
        ? new Date(patientData.regimen.planned_next_infusion)
        : null;

      const [insertedTreatment] = await db('patient_treatments')
        .insert({
          patient_id: insertedPatient.patient_id,
          regimen_id: regimen.regimen_id,
          start_date: lastInfusionDate,
          total_planned_cycles: 6,
          current_cycle: patientData.regimen.cycle_number,
          treatment_intent: 'adjuvant',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      console.log(`  ✓ Created treatment record`);

      // Insert treatment cycle
      await db('treatment_cycles').insert({
        treatment_id: insertedTreatment.treatment_id,
        cycle_number: patientData.regimen.cycle_number,
        infusion_date: lastInfusionDate,
        planned_next_infusion: plannedNextInfusion,
        created_at: new Date(),
      });

      console.log(`  ✓ Created treatment cycle (cycle ${patientData.regimen.cycle_number})`);
      console.log(`  ✅ ${patientId} imported successfully\\n`);
    }

    console.log(`\\n✅ Successfully imported ${newPatients.length} new patients!`);

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the import
importMissingPatients()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
