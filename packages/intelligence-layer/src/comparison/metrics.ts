/**
 * Comparison Metrics
 *
 * Calculates metrics to compare regimen-phase-history vs drug-module approaches
 */

import { ProCTCAEItem } from '@toxicity-analyzer/shared';

export interface ComparisonMetrics {
  symptomCoverage: SymptomCoverageMetrics;
  personalization: PersonalizationMetrics;
  clinicalValue: ClinicalValueMetrics;
  questionCount: QuestionCountMetrics;
  granularity: GranularityMetrics;
}

export interface SymptomCoverageMetrics {
  jaccardSimilarity: number; // |A ∩ B| / |A ∪ B|
  regimenApproachSymptoms: string[];
  drugModuleApproachSymptoms: string[];
  sharedSymptoms: string[];
  uniqueToRegimen: string[];
  uniqueToDrugModule: string[];
  totalUnion: number;
  totalIntersection: number;
}

export interface PersonalizationMetrics {
  regimenApproachHistoricalCoverage: number; // % of Grade 2+ symptoms covered
  drugModuleApproachHistoricalCoverage: number;
  regimenApproachGrade3Coverage: number; // % of Grade 3+ symptoms covered
  drugModuleApproachGrade3Coverage: number;
}

export interface ClinicalValueMetrics {
  regimenApproachSafetyProxyCoverage: number; // % of safety proxies covered
  drugModuleApproachSafetyProxyCoverage: number;
  regimenApproachSafetyProxyCount: number;
  drugModuleApproachSafetyProxyCount: number;
  criticalSafetySymptoms: string[]; // Expected safety symptoms
}

export interface QuestionCountMetrics {
  regimenApproachTotal: number;
  drugModuleApproachTotal: number;
  difference: number;
  percentDifference: number;
}

export interface GranularityMetrics {
  drugModuleApproachHasStepTracking: boolean;
  drugModuleApproachActiveDrugs: string[];
  drugModuleApproachRegimenStep: string | null;
  drugModuleApproachSymptomSources: Array<{
    symptom: string;
    sources: string[];
  }>;
}

/**
 * Extract symptom terms from PRO-CTCAE items
 */
export function extractSymptomTerms(items: ProCTCAEItem[]): string[] {
  const symptoms = new Set<string>();

  items.forEach(item => {
    const parts = item.itemCode.split('_');
    const lastPart = parts[parts.length - 1];
    const symptomTerm = ['FREQ', 'SEV', 'INTERF', 'PRESENT', 'AMOUNT'].includes(lastPart)
      ? parts.slice(0, -1).join('_').toLowerCase()
      : item.itemCode.toLowerCase();
    symptoms.add(symptomTerm);
  });

  return Array.from(symptoms).sort();
}

/**
 * Calculate Jaccard similarity
 */
export function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Calculate symptom coverage metrics
 */
export function calculateSymptomCoverage(
  regimenItems: ProCTCAEItem[],
  drugModuleItems: ProCTCAEItem[]
): SymptomCoverageMetrics {
  const regimenSymptoms = extractSymptomTerms(regimenItems);
  const drugModuleSymptoms = extractSymptomTerms(drugModuleItems);

  const regimenSet = new Set(regimenSymptoms);
  const drugModuleSet = new Set(drugModuleSymptoms);

  const sharedSymptoms = regimenSymptoms.filter(s => drugModuleSet.has(s));
  const uniqueToRegimen = regimenSymptoms.filter(s => !drugModuleSet.has(s));
  const uniqueToDrugModule = drugModuleSymptoms.filter(s => !regimenSet.has(s));

  const jaccardSimilarity = calculateJaccardSimilarity(regimenSet, drugModuleSet);

  return {
    jaccardSimilarity,
    regimenApproachSymptoms: regimenSymptoms,
    drugModuleApproachSymptoms: drugModuleSymptoms,
    sharedSymptoms,
    uniqueToRegimen,
    uniqueToDrugModule,
    totalUnion: new Set([...regimenSymptoms, ...drugModuleSymptoms]).size,
    totalIntersection: sharedSymptoms.length,
  };
}

/**
 * Calculate personalization effectiveness
 */
export function calculatePersonalizationEffectiveness(
  regimenItems: ProCTCAEItem[],
  drugModuleItems: ProCTCAEItem[],
  patientHistory?: Array<{ symptomTerm: string; lastGrade: number }>
): PersonalizationMetrics {
  if (!patientHistory || patientHistory.length === 0) {
    return {
      regimenApproachHistoricalCoverage: 0,
      drugModuleApproachHistoricalCoverage: 0,
      regimenApproachGrade3Coverage: 0,
      drugModuleApproachGrade3Coverage: 0,
    };
  }

  const regimenSymptoms = new Set(extractSymptomTerms(regimenItems));
  const drugModuleSymptoms = new Set(extractSymptomTerms(drugModuleItems));

  const grade2PlusSymptoms = patientHistory.filter(h => h.lastGrade >= 2);
  const grade3PlusSymptoms = patientHistory.filter(h => h.lastGrade >= 3);

  const regimenGrade2Coverage = grade2PlusSymptoms.filter(h =>
    regimenSymptoms.has(h.symptomTerm)
  ).length;

  const drugModuleGrade2Coverage = grade2PlusSymptoms.filter(h =>
    drugModuleSymptoms.has(h.symptomTerm)
  ).length;

  const regimenGrade3Coverage = grade3PlusSymptoms.filter(h =>
    regimenSymptoms.has(h.symptomTerm)
  ).length;

  const drugModuleGrade3Coverage = grade3PlusSymptoms.filter(h =>
    drugModuleSymptoms.has(h.symptomTerm)
  ).length;

  return {
    regimenApproachHistoricalCoverage:
      grade2PlusSymptoms.length > 0 ? regimenGrade2Coverage / grade2PlusSymptoms.length : 0,
    drugModuleApproachHistoricalCoverage:
      grade2PlusSymptoms.length > 0 ? drugModuleGrade2Coverage / grade2PlusSymptoms.length : 0,
    regimenApproachGrade3Coverage:
      grade3PlusSymptoms.length > 0 ? regimenGrade3Coverage / grade3PlusSymptoms.length : 0,
    drugModuleApproachGrade3Coverage:
      grade3PlusSymptoms.length > 0 ? drugModuleGrade3Coverage / grade3PlusSymptoms.length : 0,
  };
}

/**
 * Calculate clinical value (safety signal coverage)
 */
export function calculateClinicalValue(
  regimenItems: ProCTCAEItem[],
  drugModuleItems: ProCTCAEItem[],
  _drugModuleMetadata?: {
    symptomSources?: Array<{
      symptomTerm: string;
      sources: string[];
      isSafetyProxy: boolean;
    }>;
  }
): ClinicalValueMetrics {
  // Define critical safety symptoms based on common chemotherapy monitoring needs
  const criticalSafetySymptoms = [
    'fever',
    'chills',
    'sore_throat',
    'shortness_of_breath',
    'chest_pain',
    'bleeding',
    'bruising',
    'rash',
  ];

  const regimenSymptoms = new Set(extractSymptomTerms(regimenItems));
  const drugModuleSymptoms = new Set(extractSymptomTerms(drugModuleItems));

  const regimenSafetyProxyCount = criticalSafetySymptoms.filter(s =>
    regimenSymptoms.has(s)
  ).length;

  const drugModuleSafetyProxyCount = criticalSafetySymptoms.filter(s =>
    drugModuleSymptoms.has(s)
  ).length;

  return {
    regimenApproachSafetyProxyCoverage:
      regimenSafetyProxyCount / criticalSafetySymptoms.length,
    drugModuleApproachSafetyProxyCoverage:
      drugModuleSafetyProxyCount / criticalSafetySymptoms.length,
    regimenApproachSafetyProxyCount: regimenSafetyProxyCount,
    drugModuleApproachSafetyProxyCount: drugModuleSafetyProxyCount,
    criticalSafetySymptoms,
  };
}

/**
 * Calculate question count metrics
 */
export function calculateQuestionCount(
  regimenItems: ProCTCAEItem[],
  drugModuleItems: ProCTCAEItem[]
): QuestionCountMetrics {
  const regimenTotal = regimenItems.length;
  const drugModuleTotal = drugModuleItems.length;
  const difference = drugModuleTotal - regimenTotal;
  const percentDifference = regimenTotal > 0 ? (difference / regimenTotal) * 100 : 0;

  return {
    regimenApproachTotal: regimenTotal,
    drugModuleApproachTotal: drugModuleTotal,
    difference,
    percentDifference,
  };
}

/**
 * Calculate granularity metrics
 */
export function calculateGranularity(
  drugModuleMetadata?: {
    activeDrugs?: string[];
    regimenStep?: string | null;
    symptomSources?: Array<{
      symptomTerm: string;
      sources: string[];
      isSafetyProxy: boolean;
    }>;
  }
): GranularityMetrics {
  return {
    drugModuleApproachHasStepTracking: !!drugModuleMetadata?.regimenStep,
    drugModuleApproachActiveDrugs: drugModuleMetadata?.activeDrugs || [],
    drugModuleApproachRegimenStep: drugModuleMetadata?.regimenStep || null,
    drugModuleApproachSymptomSources:
      drugModuleMetadata?.symptomSources?.map(s => ({
        symptom: s.symptomTerm,
        sources: s.sources,
      })) || [],
  };
}

/**
 * Calculate all comparison metrics
 */
export function calculateComparisonMetrics(
  regimenApproachItems: ProCTCAEItem[],
  drugModuleApproachItems: ProCTCAEItem[],
  drugModuleMetadata?: {
    activeDrugs?: string[];
    regimenStep?: string | null;
    symptomSources?: Array<{
      symptomTerm: string;
      sources: string[];
      isSafetyProxy: boolean;
    }>;
  },
  patientHistory?: Array<{ symptomTerm: string; lastGrade: number }>
): ComparisonMetrics {
  return {
    symptomCoverage: calculateSymptomCoverage(regimenApproachItems, drugModuleApproachItems),
    personalization: calculatePersonalizationEffectiveness(
      regimenApproachItems,
      drugModuleApproachItems,
      patientHistory
    ),
    clinicalValue: calculateClinicalValue(
      regimenApproachItems,
      drugModuleApproachItems,
      drugModuleMetadata
    ),
    questionCount: calculateQuestionCount(regimenApproachItems, drugModuleApproachItems),
    granularity: calculateGranularity(drugModuleMetadata),
  };
}
