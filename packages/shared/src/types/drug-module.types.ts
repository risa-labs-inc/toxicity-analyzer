/**
 * Drug Module Types
 *
 * Defines the structure for drug-based symptom modules.
 * Each drug is a "module" with its own symptom list that can be
 * composed into regimens.
 */

import { CyclePhase } from './treatment.types';

/**
 * Safety proxy item
 *
 * Represents symptoms that serve as proxies for monitoring
 * specific drug-related safety concerns (e.g., fever for neutropenia)
 */
export interface SafetyProxyItem {
  type: string;  // e.g., 'myelosuppression', 'cardiotoxicity', 'thrombocytopenia'
  symptoms: string[];  // e.g., ['fever', 'chills', 'sore_throat']
  rationale: string;  // Clinical reason for monitoring
}

/**
 * Drug Module
 *
 * Represents a single drug with its associated symptoms and monitoring requirements
 */
export interface DrugModule {
  drugModuleId: string;
  drugName: string;  // e.g., 'Doxorubicin', 'Cyclophosphamide'
  drugClass: string;  // e.g., 'Anthracycline', 'Alkylating agent', 'Taxane'
  symptomTerms: string[];  // Direct drug effects, e.g., ['nausea', 'vomiting', 'alopecia']
  safetyProxyItems: SafetyProxyItem[];  // Safety monitoring symptoms
  phaseFilteringRules: Record<string, CyclePhase[]>;  // Optional: which symptoms filter by phase
  isMyelosuppressive: boolean;
  clinicalNotes?: string;
  createdAt: Date;
}

/**
 * Drug module composition for regimens
 *
 * Defines which drugs are active in which steps of a regimen
 */
export interface DrugModuleCompositionStep {
  stepName: string | null;  // 'AC', 'T', or null for single-phase regimens
  cycles: number[] | 'all';  // Which cycle numbers this step applies to
  drugModules: string[];  // Drug names active in this step
}

export interface DrugModuleComposition {
  steps: DrugModuleCompositionStep[];
  safetyProfile?: {
    myelosuppressive?: boolean;
    cardiotoxic?: boolean;
    hepatotoxic?: boolean;
    nephrotoxic?: boolean;
  };
}

/**
 * Active drugs result
 *
 * Information about which drugs are currently active for a patient
 */
export interface ActiveDrugsResult {
  drugs: string[];  // Drug names currently active
  regimenStep: string | null;  // Current step (e.g., 'AC', 'T')
  cycleNumber: number;
}

/**
 * Symptom source metadata
 *
 * Tracks which drug(s) contributed each symptom
 */
export interface SymptomSource {
  symptomTerm: string;  // e.g., 'nausea'
  sources: string[];  // e.g., ['Doxorubicin', 'Cyclophosphamide']
  isSafetyProxy: boolean;  // Is this from a safety proxy item?
  phaseFilteringApplies: CyclePhase[] | null;  // Phase filtering rules, if any
}

/**
 * Questionnaire generation metadata
 *
 * Metadata about how a questionnaire was generated
 */
export interface QuestionnaireGenerationMetadata {
  metadataId: string;
  questionnaireId: string;
  generationApproach: 'regimen-phase-history' | 'drug-module';
  activeDrugs?: string[];
  symptomSources?: SymptomSource[];
  totalSymptomsBeforeDedup?: number;
  totalSymptomsAfterDedup?: number;
  phaseFilteringApplied?: boolean;
  generatedAt: Date;
}
