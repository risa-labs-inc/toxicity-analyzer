/**
 * Scoring Service
 *
 * NCI-validated composite scoring algorithm for PRO-CTCAE responses.
 *
 * Implements the validated algorithm:
 * 1. Base grade = MAX(frequency, severity)
 * 2. Escalate if both frequency ≥3 AND severity ≥3
 * 3. Escalate if interference ≥3
 * 4. Cap at Grade 4
 *
 * Also provides CTCAE v5.0 mapping for clinician familiarity.
 */

// NCI Grading Algorithm exports
export {
  calculateCompositeGrade,
  calculateMultipleGrades,
  getHighestGrade,
  filterByGrade,
  calculateToxicityBurden,
  getGradeExplanation,
  requiresUrgentReview,
  calculateGradeTrend,
  validateGradingInput,
  type SymptomResponses,
  type GradingInput,
  type GradingResult,
} from './nci-grading-algorithm';

// CTCAE Mapper exports
export {
  mapToCTCAE,
  getSymptomsWithSpecificMappings,
  hasSpecificMapping,
  getClinicalAction,
  mapMultipleToCTCAE,
  type CTCAEMapping,
} from './ctcae-mapper';
