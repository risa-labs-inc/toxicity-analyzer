const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testComparison(patientId = 'P002') {
  try {
    console.log(`\n🔬 Testing Comparison Framework for ${patientId}`);
    console.log('=' .repeat(80));

    // Set up authentication
    const headers = { Authorization: `Demo ${patientId}` };

    // Call comparison endpoint
    console.log('\n⚙️  Generating questionnaires using both approaches...');
    const response = await axios.post(
      `${API_BASE}/patient/questionnaires/compare`,
      {},
      { headers }
    );

    const { comparison, summary } = response.data;

    // Display summary
    console.log('\n' + summary);

    // Display detailed symptom breakdown
    console.log('\n📋 DETAILED SYMPTOM BREAKDOWN');
    console.log('─'.repeat(80));

    console.log('\n  Shared Symptoms:');
    comparison.metrics.symptomCoverage.sharedSymptoms.forEach(s =>
      console.log(`    ✓ ${s}`)
    );

    if (comparison.metrics.symptomCoverage.uniqueToRegimen.length > 0) {
      console.log('\n  Unique to Regimen Approach:');
      comparison.metrics.symptomCoverage.uniqueToRegimen.forEach(s =>
        console.log(`    → ${s}`)
      );
    }

    if (comparison.metrics.symptomCoverage.uniqueToDrugModule.length > 0) {
      console.log('\n  Unique to Drug Module Approach:');
      comparison.metrics.symptomCoverage.uniqueToDrugModule.forEach(s =>
        console.log(`    → ${s}`)
      );
    }

    // Display active drugs info
    console.log('\n🔍 DRUG MODULE APPROACH DETAILS');
    console.log('─'.repeat(80));
    console.log('  Active Drugs:',
      comparison.metrics.granularity.drugModuleApproachActiveDrugs.join(', ')
    );
    console.log('  Regimen Step:',
      comparison.metrics.granularity.drugModuleApproachRegimenStep || 'N/A'
    );
    console.log('  Symptoms with Source Tracking:',
      comparison.metrics.granularity.drugModuleApproachSymptomSources.length
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ Comparison completed successfully!');
    console.log('\n📊 Questionnaire IDs:');
    console.log(`  - Regimen Approach: ${comparison.regimenApproach.questionnaire.questionnaireId}`);
    console.log(`  - Drug Module Approach: ${comparison.drugModuleApproach.questionnaire.questionnaireId}`);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('\nStack:', error.response.data.stack);
    }
  }
}

// Run test
const patientId = process.argv[2] || 'P002';
testComparison(patientId);
