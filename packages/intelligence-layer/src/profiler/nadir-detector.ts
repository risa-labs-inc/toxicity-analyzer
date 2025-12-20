import { Regimen } from '@toxicity-analyzer/shared';

export interface NadirAnalysis {
  isInNadirWindow: boolean;
  nadirDay?: number;
  daysIntoNadir?: number;
  daysUntilNadirEnd?: number;
  nadirSeverity: 'none' | 'early' | 'peak' | 'late';
}

/**
 * Detect nadir status and provide detailed analysis
 *
 * The nadir window is the critical period when blood counts reach their lowest
 * point after chemotherapy. This function provides granular analysis of where
 * the patient is within that window.
 *
 * Nadir Phases:
 * - early: First 1-2 days of nadir window (Day 7-8)
 * - peak: Middle of nadir window (Day 9-10)
 * - late: Final days of nadir window (Day 11-12)
 *
 * @param treatmentDay - Current day in treatment cycle
 * @param regimen - Treatment regimen with nadir configuration
 * @returns Detailed nadir analysis
 *
 * @example
 * // Patient on Day 9 of AC-T (nadir days 7-12)
 * const analysis = analyzeNadirStatus(9, acTRegimen);
 * // {
 * //   isInNadirWindow: true,
 * //   nadirDay: 9,
 * //   daysIntoNadir: 2,
 * //   daysUntilNadirEnd: 3,
 * //   nadirSeverity: 'peak'
 * // }
 */
export function analyzeNadirStatus(
  treatmentDay: number,
  regimen: Regimen
): NadirAnalysis {
  // Check if regimen has nadir window configured
  if (!regimen.nadirWindowStart || !regimen.nadirWindowEnd) {
    return {
      isInNadirWindow: false,
      nadirSeverity: 'none',
    };
  }

  const nadirStart = regimen.nadirWindowStart;
  const nadirEnd = regimen.nadirWindowEnd;
  const isInWindow = treatmentDay >= nadirStart && treatmentDay <= nadirEnd;

  // Not in nadir window
  if (!isInWindow) {
    return {
      isInNadirWindow: false,
      nadirSeverity: 'none',
    };
  }

  // Calculate position within nadir window
  const daysIntoNadir = treatmentDay - nadirStart;
  const daysUntilNadirEnd = nadirEnd - treatmentDay;
  const nadirWindowLength = nadirEnd - nadirStart + 1;

  // Determine nadir severity phase
  let nadirSeverity: 'early' | 'peak' | 'late';

  const earlyThreshold = Math.ceil(nadirWindowLength * 0.33);
  const lateThreshold = Math.floor(nadirWindowLength * 0.67);

  if (daysIntoNadir < earlyThreshold) {
    nadirSeverity = 'early';
  } else if (daysIntoNadir >= lateThreshold) {
    nadirSeverity = 'late';
  } else {
    nadirSeverity = 'peak';
  }

  return {
    isInNadirWindow: true,
    nadirDay: treatmentDay,
    daysIntoNadir,
    daysUntilNadirEnd,
    nadirSeverity,
  };
}

/**
 * Get infection risk level based on nadir status
 *
 * During nadir, patients are at elevated risk of infection due to low
 * neutrophil counts. This function maps nadir severity to infection risk.
 *
 * @param nadirAnalysis - Output from analyzeNadirStatus
 * @returns Risk level: 'low', 'moderate', 'high', 'very_high'
 */
export function getInfectionRiskLevel(
  nadirAnalysis: NadirAnalysis
): 'low' | 'moderate' | 'high' | 'very_high' {
  if (!nadirAnalysis.isInNadirWindow) {
    return 'low';
  }

  switch (nadirAnalysis.nadirSeverity) {
    case 'early':
      return 'moderate';
    case 'peak':
      return 'very_high';
    case 'late':
      return 'high';
    default:
      return 'low';
  }
}

/**
 * Get prioritized symptom categories for nadir period
 *
 * Returns symptom categories that should be prioritized during nadir,
 * with different priorities based on nadir phase.
 *
 * @param nadirAnalysis - Output from analyzeNadirStatus
 * @returns Array of prioritized symptom categories
 */
export function getNadirPrioritySymptoms(
  nadirAnalysis: NadirAnalysis
): string[] {
  if (!nadirAnalysis.isInNadirWindow) {
    return [];
  }

  // Core nadir symptoms (always prioritized)
  const coreSymptoms = [
    'infection_signs',
    'fever',
    'bleeding',
    'bruising',
  ];

  // Additional symptoms based on nadir phase
  const phaseSymptoms: Record<string, string[]> = {
    early: ['fatigue', 'weakness'],
    peak: ['shortness_of_breath', 'dizziness', 'chills'],
    late: ['mouth_sores', 'skin_changes'],
  };

  const additionalSymptoms = phaseSymptoms[nadirAnalysis.nadirSeverity] || [];

  return [...coreSymptoms, ...additionalSymptoms];
}

/**
 * Check if patient should receive nadir-specific warnings
 *
 * Determines if patient education and warnings about infection risk
 * should be displayed based on their nadir status.
 *
 * @param nadirAnalysis - Output from analyzeNadirStatus
 * @returns True if nadir warnings should be shown
 */
export function shouldShowNadirWarnings(
  nadirAnalysis: NadirAnalysis
): boolean {
  return (
    nadirAnalysis.isInNadirWindow &&
    (nadirAnalysis.nadirSeverity === 'peak' ||
     nadirAnalysis.nadirSeverity === 'early')
  );
}

/**
 * Generate patient-facing nadir guidance message
 *
 * Creates a contextualized message for patients based on their current
 * nadir status to help them understand their risk level.
 *
 * @param nadirAnalysis - Output from analyzeNadirStatus
 * @returns Patient-facing guidance message
 */
export function generateNadirGuidance(
  nadirAnalysis: NadirAnalysis
): string {
  if (!nadirAnalysis.isInNadirWindow) {
    return '';
  }

  const riskLevel = getInfectionRiskLevel(nadirAnalysis);

  const messages: Record<typeof riskLevel, string> = {
    low: 'Your infection risk is currently low. Continue normal precautions.',
    moderate: 'You are entering the nadir period. Be extra vigilant about infection signs.',
    high: 'Your white blood cell counts are likely low. Avoid crowds and practice good hygiene.',
    very_high: '⚠️ PEAK NADIR PERIOD: Your infection risk is at its highest. Monitor for fever (>100.4°F), chills, or any signs of infection. Contact your care team immediately if symptoms develop.',
  };

  return messages[riskLevel];
}

/**
 * Calculate expected nadir dates for a cycle
 *
 * Given an infusion date, calculate when the nadir window will occur.
 * Useful for patient education and scheduling.
 *
 * @param infusionDate - Date of chemotherapy infusion
 * @param regimen - Treatment regimen
 * @returns Object with nadir start and end dates
 */
export function calculateNadirDates(
  infusionDate: Date,
  regimen: Regimen
): { nadirStart: Date; nadirEnd: Date } | null {
  if (!regimen.nadirWindowStart || !regimen.nadirWindowEnd) {
    return null;
  }

  const msPerDay = 24 * 60 * 60 * 1000;

  const nadirStart = new Date(
    infusionDate.getTime() + (regimen.nadirWindowStart - 1) * msPerDay
  );

  const nadirEnd = new Date(
    infusionDate.getTime() + (regimen.nadirWindowEnd - 1) * msPerDay
  );

  return { nadirStart, nadirEnd };
}
