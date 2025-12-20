import { Knex } from 'knex';
import { QuestionnaireGenerationMetadata, SymptomSource } from '@toxicity-analyzer/shared';

export class QuestionnaireMetadataRepository {
  constructor(private db: Knex) {}

  /**
   * Create questionnaire generation metadata
   */
  async create(metadata: Omit<QuestionnaireGenerationMetadata, 'metadataId' | 'generatedAt'>): Promise<QuestionnaireGenerationMetadata> {
    const [row] = await this.db('questionnaire_generation_metadata')
      .insert({
        questionnaire_id: metadata.questionnaireId,
        generation_approach: metadata.generationApproach,
        active_drugs: metadata.activeDrugs ? JSON.stringify(metadata.activeDrugs) : null,
        symptom_sources: metadata.symptomSources ? JSON.stringify(metadata.symptomSources) : null,
        total_symptoms_before_dedup: metadata.totalSymptomsBeforeDedup,
        total_symptoms_after_dedup: metadata.totalSymptomsAfterDedup,
        phase_filtering_applied: metadata.phaseFilteringApplied,
      })
      .returning('*');

    return this.mapToMetadata(row);
  }

  /**
   * Find metadata by questionnaire ID
   */
  async findByQuestionnaireId(questionnaireId: string): Promise<QuestionnaireGenerationMetadata | null> {
    const row = await this.db('questionnaire_generation_metadata')
      .where('questionnaire_id', questionnaireId)
      .first();

    if (!row) {
      return null;
    }

    return this.mapToMetadata(row);
  }

  /**
   * Find all metadata by generation approach
   */
  async findByApproach(approach: 'regimen-phase-history' | 'drug-module'): Promise<QuestionnaireGenerationMetadata[]> {
    const rows = await this.db('questionnaire_generation_metadata')
      .where('generation_approach', approach)
      .orderBy('generated_at', 'desc');

    return rows.map(this.mapToMetadata);
  }

  /**
   * Map database row to QuestionnaireGenerationMetadata
   */
  private mapToMetadata(row: any): QuestionnaireGenerationMetadata {
    return {
      metadataId: row.metadata_id,
      questionnaireId: row.questionnaire_id,
      generationApproach: row.generation_approach,
      activeDrugs: row.active_drugs
        ? (typeof row.active_drugs === 'string' ? JSON.parse(row.active_drugs) : row.active_drugs)
        : undefined,
      symptomSources: row.symptom_sources
        ? (typeof row.symptom_sources === 'string' ? JSON.parse(row.symptom_sources) : row.symptom_sources)
        : undefined,
      totalSymptomsBeforeDedup: row.total_symptoms_before_dedup,
      totalSymptomsAfterDedup: row.total_symptoms_after_dedup,
      phaseFilteringApplied: row.phase_filtering_applied,
      generatedAt: row.generated_at,
    };
  }
}
