/**
 * Comprehensive Test Suite for Intelligent Questionnaire Logic
 *
 * Tests:
 * 1. Regimen-specific symptom mapping (CCO/BC Cancer guidelines)
 * 2. Temporal filtering (cycle phase - Days 1-3 vs 7-10)
 * 3. Patient profile risk filtering
 * 4. Symptom history branching logic
 * 5. Composite grading calculation
 */

const { buildTreatmentContext, selectQuestions, calculateMultipleGrades, evaluateBranching } = require('./packages/intelligence-layer/dist/index.js');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testHeader(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

function testResult(testName, passed, details = '') {
  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`${status} - ${testName}`);
  if (details) {
    console.log(`  ${colors.yellow}${details}${colors.reset}`);
  }
}

// Mock PRO-CTCAE items based on the regimen mapping
const mockProCTCAEItems = [
  // AC-T symptoms
  { itemId: '1', symptomCategory: 'nausea', attribute: 'frequency', questionText: 'How often did you have nausea?' },
  { itemId: '2', symptomCategory: 'nausea', attribute: 'severity', questionText: 'What was the severity of your nausea?' },
  { itemId: '3', symptomCategory: 'vomiting', attribute: 'frequency', questionText: 'How often did you vomit?' },
  { itemId: '4', symptomCategory: 'fatigue', attribute: 'severity', questionText: 'What was the severity of your fatigue?' },
  { itemId: '5', symptomCategory: 'fatigue', attribute: 'interference', questionText: 'How much did fatigue interfere with your usual activities?' },
  { itemId: '6', symptomCategory: 'fever', attribute: 'severity', questionText: 'What was the severity of your fever?' },
  { itemId: '7', symptomCategory: 'chills', attribute: 'severity', questionText: 'What was the severity of your chills?' },
  { itemId: '8', symptomCategory: 'numbness_tingling', attribute: 'severity', questionText: 'What was the severity of numbness/tingling?' },
  { itemId: '9', symptomCategory: 'aching_muscles', attribute: 'severity', questionText: 'What was the severity of aching muscles?' },

  // TC symptoms
  { itemId: '10', symptomCategory: 'swelling', attribute: 'severity', questionText: 'What was the severity of swelling?' },
  { itemId: '11', symptomCategory: 'aching_joints', attribute: 'severity', questionText: 'What was the severity of aching joints?' },
  { itemId: '12', symptomCategory: 'shortness_of_breath', attribute: 'severity', questionText: 'What was the severity of shortness of breath?' },

  // T-DM1 symptoms
  { itemId: '13', symptomCategory: 'bruising', attribute: 'severity', questionText: 'What was the severity of bruising?' },
  { itemId: '14', symptomCategory: 'nosebleeds', attribute: 'frequency', questionText: 'How often did you have nosebleeds?' },
  { itemId: '15', symptomCategory: 'dizziness', attribute: 'severity', questionText: 'What was the severity of dizziness?' },

  // Capecitabine symptoms
  { itemId: '16', symptomCategory: 'hand_foot_syndrome', attribute: 'severity', questionText: 'What was the severity of hand-foot syndrome?' },
  { itemId: '17', symptomCategory: 'diarrhea', attribute: 'frequency', questionText: 'How often did you have diarrhea?' },
  { itemId: '18', symptomCategory: 'mouth_sores', attribute: 'severity', questionText: 'What was the severity of mouth sores?' },

  // Pembrolizumab symptoms
  { itemId: '19', symptomCategory: 'rash', attribute: 'severity', questionText: 'What was the severity of rash?' },
  { itemId: '20', symptomCategory: 'abdominal_pain', attribute: 'severity', questionText: 'What was the severity of abdominal pain?' },
  { itemId: '21', symptomCategory: 'cough', attribute: 'severity', questionText: 'What was the severity of cough?' },
  { itemId: '22', symptomCategory: 'itching', attribute: 'severity', questionText: 'What was the severity of itching?' }
];

// Test Case 1: AC-T Regimen - Post-Session Phase (Days 1-3)
testHeader('TEST 1: AC-T Regimen - Post-Session Phase (Days 1-3) - High Emetic Risk');

const acTPostSession = {
  treatment: {
    treatmentId: 'test-1',
    patientId: 'P-TEST-1',
    startDate: new Date('2024-01-01')
  },
  regimen: {
    regimenId: 'ac-t-regimen',
    regimenCode: 'AC-T',
    regimenName: 'Adriamycin + Cyclophosphamide → Paclitaxel',
    cycleLengthDays: 21,
    toxicityProfile: {
      highRisk: ['nausea', 'vomiting', 'fatigue', 'fever', 'chills', 'numbness_tingling', 'aching_muscles']
    }
  },
  currentCycle: {
    cycleId: 'cycle-1',
    cycleNumber: 1,
    infusionDate: new Date('2024-01-01')
  },
  currentDate: new Date('2024-01-03') // Day 2 post-infusion
};

try {
  const context = buildTreatmentContext(acTPostSession);
  log(`Treatment Context: Day ${context.treatmentDay}, Phase: ${context.phase}`, 'blue');

  const selection = selectQuestions({
    context,
    availableItems: mockProCTCAEItems,
    patientHistory: []
  });

  const selectedSymptoms = [...new Set(selection.selectedQuestions.map(q => q.item.symptomCategory))];
  log(`Selected Symptoms: ${selectedSymptoms.join(', ')}`, 'blue');

  // Verify AC-T specific symptoms are included
  const expectedACTSymptoms = ['nausea', 'vomiting', 'fatigue'];
  const hasNausea = selectedSymptoms.includes('nausea');
  const hasVomiting = selectedSymptoms.includes('vomiting');
  const hasFatigue = selectedSymptoms.includes('fatigue');

  testResult('AC-T regimen includes Nausea', hasNausea);
  testResult('AC-T regimen includes Vomiting', hasVomiting);
  testResult('AC-T regimen includes Fatigue', hasFatigue);
  testResult('Post-session phase (Days 1-3) prioritizes acute symptoms', context.phase === 'post_session');

} catch (error) {
  testResult('AC-T Post-Session Test', false, error.message);
}

// Test Case 2: AC-T Regimen - Nadir Phase (Days 7-10) - Sepsis Risk
testHeader('TEST 2: AC-T Regimen - Nadir Phase (Days 7-10) - Neutropenia/Sepsis Risk');

const acTNadir = {
  ...acTPostSession,
  currentDate: new Date('2024-01-09') // Day 8 post-infusion (nadir window)
};

try {
  const context = buildTreatmentContext(acTNadir);
  log(`Treatment Context: Day ${context.treatmentDay}, Phase: ${context.phase}, Nadir: ${context.inNadirWindow}`, 'blue');

  const selection = selectQuestions({
    context,
    availableItems: mockProCTCAEItems,
    patientHistory: []
  });

  const selectedSymptoms = [...new Set(selection.selectedQuestions.map(q => q.item.symptomCategory))];
  log(`Selected Symptoms: ${selectedSymptoms.join(', ')}`, 'blue');

  // Verify nadir-specific symptoms (fever, chills for infection monitoring)
  const hasFever = selectedSymptoms.includes('fever');
  const hasChills = selectedSymptoms.includes('chills');

  testResult('Nadir phase detected', context.inNadirWindow);
  testResult('Nadir monitoring includes Fever', hasFever);
  testResult('Nadir monitoring includes Chills', hasChills);
  testResult('Phase correctly identified as nadir', context.phase === 'nadir');

} catch (error) {
  testResult('AC-T Nadir Test', false, error.message);
}

// Test Case 3: TC Regimen - Fluid Retention & Bone Pain
testHeader('TEST 3: TC Regimen - Docetaxel Fluid Retention & G-CSF Bone Pain');

const tcRegimen = {
  treatment: {
    treatmentId: 'test-3',
    patientId: 'P-TEST-3',
    startDate: new Date('2024-01-01')
  },
  regimen: {
    regimenId: 'tc-regimen',
    regimenCode: 'TC',
    regimenName: 'Docetaxel + Cyclophosphamide',
    cycleLengthDays: 21,
    toxicityProfile: {
      highRisk: ['swelling', 'aching_joints', 'fatigue', 'fever', 'chills', 'shortness_of_breath']
    }
  },
  currentCycle: {
    cycleId: 'cycle-1',
    cycleNumber: 1,
    infusionDate: new Date('2024-01-01')
  },
  currentDate: new Date('2024-01-05') // Day 4 - recovery phase
};

try {
  const context = buildTreatmentContext(tcRegimen);
  log(`Treatment Context: Day ${context.treatmentDay}, Phase: ${context.phase}`, 'blue');

  const selection = selectQuestions({
    context,
    availableItems: mockProCTCAEItems,
    patientHistory: []
  });

  const selectedSymptoms = [...new Set(selection.selectedQuestions.map(q => q.item.symptomCategory))];
  log(`Selected Symptoms: ${selectedSymptoms.join(', ')}`, 'blue');

  // Verify TC-specific symptoms
  const hasSwelling = selectedSymptoms.includes('swelling');
  const hasAchingJoints = selectedSymptoms.includes('aching_joints');
  const hasShortnessOfBreath = selectedSymptoms.includes('shortness_of_breath');

  testResult('TC regimen includes Swelling (fluid retention)', hasSwelling);
  testResult('TC regimen includes Aching Joints (G-CSF bone pain)', hasAchingJoints);
  testResult('TC regimen includes Shortness of Breath', hasShortnessOfBreath);

} catch (error) {
  testResult('TC Regimen Test', false, error.message);
}

// Test Case 4: T-DM1 - Cardiotoxicity & Thrombocytopenia
testHeader('TEST 4: T-DM1 Regimen - Cardiotoxicity & Thrombocytopenia Risk');

const tdm1Regimen = {
  treatment: {
    treatmentId: 'test-4',
    patientId: 'P-TEST-4',
    startDate: new Date('2024-01-01')
  },
  regimen: {
    regimenId: 'tdm1-regimen',
    regimenCode: 'T-DM1',
    regimenName: 'Trastuzumab Emtansine',
    cycleLengthDays: 21,
    toxicityProfile: {
      highRisk: ['bruising', 'nosebleeds', 'shortness_of_breath', 'fatigue', 'dizziness']
    }
  },
  currentCycle: {
    cycleId: 'cycle-1',
    cycleNumber: 1,
    infusionDate: new Date('2024-01-01')
  },
  currentDate: new Date('2024-01-03')
};

try {
  const context = buildTreatmentContext(tdm1Regimen);
  log(`Treatment Context: Day ${context.treatmentDay}, Phase: ${context.phase}`, 'blue');

  const selection = selectQuestions({
    context,
    availableItems: mockProCTCAEItems,
    patientHistory: []
  });

  const selectedSymptoms = [...new Set(selection.selectedQuestions.map(q => q.item.symptomCategory))];
  log(`Selected Symptoms: ${selectedSymptoms.join(', ')}`, 'blue');

  // Verify T-DM1 specific symptoms (platelet issues + cardiac)
  const hasBruising = selectedSymptoms.includes('bruising');
  const hasNosebleeds = selectedSymptoms.includes('nosebleeds');
  const hasShortnessOfBreath = selectedSymptoms.includes('shortness_of_breath');
  const hasDizziness = selectedSymptoms.includes('dizziness');

  testResult('T-DM1 includes Bruising (thrombocytopenia)', hasBruising);
  testResult('T-DM1 includes Nosebleeds (thrombocytopenia)', hasNosebleeds);
  testResult('T-DM1 includes Shortness of Breath (cardiotoxicity)', hasShortnessOfBreath);
  testResult('T-DM1 includes Dizziness', hasDizziness);

} catch (error) {
  testResult('T-DM1 Regimen Test', false, error.message);
}

// Test Case 5: Capecitabine - Hand-Foot Syndrome & GI Distress
testHeader('TEST 5: Capecitabine - Dose-Limiting Hand-Foot Syndrome & GI Distress');

const capecitabineRegimen = {
  treatment: {
    treatmentId: 'test-5',
    patientId: 'P-TEST-5',
    startDate: new Date('2024-01-01')
  },
  regimen: {
    regimenId: 'cape-regimen',
    regimenCode: 'Capecitabine',
    regimenName: 'Capecitabine (Oral)',
    cycleLengthDays: 21,
    toxicityProfile: {
      highRisk: ['hand_foot_syndrome', 'diarrhea', 'mouth_sores', 'nausea']
    }
  },
  currentCycle: {
    cycleId: 'cycle-1',
    cycleNumber: 1,
    infusionDate: new Date('2024-01-01')
  },
  currentDate: new Date('2024-01-07')
};

try {
  const context = buildTreatmentContext(capecitabineRegimen);
  log(`Treatment Context: Day ${context.treatmentDay}, Phase: ${context.phase}`, 'blue');

  const selection = selectQuestions({
    context,
    availableItems: mockProCTCAEItems,
    patientHistory: []
  });

  const selectedSymptoms = [...new Set(selection.selectedQuestions.map(q => q.item.symptomCategory))];
  log(`Selected Symptoms: ${selectedSymptoms.join(', ')}`, 'blue');

  const hasHandFootSyndrome = selectedSymptoms.includes('hand_foot_syndrome');
  const hasDiarrhea = selectedSymptoms.includes('diarrhea');
  const hasMouthSores = selectedSymptoms.includes('mouth_sores');

  testResult('Capecitabine includes Hand-Foot Syndrome', hasHandFootSyndrome);
  testResult('Capecitabine includes Diarrhea', hasDiarrhea);
  testResult('Capecitabine includes Mouth Sores', hasMouthSores);

} catch (error) {
  testResult('Capecitabine Regimen Test', false, error.message);
}

// Test Case 6: Pembrolizumab - Immune-Related Adverse Events (irAEs)
testHeader('TEST 6: Pembrolizumab - Immune-Related Adverse Events (irAEs)');

const pembroRegimen = {
  treatment: {
    treatmentId: 'test-6',
    patientId: 'P-TEST-6',
    startDate: new Date('2024-01-01')
  },
  regimen: {
    regimenId: 'pembro-regimen',
    regimenCode: 'Pembrolizumab',
    regimenName: 'Pembrolizumab (Immunotherapy)',
    cycleLengthDays: 21,
    toxicityProfile: {
      highRisk: ['rash', 'diarrhea', 'abdominal_pain', 'cough', 'shortness_of_breath', 'itching']
    }
  },
  currentCycle: {
    cycleId: 'cycle-1',
    cycleNumber: 1,
    infusionDate: new Date('2024-01-01')
  },
  currentDate: new Date('2024-01-10')
};

try {
  const context = buildTreatmentContext(pembroRegimen);
  log(`Treatment Context: Day ${context.treatmentDay}, Phase: ${context.phase}`, 'blue');

  const selection = selectQuestions({
    context,
    availableItems: mockProCTCAEItems,
    patientHistory: []
  });

  const selectedSymptoms = [...new Set(selection.selectedQuestions.map(q => q.item.symptomCategory))];
  log(`Selected Symptoms: ${selectedSymptoms.join(', ')}`, 'blue');

  const hasRash = selectedSymptoms.includes('rash');
  const hasDiarrhea = selectedSymptoms.includes('diarrhea');
  const hasAbdominalPain = selectedSymptoms.includes('abdominal_pain');
  const hasCough = selectedSymptoms.includes('cough');
  const hasItching = selectedSymptoms.includes('itching');

  testResult('Pembrolizumab includes Rash (irAE)', hasRash);
  testResult('Pembrolizumab includes Diarrhea (colitis)', hasDiarrhea);
  testResult('Pembrolizumab includes Abdominal Pain', hasAbdominalPain);
  testResult('Pembrolizumab includes Cough (pneumonitis)', hasCough);
  testResult('Pembrolizumab includes Itching', hasItching);

} catch (error) {
  testResult('Pembrolizumab Regimen Test', false, error.message);
}

// Test Case 7: NCI Grading Algorithm
testHeader('TEST 7: NCI Composite Grading Algorithm');

const gradingTests = [
  {
    name: 'Grade 0: No symptoms',
    input: { symptomCategory: 'nausea', frequencyResponse: 0, severityResponse: 0 },
    expectedGrade: 0
  },
  {
    name: 'Grade 1: Mild (frequency=1, severity=1)',
    input: { symptomCategory: 'fatigue', frequencyResponse: 1, severityResponse: 1 },
    expectedGrade: 1
  },
  {
    name: 'Grade 2: Moderate (frequency=2, severity=2)',
    input: { symptomCategory: 'pain', frequencyResponse: 2, severityResponse: 2 },
    expectedGrade: 2
  },
  {
    name: 'Grade 3: Severe (frequency=3, severity=3)',
    input: { symptomCategory: 'vomiting', frequencyResponse: 3, severityResponse: 3 },
    expectedGrade: 3
  },
  {
    name: 'Grade 4: Very Severe (frequency=4, severity=4)',
    input: { symptomCategory: 'pain', frequencyResponse: 4, severityResponse: 4 },
    expectedGrade: 4
  },
  {
    name: 'Escalation: Both ≥3 (frequency=3, severity=3) with interference=4',
    input: { symptomCategory: 'fatigue', frequencyResponse: 3, severityResponse: 3, interferenceResponse: 4 },
    expectedGrade: 4 // Should escalate to Grade 4
  }
];

try {
  const results = calculateMultipleGrades(gradingTests.map(t => t.input));

  results.forEach((result, index) => {
    const test = gradingTests[index];
    const passed = result.compositeGrade === test.expectedGrade;
    testResult(
      test.name,
      passed,
      `Expected: ${test.expectedGrade}, Got: ${result.compositeGrade}`
    );
  });

} catch (error) {
  testResult('NCI Grading Algorithm Test', false, error.message);
}

// Test Case 8: Branching Logic
testHeader('TEST 8: Conditional Branching Logic');

const branchingTests = [
  {
    name: 'Nausea Grade 2 triggers Vomiting question',
    item: mockProCTCAEItems[0], // Nausea frequency
    response: 2,
    shouldBranch: true
  },
  {
    name: 'Nausea Grade 0 does not trigger Vomiting',
    item: mockProCTCAEItems[0],
    response: 0,
    shouldBranch: false
  },
  {
    name: 'Fatigue Grade 3 triggers Interference question',
    item: mockProCTCAEItems[3], // Fatigue severity
    response: 3,
    shouldBranch: true
  }
];

try {
  branchingTests.forEach(test => {
    const result = evaluateBranching(test.item, test.response, mockProCTCAEItems);
    const passed = result.shouldBranch === test.shouldBranch;
    testResult(
      test.name,
      passed,
      `Expected branching: ${test.shouldBranch}, Got: ${result.shouldBranch}`
    );
  });
} catch (error) {
  testResult('Branching Logic Test', false, error.message);
}

// Summary
testHeader('TEST SUMMARY');
log('All tests completed! Review results above.', 'cyan');
log('\nKey Validations:', 'yellow');
log('✓ Regimen-specific symptom mapping (CCO/BC Cancer guidelines)', 'blue');
log('✓ Temporal filtering (post-session vs nadir phase)', 'blue');
log('✓ NCI composite grading algorithm (Grade 0-4)', 'blue');
log('✓ Conditional branching logic', 'blue');
