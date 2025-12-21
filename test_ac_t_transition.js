const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testACTTransition() {
  console.log('🔬 TESTING AC → T SEQUENTIAL REGIMEN STEP TRACKING\n');
  console.log('═'.repeat(80));

  const testCases = [
    { patientId: 'P003', expectedStep: 'AC', expectedDrugs: ['Doxorubicin', 'Cyclophosphamide'], cycle: 3 },
    { patientId: 'P002', expectedStep: 'T', expectedDrugs: ['Paclitaxel'], cycle: 6 },
  ];

  let passCount = 0;
  let failCount = 0;

  for (const testCase of testCases) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`\n📋 TEST: ${testCase.patientId} (Cycle ${testCase.cycle})`);
    console.log(`Expected Step: ${testCase.expectedStep}`);
    console.log(`Expected Drugs: ${testCase.expectedDrugs.join(', ')}`);

    try {
      const headers = { Authorization: `Demo ${testCase.patientId}` };

      // Generate using drug-module approach
      const response = await axios.post(
        `${API_BASE}/patient/questionnaires/generate-drug-module`,
        {},
        { headers }
      );

      const { metadata } = response.data;

      console.log(`\nActual Results:`);
      console.log(`  Active Drugs: ${metadata.activeDrugs.join(', ')}`);
      console.log(`  Regimen Step: ${metadata.regimenStep || 'N/A'}`);
      console.log(`  Symptoms Tracked: ${metadata.symptomSources ? metadata.symptomSources.length : 0}`);
      console.log(`  Questions Generated: ${response.data.items.length}`);

      // Validate step tracking
      const stepMatch = metadata.regimenStep === testCase.expectedStep;
      const drugsMatch = JSON.stringify(metadata.activeDrugs.sort()) === JSON.stringify(testCase.expectedDrugs.sort());

      console.log(`\nValidation:`);
      console.log(`  ${stepMatch ? '✅' : '❌'} Regimen step: ${metadata.regimenStep || 'N/A'} ${stepMatch ? '==' : '!='} ${testCase.expectedStep}`);
      console.log(`  ${drugsMatch ? '✅' : '❌'} Active drugs: ${metadata.activeDrugs.join(', ')} ${drugsMatch ? '==' : '!='} ${testCase.expectedDrugs.join(', ')}`);

      if (stepMatch && drugsMatch) {
        console.log(`\n✅ PASS: Step tracking working correctly for ${testCase.patientId}`);
        passCount++;
      } else {
        console.log(`\n❌ FAIL: Step tracking incorrect for ${testCase.patientId}`);
        failCount++;
      }

      // Show symptom sources for transparency
      if (metadata.symptomSources && metadata.symptomSources.length > 0) {
        console.log(`\nSymptom Sources (sample):`);
        metadata.symptomSources.slice(0, 5).forEach(source => {
          console.log(`  - ${source.symptom}: ${source.sources.join(', ')}`);
        });
        if (metadata.symptomSources.length > 5) {
          console.log(`  ... and ${metadata.symptomSources.length - 5} more`);
        }
      }

    } catch (error) {
      console.error(`\n❌ FAIL: Error testing ${testCase.patientId}:`, error.response?.data?.message || error.message);
      failCount++;
    }
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log('\n📊 TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`Passed: ${passCount} ✅`);
  console.log(`Failed: ${failCount} ${failCount > 0 ? '❌' : ''}`);
  console.log(`Success Rate: ${((passCount / testCases.length) * 100).toFixed(1)}%`);

  console.log('\n🎯 EDGE CASE FINDINGS:');
  console.log('─'.repeat(80));
  if (passCount === testCases.length) {
    console.log('✅ AC → T sequential step tracking is working correctly');
    console.log('✅ Drug module selector correctly identifies active drugs per cycle');
    console.log('✅ Regimen step field is properly populated');
  } else {
    console.log('⚠️  Issues detected in AC → T transition handling');
    console.log('⚠️  Review getActiveDrugs() logic in drug-module-selector.ts');
  }

  console.log('\n' + '═'.repeat(80));
  return passCount === testCases.length;
}

testACTTransition()
  .then(success => {
    if (success) {
      console.log('✅ All AC → T transition tests passed!\n');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
