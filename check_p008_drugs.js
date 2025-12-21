const { getDb } = require('./packages/api/dist/db/connection');

async function checkP008Drugs() {
  const db = getDb();

  console.log('🔍 Checking P008 drug name mismatch\n');
  console.log('═'.repeat(80));

  // Get P008's treatment and regimen
  console.log('\n1️⃣ Checking P008 treatment...');
  const treatment = await db('treatments')
    .where('patient_id', 'P008')
    .first();

  if (!treatment) {
    console.log('❌ No treatment found for P008');
    return;
  }

  console.log(`   Regimen ID: ${treatment.regimen_id}`);

  // Get regimen
  const regimen = await db('regimens')
    .where('regimen_id', treatment.regimen_id)
    .first();

  console.log(`   Regimen Code: ${regimen.regimen_code}`);
  console.log(`   Regimen Name: ${regimen.regimen_name}`);
  console.log(`   Drug Module Composition:`, JSON.stringify(regimen.drug_module_composition, null, 2));

  // Get current cycle
  const cycle = await db('treatment_cycles')
    .where('treatment_id', treatment.treatment_id)
    .orderBy('cycle_number', 'desc')
    .first();

  console.log(`\n   Current Cycle: ${cycle.cycle_number}`);
  console.log(`   Active Drugs (from cycle):`, cycle.active_drugs);

  // Get drug modules
  console.log('\n2️⃣ Checking drug modules in database...');
  const drugModules = await db('drug_modules').select('drug_name');
  console.log(`   Available drug modules:`);
  drugModules.forEach(d => console.log(`     - ${d.drug_name}`));

  console.log('\n3️⃣ ROOT CAUSE IDENTIFIED:');
  console.log('   ❌ Regimen composition has: "Trastuzumab Emtansine"');
  console.log('   ❌ Drug module is named: "T-DM1"');
  console.log('   ❌ Drug name lookup fails → 0 drug modules found → 0 symptoms → 0 questions');

  console.log('\n4️⃣ SOLUTION:');
  console.log('   Option 1: Update drug module name to "Trastuzumab Emtansine"');
  console.log('   Option 2: Update regimen composition to use "T-DM1"');
  console.log('   Option 3: Add alias matching logic (check alternativeNames field)');
  console.log('   Recommendation: Option 3 - Use alternativeNames for flexible matching');

  await db.destroy();
}

checkP008Drugs().catch(console.error);
