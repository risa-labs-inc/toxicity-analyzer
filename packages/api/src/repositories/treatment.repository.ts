import { Knex } from 'knex';
import {
  PatientTreatment,
  TreatmentCycle,
  Regimen,
} from '@toxicity-analyzer/shared';
import { NotFoundError } from '../middleware/error.middleware';

export class TreatmentRepository {
  constructor(private db: Knex) {}

  /**
   * Find active treatment for patient
   */
  async findActiveByPatientId(patientId: string): Promise<PatientTreatment | null> {
    const row = await this.db('patient_treatments')
      .where('patient_id', patientId)
      .where('status', 'active')
      .first();

    if (!row) {
      return null;
    }

    return this.mapToTreatment(row);
  }

  /**
   * Get current cycle for treatment
   */
  async getCurrentCycle(treatmentId: string): Promise<TreatmentCycle | null> {
    const row = await this.db('treatment_cycles')
      .where('treatment_id', treatmentId)
      .where('completed', false)
      .orderBy('cycle_number', 'desc')
      .first();

    if (!row) {
      return null;
    }

    return this.mapToCycle(row);
  }

  /**
   * Get regimen by ID
   */
  async findRegimenById(regimenId: string): Promise<Regimen | null> {
    const row = await this.db('regimens')
      .where('regimen_id', regimenId)
      .first();

    if (!row) {
      return null;
    }

    return this.mapToRegimen(row);
  }

  /**
   * Get regimen by code
   */
  async findRegimenByCode(regimenCode: string): Promise<Regimen | null> {
    const row = await this.db('regimens')
      .where('regimen_code', regimenCode)
      .first();

    if (!row) {
      return null;
    }

    return this.mapToRegimen(row);
  }

  /**
   * Get complete treatment context for patient
   */
  async getTreatmentContext(patientId: string): Promise<{
    treatment: PatientTreatment;
    regimen: Regimen;
    currentCycle: TreatmentCycle;
  } | null> {
    const treatment = await this.findActiveByPatientId(patientId);
    if (!treatment) {
      return null;
    }

    const regimen = await this.findRegimenById(treatment.regimenId);
    if (!regimen) {
      throw new NotFoundError('Regimen');
    }

    const currentCycle = await this.getCurrentCycle(treatment.treatmentId);
    if (!currentCycle) {
      throw new NotFoundError('Current cycle');
    }

    return { treatment, regimen, currentCycle };
  }

  /**
   * Get all cycles for treatment
   */
  async getCycles(treatmentId: string): Promise<TreatmentCycle[]> {
    const rows = await this.db('treatment_cycles')
      .where('treatment_id', treatmentId)
      .orderBy('cycle_number', 'asc');

    return rows.map(this.mapToCycle);
  }

  /**
   * Map database row to PatientTreatment
   */
  private mapToTreatment(row: any): PatientTreatment {
    return {
      treatmentId: row.treatment_id,
      patientId: row.patient_id,
      regimenId: row.regimen_id,
      startDate: row.start_date,
      endDate: row.end_date,
      currentCycle: row.current_cycle,
      totalPlannedCycles: row.total_planned_cycles,
      treatmentIntent: row.treatment_intent,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to TreatmentCycle
   */
  private mapToCycle(row: any): TreatmentCycle {
    return {
      cycleId: row.cycle_id,
      treatmentId: row.treatment_id,
      cycleNumber: row.cycle_number,
      infusionDate: row.infusion_date,
      plannedNextInfusion: row.planned_next_infusion,
      actualNextInfusion: row.actual_next_infusion,
      doseModifications: row.dose_modifications,
      delayReasons: row.delay_reasons,
      completed: row.completed,
      createdAt: row.created_at,
    };
  }

  /**
   * Map database row to Regimen
   */
  private mapToRegimen(row: any): Regimen {
    return {
      regimenId: row.regimen_id,
      regimenCode: row.regimen_code,
      regimenName: row.regimen_name,
      description: row.description,
      drugComponents: typeof row.drug_components === 'string' ? JSON.parse(row.drug_components) : row.drug_components,
      standardCycleLengthDays: row.standard_cycle_length_days,
      totalCycles: row.total_cycles,
      toxicityProfile: typeof row.toxicity_profile === 'string' ? JSON.parse(row.toxicity_profile) : row.toxicity_profile,
      nadirWindowStart: row.nadir_window_start,
      nadirWindowEnd: row.nadir_window_end,
    };
  }
}
