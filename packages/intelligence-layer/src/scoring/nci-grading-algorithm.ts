import { CompositeGrade } from '@toxicity-analyzer/shared';

export interface SymptomResponses {
  symptomTerm: string; // Specific symptom (e.g., "nausea", not "gastrointestinal")
  frequencyResponse?: number;
  severityResponse?: number;
  interferenceResponse?: number;
}

export interface GradingInput {
  symptomTerm: string; // Specific symptom (e.g., "nausea", not "gastrointestinal")
  frequency?: number;
  severity?: number;
  interference?: number;
}

export interface GradingResult {
  symptomTerm: string; // Specific symptom (e.g., "nausea", not "gastrointestinal")
  compositeGrade: CompositeGrade;
  components: {
    frequency?: number;
    severity?: number;
    interference?: number;
  };
  gradingRationale: string;
}

/**
 * NCI PRO-CTCAE Composite Grading Algorithm
 *
 * The validated algorithm for calculating composite toxicity grades:
 *
 * Step 1: Base Grade = MAX(frequency, severity)
 * Step 2: If both frequency ≥ 3 AND severity ≥ 3, escalate by 1
 * Step 3: If interference ≥ 3, escalate by 1
 * Step 4: Cap at Grade 4 (maximum possible grade)
 *
 * Grade Scale:
 * - Grade 0: No symptoms
 * - Grade 1: Mild symptoms
 * - Grade 2: Moderate symptoms
 * - Grade 3: Severe symptoms
 * - Grade 4: Life-threatening or disabling symptoms
 *
 * @param input - Patient responses (frequency, severity, interference)
 * @returns Composite grade (0-4) with rationale
 *
 * @example
 * // Patient reports frequent (3) and moderate (2) nausea
 * const result = calculateCompositeGrade({
 *   symptomCategory: 'gastrointestinal',
 *   frequency: 3,
 *   severity: 2,
 *   interference: null
 * });
 * // Returns Grade 3 (MAX(3,2) = 3)
 *
 * @example
 * // Patient reports frequent (3) and severe (3) pain with high interference (4)
 * const result = calculateCompositeGrade({
 *   symptomCategory: 'pain',
 *   frequency: 3,
 *   severity: 3,
 *   interference: 4
 * });
 * // Returns Grade 4 (MAX(3,3) = 3, both ≥3 → +1 = 4, interference ≥3 → would be +1 but capped at 4)
 */
export function calculateCompositeGrade(
  input: GradingInput
): GradingResult {
  const { symptomTerm, frequency, severity, interference } = input;

  // If no responses, return Grade 0
  if (
    frequency === undefined &&
    severity === undefined &&
    interference === undefined
  ) {
    return {
      symptomTerm,
      compositeGrade: 0,
      components: {},
      gradingRationale: 'No symptom reported',
    };
  }

  let grade = 0;
  const rationale: string[] = [];

  // Step 1: Base grade = MAX(frequency, severity)
  if (frequency !== undefined && severity !== undefined) {
    grade = Math.max(frequency, severity);
    rationale.push(
      `Base grade: MAX(frequency=${frequency}, severity=${severity}) = ${grade}`
    );
  } else if (frequency !== undefined) {
    grade = frequency;
    rationale.push(`Base grade from frequency: ${grade}`);
  } else if (severity !== undefined) {
    grade = severity;
    rationale.push(`Base grade from severity: ${grade}`);
  }

  // Step 2: Escalate if both frequency ≥ 3 AND severity ≥ 3
  if (
    frequency !== undefined &&
    severity !== undefined &&
    frequency >= 3 &&
    severity >= 3
  ) {
    grade = Math.min(4, grade + 1);
    rationale.push(
      'Escalated +1: Both frequency ≥3 and severity ≥3'
    );
  }

  // Step 3: Escalate if interference ≥ 3
  if (interference !== undefined && interference >= 3) {
    grade = Math.min(4, grade + 1);
    rationale.push(
      `Escalated +1: Interference ≥3 (interference=${interference})`
    );
  }

  // Ensure grade is within valid range [0-4]
  grade = Math.max(0, Math.min(4, grade));

  return {
    symptomTerm,
    compositeGrade: grade as CompositeGrade,
    components: {
      frequency,
      severity,
      interference,
    },
    gradingRationale: rationale.join('; '),
  };
}

/**
 * Calculate grades for multiple symptoms from questionnaire responses
 *
 * Processes a complete questionnaire by grouping responses by symptom
 * category and calculating composite grades for each.
 *
 * @param responses - Array of symptom responses
 * @returns Array of grading results, one per symptom
 *
 * @example
 * const responses = [
 *   { symptomCategory: 'nausea', frequencyResponse: 3, severityResponse: 2 },
 *   { symptomCategory: 'fatigue', frequencyResponse: 2, severityResponse: 3, interferenceResponse: 3 }
 * ];
 *
 * const grades = calculateMultipleGrades(responses);
 * // [
 * //   { symptomCategory: 'nausea', compositeGrade: 3, ... },
 * //   { symptomCategory: 'fatigue', compositeGrade: 4, ... }
 * // ]
 */
export function calculateMultipleGrades(
  responses: SymptomResponses[]
): GradingResult[] {
  return responses.map((response) =>
    calculateCompositeGrade({
      symptomTerm: response.symptomTerm,
      frequency: response.frequencyResponse,
      severity: response.severityResponse,
      interference: response.interferenceResponse,
    })
  );
}

/**
 * Identify highest grade (worst symptom) from grading results
 *
 * Useful for overall patient status assessment and triage prioritization.
 *
 * @param grades - Array of grading results
 * @returns The result with the highest grade, or null if empty
 */
export function getHighestGrade(
  grades: GradingResult[]
): GradingResult | null {
  if (grades.length === 0) {
    return null;
  }

  return grades.reduce((highest, current) =>
    current.compositeGrade > highest.compositeGrade ? current : highest
  );
}

/**
 * Filter grades by minimum severity threshold
 *
 * Returns only symptoms meeting or exceeding a grade threshold.
 * Useful for identifying symptoms requiring clinical attention.
 *
 * @param grades - Array of grading results
 * @param minGrade - Minimum grade threshold (inclusive)
 * @returns Filtered results ≥ minGrade
 *
 * @example
 * // Get all Grade 3+ symptoms for emergency alerts
 * const severeSymptoms = filterByGrade(allGrades, 3);
 */
export function filterByGrade(
  grades: GradingResult[],
  minGrade: CompositeGrade
): GradingResult[] {
  return grades.filter((grade) => grade.compositeGrade >= minGrade);
}

/**
 * Calculate overall patient toxicity burden
 *
 * Provides a summary score of total toxicity burden based on all symptoms.
 * Uses weighted sum to account for multiple moderate symptoms.
 *
 * @param grades - Array of grading results
 * @returns Burden score (0-100)
 *
 * @example
 * const burden = calculateToxicityBurden(allGrades);
 * // High burden (>60): Multiple severe symptoms
 * // Moderate burden (30-60): Several moderate symptoms
 * // Low burden (<30): Mostly mild symptoms
 */
export function calculateToxicityBurden(
  grades: GradingResult[]
): number {
  if (grades.length === 0) {
    return 0;
  }

  // Weighted sum: Grade 4 = 25 points, Grade 3 = 15, Grade 2 = 8, Grade 1 = 3
  const weights = [0, 3, 8, 15, 25];

  const totalPoints = grades.reduce(
    (sum, grade) => sum + weights[grade.compositeGrade],
    0
  );

  // Normalize to 0-100 scale (assuming max 8 symptoms at Grade 4 = 200 points)
  const maxPossiblePoints = 200;
  return Math.min(100, (totalPoints / maxPossiblePoints) * 100);
}

/**
 * Generate patient-facing grade explanation
 *
 * Creates a friendly, understandable explanation of what a grade means.
 *
 * @param grade - Composite grade (0-4)
 * @returns Patient-facing explanation
 */
export function getGradeExplanation(grade: CompositeGrade): string {
  const explanations: Record<CompositeGrade, string> = {
    0: 'No symptoms reported',
    1: 'Mild symptoms - usually manageable with minimal intervention',
    2: 'Moderate symptoms - may require medication or supportive care',
    3: 'Severe symptoms - requires medical attention and intervention',
    4: 'Very severe symptoms - potentially serious, requires immediate attention',
  };

  return explanations[grade];
}

/**
 * Determine if grade requires urgent clinical review
 *
 * Based on clinical guidelines for PRO-CTCAE:
 * - Grade 4: Immediate review (emergency)
 * - Grade 3: Urgent review (within 24 hours)
 * - Grade 1-2: Routine monitoring
 *
 * @param grade - Composite grade
 * @returns True if requires urgent review
 */
export function requiresUrgentReview(grade: CompositeGrade): boolean {
  return grade >= 3;
}

/**
 * Calculate grade trend from historical data
 *
 * Analyzes grade trajectory to identify worsening or improving symptoms.
 * Useful for prioritizing patients with worsening trends even if current
 * grade is moderate.
 *
 * @param currentGrade - Current composite grade
 * @param previousGrade - Previous composite grade
 * @returns Trend direction and magnitude
 */
export function calculateGradeTrend(
  currentGrade: CompositeGrade,
  previousGrade: CompositeGrade
): {
  direction: 'improving' | 'worsening' | 'stable';
  change: number;
} {
  const change = currentGrade - previousGrade;

  let direction: 'improving' | 'worsening' | 'stable';

  if (change > 0) {
    direction = 'worsening';
  } else if (change < 0) {
    direction = 'improving';
  } else {
    direction = 'stable';
  }

  return { direction, change };
}

/**
 * Validate PRO-CTCAE responses before grading
 *
 * Ensures responses are within valid range [0-4] and follow PRO-CTCAE rules.
 *
 * @param input - Grading input to validate
 * @returns Validation result with any errors
 */
export function validateGradingInput(
  input: GradingInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const validateValue = (value: number | undefined, name: string) => {
    if (value !== undefined) {
      if (!Number.isInteger(value)) {
        errors.push(`${name} must be an integer`);
      }
      if (value < 0 || value > 4) {
        errors.push(`${name} must be between 0 and 4 (got ${value})`);
      }
    }
  };

  validateValue(input.frequency, 'Frequency');
  validateValue(input.severity, 'Severity');
  validateValue(input.interference, 'Interference');

  // At least one attribute must be provided
  if (
    input.frequency === undefined &&
    input.severity === undefined &&
    input.interference === undefined
  ) {
    errors.push('At least one attribute (frequency, severity, or interference) must be provided');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
