import {
  TreatmentContext,
  CyclePhase,
  ProCTCAEItem,
} from '@toxicity-analyzer/shared';
import { PHASE_SYMPTOM_PRIORITIES } from '@toxicity-analyzer/shared';

export interface QuestionSelectionInput {
  context: TreatmentContext;
  availableItems: ProCTCAEItem[];
  patientHistory?: SymptomHistory[];
  targetItemCount?: number;
}

export interface SymptomHistory {
  symptomCategory: string;
  lastGrade: number;
  trend: 'improving' | 'worsening' | 'stable';
  lastReportedDate: Date;
}

export interface SelectedQuestion {
  item: ProCTCAEItem;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  requiresConditionalBranching: boolean;
}

export interface QuestionSelectionResult {
  selectedQuestions: SelectedQuestion[];
  totalCount: number;
  selectionMetadata: {
    cyclePhase: CyclePhase;
    treatmentDay: number;
    inNadirWindow: boolean;
    regimenCode: string;
  };
}

/**
 * Filter PRO-CTCAE items by regimen toxicity profile
 *
 * Selects items that match high-risk symptom categories for the patient's
 * current regimen. This ensures we ask about symptoms most likely to occur.
 *
 * @param items - All available PRO-CTCAE items
 * @param context - Treatment context with regimen information
 * @returns Filtered items matching regimen toxicity profile
 */
export function filterByRegimenToxicity(
  items: ProCTCAEItem[],
  context: TreatmentContext
): ProCTCAEItem[] {
  const toxicityProfile = context.regimen.toxicityProfile;

  if (!toxicityProfile || !toxicityProfile.highRisk) {
    return items;
  }

  const highRiskCategories = new Set(toxicityProfile.highRisk);

  return items.filter((item) =>
    highRiskCategories.has(item.symptomCategory)
  );
}

/**
 * Filter PRO-CTCAE items by cycle phase
 *
 * Selects items appropriate for the current cycle phase based on when
 * symptoms typically manifest. Prioritizes regimen-specific phase priorities
 * if available, otherwise falls back to universal phase priorities.
 *
 * @param items - Regimen-filtered PRO-CTCAE items
 * @param context - Treatment context with phase information
 * @returns Items appropriate for current cycle phase
 */
export function filterByCyclePhase(
  items: ProCTCAEItem[],
  context: TreatmentContext
): ProCTCAEItem[] {
  // Try regimen-specific phase priorities first
  const regimenPhasePriorities = context.regimen.toxicityProfile.phasePriorities;

  if (regimenPhasePriorities && regimenPhasePriorities[context.phase]) {
    // Use regimen-specific phase priorities
    const phaseCategories = regimenPhasePriorities[context.phase];
    const phaseCategoriesSet = new Set(phaseCategories);
    return items.filter((item) =>
      phaseCategoriesSet.has(item.symptomCategory)
    );
  }

  // Fallback to universal phase priorities (for backwards compatibility)
  const phaseCategories = PHASE_SYMPTOM_PRIORITIES[context.phase] || [];

  if (phaseCategories.length === 0) {
    return items;
  }

  const phaseCategoriesSet = new Set(phaseCategories);

  return items.filter((item) =>
    phaseCategoriesSet.has(item.symptomCategory)
  );
}

/**
 * Apply historical escalation based on patient's symptom history
 *
 * Prioritizes symptoms that were previously Grade ≥ 2, as these are more
 * likely to recur and require close monitoring.
 *
 * @param items - Phase-filtered PRO-CTCAE items
 * @param history - Patient's symptom history
 * @returns Items with priority scores based on history
 */
export function applyHistoricalEscalation(
  items: ProCTCAEItem[],
  history?: SymptomHistory[]
): Map<string, number> {
  const priorityScores = new Map<string, number>();

  if (!history || history.length === 0) {
    // No history - all items get base priority
    items.forEach((item) => {
      priorityScores.set(item.itemId, 1);
    });
    return priorityScores;
  }

  // Build symptom history lookup
  const historyMap = new Map(
    history.map((h) => [h.symptomCategory, h])
  );

  items.forEach((item) => {
    const symptomHistory = historyMap.get(item.symptomCategory);

    if (!symptomHistory) {
      // No history for this symptom
      priorityScores.set(item.itemId, 1);
      return;
    }

    // Calculate priority score based on history
    let score = 1;

    // Escalate for Grade ≥ 2
    if (symptomHistory.lastGrade >= 2) {
      score += 2;
    }

    // Further escalate for Grade ≥ 3
    if (symptomHistory.lastGrade >= 3) {
      score += 2;
    }

    // Escalate for worsening trend
    if (symptomHistory.trend === 'worsening') {
      score += 1;
    }

    // Slight de-prioritize improving symptoms
    if (symptomHistory.trend === 'improving' && symptomHistory.lastGrade < 2) {
      score -= 0.5;
    }

    priorityScores.set(item.itemId, score);
  });

  return priorityScores;
}

/**
 * Ensure attribute completeness for selected symptoms
 *
 * For each symptom category selected, ensure we have both frequency and
 * severity questions (minimum required for NCI grading). Add interference
 * questions for symptoms likely to impact daily life.
 *
 * CRITICAL: Maintains correct question order (frequency → severity → interference)
 * for each symptom category.
 *
 * @param items - Items to check for completeness
 * @param allItems - Full item library for adding missing attributes
 * @returns Complete set of items with all required attributes in correct order
 */
export function ensureAttributeCompleteness(
  items: ProCTCAEItem[],
  allItems: ProCTCAEItem[]
): ProCTCAEItem[] {
  // Group selected items by symptom category
  const categoryMap = new Map<string, {
    frequency?: ProCTCAEItem;
    severity?: ProCTCAEItem;
    interference?: ProCTCAEItem;
    present_absent?: ProCTCAEItem;
    amount?: ProCTCAEItem;
  }>();

  items.forEach((item) => {
    if (!categoryMap.has(item.symptomCategory)) {
      categoryMap.set(item.symptomCategory, {});
    }
    const categoryItems = categoryMap.get(item.symptomCategory)!;
    categoryItems[item.attribute as keyof typeof categoryItems] = item;
  });

  const completeItems: ProCTCAEItem[] = [];

  // For each selected symptom category, ensure frequency and severity exist
  // and order them correctly
  categoryMap.forEach((attributes, category) => {
    const needsFrequency = !attributes.frequency && !attributes.present_absent && !attributes.amount;
    const needsSeverity = !attributes.severity;

    // Add missing frequency if needed (only for symptoms that use frequency)
    if (needsFrequency) {
      const freqItem = allItems.find(
        (item) =>
          item.symptomCategory === category && item.attribute === 'frequency'
      );
      if (freqItem) {
        attributes.frequency = freqItem;
      }
    }

    // Add missing severity if needed
    if (needsSeverity) {
      const sevItem = allItems.find(
        (item) =>
          item.symptomCategory === category && item.attribute === 'severity'
      );
      if (sevItem) {
        attributes.severity = sevItem;
      }
    }

    // Add items in the correct order: frequency/present_absent/amount → severity → interference
    if (attributes.present_absent) {
      completeItems.push(attributes.present_absent);
    } else if (attributes.amount) {
      completeItems.push(attributes.amount);
    } else if (attributes.frequency) {
      completeItems.push(attributes.frequency);
    }

    if (attributes.severity) {
      completeItems.push(attributes.severity);
    }

    if (attributes.interference) {
      completeItems.push(attributes.interference);
    }
  });

  return completeItems;
}

/**
 * Prioritize items without limiting count
 *
 * Sorts items by priority score based on regimen profile, cycle phase, and history.
 * Note: Does NOT limit the number of items - all regimen-specific symptoms are included
 * to ensure comprehensive symptom screening. The adaptive questionnaire logic (skipping
 * and branching) will handle keeping completion time reasonable.
 *
 * @param items - Complete set of candidate items
 * @param priorityScores - Priority scores from historical escalation
 * @param targetCount - Deprecated parameter (kept for backwards compatibility)
 * @returns Prioritized item list (all items included)
 */
export function prioritizeAndLimit(
  items: ProCTCAEItem[],
  priorityScores: Map<string, number>,
  _targetCount: number = 12
): ProCTCAEItem[] {
  // Sort items by priority score (descending) - high priority symptoms first
  const sortedItems = items.sort((a, b) => {
    const scoreA = priorityScores.get(a.itemId) || 1;
    const scoreB = priorityScores.get(b.itemId) || 1;
    return scoreB - scoreA;
  });

  // Return ALL items (no artificial limiting)
  // The adaptive questionnaire will naturally keep completion time reasonable:
  // - Skip severity if frequency = 0
  // - Skip interference if frequency < 2 AND severity < 2
  return sortedItems;
}

/**
 * Determine which questions require conditional branching
 *
 * Identifies questions that should trigger follow-up "interference" questions
 * based on NCI guidelines: if frequency ≥ 2 OR severity ≥ 2, ask interference.
 *
 * @param items - Selected PRO-CTCAE items
 * @returns Map of item IDs to boolean (requires branching)
 */
export function determineConditionalBranching(
  items: ProCTCAEItem[]
): Map<string, boolean> {
  const branchingMap = new Map<string, boolean>();

  items.forEach((item) => {
    // Frequency and severity questions can trigger interference questions
    const requiresBranching =
      item.attribute === 'frequency' || item.attribute === 'severity';

    branchingMap.set(item.itemId, requiresBranching);
  });

  return branchingMap;
}

/**
 * Main function: Select questions for personalized questionnaire
 *
 * This is the primary entry point for The Orchestrator. Implements the
 * intelligent question selection algorithm:
 *
 * 1. Filter by regimen toxicity profile
 * 2. Filter by cycle phase
 * 3. Apply historical escalation
 * 4. Ensure attribute completeness
 * 5. Prioritize and limit to target count
 * 6. Determine conditional branching needs
 *
 * @param input - Selection parameters (context, items, history, target count)
 * @returns Complete question selection result with metadata
 *
 * @example
 * const result = selectQuestions({
 *   context: treatmentContext,  // From The Profiler
 *   availableItems: proctcaeLibrary,
 *   patientHistory: symptomHistory,
 *   targetItemCount: 12
 * });
 *
 * result.selectedQuestions.forEach(q => {
 *   console.log(q.item.questionText, q.priority, q.reason);
 * });
 */
export function selectQuestions(
  input: QuestionSelectionInput
): QuestionSelectionResult {
  const {
    context,
    availableItems,
    patientHistory,
    targetItemCount = 12,
  } = input;

  // Step 1: Filter by regimen toxicity profile
  let filteredItems = filterByRegimenToxicity(availableItems, context);

  // Step 2: Filter by cycle phase
  filteredItems = filterByCyclePhase(filteredItems, context);

  // Step 3: Apply historical escalation
  const priorityScores = applyHistoricalEscalation(
    filteredItems,
    patientHistory
  );

  // Step 4: Ensure attribute completeness
  const completeItems = ensureAttributeCompleteness(
    filteredItems,
    availableItems
  );

  // Step 5: Prioritize and limit to target count
  const finalItems = prioritizeAndLimit(
    completeItems,
    priorityScores,
    targetItemCount
  );

  // Step 6: Determine conditional branching
  const branchingMap = determineConditionalBranching(finalItems);

  // Build selected questions with metadata
  const selectedQuestions: SelectedQuestion[] = finalItems.map((item) => {
    const priorityScore = priorityScores.get(item.itemId) || 1;
    let priority: 'high' | 'medium' | 'low';
    let reason: string;

    if (priorityScore >= 4) {
      priority = 'high';
      reason = 'High-grade symptom history (Grade ≥ 3)';
    } else if (priorityScore >= 2) {
      priority = 'medium';
      reason = 'Previous symptom reported (Grade ≥ 2)';
    } else {
      priority = 'low';
      reason = 'Regimen-specific or phase-appropriate';
    }

    return {
      item,
      priority,
      reason,
      requiresConditionalBranching: branchingMap.get(item.itemId) || false,
    };
  });

  return {
    selectedQuestions,
    totalCount: selectedQuestions.length,
    selectionMetadata: {
      cyclePhase: context.phase,
      treatmentDay: context.treatmentDay,
      inNadirWindow: context.inNadirWindow,
      regimenCode: context.regimen.regimenCode,
    },
  };
}
