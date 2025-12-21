const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api/v1';
const DEMO_PATIENTS = ['P002', 'P003', 'P006', 'P008', 'P012', 'P015', 'P016'];

async function runComparisonForPatient(patientId) {
  try {
    console.log(`\n🔬 Testing ${patientId}...`);
    const headers = { Authorization: `Demo ${patientId}` };

    const response = await axios.post(
      `${API_BASE}/patient/questionnaires/compare`,
      {},
      { headers }
    );

    return {
      patientId,
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(`❌ Error for ${patientId}:`, error.response?.data?.message || error.message);
    return {
      patientId,
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

async function runAllComparisons() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('RUNNING COMPARISONS FOR ALL DEMO PATIENTS');
  console.log('═══════════════════════════════════════════════════════════');

  const results = [];

  for (const patientId of DEMO_PATIENTS) {
    const result = await runComparisonForPatient(patientId);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${patientId} completed`);
    } else {
      console.log(`❌ ${patientId} failed`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nSuccessful: ${successful.length}/${DEMO_PATIENTS.length}`);
  console.log(`Failed: ${failed.length}/${DEMO_PATIENTS.length}`);

  if (failed.length > 0) {
    console.log('\nFailed patients:', failed.map(r => r.patientId).join(', '));
  }

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `comparison_results_${timestamp}.json`;

  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n📁 Results saved to: ${filename}`);

  return results;
}

// Run comparisons
runAllComparisons()
  .then(() => {
    console.log('\n✅ All comparisons completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
