import {
  TreatmentContext,
  CyclePhase,
  ProCTCAEItem,
  DrugModule,
  ActiveDrugsResult,
  SymptomSource,
} from '@toxicity-analyzer/shared';
import { applyHistoricalEscalation, ensureAttributeCompleteness, SymptomHistory } from './question-selector';

export interface DrugModuleQuestionSelectionInput {
  context: TreatmentContext;
  drugModules: DrugModule[];
  availableItems: ProCTCAEItem[];
  patientHistory?: SymptomHistory[];
  targetItemCount?: number;
}

export interface DrugModuleQuestionSelectionResult {
  selectedQuestions: ProCTCAEItem[];
  metadata: {
    activeDrugs: string[];
    regimenStep: string | null;
    symptomSources: SymptomSource[];
    totalSymptomsBeforeDedup: number;
    totalSymptomsAfterDedup: number;
    phaseFilteringApplied: boolean;
    cyclePhase: CyclePhase;
    treatmentDay: number;
    inNadirWindow: boolean;
    regimenCode: string;
  };
}

/**
 * Get active drugs for the current cycle
 *
 * Determines which drugs are active based on the regimen's drug module composition
 * and the current cycle number. Supports sequential regimens (e.g., AC-T).
 *
 * @param context - Treatment context with regimen and cycle information
 * @returns Active drugs, regimen step, and cycle number
 */
export function getActiveDrugs(context: TreatmentContext): ActiveDrugsResult {
  const composition = context.regimen.drugModuleComposition;

  if (!composition || !composition.steps) {
    // Fallback: extract drug names from drug_components if available
    const drugComponents = context.regimen.drugComponents || [];
    const drugs = drugComponents.map((comp: any) => comp.name);
    return {
      drugs,
      regimenStep: null,
      cycleNumber: context.currentCycle,
    };
  }

  const currentCycleNumber = context.currentCycle;

  // Find which step applies to the current cycle
  for (const step of composition.steps) {
    const appliesTo =
      step.cycles === 'all' ||
      (Array.isArray(step.cycles) && step.cycles.includes(currentCycleNumber));

    if (appliesTo) {
      return {
        drugs: step.drugModules,
        regimenStep: step.stepName,
        cycleNumber: currentCycleNumber,
      };
    }
  }

  // No matching step found
  return {
    drugs: [],
    regimenStep: null,
    cycleNumber: currentCycleNumber,
  };
}

/**
 * Union symptoms from multiple drug modules
 *
 * Takes the UNION of symptom terms and safety proxy items from all active drugs,
 * deduplicates, and tracks which drug(s) contributed each symptom.
 *
 * @param drugModules - Active drug modules for the current cycle
 * @returns Deduplicated symptom terms with source tracking
 */
export function unionSymptoms(drugModules: DrugModule[]): SymptomSource[] {
  const symptomSourceMap = new Map<string, SymptomSource>();

  for (const module of drugModules) {
    // Process direct symptom terms
    for (const symptomTerm of module.symptomTerms) {
      if (!symptomSourceMap.has(symptomTerm)) {
        symptomSourceMap.set(symptomTerm, {
          symptomTerm,
          sources: [],
          isSafetyProxy: false,
          phaseFilteringApplies: module.phaseFilteringRules?.[symptomTerm] || null,
        });
      }

      const existing = symptomSourceMap.get(symptomTerm)!;
      existing.sources.push(module.drugName);

      // If multiple drugs have different phase filtering rules, take the union
      if (module.phaseFilteringRules?.[symptomTerm]) {
        if (existing.phaseFilteringApplies) {
          const existingPhases = new Set(existing.phaseFilteringApplies);
          const newPhases = module.phaseFilteringRules[symptomTerm];
          for (const phase of newPhases) {
            existingPhases.add(phase);
          }
          existing.phaseFilteringApplies = Array.from(existingPhases);
        } else {
          existing.phaseFilteringApplies = module.phaseFilteringRules[symptomTerm];
        }
      }
    }

    // Process safety proxy items
    for (const proxyItem of module.safetyProxyItems) {
      for (const symptom of proxyItem.symptoms) {
        if (!symptomSourceMap.has(symptom)) {
          symptomSourceMap.set(symptom, {
            symptomTerm: symptom,
            sources: [],
            isSafetyProxy: true,
            phaseFilteringApplies: null, // Safety proxies are always included
          });
        }

        const existing = symptomSourceMap.get(symptom)!;
        if (!existing.sources.includes(module.drugName)) {
          existing.sources.push(module.drugName);
        }
        // Mark as safety proxy if any drug contributed it as a safety proxy
        existing.isSafetyProxy = existing.isSafetyProxy || true;
      }
    }
  }

  return Array.from(symptomSourceMap.values());
}

/**
 * Apply optional phase filtering
 *
 * Filters symptoms based on phase filtering rules where they exist.
 * Symptoms without phase filtering rules are always included.
 * Safety proxy symptoms are always included regardless of phase.
 *
 * @param symptomSources - Symptom sources with phase filtering rules
 * @param currentPhase - Current cycle phase
 * @returns Filtered symptom sources
 */
export function applyOptionalPhaseFiltering(
  symptomSources: SymptomSource[],
  currentPhase: CyclePhase
): SymptomSource[] {
  return symptomSources.filter((source) => {
    // Safety proxies are always included
    if (source.isSafetyProxy) {
      return true;
    }

    // No phase filtering rules = always include
    if (!source.phaseFilteringApplies || source.phaseFilteringApplies.length === 0) {
      return true;
    }

    // Has phase filtering rules = check if current phase is in the list
    return source.phaseFilteringApplies.includes(currentPhase);
  });
}

/**
 * Select questions via drug modules
 *
 * Main function for drug-module based questionnaire generation.
 * Implements the algorithm: Drug → Symptoms → Union → Phase Filter → History → Questions
 *
 * @param input - Drug module selection input
 * @returns Selected questions with metadata
 */
export function selectQuestionsViaDrugModules(
  input: DrugModuleQuestionSelectionInput
): DrugModuleQuestionSelectionResult {
  const { context, drugModules, availableItems, patientHistory, targetItemCount = 50 } = input;

  // Step 1: Get active drugs for current cycle
  const activeDrugsResult = getActiveDrugs(context);

  // Step 2: Filter drug modules to only active ones
  const activeDrugModules = drugModules.filter((module) =>
    activeDrugsResult.drugs.includes(module.drugName)
  );

  // Step 3: Union symptoms from active drug modules
  const allSymptomSources = unionSymptoms(activeDrugModules);
  const totalSymptomsBeforeDedup = activeDrugModules.reduce(
    (sum, module) => sum + module.symptomTerms.length + module.safetyProxyItems.reduce((s: number, p: any) => s + p.symptoms.length, 0),
    0
  );

  // Step 4: Apply optional phase filtering
  const filteredSymptomSources = applyOptionalPhaseFiltering(allSymptomSources, context.phase);
  const phaseFilteringApplied = filteredSymptomSources.length < allSymptomSources.length;

  // Step 5: Get PRO-CTCAE items for filtered symptoms
  const symptomTerms = filteredSymptomSources.map((s) => s.symptomTerm);
  const relevantItems = availableItems.filter((item) =>
    symptomTerms.includes(item.symptomCategory)
  );

  // Step 6: Apply historical escalation (reuse existing logic)
  const priorityScores = applyHistoricalEscalation(relevantItems, patientHistory);

  // Step 7: Sort by priority score
  const sortedItems = relevantItems.sort((a, b) => {
    const scoreA = priorityScores.get(a.itemId) || 1;
    const scoreB = priorityScores.get(b.itemId) || 1;
    return scoreB - scoreA;
  });

  // Step 8: Ensure attribute completeness (reuse existing logic)
  const completeItems = ensureAttributeCompleteness(sortedItems, availableItems);

  // Step 9: Limit to target count
  const limitedItems = completeItems.slice(0, targetItemCount);

  return {
    selectedQuestions: limitedItems,
    metadata: {
      activeDrugs: activeDrugsResult.drugs,
      regimenStep: activeDrugsResult.regimenStep,
      symptomSources: filteredSymptomSources,
      totalSymptomsBeforeDedup,
      totalSymptomsAfterDedup: allSymptomSources.length,
      phaseFilteringApplied,
      cyclePhase: context.phase,
      treatmentDay: context.treatmentDay,
      inNadirWindow: context.inNadirWindow,
      regimenCode: context.regimen.regimenCode,
    },
  };
}
