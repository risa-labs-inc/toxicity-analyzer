/**
 * Treatment and regimen-related type definitions
 */

export interface Regimen {
  regimenId: string;
  regimenCode: string; // 'AC-T', 'TC', 'T-DM1', 'Capecitabine', 'Pembrolizumab'
  regimenName: string;
  description?: string;
  drugComponents: DrugComponent[];
  standardCycleLengthDays: number;
  totalCycles?: number;
  toxicityProfile: ToxicityProfile;
  drugModuleComposition?: any; // Drug module composition for drug-module approach
  nadirWindowStart: number; // Day 7 for most regimens
  nadirWindowEnd: number;   // Day 12 for most regimens
  createdAt: Date;
}

export interface DrugComponent {
  name: string;
  dose: string;
  route?: 'IV' | 'PO' | 'SC' | 'IM';
  frequency?: string;
}

export interface ToxicityProfile {
  highRisk: string[]; // Symptom categories with high risk for this regimen
  moderate: string[];
  low: string[];
  phasePriorities?: {
    pre_session: string[];
    post_session: string[];
    recovery: string[];
    nadir: string[];
    inter_cycle: string[];
  };
  regimenSpecific?: {
    symptom: string;
    peakWindow?: { start: number; end: number }; // Days relative to cycle
    monitoringFrequency?: 'daily' | 'twice_weekly' | 'weekly';
  }[];
}

export interface PatientTreatment {
  treatmentId: string;
  patientId: string;
  regimenId: string;
  startDate: Date;
  endDate?: Date;
  totalPlannedCycles: number;
  currentCycle: number;
  treatmentIntent?: 'curative' | 'adjuvant' | 'neoadjuvant' | 'palliative';
  status: TreatmentStatus;
  discontinuationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TreatmentStatus = 'active' | 'paused' | 'completed' | 'discontinued';

export interface TreatmentCycle {
  cycleId: string;
  treatmentId: string;
  cycleNumber: number;
  infusionDate: Date;
  plannedNextInfusion?: Date;
  actualNextInfusion?: Date;
  doseModifications?: DoseModification[];
  completed: boolean;
  notes?: string;
  createdAt: Date;
}

export interface DoseModification {
  drug: string;
  originalDose: string;
  modifiedDose: string;
  reason: string;
  modifiedDate: Date;
}

export type CyclePhase =
  | 'pre_session'  // Day -2 to 0: Pre-infusion assessment
  | 'post_session' // Day 1-3: Acute monitoring
  | 'recovery'     // Day 4-6: Peak toxicity assessment
  | 'nadir'        // Day 7-12: Nadir window (regimen-specific)
  | 'inter_cycle'; // Other days between cycles

export interface TreatmentContext {
  patientId: string;
  treatmentId: string;
  regimen: Regimen;
  currentCycle: number;
  treatmentDay: number;       // Relative to cycle start (can be negative for pre-session)
  absoluteTreatmentDay: number; // Since treatment start
  lastInfusionDate: Date;
  nextInfusionDate?: Date;
  phase: CyclePhase;
  inNadirWindow: boolean;
  cycleInfo: TreatmentCycle;
}
