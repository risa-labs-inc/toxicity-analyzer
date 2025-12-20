import { Knex } from 'knex';

/**
 * Migration: Add Drug Module Infrastructure
 *
 * This migration implements the drug-module based questionnaire generation approach
 * as an alternative to the regimen-phase-history approach.
 *
 * Changes:
 * - Creates drug_modules table for storing drug-symptom mappings
 * - Creates questionnaire_generation_metadata table for tracking which approach generated each questionnaire
 * - Adds regimen_step and active_drugs columns to treatment_cycles for sequential regimen tracking
 * - Adds drug_module_composition column to regimens for drug module composition
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Adding drug module infrastructure...');

  // Create drug_modules table
  console.log('  - Creating drug_modules table...');
  await knex.schema.createTable('drug_modules', (table) => {
    table.uuid('drug_module_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('drug_name', 100).unique().notNullable();
    table.string('drug_class', 50).notNullable();
    table.jsonb('symptom_terms').notNullable(); // Array of symptom terms
    table.jsonb('safety_proxy_items').notNullable(); // Array of SafetyProxyItem objects
    table.jsonb('phase_filtering_rules').nullable(); // Record<string, CyclePhase[]>
    table.boolean('is_myelosuppressive').defaultTo(false);
    table.text('clinical_notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('drug_name', 'idx_drug_modules_drug_name');
    table.index('drug_class', 'idx_drug_modules_drug_class');
  });

  await knex.raw(`
    COMMENT ON TABLE drug_modules IS
    'Drug modules store drug-symptom mappings for drug-module based questionnaire generation.
     Each drug is a module with its own symptom list that can be composed into regimens.';

    COMMENT ON COLUMN drug_modules.symptom_terms IS
    'Array of symptom terms directly caused by this drug (e.g., ["nausea", "vomiting", "alopecia"])';

    COMMENT ON COLUMN drug_modules.safety_proxy_items IS
    'Array of safety monitoring items (e.g., fever/chills for myelosuppression).
     Each item has: {type: string, symptoms: string[], rationale: string}';

    COMMENT ON COLUMN drug_modules.phase_filtering_rules IS
    'Optional phase filtering rules for specific symptoms.
     Format: {"nausea": ["post_session", "recovery"], "fatigue": ["nadir", "recovery"]}
     If null or symptom not listed, symptom is always included.';
  `);

  // Create questionnaire_generation_metadata table
  console.log('  - Creating questionnaire_generation_metadata table...');
  await knex.schema.createTable('questionnaire_generation_metadata', (table) => {
    table.uuid('metadata_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('questionnaire_id').references('questionnaire_id').inTable('questionnaires').onDelete('CASCADE');
    table.string('generation_approach', 50).notNullable(); // 'regimen-phase-history' or 'drug-module'
    table.jsonb('active_drugs').nullable(); // Array of drug names
    table.jsonb('symptom_sources').nullable(); // Array of SymptomSource objects
    table.integer('total_symptoms_before_dedup').nullable();
    table.integer('total_symptoms_after_dedup').nullable();
    table.boolean('phase_filtering_applied').nullable();
    table.timestamp('generated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('questionnaire_id', 'idx_qgen_metadata_questionnaire_id');
    table.index('generation_approach', 'idx_qgen_metadata_generation_approach');
  });

  await knex.raw(`
    COMMENT ON TABLE questionnaire_generation_metadata IS
    'Tracks which approach (regimen-phase-history or drug-module) generated each questionnaire
     and stores metadata about the generation process for comparison analysis.';

    COMMENT ON COLUMN questionnaire_generation_metadata.symptom_sources IS
    'Tracks which drug(s) contributed each symptom.
     Format: [{symptomTerm: string, sources: string[], isSafetyProxy: boolean, phaseFilteringApplies: CyclePhase[] | null}]';
  `);

  // Alter treatment_cycles table to add regimen_step and active_drugs
  console.log('  - Adding regimen_step and active_drugs to treatment_cycles...');
  await knex.schema.alterTable('treatment_cycles', (table) => {
    table.string('regimen_step', 50).nullable(); // 'AC', 'T', or null for single-phase regimens
    table.jsonb('active_drugs').nullable(); // Array of drug names currently active
  });

  await knex.raw(`
    COMMENT ON COLUMN treatment_cycles.regimen_step IS
    'Sequential regimen step (e.g., "AC", "T" in AC-T regimen). Null for single-phase regimens.';

    COMMENT ON COLUMN treatment_cycles.active_drugs IS
    'Array of drug names active in this cycle (e.g., ["Doxorubicin", "Cyclophosphamide"])';
  `);

  // Alter regimens table to add drug_module_composition
  console.log('  - Adding drug_module_composition to regimens...');
  await knex.schema.alterTable('regimens', (table) => {
    table.jsonb('drug_module_composition').nullable();
  });

  await knex.raw(`
    COMMENT ON COLUMN regimens.drug_module_composition IS
    'Defines which drugs are active in which steps of a regimen.
     Format: {
       steps: [{stepName: string | null, cycles: number[] | "all", drugModules: string[]}],
       safetyProfile: {myelosuppressive?: boolean, cardiotoxic?: boolean, ...}
     }';
  `);

  console.log('✅ Drug module infrastructure added successfully!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Reverting drug module infrastructure...');

  // Remove added columns from regimens
  await knex.schema.alterTable('regimens', (table) => {
    table.dropColumn('drug_module_composition');
  });

  // Remove added columns from treatment_cycles
  await knex.schema.alterTable('treatment_cycles', (table) => {
    table.dropColumn('regimen_step');
    table.dropColumn('active_drugs');
  });

  // Drop tables (cascade will handle foreign key constraints)
  await knex.schema.dropTableIfExists('questionnaire_generation_metadata');
  await knex.schema.dropTableIfExists('drug_modules');

  console.log('✅ Drug module infrastructure reverted');
}
