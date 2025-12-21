const { getDb } = require('./packages/api/dist/db/connection');

async function updateTDM1Names() {
  const db = getDb();

  console.log('🔧 Updating T-DM1 alternative names...\n');

  try {
    // Read the updated data from JSON file
    const drugModulesData = require('./data/drug-modules.json');
    const tdm1Module = drugModulesData.drugModules.find(d => d.drugName === 'T-DM1');

    if (!tdm1Module) {
      console.error('❌ T-DM1 module not found in drug-modules.json');
      return;
    }

    console.log('New alternative names:', tdm1Module.alternativeNames);

    // Update the database
    await db('drug_modules')
      .where('drug_name', 'T-DM1')
      .update({
        // Store as JSONB (Postgres will handle the conversion)
        alternative_names: JSON.stringify(tdm1Module.alternativeNames),
      });

    console.log('\n✅ Updated T-DM1 alternative names in database');

    // Verify the update
    const updated = await db('drug_modules')
      .where('drug_name', 'T-DM1')
      .select('drug_name', 'alternative_names')
      .first();

    console.log('\nVerification:', updated);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

updateTDM1Names();
