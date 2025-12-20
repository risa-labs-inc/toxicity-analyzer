const axios = require('axios');
const API_BASE = 'http://localhost:3000/api/v1';

async function checkQuestions() {
  const headers = { Authorization: 'Demo P002' };

  // Generate questionnaire
  const generateResponse = await axios.post(
    `${API_BASE}/patient/questionnaires/generate-drug-module`,
    {},
    { headers }
  );

  const items = generateResponse.data.items;
  const metadata = generateResponse.data.metadata;

  console.log('Total questions:', items.length);
  console.log('Active drugs:', metadata.activeDrugs.join(', '));
  console.log('\nQuestions by symptom:\n');

  // Extract symptom term from item code
  const extractSymptom = (code) => {
    const parts = code.split('_');
    const lastPart = parts[parts.length - 1];
    return ['FREQ', 'SEV', 'INTERF', 'PRESENT', 'AMOUNT'].includes(lastPart)
      ? parts.slice(0, -1).join('_').toLowerCase()
      : code.toLowerCase();
  };

  const bySymptom = {};
  items.forEach(item => {
    const symptom = extractSymptom(item.itemCode);
    if (!bySymptom[symptom]) bySymptom[symptom] = [];
    bySymptom[symptom].push(item.attribute);
  });

  Object.entries(bySymptom).sort().forEach(([symptom, attrs]) => {
    console.log(`  ${symptom}: ${attrs.join(', ')}`);
  });

  console.log('\n✅ Successfully generated questionnaire with drug-module approach!');
}

checkQuestions().catch(e => console.error(e.response?.data || e.message));
