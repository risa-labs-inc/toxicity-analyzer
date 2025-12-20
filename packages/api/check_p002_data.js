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

async function checkP002Data() {
  try {
    // Get patient P002
    const patient = await knex('patients')
      .where('medical_record_number', 'P002')
      .first();

    console.log('\n=== PATIENT P002 ===');
    console.log(`Patient ID: ${patient.patient_id}`);
    console.log(`Firebase UID: ${patient.firebase_uid}`);

    // Get all questionnaires for P002
    const questionnaires = await knex('questionnaires')
      .where('patient_id', patient.patient_id)
      .orderBy('created_at', 'desc');

    console.log(`\n=== QUESTIONNAIRES (${questionnaires.length} total) ===`);

    for (const q of questionnaires) {
      console.log('\n======================================================================');
      console.log(`Questionnaire ID: ${q.questionnaire_id}`);
      console.log(`Status: ${q.status}`);
      console.log(`Created: ${q.created_at}`);
      console.log(`Completed: ${q.completed_at}`);

      // Get responses for this questionnaire
      const responses = await knex('questionnaire_responses')
        .where('questionnaire_id', q.questionnaire_id)
        .orderBy('created_at', 'asc');

      console.log(`\nRESPONSES (${responses.length} total):`);
      for (const r of responses) {
        const item = await knex('proctcae_items')
          .where('item_id', r.item_id)
          .first();

        console.log(`  - ${item.symptom_category} (${item.attribute}): ${r.response_value}`);
      }

      // Get toxicity scores for this questionnaire
      const scores = await knex('toxicity_scores')
        .where('questionnaire_id', q.questionnaire_id)
        .orderBy('calculated_at', 'desc');

      console.log(`\nTOXICITY SCORES (${scores.length} total):`);
      for (const s of scores) {
        console.log(`  - ${s.symptom_category}: Grade ${s.composite_grade}`);
        console.log(`    Frequency: ${s.frequency_score || 'N/A'}, Severity: ${s.severity_score || 'N/A'}, Interference: ${s.interference_score || 'N/A'}`);
      }

      // Get alerts for this questionnaire
      const alerts = await knex('alerts')
        .where('questionnaire_id', q.questionnaire_id)
        .orderBy('triggered_at', 'desc');

      console.log(`\nALERTS (${alerts.length} total):`);
      for (const a of alerts) {
        console.log(`  - ${a.symptom_category || 'Overall'}: ${a.severity} (Alert Type: ${a.alert_type})`);
        console.log(`    Message: ${a.alert_message}`);
        console.log(`    Patient Instructions: ${a.patient_instructions || 'None'}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await knex.destroy();
  }
}

checkP002Data();
