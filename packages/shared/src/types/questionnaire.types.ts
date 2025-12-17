/**
 * Questionnaire-related type definitions
 */

import { ProCTCAEItem } from './proctcae.types';
import { CyclePhase } from './treatment.types';

export interface Questionnaire {
  questionnaireId: string;
  patientId: string;
  treatmentId: string;
  cycleId?: string;
  questionnaireType: QuestionnaireType;
  scheduledDate: Date;
  treatmentDay: number; // Relative to cycle start
  dueDate: Date;
  expiryDate?: Date;
  status: QuestionnaireStatus;
  startedAt?: Date;
  completedAt?: Date;
  timeToCompleteSeconds?: number;
  selectedItems: string[]; // Array of ProCTCAE item IDs
  createdAt: Date;
}

export type QuestionnaireType =
  | 'pre_session'  // Day -2 to 0: Pre-infusion fitness clearance
  | 'post_session' // Day 1-3: Acute toxicity monitoring
  | 'recovery'     // Day 4-7: Peak toxicity assessment
  | 'guardian'     // Daily during nadir: Infection screening
  | 'adherence'    // Daily for oral chemo: Medication tracking
  | 'on_demand';   // Patient-initiated

export type QuestionnaireStatus =
  | 'pending'      // Not yet started
  | 'in_progress'  // Started but not completed
  | 'completed'    // Finished and submitted
  | 'expired';     // Past due date

export interface QuestionnaireSession extends Questionnaire {
  items: ProCTCAEItem[];
  currentItemIndex: number;
  responses: QuestionnaireResponse[];
  conditionalStack: ProCTCAEItem[]; // Items triggered by conditional branching
}

export interface QuestionnaireResponse {
  responseId: string;
  questionnaireId: string;
  itemId: string;
  responseValue: number;
  responseLabel: string;
  conditionalTriggered: boolean; // Whether this response triggered a follow-up question
  parentResponseId?: string;     // If this is a conditional follow-up
  createdAt: Date;
}

export interface QuestionnairePreview {
  questionnaireId: string;
  questionnaireType: QuestionnaireType;
  dueDate: Date;
  itemCount: number;
  estimatedMinutes: number;
  cyclePhase: CyclePhase;
  status: QuestionnaireStatus;
}

export interface QuestionnaireCompletion {
  questionnaireId: string;
  completedAt: Date;
  timeToCompleteSeconds: number;
  totalItems: number;
  totalResponses: number;
  scores: QuestionnaireScore[];
  alerts: Alert[];
  summary: string;
}

export interface QuestionnaireScore {
  symptomCategory: string;
  compositeGrade: number;
  severity: 'green' | 'yellow' | 'red';
}

export interface Alert {
  alertId: string;
  alertType: 'emergency' | 'urgent' | 'routine';
  severity: 'red' | 'yellow' | 'green';
  symptomCategory: string;
  grade: number;
  message: string;
  patientInstructions?: string;
  triggeredAt: Date;
}

// Questionnaire generation criteria
export interface QuestionSelectionCriteria {
  patientId: string;
  treatmentContext: any; // TreatmentContext
  questionnaireType: QuestionnaireType;
  targetItemCount?: number; // Default: 8-12 items for 2-minute completion
  includeHistorical?: boolean; // Whether to prioritize symptoms with past elevation
}
