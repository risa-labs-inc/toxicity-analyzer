/**
 * The Profiler
 *
 * Calculates treatment context by analyzing:
 * - Current position in treatment cycle (treatment day)
 * - Cycle phase (pre_session, post_session, recovery, nadir, inter_cycle)
 * - Nadir window status and severity
 * - Days until next infusion
 *
 * This context is used by The Orchestrator to select appropriate PRO-CTCAE items.
 */

// Timeline Calculator exports
export {
  calculateTreatmentDay,
  determineCyclePhase,
  isInNadirWindow,
  calculateDaysUntilNextInfusion,
  calculateTimeline,
  buildTreatmentContext,
  type TimelineInput,
  type TimelineResult,
} from './timeline-calculator';

// Nadir Detector exports
export {
  analyzeNadirStatus,
  getInfectionRiskLevel,
  getNadirPrioritySymptoms,
  shouldShowNadirWarnings,
  generateNadirGuidance,
  calculateNadirDates,
  type NadirAnalysis,
} from './nadir-detector';
