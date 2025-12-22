/**
 * Patient-related type definitions
 */

export interface Patient {
  patientId: string;
  firebaseUid: string;
  fullName?: string;
  medicalRecordNumber?: string; // Encrypted in DB
  dateOfBirth?: Date;            // Encrypted in DB
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  ethnicity?: string;
  comorbidities?: Comorbidity[];
  ecogBaseline?: ECOGStatus;
  enrollmentDate: Date;
  status: PatientStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comorbidity {
  condition: string;
  diagnosedDate?: Date;
  severity?: 'mild' | 'moderate' | 'severe';
  controlled: boolean;
}

export type ECOGStatus = 0 | 1 | 2 | 3 | 4 | 5;

export type PatientStatus = 'active' | 'completed' | 'withdrawn' | 'on_hold';

export interface PatientProfile extends Patient {
  currentTreatment?: TreatmentSummary;
  recentAlerts?: AlertSummary[];
}

export interface TreatmentSummary {
  treatmentId: string;
  regimenCode: string;
  regimenName: string;
  currentCycle: number;
  totalPlannedCycles: number;
  treatmentDay: number;
  phase: string;
  nextInfusionDate?: Date;
}

export interface AlertSummary {
  alertId: string;
  severity: 'red' | 'yellow' | 'green';
  symptom: string;
  grade: number;
  triggeredAt: Date;
}
