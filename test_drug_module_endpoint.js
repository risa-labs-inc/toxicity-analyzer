const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testDrugModuleEndpoint() {
  try {
    console.log('\n🧪 Testing Drug-Module Questionnaire Generation');
    console.log('=' .repeat(80));

    // Step 1: Set up authentication
    console.log('\n1️⃣  Setting up authentication for P002...');
    const headers = { Authorization: 'Demo P002' };
    console.log('✅ Authentication configured');

    // Step 2: Generate questionnaire using drug-module approach
    console.log('\n2️⃣  Generating questionnaire with drug-module approach...');
    const generateResponse = await axios.post(
      `${API_BASE}/patient/questionnaires/generate-drug-module`,
      {},
      { headers }
    );

    const { questionnaire, items, metadata } = generateResponse.data;

    console.log(`✅ Questionnaire generated: ${questionnaire.questionnaireId}`);
    console.log(`\n📊 Metadata:`);
    console.log(`  - Active drugs: ${metadata.activeDrugs.join(', ')}`);
    console.log(`  - Regimen step: ${metadata.regimenStep || 'N/A'}`);
    console.log(`  - Symptoms before dedup: ${metadata.totalSymptomsBeforeDedup}`);
    console.log(`  - Symptoms after dedup: ${metadata.totalSymptomsAfterDedup}`);
    console.log(`  - Phase filtering applied: ${metadata.phaseFilteringApplied}`);
    console.log(`  - Total questions: ${items.length}`);

    // Step 3: Analyze question composition
    console.log('\n3️⃣  Analyzing question composition...');
    const symptomGroups = {};
    items.forEach((item) => {
      const key = item.symptomCategory;
      if (!symptomGroups[key]) {
        symptomGroups[key] = [];
      }
      symptomGroups[key].push(item.attribute);
    });

    console.log('\n📋 Symptoms included:');
    Object.entries(symptomGroups).forEach(([symptom, attributes]) => {
      console.log(`  - ${symptom}: ${attributes.join(', ')}`);
    });

    // Step 4: Get full metadata
    console.log('\n4️⃣  Fetching full metadata...');
    const metadataResponse = await axios.get(
      `${API_BASE}/patient/questionnaires/${questionnaire.questionnaireId}/metadata`,
      { headers }
    );

    const fullMetadata = metadataResponse.data.metadata;
    if (fullMetadata && fullMetadata.symptomSources) {
      console.log('\n🔍 Symptom sources:');
      fullMetadata.symptomSources.slice(0, 5).forEach((source) => {
        console.log(`  - ${source.symptomTerm}:`);
        console.log(`    Sources: ${source.sources.join(', ')}`);
        console.log(`    Safety proxy: ${source.isSafetyProxy ? 'Yes' : 'No'}`);
        console.log(`    Phase filtering: ${source.phaseFilteringApplies ? source.phaseFilteringApplies.join(', ') : 'None'}`);
      });
      if (fullMetadata.symptomSources.length > 5) {
        console.log(`  ... and ${fullMetadata.symptomSources.length - 5} more`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('\nStack:', error.response.data.stack);
    }
  }
}

testDrugModuleEndpoint();
