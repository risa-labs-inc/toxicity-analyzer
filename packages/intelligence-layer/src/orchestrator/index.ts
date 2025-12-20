/**
 * The Orchestrator
 *
 * Intelligent PRO-CTCAE question selection and conditional branching logic.
 *
 * Responsibilities:
 * - Filter questions by regimen toxicity profile
 * - Select phase-appropriate symptoms
 * - Apply historical escalation for recurring symptoms
 * - Ensure attribute completeness (frequency + severity minimum)
 * - Prioritize and limit to target count (8-12 items)
 * - Handle conditional branching (trigger interference questions)
 *
 * Target: 2-minute questionnaire completion time
 */

// Question Selection exports
export {
  selectQuestions,
  filterByRegimenToxicity,
  filterByCyclePhase,
  applyHistoricalEscalation,
  ensureAttributeCompleteness,
  prioritizeAndLimit,
  determineConditionalBranching,
  type QuestionSelectionInput,
  type QuestionSelectionResult,
  type SelectedQuestion,
  type SymptomHistory,
} from './question-selector';

// Conditional Branching exports
export {
  evaluateBranchingTrigger,
  findBranchingTarget,
  evaluateBranching,
  collectBranchingQuestions,
  isQuestionAlreadyAsked,
  deduplicateAndOrderFollowUps,
  getBranchingExplanation,
  estimateBranchingTime,
  NCI_BRANCHING_RULES,
  type BranchingRule,
  type BranchingEvaluation,
} from './conditional-branching';

// Drug Module Question Selection exports
export {
  selectQuestionsViaDrugModules,
  getActiveDrugs,
  unionSymptoms,
  applyOptionalPhaseFiltering,
  type DrugModuleQuestionSelectionInput,
  type DrugModuleQuestionSelectionResult,
} from './drug-module-selector';
