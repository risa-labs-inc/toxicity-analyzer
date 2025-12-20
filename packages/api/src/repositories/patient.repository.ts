import { Knex } from 'knex';
import { Patient } from '@toxicity-analyzer/shared';
import { NotFoundError } from '../middleware/error.middleware';

export class PatientRepository {
  constructor(private db: Knex) {}

  /**
   * Find patient by ID
   */
  async findById(patientId: string): Promise<Patient | null> {
    const row = await this.db('patients')
      .where('patient_id', patientId)
      .first();

    if (!row) {
      return null;
    }

    return this.mapToPatient(row);
  }

  /**
   * Find patient by Firebase UID
   */
  async findByFirebaseUid(firebaseUid: string): Promise<Patient | null> {
    const row = await this.db('patients')
      .where('firebase_uid', firebaseUid)
      .first();

    if (!row) {
      return null;
    }

    return this.mapToPatient(row);
  }

  /**
   * Get all active patients
   */
  async findActive(): Promise<Patient[]> {
    const rows = await this.db('patients')
      .where('status', 'active')
      .orderBy('created_at', 'desc');

    return rows.map(this.mapToPatient);
  }

  /**
   * Get patient profile with demographics
   */
  async getProfile(patientId: string): Promise<Patient> {
    const patient = await this.findById(patientId);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    return patient;
  }

  /**
   * Update patient status
   */
  async updateStatus(
    patientId: string,
    status: 'active' | 'completed' | 'withdrawn'
  ): Promise<void> {
    await this.db('patients')
      .where('patient_id', patientId)
      .update({ status, updated_at: new Date() });
  }

  /**
   * Map database row to Patient type
   */
  private mapToPatient(row: any): Patient {
    return {
      patientId: row.patient_id,
      firebaseUid: row.firebase_uid,
      medicalRecordNumber: row.medical_record_number,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      ethnicity: row.ethnicity,
      comorbidities: row.comorbidities && typeof row.comorbidities === 'string' && row.comorbidities !== 'None'
        ? JSON.parse(row.comorbidities)
        : (typeof row.comorbidities === 'object' ? row.comorbidities : []),
      ecogBaseline: row.ecog_baseline,
      enrollmentDate: row.enrollment_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
