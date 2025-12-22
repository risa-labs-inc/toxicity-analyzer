/**
 * Test script to check for duplicate questions in questionnaires
 * Generates questionnaires for all patients and checks for duplicates
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
 * Check for duplicate questions in a questionnaire
 */
function checkDuplicates(items) {
  const seen = new Map();
  const duplicates = [];

  for (const item of items) {
    const key = item.itemId || item.item_id;
    if (seen.has(key)) {
      duplicates.push({
        itemId: key,
        itemCode: item.itemCode || item.item_code,
        questionText: item.questionText || item.question_text,
        occurrences: seen.get(key) + 1,
      });
      seen.set(key, seen.get(key) + 1);
    } else {
      seen.set(key, 1);
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
 * Test questionnaire generation for a single patient
 */
async function testPatient(patientId) {
  log('blue', `\n▶ Testing ${patientId}...`);

  const client = createPatientClient(patientId);

  try {
    // Get patient profile
    const profileResponse = await client.get('/patient/profile');
    const patient = profileResponse.data.patient;
    log('cyan', `  Patient: ${patient.fullName || patientId} (${patient.gender}, ${patient.ethnicity || 'N/A'})`);

    // Get treatment timeline
    const timelineResponse = await client.get('/patient/treatment/timeline');
    const timeline = timelineResponse.data.timeline;
    log('cyan', `  Treatment: ${timeline.regimenCode} - Cycle ${timeline.currentCycle}, Day ${timeline.treatmentDay}, Phase: ${timeline.phase}`);

    // Generate questionnaire (drug-module approach)
    log('cyan', '  Generating questionnaire (drug-module)...');
    const generateResponse = await client.post('/patient/questionnaires/generate?mode=drug-module');
    const questionnaire = generateResponse.data.questionnaire;
    const items = generateResponse.data.items;
    const metadata = generateResponse.data.metadata;

    log('cyan', `  Questionnaire ID: ${questionnaire.questionnaireId}`);
    log('cyan', `  Total questions: ${items.length}`);

    if (metadata) {
      log('cyan', `  Active drugs: ${metadata.activeDrugs?.length || 0}`);
      log('cyan', `  Total symptoms: ${metadata.totalSymptoms?.afterDedup || 'N/A'}`);
    }

    // Check for duplicates
    const duplicateCheck = checkDuplicates(items);

    if (duplicateCheck.hasDuplicates) {
      log('red', `  ❌ DUPLICATES FOUND!`);
      log('red', `     Total: ${duplicateCheck.totalQuestions} questions`);
      log('red', `     Unique: ${duplicateCheck.uniqueQuestions} questions`);
      log('red', `     Duplicates: ${duplicateCheck.totalQuestions - duplicateCheck.uniqueQuestions}`);

      // Show duplicate details
      const uniqueDuplicates = new Map();
      for (const dup of duplicateCheck.duplicates) {
        if (!uniqueDuplicates.has(dup.itemId)) {
          uniqueDuplicates.set(dup.itemId, dup);
        }
      }

      log('yellow', '     Duplicate questions:');
      for (const [itemId, dup] of uniqueDuplicates) {
        log('yellow', `       - ${dup.itemCode}: ${dup.questionText.substring(0, 60)}...`);
      }

      return {
        patientId,
        success: true,
        hasDuplicates: true,
        duplicateCount: duplicateCheck.totalQuestions - duplicateCheck.uniqueQuestions,
        details: duplicateCheck,
      };
    } else {
      log('green', `  ✓ No duplicates found (${duplicateCheck.uniqueQuestions} unique questions)`);
      return {
        patientId,
        success: true,
        hasDuplicates: false,
        questionCount: items.length,
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
  log('cyan', 'QUESTIONNAIRE DUPLICATE QUESTIONS TEST');
  log('cyan', '='.repeat(80));
  log('cyan', `API: ${API_BASE_URL}`);
  log('cyan', `Time: ${new Date().toISOString()}`);
  log('cyan', '='.repeat(80));

  // Test patients P001-P017
  const patientIds = Array.from({ length: 17 }, (_, i) => `P${String(i + 1).padStart(3, '0')}`);

  const results = [];

  for (const patientId of patientIds) {
    const result = await testPatient(patientId);
    results.push(result);

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 500));
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
    log('yellow', '\nPatients with duplicate questions:');
    for (const result of withDuplicates) {
      log('yellow', `  - ${result.patientId}: ${result.duplicateCount} duplicate(s)`);
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
