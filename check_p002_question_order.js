const knex = require('knex')({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'toxicity_analyzer_dev',
    user: 'anismanjhi',
    password: ''
  }
});

async function checkQuestionOrder() {
  try {
    // Get patient P002
    const patient = await knex('patients')
      .where('medical_record_number', 'P002')
      .first();

    // Get most recent questionnaire
    const questionnaire = await knex('questionnaires')
      .where('patient_id', patient.patient_id)
      .orderBy('created_at', 'desc')
      .first();

    console.log('\n=== MOST RECENT QUESTIONNAIRE ===');
    console.log(`Questionnaire ID: ${questionnaire.questionnaire_id}`);
    console.log(`Status: ${questionnaire.status}`);
    console.log(`Created: ${questionnaire.created_at}`);

    // Get selected_items (it's already parsed by knex from JSONB)
    const selectedItemIds = questionnaire.selected_items;
    console.log(`\nTotal items in questionnaire: ${selectedItemIds.length}`);

    // Get items in the order they were stored
    console.log('\n=== ITEMS IN STORED ORDER ===');
    for (let i = 0; i < selectedItemIds.length; i++) {
      const item = await knex('proctcae_items')
        .where('item_id', selectedItemIds[i])
        .first();

      console.log(`${i + 1}. [${item.attribute.toUpperCase()}] ${item.symptom_category} - ${item.question_text}`);
    }

    // Get responses in order they were submitted
    const responses = await knex('questionnaire_responses')
      .where('questionnaire_id', questionnaire.questionnaire_id)
      .orderBy('created_at', 'asc');

    console.log('\n=== RESPONSES IN SUBMISSION ORDER ===');
    for (let i = 0; i < responses.length; i++) {
      const item = await knex('proctcae_items')
        .where('item_id', responses[i].item_id)
        .first();

      const optionsArray = typeof item.response_options === 'string'
        ? JSON.parse(item.response_options)
        : item.response_options;

      const selectedOption = optionsArray.find(opt => opt.value === responses[i].response_value);
      const label = selectedOption ? selectedOption.label : 'Unknown';

      console.log(`${i + 1}. [${item.attribute.toUpperCase()}] ${item.symptom_category}: ${label} (value: ${responses[i].response_value})`);
    }

    // Compare: were there items that were selected but not answered?
    console.log('\n=== ITEMS SELECTED BUT NOT ANSWERED ===');
    const answeredItemIds = new Set(responses.map(r => r.item_id));
    const unansweredItems = selectedItemIds.filter(id => !answeredItemIds.has(id));

    if (unansweredItems.length > 0) {
      for (const itemId of unansweredItems) {
        const item = await knex('proctcae_items')
          .where('item_id', itemId)
          .first();
        console.log(`  - [${item.attribute.toUpperCase()}] ${item.symptom_category} - ${item.question_text}`);
      }
    } else {
      console.log('  All selected items were answered');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await knex.destroy();
  }
}

checkQuestionOrder();
