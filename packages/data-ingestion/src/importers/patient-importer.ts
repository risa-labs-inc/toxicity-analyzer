import { Knex } from 'knex';
import * as fs from 'fs';
import { getDataPath } from '../db-connection';

interface DemoPatient {
  patient_id: string;
  profile: {
    name?: string;
    age: number;
    gender?: string;
    ethnicity?: string;
    bmi: number;
    comorbidities: string[];
  };
  regimen: {
    name: string;
    current_phase?: string;
    drugs: string[];
    cycle_number: number;
    last_infusion_date: string;
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

export async function importPatients(db: Knex): Promise<void> {
  const filePath = getDataPath('demo-patients.json');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Patient data file not found at: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log(`   Loading ${data.patients.length} demo patients...`);

  // Check if data already exists
  const existingCount = await db('patients').count('* as count').first();
  if (existingCount && Number(existingCount.count) > 0) {
    console.log(`   ⚠️  ${existingCount.count} patients already exist. Skipping import.`);
    return;
  }

  let imported = 0;

  for (const patient of data.patients as DemoPatient[]) {
    // Calculate date_of_birth from age
    const today = new Date();
    const birthYear = today.getFullYear() - patient.profile.age;
    const dateOfBirth = new Date(birthYear, today.getMonth(), today.getDate());

    // Create patient record
    const [patientRecord] = await db('patients')
      .insert({
        firebase_uid: patient.patient_id, // Use patient_id as firebase_uid for demo
        medical_record_number: patient.patient_id,
        full_name: patient.profile.name || null,
        date_of_birth: dateOfBirth,
        gender: patient.profile.gender || 'female',
        ethnicity: patient.profile.ethnicity || null,
        comorbidities: JSON.stringify(patient.profile.comorbidities),
        ecog_baseline: patient.functional_status.ecog,
        enrollment_date: new Date('2025-01-01'),
        status: 'active',
      })
      .returning('*');

    // Get regimen by code
    const regimen = await db('regimens')
      .where('regimen_code', patient.regimen.name)
      .first();

    if (!regimen) {
      console.warn(`   ⚠️  Regimen not found: ${patient.regimen.name} for patient ${patient.patient_id}`);
      continue;
    }

    // Create treatment record
    const [treatment] = await db('patient_treatments')
      .insert({
        patient_id: patientRecord.patient_id,
        regimen_id: regimen.regimen_id,
        start_date: new Date('2025-10-01'), // Demo start date
        total_planned_cycles: 6,
        current_cycle: patient.regimen.cycle_number,
        treatment_intent: 'adjuvant',
        status: 'active',
      })
      .returning('*');

    // Create current cycle record
    await db('treatment_cycles').insert({
      treatment_id: treatment.treatment_id,
      cycle_number: patient.regimen.cycle_number,
      infusion_date: new Date(patient.regimen.last_infusion_date),
      planned_next_infusion: new Date(
        new Date(patient.regimen.last_infusion_date).getTime() +
        regimen.standard_cycle_length_days * 24 * 60 * 60 * 1000
      ),
      completed: false,
    });

    imported++;
    console.log(`   ✓ ${patient.patient_id}: ${patient.regimen.name} - Cycle ${patient.regimen.cycle_number}`);
  }

  console.log(`   ✅ Imported ${imported} patients with treatment data`);
}
