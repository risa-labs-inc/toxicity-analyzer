/**
 * API-specific types for HTTP requests and responses
 */

import { Questionnaire } from './questionnaire.types';
import { ProCTCAEItem } from './proctcae.types';

/**
 * Questionnaire generation mode
 */
export type QuestionnaireGenerationMode = 'drug-module' | 'regimen';

/**
 * Metadata about questionnaire generation
 */
export interface QuestionnaireMetadata {
  generationApproach: 'drug-module' | 'regimen-phase-history';
  activeDrugs: Array<{
    drugName: string;
    cycleNumber: number;
  }>;
  totalSymptoms: {
    beforeDedup: number;
    afterDedup: number;
  };
  phaseFilteringApplied: boolean;
  currentPhase?: string;
  regimenCode?: string;
  cycleDay?: number;
}

/**
 * Request parameters for questionnaire generation
 */
export interface QuestionnaireGenerationRequest {
  patientId: string;
  mode?: QuestionnaireGenerationMode;
}

/**
 * Response from questionnaire generation endpoint
 */
export interface QuestionnaireGenerationResponse {
  questionnaire: Questionnaire;
  items: ProCTCAEItem[];
  metadata: QuestionnaireMetadata;
  message: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}
