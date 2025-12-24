import { Knex } from 'knex';
import { QuestionnaireResponse } from '@toxicity-analyzer/shared';
import { ToxicityScore } from '@toxicity-analyzer/shared';

export class ResponseRepository {
  constructor(private db: Knex) {}

  /**
   * Create questionnaire response
   */
  async createResponse(response: Omit<QuestionnaireResponse, 'responseId' | 'createdAt'>): Promise<QuestionnaireResponse> {
    const [row] = await this.db('questionnaire_responses')
      .insert({
        questionnaire_id: response.questionnaireId,
        item_id: response.itemId,
        response_value: response.responseValue,
        response_label: response.responseLabel,
        conditional_triggered: response.conditionalTriggered,
      })
      .returning('*');

    return this.mapToResponse(row);
  }

  /**
   * Upsert questionnaire response (update if exists, insert if not)
   * OPTIMIZED: Uses PostgreSQL ON CONFLICT for true atomic upsert
   */
  async upsertResponse(response: Omit<QuestionnaireResponse, 'responseId' | 'createdAt'>): Promise<QuestionnaireResponse> {
    // Use PostgreSQL's ON CONFLICT for true atomic upsert
    const [row] = await this.db('questionnaire_responses')
      .insert({
        questionnaire_id: response.questionnaireId,
        item_id: response.itemId,
        response_value: response.responseValue,
        response_label: response.responseLabel,
        conditional_triggered: response.conditionalTriggered,
      })
      .onConflict(['questionnaire_id', 'item_id'])
      .merge({
        response_value: response.responseValue,
        response_label: response.responseLabel,
        conditional_triggered: response.conditionalTriggered,
      })
      .returning('*');

    return this.mapToResponse(row);
  }

  /**
   * Delete responses by item IDs
   */
  async deleteResponses(questionnaireId: string, itemIds: string[]): Promise<number> {
    if (itemIds.length === 0) {
      return 0;
    }

    const deletedCount = await this.db('questionnaire_responses')
      .where('questionnaire_id', questionnaireId)
      .whereIn('item_id', itemIds)
      .delete();

    return deletedCount;
  }

  /**
   * Get all responses for questionnaire
   */
  async findByQuestionnaireId(questionnaireId: string): Promise<QuestionnaireResponse[]> {
    const rows = await this.db('questionnaire_responses')
      .where('questionnaire_id', questionnaireId)
      .orderBy('created_at', 'asc');

    return rows.map(this.mapToResponse);
  }

  /**
   * Create toxicity score
   */
  async createScore(score: Omit<ToxicityScore, 'scoreId' | 'calculatedAt'>): Promise<ToxicityScore> {
    const [row] = await this.db('toxicity_scores')
      .insert({
        questionnaire_id: score.questionnaireId,
        patient_id: score.patientId,
        symptom_term: score.symptomTerm,
        composite_grade: score.compositeGrade,
        frequency_score: score.frequencyScore,
        severity_score: score.severityScore,
        interference_score: score.interferenceScore,
        ctcae_equivalent_grade: score.ctcaeEquivalentGrade,
        scoring_algorithm_version: score.scoringAlgorithmVersion,
      })
      .returning('*');

    return this.mapToScore(row);
  }

  /**
   * Get scores for questionnaire
   */
  async findScoresByQuestionnaireId(questionnaireId: string): Promise<ToxicityScore[]> {
    const rows = await this.db('toxicity_scores')
      .where('questionnaire_id', questionnaireId)
      .orderBy('composite_grade', 'desc');

    return rows.map(this.mapToScore);
  }

  /**
   * Get recent scores for patient
   */
  async findRecentScoresByPatientId(patientId: string, limit: number = 20): Promise<ToxicityScore[]> {
    const rows = await this.db('toxicity_scores')
      .where('patient_id', patientId)
      .orderBy('calculated_at', 'desc')
      .limit(limit);

    return rows.map(this.mapToScore);
  }

  /**
   * Get symptom history for patient
   */
  async getSymptomHistory(patientId: string): Promise<Array<{
    symptomCategory: string;
    lastGrade: number;
    trend: 'improving' | 'worsening' | 'stable';
    lastReportedDate: Date;
  }>> {
    // Get last 2 scores for each symptom to determine trend
    const rows = await this.db.raw(`
      WITH ranked_scores AS (
        SELECT
          symptom_term,
          composite_grade,
          calculated_at,
          ROW_NUMBER() OVER (
            PARTITION BY symptom_term
            ORDER BY calculated_at DESC
          ) as rn
        FROM toxicity_scores
        WHERE patient_id = ?
      ),
      latest AS (
        SELECT * FROM ranked_scores WHERE rn = 1
      ),
      previous AS (
        SELECT * FROM ranked_scores WHERE rn = 2
      )
      SELECT
        latest.symptom_term,
        latest.composite_grade as last_grade,
        latest.calculated_at as last_reported_date,
        CASE
          WHEN previous.composite_grade IS NULL THEN 'stable'
          WHEN latest.composite_grade < previous.composite_grade THEN 'improving'
          WHEN latest.composite_grade > previous.composite_grade THEN 'worsening'
          ELSE 'stable'
        END as trend
      FROM latest
      LEFT JOIN previous ON latest.symptom_term = previous.symptom_term
      ORDER BY latest.calculated_at DESC
    `, [patientId]);

    return rows.rows.map((row: any) => ({
      symptomCategory: row.symptom_term, // Map to symptomCategory to match SymptomHistory interface
      lastGrade: row.last_grade,
      trend: row.trend,
      lastReportedDate: row.last_reported_date,
    }));
  }

  /**
   * Map database row to QuestionnaireResponse
   */
  private mapToResponse(row: any): QuestionnaireResponse {
    return {
      responseId: row.response_id,
      questionnaireId: row.questionnaire_id,
      itemId: row.item_id,
      responseValue: row.response_value,
      responseLabel: row.response_label,
      conditionalTriggered: row.conditional_triggered,
      createdAt: row.created_at,
    };
  }

  /**
   * Map database row to ToxicityScore
   */
  private mapToScore(row: any): ToxicityScore {
    return {
      scoreId: row.score_id,
      questionnaireId: row.questionnaire_id,
      patientId: row.patient_id,
      symptomTerm: row.symptom_term,
      compositeGrade: row.composite_grade,
      frequencyScore: row.frequency_score,
      severityScore: row.severity_score,
      interferenceScore: row.interference_score,
      ctcaeEquivalentGrade: row.ctcae_equivalent_grade,
      scoringAlgorithmVersion: row.scoring_algorithm_version || 'NCI_v1.0',
      calculatedAt: row.calculated_at,
    };
  }
}
