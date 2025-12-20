/**
 * Alert Engine
 *
 * Emergency detection and triage prioritization for clinician dashboard.
 *
 * Responsibilities:
 * - Detect emergency alerts (Grade 3/4 toxicities)
 * - Classify alerts by severity (red/yellow/green)
 * - Generate patient and clinician instructions
 * - Prioritize triage queue by urgency
 * - Provide queue statistics and recommendations
 */

// Emergency Detection exports
export {
  detectEmergencyAlerts,
  getHighestPriorityAlert,
  requiresImmediateAction,
  groupAlertsBySeverity,
  generatePatientSummary,
  type AlertSeverity,
  type AlertType,
  type EmergencyAlert,
  type AlertDetectionInput,
} from './emergency-detector';

// Triage Prioritization exports
export {
  calculatePriorityScore,
  getPriorityReason,
  getRecommendedAction,
  getTimelineTarget,
  prioritizeTriageQueue,
  filterBySeverity,
  getQueueStatistics,
  getNextPatient,
  type TriagePatient,
  type TriagePriority,
} from './triage-prioritizer';
