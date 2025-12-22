import { Knex } from 'knex';
import { Questionnaire } from '@toxicity-analyzer/shared';
import { NotFoundError } from '../middleware/error.middleware';

export class QuestionnaireRepository {
  constructor(private db: Knex) {}

  /**
   * Create new questionnaire
   */
  async create(questionnaire: Omit<Questionnaire, 'questionnaireId' | 'createdAt'>): Promise<Questionnaire> {
    const [row] = await this.db('questionnaires')
      .insert({
        patient_id: questionnaire.patientId,
        treatment_id: questionnaire.treatmentId,
        cycle_id: questionnaire.cycleId,
        questionnaire_type: questionnaire.questionnaireType,
        treatment_day: questionnaire.treatmentDay,
        due_date: questionnaire.dueDate,
        scheduled_date: questionnaire.dueDate, // Same as due_date for now
        status: questionnaire.status,
        selected_items: JSON.stringify(questionnaire.selectedItems),
      })
      .returning('*');

    return this.mapToQuestionnaire(row);
  }

  /**
   * Find questionnaire by ID
   */
  async findById(questionnaireId: string): Promise<Questionnaire | null> {
    const row = await this.db('questionnaires')
      .where('questionnaire_id', questionnaireId)
      .first();

    if (!row) {
      return null;
    }

    return this.mapToQuestionnaire(row);
  }

  /**
   * Get pending questionnaires for patient
   */
  async findPendingByPatientId(patientId: string): Promise<Questionnaire[]> {
    const rows = await this.db('questionnaires')
      .where('patient_id', patientId)
      .whereIn('status', ['pending', 'in_progress'])
      .orderBy('due_date', 'asc');

    return rows.map(this.mapToQuestionnaire);
  }

  /**
   * Get completed questionnaires for patient
   */
  async findCompletedByPatientId(patientId: string, limit: number = 10): Promise<Questionnaire[]> {
    const rows = await this.db('questionnaires')
      .where('patient_id', patientId)
      .where('status', 'completed')
      .orderBy('completed_at', 'desc')
      .limit(limit);

    return rows.map(this.mapToQuestionnaire);
  }

  /**
   * Update questionnaire status
   */
  async updateStatus(
    questionnaireId: string,
    status: 'pending' | 'in_progress' | 'completed',
    completedAt?: Date
  ): Promise<void> {
    const updateData: any = {
      status,
    };

    if (completedAt) {
      updateData.completed_at = completedAt;
    }

    await this.db('questionnaires')
      .where('questionnaire_id', questionnaireId)
      .update(updateData);
  }

  /**
   * Record completion time
   */
  async recordCompletionTime(
    questionnaireId: string,
    seconds: number
  ): Promise<void> {
    await this.db('questionnaires')
      .where('questionnaire_id', questionnaireId)
      .update({
        time_to_complete_seconds: seconds,
      });
  }

  /**
   * Map database row to Questionnaire
   */
  private mapToQuestionnaire(row: any): Questionnaire {
    return {
      questionnaireId: row.questionnaire_id,
      patientId: row.patient_id,
      treatmentId: row.treatment_id,
      cycleId: row.cycle_id,
      questionnaireType: row.questionnaire_type,
      scheduledDate: row.scheduled_date,
      treatmentDay: row.treatment_day,
      dueDate: row.due_date,
      status: row.status,
      selectedItems: typeof row.selected_items === 'string' ? JSON.parse(row.selected_items) : row.selected_items,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      timeToCompleteSeconds: row.time_to_complete_seconds,
      createdAt: row.created_at,
    };
  }
}
