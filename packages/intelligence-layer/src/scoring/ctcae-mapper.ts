import { CompositeGrade } from '@toxicity-analyzer/shared';

export interface CTCAEMapping {
  symptomCategory: string;
  proctcaeGrade: CompositeGrade;
  ctcaeTermDraft: string;
  ctcaeGrade: number;
  clinicalDescription: string;
}

/**
 * Map PRO-CTCAE composite grade to CTCAE v5.0 equivalent
 *
 * CTCAE (Common Terminology Criteria for Adverse Events) is the standard
 * clinician-assessed grading system. This mapping helps clinicians interpret
 * patient-reported PRO-CTCAE grades in familiar CTCAE terms.
 *
 * General mapping principles:
 * - PRO-CTCAE Grade 0 → CTCAE Grade 0 (None)
 * - PRO-CTCAE Grade 1 → CTCAE Grade 1 (Mild)
 * - PRO-CTCAE Grade 2 → CTCAE Grade 2 (Moderate)
 * - PRO-CTCAE Grade 3 → CTCAE Grade 3 (Severe)
 * - PRO-CTCAE Grade 4 → CTCAE Grade 3-4 (Severe to Life-threatening)
 *
 * Note: Some symptoms have symptom-specific mappings that may differ.
 *
 * @param symptomCategory - The symptom being mapped
 * @param proctcaeGrade - PRO-CTCAE composite grade (0-4)
 * @returns CTCAE mapping with equivalent grade and description
 */
export function mapToCTCAE(
  symptomCategory: string,
  proctcaeGrade: CompositeGrade
): CTCAEMapping {
  // Get symptom-specific mapping if available
  const specificMapping = SYMPTOM_SPECIFIC_MAPPINGS[symptomCategory];

  if (specificMapping && specificMapping[proctcaeGrade]) {
    return {
      symptomCategory,
      proctcaeGrade,
      ...specificMapping[proctcaeGrade],
    };
  }

  // Fall back to general mapping
  return {
    symptomCategory,
    proctcaeGrade,
    ...GENERAL_CTCAE_MAPPING[proctcaeGrade],
  };
}

/**
 * General CTCAE mapping (used when symptom-specific mapping not available)
 */
const GENERAL_CTCAE_MAPPING: Record<
  CompositeGrade,
  Omit<CTCAEMapping, 'symptomCategory' | 'proctcaeGrade'>
> = {
  0: {
    ctcaeTermDraft: 'Absent',
    ctcaeGrade: 0,
    clinicalDescription: 'No adverse event present',
  },
  1: {
    ctcaeTermDraft: 'Mild',
    ctcaeGrade: 1,
    clinicalDescription:
      'Mild adverse event; asymptomatic or mild symptoms; clinical or diagnostic observations only; intervention not indicated',
  },
  2: {
    ctcaeTermDraft: 'Moderate',
    ctcaeGrade: 2,
    clinicalDescription:
      'Moderate adverse event; minimal, local or noninvasive intervention indicated; limiting age-appropriate instrumental ADL',
  },
  3: {
    ctcaeTermDraft: 'Severe',
    ctcaeGrade: 3,
    clinicalDescription:
      'Severe adverse event; medically significant but not immediately life-threatening; hospitalization or prolongation of hospitalization indicated; disabling; limiting self-care ADL',
  },
  4: {
    ctcaeTermDraft: 'Life-threatening',
    ctcaeGrade: 4,
    clinicalDescription:
      'Life-threatening consequences or urgent intervention indicated',
  },
};

/**
 * Symptom-specific CTCAE mappings
 *
 * Some symptoms have nuanced mappings based on clinical practice guidelines.
 */
const SYMPTOM_SPECIFIC_MAPPINGS: Record<
  string,
  Partial<
    Record<CompositeGrade, Omit<CTCAEMapping, 'symptomCategory' | 'proctcaeGrade'>>
  >
> = {
  nausea: {
    0: {
      ctcaeTermDraft: 'Nausea - None',
      ctcaeGrade: 0,
      clinicalDescription: 'No nausea',
    },
    1: {
      ctcaeTermDraft: 'Nausea - Grade 1',
      ctcaeGrade: 1,
      clinicalDescription:
        'Loss of appetite without alteration in eating habits',
    },
    2: {
      ctcaeTermDraft: 'Nausea - Grade 2',
      ctcaeGrade: 2,
      clinicalDescription:
        'Oral intake decreased without significant weight loss, dehydration or malnutrition',
    },
    3: {
      ctcaeTermDraft: 'Nausea - Grade 3',
      ctcaeGrade: 3,
      clinicalDescription:
        'Inadequate oral caloric or fluid intake; tube feeding, TPN, or hospitalization indicated',
    },
    4: {
      ctcaeTermDraft: 'Nausea - Grade 3',
      ctcaeGrade: 3,
      clinicalDescription:
        'Severe nausea requiring hospitalization (PRO-CTCAE Grade 4 typically maps to CTCAE Grade 3 for nausea)',
    },
  },

  vomiting: {
    1: {
      ctcaeTermDraft: 'Vomiting - Grade 1',
      ctcaeGrade: 1,
      clinicalDescription: '1-2 episodes in 24 hours',
    },
    2: {
      ctcaeTermDraft: 'Vomiting - Grade 2',
      ctcaeGrade: 2,
      clinicalDescription:
        '3-5 episodes in 24 hours; medical intervention indicated',
    },
    3: {
      ctcaeTermDraft: 'Vomiting - Grade 3',
      ctcaeGrade: 3,
      clinicalDescription:
        '≥6 episodes in 24 hours; tube feeding, TPN or hospitalization indicated',
    },
    4: {
      ctcaeTermDraft: 'Vomiting - Grade 4',
      ctcaeGrade: 4,
      clinicalDescription: 'Life-threatening consequences; urgent intervention indicated',
    },
  },

  diarrhea: {
    1: {
      ctcaeTermDraft: 'Diarrhea - Grade 1',
      ctcaeGrade: 1,
      clinicalDescription:
        'Increase of <4 stools per day over baseline; mild increase in ostomy output',
    },
    2: {
      ctcaeTermDraft: 'Diarrhea - Grade 2',
      ctcaeGrade: 2,
      clinicalDescription:
        'Increase of 4-6 stools per day over baseline; moderate increase in ostomy output',
    },
    3: {
      ctcaeTermDraft: 'Diarrhea - Grade 3',
      ctcaeGrade: 3,
      clinicalDescription:
        'Increase of ≥7 stools per day over baseline; hospitalization indicated; severe increase in ostomy output; limiting self-care ADL',
    },
    4: {
      ctcaeTermDraft: 'Diarrhea - Grade 4',
      ctcaeGrade: 4,
      clinicalDescription:
        'Life-threatening consequences; urgent intervention indicated',
    },
  },

  fatigue: {
    1: {
      ctcaeTermDraft: 'Fatigue - Grade 1',
      ctcaeGrade: 1,
      clinicalDescription: 'Fatigue relieved by rest',
    },
    2: {
      ctcaeTermDraft: 'Fatigue - Grade 2',
      ctcaeGrade: 2,
      clinicalDescription:
        'Fatigue not relieved by rest; limiting instrumental ADL',
    },
    3: {
      ctcaeTermDraft: 'Fatigue - Grade 3',
      ctcaeGrade: 3,
      clinicalDescription: 'Fatigue not relieved by rest; limiting self-care ADL',
    },
    4: {
      ctcaeTermDraft: 'Fatigue - Grade 3',
      ctcaeGrade: 3,
      clinicalDescription:
        'Severe fatigue (PRO-CTCAE Grade 4 typically maps to CTCAE Grade 3 for fatigue)',
    },
  },

  neuropathy: {
    1: {
      ctcaeTermDraft: 'Peripheral sensory neuropathy - Grade 1',
      ctcaeGrade: 1,
      clinicalDescription: 'Asymptomatic; loss of deep tendon reflexes or paresthesia',
    },
    2: {
      ctcaeTermDraft: 'Peripheral sensory neuropathy - Grade 2',
      ctcaeGrade: 2,
      clinicalDescription:
        'Moderate symptoms; limiting instrumental ADL',
    },
    3: {
      ctcaeTermDraft: 'Peripheral sensory neuropathy - Grade 3',
      ctcaeGrade: 3,
      clinicalDescription:
        'Severe symptoms; limiting self-care ADL',
    },
    4: {
      ctcaeTermDraft: 'Peripheral sensory neuropathy - Grade 4',
      ctcaeGrade: 4,
      clinicalDescription: 'Life-threatening consequences; urgent intervention indicated',
    },
  },

  'hand-foot_syndrome': {
    1: {
      ctcaeTermDraft: 'Palmar-plantar erythrodysesthesia - Grade 1',
      ctcaeGrade: 1,
      clinicalDescription:
        'Minimal skin changes or dermatitis without pain',
    },
    2: {
      ctcaeTermDraft: 'Palmar-plantar erythrodysesthesia - Grade 2',
      ctcaeGrade: 2,
      clinicalDescription:
        'Skin changes with pain; limiting instrumental ADL',
    },
    3: {
      ctcaeTermDraft: 'Palmar-plantar erythrodysesthesia - Grade 3',
      ctcaeGrade: 3,
      clinicalDescription:
        'Severe skin changes with pain; limiting self-care ADL',
    },
    4: {
      ctcaeTermDraft: 'Palmar-plantar erythrodysesthesia - Grade 3',
      ctcaeGrade: 3,
      clinicalDescription:
        'Very severe symptoms (PRO-CTCAE Grade 4 typically maps to CTCAE Grade 3 for HFS)',
    },
  },
};

/**
 * Get all symptoms that have specific CTCAE mappings
 *
 * @returns Array of symptom categories with custom mappings
 */
export function getSymptomsWithSpecificMappings(): string[] {
  return Object.keys(SYMPTOM_SPECIFIC_MAPPINGS);
}

/**
 * Check if a symptom has symptom-specific CTCAE mapping
 *
 * @param symptomCategory - Symptom to check
 * @returns True if specific mapping exists
 */
export function hasSpecificMapping(symptomCategory: string): boolean {
  return symptomCategory in SYMPTOM_SPECIFIC_MAPPINGS;
}

/**
 * Get clinical action recommendation based on CTCAE grade
 *
 * Provides guidance on appropriate clinical response to a toxicity grade.
 *
 * @param ctcaeGrade - CTCAE equivalent grade
 * @returns Recommended clinical action
 */
export function getClinicalAction(ctcaeGrade: number): string {
  const actions: Record<number, string> = {
    0: 'No action required. Continue routine monitoring.',
    1: 'Routine monitoring. Consider supportive care if symptoms progress.',
    2: 'Monitor closely. Consider prophylactic management or dose modification if persistent.',
    3: 'Urgent intervention required. Consider treatment delay, dose reduction, or hospitalization.',
    4: 'Emergency intervention required. Discontinue treatment and provide immediate medical care.',
  };

  return actions[ctcaeGrade] || 'Consult clinical guidelines for appropriate action.';
}

/**
 * Map multiple PRO-CTCAE grades to CTCAE equivalents
 *
 * Batch processing for complete questionnaire results.
 *
 * @param symptoms - Array of {symptomCategory, proctcaeGrade} pairs
 * @returns Array of CTCAE mappings
 */
export function mapMultipleToCTCAE(
  symptoms: Array<{ symptomCategory: string; proctcaeGrade: CompositeGrade }>
): CTCAEMapping[] {
  return symptoms.map(({ symptomCategory, proctcaeGrade }) =>
    mapToCTCAE(symptomCategory, proctcaeGrade)
  );
}
