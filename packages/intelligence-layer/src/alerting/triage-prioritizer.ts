import { EmergencyAlert, AlertSeverity } from './emergency-detector';

export interface TriagePatient {
  patientId: string;
  patientName: string;
  alerts: EmergencyAlert[];
  questionnaireCompletedAt: Date;
  regimenCode: string;
  currentCycle: number;
  treatmentDay: number;
}

export interface TriagePriority {
  rank: number;
  patient: TriagePatient;
  priorityScore: number;
  priorityReason: string;
  recommendedAction: string;
  timelineTarget: string; // e.g., "Within 30 minutes", "Within 24 hours"
}

/**
 * Calculate priority score for triage queue
 *
 * Scoring algorithm:
 * - Red alerts: +100 points each
 * - Yellow alerts: +25 points each
 * - Green alerts: +5 points each
 * - Recent completion: +10 points (within last hour)
 * - Nadir status: +15 points
 *
 * @param patient - Patient with alerts and context
 * @returns Priority score (higher = more urgent)
 */
export function calculatePriorityScore(patient: TriagePatient): number {
  let score = 0;

  // Count alerts by severity
  const redCount = patient.alerts.filter((a) => a.severity === 'red').length;
  const yellowCount = patient.alerts.filter((a) => a.severity === 'yellow').length;
  const greenCount = patient.alerts.filter((a) => a.severity === 'green').length;

  score += redCount * 100;
  score += yellowCount * 25;
  score += greenCount * 5;

  // Recency bonus (completed within last hour)
  const hoursSinceCompletion =
    (Date.now() - patient.questionnaireCompletedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCompletion < 1) {
    score += 10;
  }

  // Nadir window bonus (Days 7-12 typically)
  if (patient.treatmentDay >= 7 && patient.treatmentDay <= 12) {
    score += 15;
  }

  return score;
}

/**
 * Determine priority reason for clinician
 *
 * Explains why this patient is prioritized at their current rank.
 *
 * @param patient - Patient with alerts
 * @returns Human-readable priority reason
 */
export function getPriorityReason(patient: TriagePatient): string {
  const redCount = patient.alerts.filter((a) => a.severity === 'red').length;
  const yellowCount = patient.alerts.filter((a) => a.severity === 'yellow').length;

  const reasons: string[] = [];

  if (redCount > 0) {
    reasons.push(`${redCount} emergency alert${redCount > 1 ? 's' : ''}`);
  }

  if (yellowCount > 0) {
    reasons.push(`${yellowCount} urgent alert${yellowCount > 1 ? 's' : ''}`);
  }

  if (patient.treatmentDay >= 7 && patient.treatmentDay <= 12) {
    reasons.push('in nadir window');
  }

  return reasons.length > 0
    ? reasons.join(', ')
    : 'routine monitoring';
}

/**
 * Get recommended action for clinician
 *
 * Provides specific guidance on next steps based on alert severity.
 *
 * @param patient - Patient with alerts
 * @returns Recommended clinical action
 */
export function getRecommendedAction(patient: TriagePatient): string {
  const hasRed = patient.alerts.some((a) => a.severity === 'red');
  const hasYellow = patient.alerts.some((a) => a.severity === 'yellow');

  if (hasRed) {
    return 'Contact patient immediately. Consider emergency evaluation or ED referral.';
  }

  if (hasYellow) {
    return 'Schedule same-day or next-day phone call or visit. Review management plan.';
  }

  return 'Routine follow-up. Document in chart. No immediate action needed.';
}

/**
 * Get timeline target for response
 *
 * Specifies how quickly clinician should respond based on urgency.
 *
 * @param patient - Patient with alerts
 * @returns Timeline target (e.g., "Within 30 minutes")
 */
export function getTimelineTarget(patient: TriagePatient): string {
  const hasRed = patient.alerts.some((a) => a.severity === 'red');
  const hasYellow = patient.alerts.some((a) => a.severity === 'yellow');

  if (hasRed) {
    return 'Within 30 minutes';
  }

  if (hasYellow) {
    return 'Within 24 hours';
  }

  return 'Within 3-5 days';
}

/**
 * Prioritize patients for triage queue
 *
 * Sorts patients by urgency and assigns priority ranks.
 * Returns ordered list for clinician dashboard display.
 *
 * @param patients - Array of patients with alerts
 * @returns Prioritized triage list sorted by urgency
 *
 * @example
 * const queue = prioritizeTriageQueue(patientsWithAlerts);
 *
 * queue.forEach(item => {
 *   console.log(`Rank ${item.rank}: ${item.patient.patientName}`);
 *   console.log(`Priority: ${item.priorityReason}`);
 *   console.log(`Action: ${item.recommendedAction}`);
 *   console.log(`Timeline: ${item.timelineTarget}`);
 * });
 */
export function prioritizeTriageQueue(
  patients: TriagePatient[]
): TriagePriority[] {
  // Calculate priority scores
  const scoredPatients = patients.map((patient) => ({
    patient,
    priorityScore: calculatePriorityScore(patient),
    priorityReason: getPriorityReason(patient),
    recommendedAction: getRecommendedAction(patient),
    timelineTarget: getTimelineTarget(patient),
  }));

  // Sort by score (descending)
  scoredPatients.sort((a, b) => b.priorityScore - a.priorityScore);

  // Assign ranks
  return scoredPatients.map((item, index) => ({
    rank: index + 1,
    ...item,
  }));
}

/**
 * Filter triage queue by severity
 *
 * Returns only patients with alerts at or above the specified severity.
 *
 * @param queue - Prioritized triage queue
 * @param minSeverity - Minimum severity level ('red', 'yellow', or 'green')
 * @returns Filtered queue
 */
export function filterBySeverity(
  queue: TriagePriority[],
  minSeverity: AlertSeverity
): TriagePriority[] {
  const severityOrder: Record<AlertSeverity, number> = {
    red: 3,
    yellow: 2,
    green: 1,
  };

  const minLevel = severityOrder[minSeverity];

  return queue.filter((item) =>
    item.patient.alerts.some(
      (alert) => severityOrder[alert.severity] >= minLevel
    )
  );
}

/**
 * Get statistics for triage queue
 *
 * Provides summary statistics for dashboard overview.
 *
 * @param queue - Prioritized triage queue
 * @returns Queue statistics
 */
export function getQueueStatistics(queue: TriagePriority[]): {
  totalPatients: number;
  emergencyCount: number;
  urgentCount: number;
  routineCount: number;
  avgResponseTime: string;
} {
  const emergencyCount = queue.filter((item) =>
    item.patient.alerts.some((a) => a.severity === 'red')
  ).length;

  const urgentCount = queue.filter(
    (item) =>
      item.patient.alerts.some((a) => a.severity === 'yellow') &&
      !item.patient.alerts.some((a) => a.severity === 'red')
  ).length;

  const routineCount = queue.length - emergencyCount - urgentCount;

  // Calculate weighted average response time
  const avgMinutes =
    (emergencyCount * 0.5 + urgentCount * 12 + routineCount * 72) /
    (queue.length || 1);

  const avgResponseTime =
    avgMinutes < 1
      ? `${Math.round(avgMinutes * 60)} minutes`
      : avgMinutes < 24
      ? `${Math.round(avgMinutes)} hours`
      : `${Math.round(avgMinutes / 24)} days`;

  return {
    totalPatients: queue.length,
    emergencyCount,
    urgentCount,
    routineCount,
    avgResponseTime,
  };
}

/**
 * Get next patient to review
 *
 * Returns the highest priority unacknowledged patient.
 *
 * @param queue - Prioritized triage queue
 * @param acknowledgedPatientIds - IDs of patients already reviewed
 * @returns Next patient to review or null
 */
export function getNextPatient(
  queue: TriagePriority[],
  acknowledgedPatientIds: Set<string>
): TriagePriority | null {
  const unacknowledged = queue.filter(
    (item) => !acknowledgedPatientIds.has(item.patient.patientId)
  );

  return unacknowledged.length > 0 ? unacknowledged[0] : null;
}
