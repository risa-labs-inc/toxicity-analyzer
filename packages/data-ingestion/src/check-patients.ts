#!/usr/bin/env node

import { getDbConnection } from './db-connection';

async function checkPatients() {
  const db = getDbConnection();

  try {
    const patients = await db('patients')
      .select('medical_record_number', 'firebase_uid')
      .orderBy('medical_record_number');

    console.log(`\n📊 Total patients in database: ${patients.length}\n`);
    console.log('Patient MRNs:');
    patients.forEach(p => {
      console.log(`  ✓ ${p.medical_record_number}`);
    });

    // Check for P016 and P017 specifically
    const hasP016 = patients.some(p => p.medical_record_number === 'MRN016');
    const hasP017 = patients.some(p => p.medical_record_number === 'MRN017');

    console.log('\n🔍 New Patient Check:');
    console.log(`  P016 (MRN016): ${hasP016 ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  P017 (MRN017): ${hasP017 ? '✅ EXISTS' : '❌ MISSING'}`);

    if (!hasP016 || !hasP017) {
      console.log('\n⚠️  New patients from demo-patients.json have NOT been imported yet.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.destroy();
  }
}

checkPatients()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
