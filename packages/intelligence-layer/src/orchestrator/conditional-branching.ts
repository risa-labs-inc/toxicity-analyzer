import {
  ProCTCAEItem,
  AttributeType,
} from '@toxicity-analyzer/shared';

export interface BranchingRule {
  triggerAttribute: AttributeType;
  triggerThreshold: number;
  targetAttribute: AttributeType;
  reason: string;
}

export interface BranchingEvaluation {
  shouldBranch: boolean;
  triggeredBy: string;
  targetQuestion: ProCTCAEItem | null;
  branchingReason: string;
}

/**
 * Standard NCI branching rules for PRO-CTCAE
 *
 * According to NCI guidelines:
 * - If frequency >= 2 (Occasionally) OR severity >= 2 (Moderate), ask interference
 * - Interference questions assess impact on daily activities
 */
export const NCI_BRANCHING_RULES: BranchingRule[] = [
  {
    triggerAttribute: 'frequency',
    triggerThreshold: 2, // "Occasionally" or higher
    targetAttribute: 'interference',
    reason: 'Symptom occurs frequently enough to potentially impact daily life',
  },
  {
    triggerAttribute: 'severity',
    triggerThreshold: 2, // "Moderate" or higher
    targetAttribute: 'interference',
    reason: 'Symptom severity sufficient to potentially impact daily life',
  },
];

/**
 * Evaluate if a response triggers conditional branching
 *
 * Checks if a patient's response to a frequency or severity question
 * reaches the threshold that requires asking a follow-up interference question.
 *
 * @param item - The PRO-CTCAE item that was answered
 * @param responseValue - Patient's numeric response (0-4 scale)
 * @param rules - Branching rules to evaluate (defaults to NCI standard)
 * @returns True if branching should occur
 *
 * @example
 * // Patient reports "Frequently" (3) for nausea frequency
 * const shouldBranch = evaluateBranchingTrigger(nauseaFreqItem, 3);
 * // Returns true - should ask nausea interference question
 */
export function evaluateBranchingTrigger(
  item: ProCTCAEItem,
  responseValue: number,
  rules: BranchingRule[] = NCI_BRANCHING_RULES
): boolean {
  const applicableRule = rules.find(
    (rule) => rule.triggerAttribute === item.attribute
  );

  if (!applicableRule) {
    return false;
  }

  return responseValue >= applicableRule.triggerThreshold;
}

/**
 * Find the target follow-up question after branching trigger
 *
 * When a branching trigger occurs, this function finds the appropriate
 * follow-up question (typically an interference question) from the
 * PRO-CTCAE item library.
 *
 * @param triggerItem - The item that triggered branching
 * @param allItems - Complete PRO-CTCAE item library
 * @param rules - Branching rules (defaults to NCI standard)
 * @returns The follow-up question to ask, or null if not found
 */
export function findBranchingTarget(
  triggerItem: ProCTCAEItem,
  allItems: ProCTCAEItem[],
  rules: BranchingRule[] = NCI_BRANCHING_RULES
): ProCTCAEItem | null {
  const applicableRule = rules.find(
    (rule) => rule.triggerAttribute === triggerItem.attribute
  );

  if (!applicableRule) {
    return null;
  }

  // Find interference question for the same symptom category
  const targetItem = allItems.find(
    (item) =>
      item.symptomCategory === triggerItem.symptomCategory &&
      item.attribute === applicableRule.targetAttribute
  );

  return targetItem || null;
}

/**
 * Evaluate branching decision with full context
 *
 * Comprehensive evaluation that determines if branching should occur,
 * identifies the trigger, finds the target question, and provides reasoning.
 *
 * @param item - The PRO-CTCAE item that was answered
 * @param responseValue - Patient's numeric response
 * @param allItems - Complete PRO-CTCAE item library
 * @param rules - Branching rules (defaults to NCI standard)
 * @returns Complete branching evaluation
 *
 * @example
 * const evaluation = evaluateBranching(
 *   nauseaFreqItem,
 *   3,
 *   proctcaeLibrary
 * );
 *
 * if (evaluation.shouldBranch) {
 *   console.log(evaluation.branchingReason);
 *   askQuestion(evaluation.targetQuestion);
 * }
 */
export function evaluateBranching(
  item: ProCTCAEItem,
  responseValue: number,
  allItems: ProCTCAEItem[],
  rules: BranchingRule[] = NCI_BRANCHING_RULES
): BranchingEvaluation {
  const shouldBranch = evaluateBranchingTrigger(item, responseValue, rules);

  if (!shouldBranch) {
    return {
      shouldBranch: false,
      triggeredBy: '',
      targetQuestion: null,
      branchingReason: 'Response below branching threshold',
    };
  }

  const targetQuestion = findBranchingTarget(item, allItems, rules);
  const applicableRule = rules.find(
    (rule) => rule.triggerAttribute === item.attribute
  );

  return {
    shouldBranch: true,
    triggeredBy: `${item.symptomCategory}_${item.attribute}`,
    targetQuestion,
    branchingReason: applicableRule?.reason || 'Branching threshold met',
  };
}

/**
 * Process responses and collect all branching questions
 *
 * Evaluates a batch of patient responses and collects all follow-up
 * questions that should be asked due to branching triggers.
 *
 * @param responses - Array of {item, responseValue} pairs
 * @param allItems - Complete PRO-CTCAE item library
 * @returns Array of follow-up questions to ask
 *
 * @example
 * const responses = [
 *   { item: nauseaFreqItem, responseValue: 3 },
 *   { item: nauseaSevItem, responseValue: 2 },
 *   { item: fatigueFreqItem, responseValue: 1 }
 * ];
 *
 * const followUps = collectBranchingQuestions(responses, proctcaeLibrary);
 * // Returns [nauseaInterferenceItem] - only nausea triggered branching
 */
export function collectBranchingQuestions(
  responses: Array<{ item: ProCTCAEItem; responseValue: number }>,
  allItems: ProCTCAEItem[]
): ProCTCAEItem[] {
  const branchingQuestions = new Map<string, ProCTCAEItem>();

  responses.forEach(({ item, responseValue }) => {
    const evaluation = evaluateBranching(item, responseValue, allItems);

    if (evaluation.shouldBranch && evaluation.targetQuestion) {
      // Use symptom category as key to avoid duplicates
      // (both frequency and severity can trigger same interference question)
      branchingQuestions.set(
        evaluation.targetQuestion.symptomCategory,
        evaluation.targetQuestion
      );
    }
  });

  return Array.from(branchingQuestions.values());
}

/**
 * Check if interference question already exists in questionnaire
 *
 * Before adding a branching follow-up, check if the interference question
 * was already included in the initial questionnaire selection.
 *
 * @param targetQuestion - The potential follow-up question
 * @param existingQuestions - Questions already in the questionnaire
 * @returns True if question already exists
 */
export function isQuestionAlreadyAsked(
  targetQuestion: ProCTCAEItem,
  existingQuestions: ProCTCAEItem[]
): boolean {
  return existingQuestions.some(
    (q) => q.itemId === targetQuestion.itemId
  );
}

/**
 * Deduplicate and order follow-up questions
 *
 * Removes duplicate questions and orders them logically (by symptom category)
 * for a coherent patient experience.
 *
 * @param branchingQuestions - Follow-up questions from branching
 * @param existingQuestions - Questions already asked
 * @returns Ordered, deduplicated list of follow-ups to add
 */
export function deduplicateAndOrderFollowUps(
  branchingQuestions: ProCTCAEItem[],
  existingQuestions: ProCTCAEItem[]
): ProCTCAEItem[] {
  // Filter out questions already asked
  const uniqueFollowUps = branchingQuestions.filter(
    (q) => !isQuestionAlreadyAsked(q, existingQuestions)
  );

  // Sort by symptom category for coherent flow
  return uniqueFollowUps.sort((a, b) =>
    a.symptomCategory.localeCompare(b.symptomCategory)
  );
}

/**
 * Get patient-facing branching explanation
 *
 * Generate a friendly explanation for why we're asking follow-up questions.
 * Helps patients understand the adaptive nature of the questionnaire.
 *
 * @param symptomCategory - The symptom that triggered branching
 * @returns Patient-facing explanation text
 */
export function getBranchingExplanation(symptomCategory: string): string {
  const categoryName = symptomCategory
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return `You reported ${categoryName.toLowerCase()}. We'd like to understand how this affects your daily activities.`;
}

/**
 * Estimate additional questionnaire time for branching
 *
 * Calculate expected additional completion time based on number of
 * follow-up questions triggered.
 *
 * @param branchingQuestionCount - Number of follow-up questions
 * @returns Estimated additional seconds
 */
export function estimateBranchingTime(
  branchingQuestionCount: number
): number {
  const SECONDS_PER_QUESTION = 10; // Average time to answer one question
  return branchingQuestionCount * SECONDS_PER_QUESTION;
}
