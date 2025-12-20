import {
  TreatmentContext,
  CyclePhase,
  Regimen,
  PatientTreatment,
  TreatmentCycle,
} from '@toxicity-analyzer/shared';

export interface TimelineInput {
  treatment: PatientTreatment;
  regimen: Regimen;
  currentCycle: TreatmentCycle;
  currentDate: Date;
}

export interface TimelineResult {
  treatmentDay: number;
  phase: CyclePhase;
  inNadirWindow: boolean;
  daysUntilNextInfusion: number;
  daysSinceLastInfusion: number;
}

/**
 * Calculate the current treatment day relative to the cycle start
 *
 * @param lastInfusionDate - Date of the most recent infusion
 * @param currentDate - Current date (defaults to today)
 * @returns Number of days since last infusion (1-based, Day 1 = infusion day)
 *
 * @example
 * // If last infusion was 10 days ago
 * calculateTreatmentDay(tenDaysAgo, new Date()) // Returns 11
 */
export function calculateTreatmentDay(
  lastInfusionDate: Date,
  currentDate: Date = new Date()
): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = currentDate.getTime() - lastInfusionDate.getTime();
  const daysSince = Math.floor(diffMs / msPerDay);

  // Treatment day is 1-based (infusion day = Day 1)
  return daysSince + 1;
}

/**
 * Determine the current cycle phase based on treatment day
 *
 * Phase definitions:
 * - pre_session: Day -2 to 0 (48 hours before infusion)
 * - post_session: Day 1 to 3 (immediate post-infusion)
 * - recovery: Day 4 to 6 (early recovery period)
 * - nadir: Day 7 to 12 (neutrophil nadir window, regimen-specific)
 * - inter_cycle: Other days between cycles
 *
 * @param treatmentDay - Current day relative to cycle start (1-based)
 * @param regimen - Treatment regimen with nadir window configuration
 * @returns The current cycle phase
 *
 * @example
 * // Day 8 during AC-T regimen (nadir days 7-12)
 * determineCyclePhase(8, acTRegimen) // Returns 'nadir'
 */
export function determineCyclePhase(
  treatmentDay: number,
  regimen: Regimen
): CyclePhase {
  // Pre-session (approaching next infusion)
  // Detected when treatment day exceeds cycle length minus 2
  const cycleLengthDays = regimen.standardCycleLengthDays;
  if (treatmentDay >= cycleLengthDays - 1 && treatmentDay <= cycleLengthDays + 1) {
    return 'pre_session';
  }

  // Post-session (Days 1-3)
  if (treatmentDay >= 1 && treatmentDay <= 3) {
    return 'post_session';
  }

  // Recovery (Days 4-6)
  if (treatmentDay >= 4 && treatmentDay <= 6) {
    return 'recovery';
  }

  // Nadir (regimen-specific window)
  if (
    regimen.nadirWindowStart &&
    regimen.nadirWindowEnd &&
    treatmentDay >= regimen.nadirWindowStart &&
    treatmentDay <= regimen.nadirWindowEnd
  ) {
    return 'nadir';
  }

  // Inter-cycle (all other days)
  return 'inter_cycle';
}

/**
 * Check if the patient is currently in the nadir window
 *
 * The nadir window is the period when blood counts (especially neutrophils)
 * reach their lowest point after chemotherapy, typically Days 7-12.
 *
 * @param treatmentDay - Current day relative to cycle start
 * @param regimen - Treatment regimen with nadir window configuration
 * @returns True if currently in nadir window
 */
export function isInNadirWindow(
  treatmentDay: number,
  regimen: Regimen
): boolean {
  if (!regimen.nadirWindowStart || !regimen.nadirWindowEnd) {
    return false;
  }

  return (
    treatmentDay >= regimen.nadirWindowStart &&
    treatmentDay <= regimen.nadirWindowEnd
  );
}

/**
 * Calculate days until next planned infusion
 *
 * @param currentDate - Current date
 * @param nextInfusionDate - Date of next planned infusion
 * @returns Number of days until next infusion (can be negative if overdue)
 */
export function calculateDaysUntilNextInfusion(
  currentDate: Date,
  nextInfusionDate: Date
): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = nextInfusionDate.getTime() - currentDate.getTime();
  return Math.ceil(diffMs / msPerDay);
}

/**
 * Main function: Calculate complete treatment timeline context
 *
 * This is the primary entry point for The Profiler. It calculates all
 * timeline-related information needed for intelligent questionnaire generation.
 *
 * @param input - Treatment data including regimen, cycle, and dates
 * @returns Complete timeline analysis with phase and nadir status
 *
 * @example
 * const timeline = calculateTimeline({
 *   treatment: patientTreatment,
 *   regimen: acTRegimen,
 *   currentCycle: cycle3,
 *   currentDate: new Date()
 * });
 *
 * console.log(timeline.phase); // 'nadir'
 * console.log(timeline.treatmentDay); // 9
 * console.log(timeline.inNadirWindow); // true
 */
export function calculateTimeline(input: TimelineInput): TimelineResult {
  const { regimen, currentCycle, currentDate } = input;

  // Calculate days since last infusion
  const daysSinceLastInfusion = Math.floor(
    (currentDate.getTime() - currentCycle.infusionDate.getTime()) / (24 * 60 * 60 * 1000)
  );

  // Calculate treatment day (1-based)
  const treatmentDay = calculateTreatmentDay(
    currentCycle.infusionDate,
    currentDate
  );

  // Determine current cycle phase
  const phase = determineCyclePhase(treatmentDay, regimen);

  // Check if in nadir window
  const inNadirWindow = isInNadirWindow(treatmentDay, regimen);

  // Calculate days until next infusion
  const daysUntilNextInfusion = currentCycle.plannedNextInfusion
    ? calculateDaysUntilNextInfusion(currentDate, currentCycle.plannedNextInfusion)
    : regimen.standardCycleLengthDays - treatmentDay;

  return {
    treatmentDay,
    phase,
    inNadirWindow,
    daysUntilNextInfusion,
    daysSinceLastInfusion,
  };
}

/**
 * Build complete treatment context for orchestration
 *
 * This function combines treatment data with timeline calculation to produce
 * the full TreatmentContext object used by The Orchestrator.
 *
 * @param input - Treatment data and timeline information
 * @returns Complete treatment context for question orchestration
 */
export function buildTreatmentContext(
  input: TimelineInput
): TreatmentContext {
  const timeline = calculateTimeline(input);
  const { treatment, regimen, currentCycle, currentDate } = input;

  // Calculate absolute treatment day (days since treatment start)
  const treatmentStartDate = treatment.startDate;
  const msPerDay = 24 * 60 * 60 * 1000;
  const absoluteTreatmentDay = Math.floor(
    (currentDate.getTime() - treatmentStartDate.getTime()) / msPerDay
  ) + 1;

  return {
    patientId: treatment.patientId,
    treatmentId: treatment.treatmentId,
    regimen,
    currentCycle: currentCycle.cycleNumber,
    treatmentDay: timeline.treatmentDay,
    absoluteTreatmentDay,
    lastInfusionDate: currentCycle.infusionDate,
    nextInfusionDate: currentCycle.plannedNextInfusion || new Date(),
    phase: timeline.phase,
    inNadirWindow: timeline.inNadirWindow,
    cycleInfo: currentCycle,
  };
}
