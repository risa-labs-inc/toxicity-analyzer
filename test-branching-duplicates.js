/**
 * Test script to check for duplicate questions during questionnaire flow
 * Simulates answering questions and checks if branching creates duplicates
 */

const axios = require('axios');

const API_BASE_URL = 'https://toxicity-analyzer-api-4tebejtipa-uc.a.run.app/api/v1';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create API client for a specific patient
 */
function createPatientClient(patientId) {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Demo ${patientId}`,
    },
  });
}

/**
 * Simulate answering all questions in a questionnaire
 * Uses responses that trigger branching (high severity answers)
 */
async function answerQuestionnaire(client, questionnaireId, items) {
  const answeredItems = new Set();
  const allSeenItems = [];
  let currentItems = [...items];

  log('cyan', `  Simulating questionnaire responses...`);

  // Keep track of all items we've seen
  for (const item of currentItems) {
    allSeenItems.push(item);
  }

  let questionIndex = 0;
  while (questionIndex < currentItems.length) {
    const item = currentItems[questionIndex];
    const itemKey = item.itemId || item.item_id;

    // Skip if already answered
    if (answeredItems.has(itemKey)) {
      log('yellow', `    Question ${questionIndex + 1}: DUPLICATE DETECTED - ${item.itemCode} (already answered)`);
      questionIndex++;
      continue;
    }

    // Choose response value that might trigger branching
    // For frequency/severity: use 3 (moderately high)
    // For present_absent: use 1 (Yes)
    let responseValue;
    const attribute = item.attribute;
    if (attribute === 'frequency' || attribute === 'severity') {
      responseValue = 3;
    } else if (attribute === 'present_absent') {
      responseValue = 1;
    } else {
      responseValue = 2; // Default moderate response
    }

    const responseLabel = item.responseOptions?.[responseValue]?.label ||
                         item.response_options?.[responseValue]?.label ||
                         'Response';

    try {
      // Submit response
      const response = await client.post(
        `/patient/questionnaires/${questionnaireId}/responses`,
        {
          itemId: itemKey,
          responseValue,
          responseLabel,
        }
      );

      answeredItems.add(itemKey);

      // Check if new branching questions were added
      const branchingQuestions = response.data.branchingQuestions || [];
      if (branchingQuestions.length > 0) {
        log('blue', `    Question ${questionIndex + 1}: ${item.itemCode} - Added ${branchingQuestions.length} branching question(s)`);

        // Add branching questions to our list
        currentItems.splice(questionIndex + 1, 0, ...branchingQuestions);

        // Track these items
        for (const bq of branchingQuestions) {
          allSeenItems.push(bq);
        }
      }

      // Small delay to avoid overwhelming API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      log('red', `    Error answering question ${questionIndex + 1}: ${error.message}`);
    }

    questionIndex++;
  }

  return {
    totalQuestionsShown: currentItems.length,
    uniqueQuestionsAnswered: answeredItems.size,
    allItems: allSeenItems,
  };
}

/**
 * Check for duplicates in the full item list
 */
function checkDuplicates(items) {
  const seen = new Map();
  const duplicates = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = item.itemId || item.item_id;
    const code = item.itemCode || item.item_code;

    if (seen.has(key)) {
      duplicates.push({
        itemId: key,
        itemCode: code,
        questionText: item.questionText || item.question_text,
        firstIndex: seen.get(key),
        duplicateIndex: i,
      });
    } else {
      seen.set(key, i);
    }
  }

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
    totalQuestions: items.length,
    uniqueQuestions: seen.size,
  };
}

/**
 * Test questionnaire flow for a single patient
 */
async function testPatientFlow(patientId) {
  log('blue', `\n▶ Testing ${patientId} (with branching simulation)...`);

  const client = createPatientClient(patientId);

  try {
    // Generate questionnaire
    const generateResponse = await client.post('/patient/questionnaires/generate?mode=drug-module');
    const questionnaire = generateResponse.data.questionnaire;
    const items = generateResponse.data.items;

    log('cyan', `  Initial questions: ${items.length}`);

    // Answer all questions and track branching
    const result = await answerQuestionnaire(client, questionnaire.questionnaireId, items);

    log('cyan', `  Final questions shown: ${result.totalQuestionsShown}`);
    log('cyan', `  Unique questions answered: ${result.uniqueQuestionsAnswered}`);

    // Check for duplicates in the complete flow
    const duplicateCheck = checkDuplicates(result.allItems);

    if (duplicateCheck.hasDuplicates) {
      log('red', `  ❌ DUPLICATES FOUND IN QUESTIONNAIRE FLOW!`);
      log('red', `     Total shown: ${duplicateCheck.totalQuestions}`);
      log('red', `     Unique: ${duplicateCheck.uniqueQuestions}`);
      log('red', `     Duplicates: ${duplicateCheck.duplicates.length}`);

      log('yellow', '     Duplicate questions:');
      for (const dup of duplicateCheck.duplicates) {
        log('yellow', `       - ${dup.itemCode}: First at index ${dup.firstIndex}, duplicate at ${dup.duplicateIndex}`);
        log('yellow', `         "${dup.questionText.substring(0, 60)}..."`);
      }

      return {
        patientId,
        success: true,
        hasDuplicates: true,
        duplicates: duplicateCheck.duplicates,
        details: duplicateCheck,
      };
    } else {
      log('green', `  ✓ No duplicates in complete flow (${duplicateCheck.uniqueQuestions} unique questions)`);
      return {
        patientId,
        success: true,
        hasDuplicates: false,
        questionCount: result.totalQuestionsShown,
      };
    }
  } catch (error) {
    log('red', `  ❌ Error: ${error.message}`);
    if (error.response?.data) {
      log('red', `     ${JSON.stringify(error.response.data)}`);
    }
    return {
      patientId,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main test function
 */
async function runTests() {
  log('cyan', '='.repeat(80));
  log('cyan', 'QUESTIONNAIRE BRANCHING DUPLICATES TEST');
  log('cyan', '='.repeat(80));
  log('cyan', `API: ${API_BASE_URL}`);
  log('cyan', `Time: ${new Date().toISOString()}`);
  log('cyan', '='.repeat(80));

  // Test first 5 patients (can extend to all 17)
  const patientIds = ['P001', 'P002', 'P003', 'P004', 'P005'];

  const results = [];

  for (const patientId of patientIds) {
    const result = await testPatientFlow(patientId);
    results.push(result);

    // Delay between patients
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  log('cyan', '\n' + '='.repeat(80));
  log('cyan', 'TEST SUMMARY');
  log('cyan', '='.repeat(80));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const withDuplicates = results.filter(r => r.hasDuplicates);
  const withoutDuplicates = results.filter(r => r.success && !r.hasDuplicates);

  log('green', `✓ Successful tests: ${successful.length}/${results.length}`);
  log('red', `✗ Failed tests: ${failed.length}/${results.length}`);
  log('yellow', `⚠ Patients with duplicates: ${withDuplicates.length}/${successful.length}`);
  log('green', `✓ Patients without duplicates: ${withoutDuplicates.length}/${successful.length}`);

  if (withDuplicates.length > 0) {
    log('yellow', '\nPatients with duplicate questions in flow:');
    for (const result of withDuplicates) {
      log('yellow', `  - ${result.patientId}: ${result.duplicates.length} duplicate(s)`);
      for (const dup of result.duplicates) {
        log('yellow', `      ${dup.itemCode} at positions ${dup.firstIndex} and ${dup.duplicateIndex}`);
      }
    }
  }

  if (failed.length > 0) {
    log('red', '\nFailed tests:');
    for (const result of failed) {
      log('red', `  - ${result.patientId}: ${result.error}`);
    }
  }

  log('cyan', '='.repeat(80));

  // Exit with error code if duplicates found
  if (withDuplicates.length > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log('red', `\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
