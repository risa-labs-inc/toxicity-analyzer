import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ============================================
  // PATIENTS & DEMOGRAPHICS
  // ============================================
  await knex.schema.createTable('patients', (table) => {
    table.uuid('patient_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('firebase_uid', 128).unique().notNullable();
    table.string('medical_record_number', 50).unique(); // Will be encrypted in app
    table.date('date_of_birth'); // Will be encrypted in app
    table.string('gender', 20);
    table.string('ethnicity', 50);
    table.jsonb('comorbidities'); // Array of conditions
    table.integer('ecog_baseline').checkBetween([0, 5]);
    table.timestamp('enrollment_date').defaultTo(knex.fn.now());
    table.string('status', 20).defaultTo('active'); // active, completed, withdrawn
    table.timestamps(true, true);

    table.index('firebase_uid');
    table.index('status');
  });

  // ============================================
  // TREATMENT REGIMENS & SCHEDULES
  // ============================================
  await knex.schema.createTable('regimens', (table) => {
    table.uuid('regimen_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('regimen_code', 50).unique().notNullable(); // 'AC-T', 'TC', etc.
    table.string('regimen_name', 255).notNullable();
    table.text('description');
    table.jsonb('drug_components').notNullable(); // Array of drug objects
    table.integer('standard_cycle_length_days').notNullable();
    table.integer('total_cycles');
    table.jsonb('toxicity_profile').notNullable(); // High-risk symptoms by category
    table.integer('nadir_window_start'); // Day 7 for most regimens
    table.integer('nadir_window_end'); // Day 12
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('patient_treatments', (table) => {
    table.uuid('treatment_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('patient_id').notNullable().references('patient_id').inTable('patients').onDelete('CASCADE');
    table.uuid('regimen_id').notNullable().references('regimen_id').inTable('regimens');
    table.date('start_date').notNullable();
    table.date('end_date');
    table.integer('total_planned_cycles').notNullable();
    table.integer('current_cycle').defaultTo(1);
    table.string('treatment_intent', 50); // 'curative', 'adjuvant', 'neoadjuvant'
    table.string('status', 20).defaultTo('active'); // active, paused, completed, discontinued
    table.text('discontinuation_reason');
    table.timestamps(true, true);

    table.index('patient_id');
    table.index('status');
  });

  await knex.schema.createTable('treatment_cycles', (table) => {
    table.uuid('cycle_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('treatment_id').notNullable().references('treatment_id').inTable('patient_treatments').onDelete('CASCADE');
    table.integer('cycle_number').notNullable();
    table.date('infusion_date').notNullable();
    table.date('planned_next_infusion');
    table.date('actual_next_infusion');
    table.jsonb('dose_modifications'); // Reductions, delays
    table.boolean('completed').defaultTo(false);
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('treatment_id');
    table.index('infusion_date');
  });

  // ============================================
  // PRO-CTCAE LIBRARY
  // ============================================
  await knex.schema.createTable('proctcae_items', (table) => {
    table.uuid('item_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('item_code', 50).unique().notNullable(); // 'NAUSEA_FREQ', 'FATIGUE_SEV'
    table.string('symptom_category', 100).notNullable(); // 'gastrointestinal', 'constitutional'
    table.string('attribute', 20).notNullable(); // 'frequency', 'severity', 'interference'
    table.text('question_text').notNullable();
    table.string('response_type', 20).notNullable(); // 'frequency_5pt', 'severity_5pt', etc.
    table.jsonb('response_options').notNullable(); // [{value: 0, label: 'Never'}, ...]
    table.jsonb('applicable_populations'); // Drug filters, demographic filters
    table.jsonb('ctcae_mapping'); // Map to CTCAE grade thresholds
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('symptom_category');
    table.index('attribute');
  });

  // ============================================
  // QUESTIONNAIRES & RESPONSES
  // ============================================
  await knex.schema.createTable('questionnaires', (table) => {
    table.uuid('questionnaire_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('patient_id').notNullable().references('patient_id').inTable('patients').onDelete('CASCADE');
    table.uuid('treatment_id').notNullable().references('treatment_id').inTable('patient_treatments').onDelete('CASCADE');
    table.uuid('cycle_id').references('cycle_id').inTable('treatment_cycles');
    table.string('questionnaire_type', 50).notNullable(); // 'pre_session', 'post_session', etc.
    table.date('scheduled_date').notNullable();
    table.integer('treatment_day').notNullable(); // Relative to cycle start
    table.timestamp('due_date').notNullable();
    table.timestamp('expiry_date');
    table.string('status', 20).defaultTo('pending'); // pending, in_progress, completed, expired
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.integer('time_to_complete_seconds');
    table.jsonb('selected_items').notNullable(); // Array of item_ids
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('patient_id');
    table.index('status');
    table.index('due_date');
    table.index('questionnaire_type');
  });

  await knex.schema.createTable('questionnaire_responses', (table) => {
    table.uuid('response_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('questionnaire_id').notNullable().references('questionnaire_id').inTable('questionnaires').onDelete('CASCADE');
    table.uuid('item_id').notNullable().references('item_id').inTable('proctcae_items');
    table.integer('response_value').notNullable();
    table.string('response_label', 100);
    table.boolean('conditional_triggered').defaultTo(false);
    table.uuid('parent_response_id').references('response_id').inTable('questionnaire_responses');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('questionnaire_id');
    table.index('item_id');
  });

  // ============================================
  // SCORING & GRADING
  // ============================================
  await knex.schema.createTable('toxicity_scores', (table) => {
    table.uuid('score_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('questionnaire_id').notNullable().references('questionnaire_id').inTable('questionnaires').onDelete('CASCADE');
    table.uuid('patient_id').notNullable().references('patient_id').inTable('patients').onDelete('CASCADE');
    table.string('symptom_category', 100).notNullable();
    table.integer('composite_grade').checkBetween([0, 4]);
    table.integer('frequency_score');
    table.integer('severity_score');
    table.integer('interference_score');
    table.integer('ctcae_equivalent_grade');
    table.string('scoring_algorithm_version', 20).defaultTo('NCI_v1.0');
    table.timestamp('calculated_at').defaultTo(knex.fn.now());

    table.index('patient_id');
    table.index('questionnaire_id');
    table.index('composite_grade');
  });

  // ============================================
  // ALERTING & TRIAGE
  // ============================================
  await knex.schema.createTable('alerts', (table) => {
    table.uuid('alert_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('patient_id').notNullable().references('patient_id').inTable('patients').onDelete('CASCADE');
    table.uuid('questionnaire_id').references('questionnaire_id').inTable('questionnaires');
    table.uuid('score_id').references('score_id').inTable('toxicity_scores');
    table.string('alert_type', 50).notNullable(); // 'emergency', 'urgent', 'routine'
    table.string('severity', 20).notNullable(); // 'red', 'yellow', 'green'
    table.string('symptom_category', 100);
    table.integer('grade');
    table.text('alert_message').notNullable();
    table.text('patient_instructions'); // E.g., "Go to ER immediately"
    table.timestamp('triggered_at').defaultTo(knex.fn.now());
    table.boolean('acknowledged').defaultTo(false);
    table.uuid('acknowledged_by'); // Clinician user ID
    table.timestamp('acknowledged_at');
    table.text('resolution_notes');
    table.timestamp('resolved_at');

    table.index('patient_id');
    table.index('severity');
    table.index('acknowledged');
    table.index('triggered_at');
  });

  // ============================================
  // AUDIT LOGGING (HIPAA Compliance)
  // ============================================
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('audit_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('event_type', 50).notNullable(); // 'patient_data_access', 'response_submission'
    table.string('user_id', 128);
    table.string('user_role', 50); // 'patient', 'clinician', 'admin'
    table.uuid('patient_id').references('patient_id').inTable('patients');
    table.string('resource_type', 50);
    table.uuid('resource_id');
    table.string('action', 50).notNullable(); // 'create', 'read', 'update', 'delete'
    table.specificType('ip_address', 'inet');
    table.text('user_agent');
    table.jsonb('request_payload');
    table.integer('response_status');
    table.timestamp('timestamp').defaultTo(knex.fn.now());

    table.index('timestamp');
    table.index('patient_id');
    table.index('user_id');
    table.index('event_type');
  });

  console.log('✅ Database schema created successfully');
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order to respect foreign key constraints
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('alerts');
  await knex.schema.dropTableIfExists('toxicity_scores');
  await knex.schema.dropTableIfExists('questionnaire_responses');
  await knex.schema.dropTableIfExists('questionnaires');
  await knex.schema.dropTableIfExists('proctcae_items');
  await knex.schema.dropTableIfExists('treatment_cycles');
  await knex.schema.dropTableIfExists('patient_treatments');
  await knex.schema.dropTableIfExists('regimens');
  await knex.schema.dropTableIfExists('patients');

  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');

  console.log('✅ Database schema dropped successfully');
}
