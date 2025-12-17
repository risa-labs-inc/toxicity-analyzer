/**
 * PRO-CTCAE (Patient-Reported Outcomes - Common Terminology Criteria for Adverse Events)
 * Type definitions for the validated symptom assessment library
 */

export interface ProCTCAEItem {
  itemId: string;
  itemCode: string; // e.g., 'NAUSEA_FREQ', 'FATIGUE_SEV', 'PAIN_INTERF'
  symptomCategory: string; // e.g., 'gastrointestinal', 'constitutional', 'neurological'
  attribute: AttributeType;
  questionText: string;
  responseType: ResponseType;
  responseOptions: ResponseOption[];
  applicablePopulations?: ApplicablePopulation;
  ctcaeMapping?: CTCAEMapping;
  displayOrder?: number;
  createdAt: Date;
}

export type AttributeType = 'frequency' | 'severity' | 'interference';

export type ResponseType =
  | 'frequency_5pt'     // 0-4: Never, Rarely, Occasionally, Frequently, Almost constantly
  | 'severity_5pt'      // 0-4: None, Mild, Moderate, Severe, Very severe
  | 'interference_5pt'  // 0-4: Not at all, A little bit, Somewhat, Quite a bit, Very much
  | 'yes_no'            // Binary response
  | 'present_absent';   // Binary response for signs/symptoms

export interface ResponseOption {
  value: number;
  label: string;
  description?: string;
}

export interface ApplicablePopulation {
  gender?: ('male' | 'female' | 'other')[];
  ageRange?: { min?: number; max?: number };
  regimens?: string[]; // Specific regimen codes
  excludeRegimens?: string[];
  comorbidities?: string[];
}

export interface CTCAEMapping {
  ctcaeVersion: string; // e.g., 'v5.0'
  symptomName: string;
  gradeThresholds: {
    grade1?: ResponseThreshold;
    grade2?: ResponseThreshold;
    grade3?: ResponseThreshold;
    grade4?: ResponseThreshold;
  };
}

export interface ResponseThreshold {
  frequency?: number;
  severity?: number;
  interference?: number;
  logic?: 'AND' | 'OR'; // How to combine multiple attributes
}

// Standard response scales
export const FREQUENCY_OPTIONS: ResponseOption[] = [
  { value: 0, label: 'Never' },
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Occasionally' },
  { value: 3, label: 'Frequently' },
  { value: 4, label: 'Almost constantly' }
];

export const SEVERITY_OPTIONS: ResponseOption[] = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Mild' },
  { value: 2, label: 'Moderate' },
  { value: 3, label: 'Severe' },
  { value: 4, label: 'Very severe' }
];

export const INTERFERENCE_OPTIONS: ResponseOption[] = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'A little bit' },
  { value: 2, label: 'Somewhat' },
  { value: 3, label: 'Quite a bit' },
  { value: 4, label: 'Very much' }
];

export const YES_NO_OPTIONS: ResponseOption[] = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Yes' }
];

// Common symptom categories
export enum SymptomCategory {
  GASTROINTESTINAL = 'gastrointestinal',
  CONSTITUTIONAL = 'constitutional',
  NEUROLOGICAL = 'neurological',
  DERMATOLOGICAL = 'dermatological',
  HEMATOLOGICAL = 'hematological',
  CARDIAC = 'cardiac',
  PULMONARY = 'pulmonary',
  RENAL = 'renal',
  HEPATIC = 'hepatic',
  MUSCULOSKELETAL = 'musculoskeletal',
  IMMUNOLOGICAL = 'immunological',
  INFECTION_SIGNS = 'infection_signs'
}
