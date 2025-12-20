import { CompositeGrade } from '@toxicity-analyzer/shared';
import { GradingResult } from '../scoring/nci-grading-algorithm';

export type AlertSeverity = 'red' | 'yellow' | 'green';
export type AlertType = 'emergency' | 'urgent' | 'routine' | 'concerning_trend';

export interface EmergencyAlert {
  alertType: AlertType;
  severity: AlertSeverity;
  symptomTerm: string; // Changed from symptomCategory - specific symptom per CTCAE v5.0
  grade: CompositeGrade;
  alertMessage: string;
  patientInstructions: string;
  clinicianInstructions: string;
  requiresImmediateAction: boolean;
}

export interface AlertDetectionInput {
  grades: GradingResult[];
  patientContext?: {
    inNadirWindow?: boolean;
    currentCycle?: number;
    regimenCode?: string;
  };
  symptomHistory?: Array<{
    symptomTerm: string; // Changed from symptomCategory - specific symptom per CTCAE v5.0
    previousGrade: CompositeGrade;
    trend: 'improving' | 'worsening' | 'stable';
  }>;
}

/**
 * Detect emergency alerts from toxicity grades
 *
 * Emergency criteria (RED alerts):
 * - Any Grade 4 toxicity
 * - Grade 3 fever during nadir (neutropenic fever risk)
 * - Grade 3 bleeding or infection signs
 * - Grade 3 shortness of breath
 *
 * Urgent criteria (YELLOW alerts):
 * - Grade 3 toxicities (non-emergency)
 * - Grade 2 toxicities with worsening trend
 * - Multiple Grade 2 toxicities
 *
 * Routine (GREEN):
 * - Grade 1-2 stable toxicities
 *
 * @param input - Grading results and patient context
 * @returns Array of alerts sorted by severity
 */
export function detectEmergencyAlerts(
  input: AlertDetectionInput
): EmergencyAlert[] {
  const alerts: EmergencyAlert[] = [];
  const { grades, patientContext, symptomHistory } = input;

  // Build history lookup
  const historyMap = new Map(
    symptomHistory?.map((h) => [h.symptomTerm, h]) || []
  );

  grades.forEach((grade) => {
    const history = historyMap.get(grade.symptomTerm);

    // Grade 4: Always emergency
    if (grade.compositeGrade === 4) {
      alerts.push(createGrade4Alert(grade));
      return;
    }

    // Grade 3: Emergency or urgent based on symptom type
    if (grade.compositeGrade === 3) {
      const alert = createGrade3Alert(grade, patientContext);
      alerts.push(alert);
      return;
    }

    // Grade 2: Check for worsening trend or multiple symptoms
    if (grade.compositeGrade === 2) {
      if (history && history.trend === 'worsening') {
        alerts.push(createWorseningTrendAlert(grade, history.previousGrade));
      }
      // Note: Multiple Grade 2 alert handled separately
      return;
    }

    // Grade 1: Routine monitoring (no alert needed)
  });

  // Check for multiple Grade 2 symptoms (concerning pattern)
  const grade2Count = grades.filter((g) => g.compositeGrade === 2).length;
  if (grade2Count >= 3) {
    alerts.push(createMultipleModerateAlert(grade2Count));
  }

  // Sort by severity (red > yellow > green)
  return alerts.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  red: 1,
  yellow: 2,
  green: 3,
};

/**
 * Create Grade 4 emergency alert
 */
function createGrade4Alert(grade: GradingResult): EmergencyAlert {
  const symptomName = formatSymptomName(grade.symptomTerm);

  return {
    alertType: 'emergency',
    severity: 'red',
    symptomTerm: grade.symptomTerm,
    grade: grade.compositeGrade,
    alertMessage: `EMERGENCY: Grade 4 ${symptomName}`,
    patientInstructions:
      '🚨 EMERGENCY: This is a serious symptom that requires immediate medical attention. Please contact your oncology team immediately or go to the emergency room if they are unavailable. Do not wait.',
    clinicianInstructions:
      `Grade 4 ${symptomName} reported. Immediate evaluation required. Consider hospitalization, treatment interruption, and supportive care. Contact patient within 30 minutes.`,
    requiresImmediateAction: true,
  };
}

/**
 * Create Grade 3 alert (emergency or urgent based on symptom)
 */
function createGrade3Alert(
  grade: GradingResult,
  context?: AlertDetectionInput['patientContext']
): EmergencyAlert {
  const symptomName = formatSymptomName(grade.symptomTerm);

  // Emergency symptoms (Grade 3)
  const emergencySymptoms = [
    'fever',
    'infection_signs',
    'bleeding',
    'shortness_of_breath',
    'chest_pain',
    'confusion',
  ];

  // Fever during nadir is always emergency (neutropenic fever)
  if (
    grade.symptomTerm === 'fever' &&
    context?.inNadirWindow
  ) {
    return {
      alertType: 'emergency',
      severity: 'red',
      symptomTerm: grade.symptomTerm,
      grade: grade.compositeGrade,
      alertMessage: `EMERGENCY: Neutropenic Fever Risk - Grade 3 ${symptomName} during nadir`,
      patientInstructions:
        '🚨 EMERGENCY: Fever during chemotherapy can be serious. Please check your temperature. If it is 100.4°F (38°C) or higher, go to the emergency room immediately or call your oncology team. Do not wait.',
      clinicianInstructions:
        `URGENT: Possible neutropenic fever. Patient in nadir window (Day ${context.inNadirWindow}). Immediate evaluation required for fever workup and empiric antibiotics. Contact patient immediately.`,
      requiresImmediateAction: true,
    };
  }

  // Other emergency-level Grade 3 symptoms
  if (emergencySymptoms.includes(grade.symptomTerm)) {
    return {
      alertType: 'emergency',
      severity: 'red',
      symptomTerm: grade.symptomTerm,
      grade: grade.compositeGrade,
      alertMessage: `EMERGENCY: Grade 3 ${symptomName}`,
      patientInstructions:
        `⚠️ URGENT: Your ${symptomName} is severe and requires prompt medical attention. Please contact your oncology team today or go to urgent care if they are unavailable.`,
      clinicianInstructions:
        `Grade 3 ${symptomName} reported. Same-day evaluation recommended. Consider treatment modification, supportive care, or referral for urgent evaluation.`,
      requiresImmediateAction: true,
    };
  }

  // Non-emergency Grade 3 (still urgent)
  return {
    alertType: 'urgent',
    severity: 'yellow',
    symptomTerm: grade.symptomTerm,
    grade: grade.compositeGrade,
    alertMessage: `URGENT: Grade 3 ${symptomName}`,
    patientInstructions:
      `Your ${symptomName} is severe. Please contact your oncology team within 24 hours to discuss management. They may want to see you or adjust your treatment.`,
    clinicianInstructions:
      `Grade 3 ${symptomName} reported. Evaluate within 24-48 hours. Consider dose modification, supportive medications, or treatment delay for next cycle.`,
    requiresImmediateAction: false,
  };
}

/**
 * Create alert for worsening trend
 */
function createWorseningTrendAlert(
  grade: GradingResult,
  previousGrade: CompositeGrade
): EmergencyAlert {
  const symptomName = formatSymptomName(grade.symptomTerm);

  return {
    alertType: 'concerning_trend',
    severity: 'yellow',
    symptomTerm: grade.symptomTerm,
    grade: grade.compositeGrade,
    alertMessage: `CONCERNING TREND: ${symptomName} worsening (Grade ${previousGrade} → ${grade.compositeGrade})`,
    patientInstructions:
      `Your ${symptomName} has gotten worse since last report. Please contact your oncology team if it continues to worsen or becomes difficult to manage.`,
    clinicianInstructions:
      `${symptomName} showing worsening trend (Grade ${previousGrade} → ${grade.compositeGrade}). Monitor closely and consider proactive intervention before it reaches Grade 3.`,
    requiresImmediateAction: false,
  };
}

/**
 * Create alert for multiple moderate symptoms
 */
function createMultipleModerateAlert(count: number): EmergencyAlert {
  return {
    alertType: 'concerning_trend',
    severity: 'yellow',
    symptomTerm: 'multiple_symptoms',
    grade: 2,
    alertMessage: `CONCERNING: ${count} moderate symptoms (Grade 2)`,
    patientInstructions:
      'You are experiencing several moderate symptoms. Your care team will review all of them to help manage your treatment side effects.',
    clinicianInstructions:
      `Patient reporting ${count} Grade 2 symptoms. Consider overall toxicity burden. May indicate need for comprehensive supportive care review or treatment modification.`,
    requiresImmediateAction: false,
  };
}

/**
 * Format symptom term for display
 */
function formatSymptomName(symptomTerm: string): string {
  return symptomTerm
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get highest priority alert from list
 *
 * Returns the most severe alert that requires immediate attention.
 *
 * @param alerts - Array of alerts
 * @returns Highest priority alert or null
 */
export function getHighestPriorityAlert(
  alerts: EmergencyAlert[]
): EmergencyAlert | null {
  if (alerts.length === 0) {
    return null;
  }

  // Find first red alert
  const redAlert = alerts.find((a) => a.severity === 'red');
  if (redAlert) {
    return redAlert;
  }

  // Otherwise return first yellow alert
  const yellowAlert = alerts.find((a) => a.severity === 'yellow');
  return yellowAlert || alerts[0];
}

/**
 * Check if any alerts require immediate action
 *
 * @param alerts - Array of alerts
 * @returns True if immediate action needed
 */
export function requiresImmediateAction(alerts: EmergencyAlert[]): boolean {
  return alerts.some((a) => a.requiresImmediateAction);
}

/**
 * Group alerts by severity for dashboard display
 *
 * @param alerts - Array of alerts
 * @returns Alerts grouped by severity level
 */
export function groupAlertsBySeverity(alerts: EmergencyAlert[]): {
  red: EmergencyAlert[];
  yellow: EmergencyAlert[];
  green: EmergencyAlert[];
} {
  return {
    red: alerts.filter((a) => a.severity === 'red'),
    yellow: alerts.filter((a) => a.severity === 'yellow'),
    green: alerts.filter((a) => a.severity === 'green'),
  };
}

/**
 * Generate patient summary message
 *
 * Creates a summary of all alerts for patient dashboard display.
 *
 * @param alerts - Array of alerts
 * @returns Patient-facing summary message
 */
export function generatePatientSummary(alerts: EmergencyAlert[]): string {
  if (alerts.length === 0) {
    return 'No concerning symptoms reported. Continue routine monitoring.';
  }

  const redCount = alerts.filter((a) => a.severity === 'red').length;
  const yellowCount = alerts.filter((a) => a.severity === 'yellow').length;

  if (redCount > 0) {
    return `⚠️ URGENT: You have ${redCount} symptom${redCount > 1 ? 's' : ''} that require immediate medical attention. Please review the alert${redCount > 1 ? 's' : ''} below and contact your care team right away.`;
  }

  if (yellowCount > 0) {
    return `You have ${yellowCount} symptom${yellowCount > 1 ? 's' : ''} that need attention. Please contact your care team within 24-48 hours to discuss management.`;
  }

  return 'Your symptoms are being monitored. Your care team will review your responses.';
}
