const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testQuestionnaireFlow() {
  try {
    console.log('\n🧪 Testing P002 Questionnaire Flow');
    console.log('=' .repeat(80));

    // Step 1: Set up authentication (Demo mode - no login endpoint needed)
    console.log('\n1️⃣  Setting up authentication for P002...');
    const headers = { Authorization: 'Demo P002' };
    console.log('✅ Authentication configured');

    // Step 2: Generate new questionnaire
    console.log('\n2️⃣  Generating new questionnaire...');
    const generateResponse = await axios.post(
      `${API_BASE}/patient/questionnaires/generate`,
      {},
      { headers }
    );
    const questionnaireId = generateResponse.data.questionnaire.questionnaireId;
    console.log(`✅ Questionnaire generated: ${questionnaireId}`);

    // Step 3: Get questionnaire items
    console.log('\n3️⃣  Retrieving questionnaire items...');
    const getResponse = await axios.get(
      `${API_BASE}/patient/questionnaires/${questionnaireId}`,
      { headers }
    );
    const items = getResponse.data.items;
    console.log(`✅ Retrieved ${items.length} items`);

    // Step 4: Verify question order
    console.log('\n4️⃣  Verifying question order...');
    console.log('\n📋 Question Order:');

    // Group by symptom category
    const symptomGroups = {};
    items.forEach((item, index) => {
      const key = item.symptomCategory;
      if (!symptomGroups[key]) {
        symptomGroups[key] = [];
      }
      symptomGroups[key].push({
        index: index + 1,
        attribute: item.attribute,
        itemCode: item.itemCode,
        question: item.questionText.substring(0, 80) + '...'
      });
    });

    let orderCorrect = true;
    Object.keys(symptomGroups).forEach(category => {
      console.log(`\n  ${category.toUpperCase()}:`);
      const group = symptomGroups[category];

      group.forEach(item => {
        console.log(`    ${item.index}. [${item.attribute.toUpperCase()}] ${item.itemCode}`);
      });

      // Check order within each symptom
      const attributes = group.map(g => g.attribute);
      const expectedOrders = [
        ['frequency', 'severity', 'interference'],
        ['frequency', 'severity'],
        ['severity', 'interference'],
        ['present_absent', 'severity', 'interference'],
        ['present_absent', 'severity'],
        ['severity'],
        ['frequency'],
        ['present_absent']
      ];

      const isValidOrder = expectedOrders.some(expected => {
        if (attributes.length !== expected.length) return false;
        return attributes.every((attr, i) => attr === expected[i]);
      });

      if (!isValidOrder) {
        console.log(`    ❌ INCORRECT ORDER for ${category}`);
        orderCorrect = false;
      } else {
        console.log(`    ✅ Correct order`);
      }
    });

    if (orderCorrect) {
      console.log('\n✅ All questions are in correct order!');
    } else {
      console.log('\n❌ Some questions are out of order!');
    }

    // Step 5: Start questionnaire
    console.log('\n5️⃣  Starting questionnaire...');
    await axios.post(
      `${API_BASE}/patient/questionnaires/${questionnaireId}/start`,
      {},
      { headers }
    );
    console.log('✅ Questionnaire started');

    // Step 6: Test skip logic
    console.log('\n6️⃣  Testing skip logic...');

    // Find nausea and vomiting frequency questions
    const nauseaFreq = items.find(i => i.itemCode === 'NAUSEA_FREQ');
    const vomitingFreq = items.find(i => i.itemCode === 'VOMITING_FREQ');
    const nauseaSev = items.find(i => i.itemCode === 'NAUSEA_SEV');
    const vomitingSev = items.find(i => i.itemCode === 'VOMITING_SEV');

    if (nauseaFreq && vomitingFreq) {
      // Answer nausea with "Never" (0)
      console.log('\n  📝 Answering NAUSEA_FREQ with "Never" (0)...');
      const nauseaResponse = await axios.post(
        `${API_BASE}/patient/questionnaires/${questionnaireId}/responses`,
        {
          itemId: nauseaFreq.itemId,
          responseValue: 0,
          responseLabel: 'Never'
        },
        { headers }
      );

      if (nauseaSev && nauseaResponse.data.skipItemIds.includes(nauseaSev.itemId)) {
        console.log('  ✅ Correctly skipping NAUSEA_SEV');
      } else {
        console.log('  ❌ Not skipping NAUSEA_SEV (or item not in questionnaire)');
      }

      // Answer vomiting with "Rarely" (1)
      console.log('\n  📝 Answering VOMITING_FREQ with "Rarely" (1)...');
      const vomitingResponse = await axios.post(
        `${API_BASE}/patient/questionnaires/${questionnaireId}/responses`,
        {
          itemId: vomitingFreq.itemId,
          responseValue: 1,
          responseLabel: 'Rarely'
        },
        { headers }
      );

      if (vomitingSev && !vomitingResponse.data.skipItemIds.includes(vomitingSev.itemId)) {
        console.log('  ✅ Correctly NOT skipping VOMITING_SEV (severity should be asked)');
      } else if (vomitingSev) {
        console.log('  ❌ INCORRECTLY skipping VOMITING_SEV (should ask severity after "Rarely")');
      } else {
        console.log('  ⚠️  VOMITING_SEV not in questionnaire');
      }
    } else {
      console.log('  ⚠️  Could not find nausea/vomiting frequency questions');
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 Test completed!');
    console.log('\n📊 Summary:');
    console.log(`  - Questionnaire ID: ${questionnaireId}`);
    console.log(`  - Total questions: ${items.length}`);
    console.log(`  - Question order: ${orderCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    console.log('\n💡 You can now test manually in the browser:');
    console.log('   http://localhost:5173');
    console.log('   Login as: P002');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    console.error('\nStack:', error.stack);
  }
}

testQuestionnaireFlow();
