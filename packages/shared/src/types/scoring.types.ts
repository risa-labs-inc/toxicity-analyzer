/**
 * Scoring and grading type definitions
 * Based on NCI PRO-CTCAE validated scoring algorithms
 * Updated to CTCAE v5.0 symptom-specific scoring (each symptom scored individually)
 */

export interface ToxicityScore {
  scoreId: string;
  questionnaireId: string;
  patientId: string;
  symptomTerm: string; // Specific symptom per CTCAE v5.0 (e.g., "nausea", "vomiting", "diarrhea")
  compositeGrade: CompositeGrade;
  frequencyScore?: number;  // 0-4
  severityScore?: number;   // 0-4
  interferenceScore?: number; // 0-4
  ctcaeEquivalentGrade?: CTCAEGrade;
  scoringAlgorithmVersion: string; // e.g., 'NCI_v1.0'
  calculatedAt: Date;
}

export type CompositeGrade = 0 | 1 | 2 | 3 | 4;
export type CTCAEGrade = 0 | 1 | 2 | 3 | 4;

export interface SymptomScoreInput {
  symptomTerm: string; // Specific symptom (e.g., "nausea", not "gastrointestinal")
  frequencyResponse?: number;
  severityResponse?: number;
  interferenceResponse?: number;
}

export interface CompositeScoreResult {
  symptomTerm: string; // Specific symptom (e.g., "nausea", not "gastrointestinal")
  compositeGrade: CompositeGrade;
  ctcaeEquivalent: CTCAEGrade;
  components: {
    frequency?: number;
    severity?: number;
    interference?: number;
  };
  alertLevel: AlertLevel;
  reasoning?: string; // Explanation of how grade was calculated
}

export type AlertLevel = 'none' | 'routine' | 'urgent' | 'emergency';

// Alert thresholds
export interface AlertThresholds {
  green: { min: CompositeGrade; max: CompositeGrade }; // Grade 0-1
  yellow: { min: CompositeGrade; max: CompositeGrade }; // Grade 2
  red: { min: CompositeGrade; max: CompositeGrade };    // Grade 3-4
}

export const STANDARD_ALERT_THRESHOLDS: AlertThresholds = {
  green: { min: 0, max: 1 },
  yellow: { min: 2, max: 2 },
  red: { min: 3, max: 4 }
};

// Trend analysis
export interface TrendAnalysis {
  symptomTerm: string; // Specific symptom (e.g., "nausea", not "gastrointestinal")
  trend: TrendDirection;
  sparkline: TrendDataPoint[];
  currentGrade: CompositeGrade;
  previousGrade?: CompositeGrade;
  changeFromPrevious?: number;
  cycleComparison?: {
    cycle: number;
    grade: CompositeGrade;
  }[];
}

export type TrendDirection = 'improving' | 'stable' | 'worsening' | 'insufficient_data';

export interface TrendDataPoint {
  x: Date;
  y: CompositeGrade;
  cycleNumber?: number;
  treatmentDay?: number;
}

// Emergency alert detection
export interface EmergencyAlert {
  alertId: string;
  patientId: string;
  questionnaireId: string;
  symptomTerm: string; // Specific symptom (e.g., "nausea", not "gastrointestinal")
  grade: CompositeGrade;
  alertType: 'emergency' | 'urgent';
  severity: 'red' | 'yellow';
  message: string;
  patientInstructions: string;
  clinicianInstructions?: string;
  triggeredAt: Date;
  requiresImmediateAction: boolean;
}

// Triage classification
export interface TriageClassification {
  patientId: string;
  overallSeverity: 'red' | 'yellow' | 'green';
  activeAlerts: EmergencyAlert[];
  highestGrade: CompositeGrade;
  symptomsSummary: {
    symptomTerm: string; // Specific symptom (e.g., "nausea", not "gastrointestinal")
    grade: CompositeGrade;
    trend: TrendDirection;
  }[];
  recommendedAction: string;
  priority: number; // 1 (highest) to 10 (lowest)
}

// NCI scoring algorithm parameters
export interface NCIScoringParams {
  useFrequencySeverityMax: boolean;       // Default: true
  escalateWhenBothHigh: boolean;         // Default: true (if freq≥3 AND sev≥3, add 1)
  interferenceModifier: boolean;          // Default: true (if interf≥3, add 1)
  symptomSpecificRules?: Map<string, ScoringRule>;
}

export interface ScoringRule {
  symptom: string;
  customThresholds?: {
    grade1?: { frequency?: number; severity?: number };
    grade2?: { frequency?: number; severity?: number };
    grade3?: { frequency?: number; severity?: number };
    grade4?: { frequency?: number; severity?: number };
  };
  maxGrade?: CTCAEGrade; // Some symptoms rarely reach grade 4
}

// Default NCI parameters
export const DEFAULT_NCI_PARAMS: NCIScoringParams = {
  useFrequencySeverityMax: true,
  escalateWhenBothHigh: true,
  interferenceModifier: true
};
