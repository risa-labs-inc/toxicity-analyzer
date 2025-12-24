import { Knex } from 'knex';
import {
  buildTreatmentContext,
  selectQuestions,
  calculateMultipleGrades,
  detectEmergencyAlerts,
  evaluateBranching,
  collectBranchingQuestions,
} from '@toxicity-analyzer/intelligence-layer';
import { ProCTCAEItem } from '@toxicity-analyzer/shared';
import { Questionnaire } from '@toxicity-analyzer/shared';
import { PatientRepository } from '../repositories/patient.repository';
import { TreatmentRepository } from '../repositories/treatment.repository';
import { ProCTCAERepository } from '../repositories/proctcae.repository';
import { QuestionnaireRepository } from '../repositories/questionnaire.repository';
import { ResponseRepository } from '../repositories/response.repository';
import { NotFoundError } from '../middleware/error.middleware';

/**
 * Extract specific symptom term from PRO-CTCAE item code
 *
 * Converts item codes like "NAUSEA_FREQ" → "nausea"
 * This supports CTCAE v5.0 symptom-specific scoring where each individual symptom
 * (nausea, vomiting, diarrhea) is scored separately, not aggregated by category.
 *
 * @param itemCode - PRO-CTCAE item code (e.g., "NAUSEA_FREQ", "HAND_FOOT_SYNDROME_SEV")
 * @returns Lowercase symptom term (e.g., "nausea", "hand_foot_syndrome")
 */
function extractSymptomTerm(itemCode: string): string {
  const parts = itemCode.split('_');
  const lastPart = parts[parts.length - 1];

  // Remove attribute suffix (FREQ, SEV, INTERF)
  if (['FREQ', 'SEV', 'INTERF'].includes(lastPart)) {
    return parts.slice(0, -1).join('_').toLowerCase();
  }

  // Fallback: return full code lowercased
  return itemCode.toLowerCase();
}

export class QuestionnaireService {
  private patientRepo: PatientRepository;
  private treatmentRepo: TreatmentRepository;
  private proctcaeRepo: ProCTCAERepository;
  private questionnaireRepo: QuestionnaireRepository;
  private responseRepo: ResponseRepository;

  constructor(private db: Knex) {
    this.patientRepo = new PatientRepository(db);
    this.treatmentRepo = new TreatmentRepository(db);
    this.proctcaeRepo = new ProCTCAERepository(db);
    this.questionnaireRepo = new QuestionnaireRepository(db);
    this.responseRepo = new ResponseRepository(db);
  }

  /**
   * Generate personalized questionnaire for patient
   *
   * Uses The Profiler to calculate treatment context, then The Orchestrator
   * to select appropriate PRO-CTCAE items.
   */
  async generateQuestionnaire(patientId: string): Promise<{
    questionnaire: Questionnaire;
    items: ProCTCAEItem[];
  }> {
    // Get treatment context
    const treatmentContext = await this.treatmentRepo.getTreatmentContext(patientId);
    if (!treatmentContext) {
      throw new NotFoundError('Active treatment');
    }

    const { treatment, regimen, currentCycle } = treatmentContext;

    // Build treatment context using The Profiler
    const context = buildTreatmentContext({
      treatment,
      regimen,
      currentCycle,
      currentDate: new Date(),
    });

    // Get patient symptom history
    const symptomHistory = await this.responseRepo.getSymptomHistory(patientId);

    // Get all available PRO-CTCAE items
    const allItems = await this.proctcaeRepo.findAll();

    // Use The Orchestrator to select questions
    // Note: All regimen-specific symptoms are included (no artificial limiting)
    // The adaptive questionnaire logic (skipping + branching) keeps it manageable
    const selectionResult = selectQuestions({
      context,
      availableItems: allItems,
      patientHistory: symptomHistory,
    });

    const selectedItems = selectionResult.selectedQuestions.map((q) => q.item);

    // Map CyclePhase to QuestionnaireType
    const questionnaireType =
      context.phase === 'nadir' ? 'guardian' :
      context.phase === 'inter_cycle' ? 'on_demand' :
      context.phase; // pre_session, post_session, recovery are valid in both

    // Create questionnaire record
    const questionnaire = await this.questionnaireRepo.create({
      patientId,
      treatmentId: treatment.treatmentId,
      cycleId: currentCycle.cycleId,
      questionnaireType,
      scheduledDate: new Date(),
      treatmentDay: context.treatmentDay,
      dueDate: new Date(),
      status: 'pending',
      selectedItems: selectedItems.map((item) => item.itemId),
    });

    return {
      questionnaire,
      items: selectedItems,
    };
  }

  /**
   * Start questionnaire session
   */
  async startQuestionnaire(questionnaireId: string): Promise<void> {
    await this.questionnaireRepo.updateStatus(
      questionnaireId,
      'in_progress'
    );
  }

  /**
   * Submit response to questionnaire
   */
  async submitResponse(
    questionnaireId: string,
    itemId: string,
    responseValue: number,
    responseLabel: string
  ): Promise<{
    response: any;
    branchingQuestions: ProCTCAEItem[];
    skipItemIds: string[];
    invalidatedItemIds: string[];
  }> {
    // Get questionnaire and item
    const questionnaire = await this.questionnaireRepo.findById(questionnaireId);
    if (!questionnaire) {
      throw new NotFoundError('Questionnaire');
    }

    const item = await this.proctcaeRepo.findById(itemId);
    if (!item) {
      throw new NotFoundError('PRO-CTCAE item');
    }

    // OPTIMIZED: Extract symptom term and fetch only related items (2-3 items instead of 200)
    const currentSymptomTerm = extractSymptomTerm(item.itemCode);
    const symptomPrefix = currentSymptomTerm.toUpperCase();
    const relatedItems = await this.proctcaeRepo.findByItemCodePattern(symptomPrefix);

    // Check if branching triggered (using only related items for this symptom)
    const branchingEval = evaluateBranching(item, responseValue, relatedItems);

    // Determine items to skip based on response
    const skipItemIds: string[] = [];

    // If frequency is 0 (Never), skip severity and interference for same symptom
    if (item.attribute === 'frequency' && responseValue === 0) {
      const itemsToSkip = relatedItems.filter((i) =>
        i.attribute === 'severity' || i.attribute === 'interference'
      );
      skipItemIds.push(...itemsToSkip.map((i) => i.itemId));
    }

    // If severity is 0 (None), skip interference for same symptom
    if (item.attribute === 'severity' && responseValue === 0) {
      const itemsToSkip = relatedItems.filter((i) => i.attribute === 'interference');
      skipItemIds.push(...itemsToSkip.map((i) => i.itemId));
    }

    // If present_absent is 0 (No), skip severity and interference for same symptom
    if (item.attribute === 'present_absent' && responseValue === 0) {
      const itemsToSkip = relatedItems.filter((i) =>
        i.attribute === 'severity' || i.attribute === 'interference'
      );
      skipItemIds.push(...itemsToSkip.map((i) => i.itemId));
    }

    // Get existing responses to check for updates/deletions
    const existingResponses = await this.responseRepo.findByQuestionnaireId(questionnaireId);
    const answeredItemIds = new Set(existingResponses.map(r => r.itemId));

    // Check if this is an update (response already exists for this itemId)
    const isUpdate = answeredItemIds.has(itemId);

    // Upsert response (update if exists, insert if not)
    const response = await this.responseRepo.upsertResponse({
      questionnaireId,
      itemId,
      responseValue,
      responseLabel,
      conditionalTriggered: branchingEval.shouldBranch,
    });

    // Identify responses that need to be deleted due to branching logic changes
    // These are items that:
    // 1. Should now be skipped based on the new response value
    // 2. AND have existing responses that need to be invalidated
    const invalidatedItemIds = skipItemIds.filter(skipId => answeredItemIds.has(skipId));

    // Delete obsolete responses
    if (invalidatedItemIds.length > 0) {
      await this.responseRepo.deleteResponses(questionnaireId, invalidatedItemIds);
    }

    // Filter out branching questions that are already in the questionnaire
    // or have already been answered (excluding the ones we just invalidated)
    const selectedItemIds = new Set(questionnaire.selectedItems || []);
    const currentAnsweredItemIds = new Set(
      existingResponses
        .map(r => r.itemId)
        .filter(id => !invalidatedItemIds.includes(id))
    );

    const branchingQuestions = branchingEval.targetQuestion &&
      !selectedItemIds.has(branchingEval.targetQuestion.itemId) &&
      !currentAnsweredItemIds.has(branchingEval.targetQuestion.itemId)
      ? [branchingEval.targetQuestion]
      : [];

    return {
      response,
      branchingQuestions,
      skipItemIds,
      invalidatedItemIds,
    };
  }

  /**
   * Complete questionnaire and calculate scores
   *
   * Uses NCI Scoring Algorithm to calculate composite grades,
   * then Alert Engine to detect emergencies.
   */
  async completeQuestionnaire(
    questionnaireId: string,
    completionTimeSeconds: number
  ): Promise<{
    scores: any[];
    alerts: any[];
  }> {
    const questionnaire = await this.questionnaireRepo.findById(questionnaireId);
    if (!questionnaire) {
      throw new NotFoundError('Questionnaire');
    }

    // Get all responses
    const responses = await this.responseRepo.findByQuestionnaireId(questionnaireId);

    // Get items to resolve symptom categories
    const itemIds = responses.map((r) => r.itemId);
    const items = await this.proctcaeRepo.findByIds(itemIds);
    const itemMap = new Map(items.map((item) => [item.itemId, item]));

    // Group responses by specific symptom term (CTCAE v5.0 symptom-specific scoring)
    // Extract symptom from item_code: "NAUSEA_FREQ" → "nausea", "VOMITING_FREQ" → "vomiting"
    const symptomResponses = new Map<string, {
      symptomTerm: string;
      frequencyResponse?: number;
      severityResponse?: number;
      interferenceResponse?: number;
    }>();

    responses.forEach((response) => {
      const item = itemMap.get(response.itemId);
      if (!item) {
        console.warn(`Item not found for response itemId: ${response.itemId}`);
        return;
      }

      // Extract specific symptom term from item code
      const symptomTerm = extractSymptomTerm(item.itemCode);

      if (!symptomTerm || symptomTerm.trim() === '') {
        console.error(`ERROR: Empty symptom term from itemCode: ${item.itemCode}`);
        throw new Error(`Failed to extract symptom term from item code: ${item.itemCode}`);
      }

      if (!symptomResponses.has(symptomTerm)) {
        symptomResponses.set(symptomTerm, {
          symptomTerm,
        });
      }

      const symptomData = symptomResponses.get(symptomTerm)!;

      if (item.attribute === 'frequency') {
        symptomData.frequencyResponse = response.responseValue;
      } else if (item.attribute === 'severity') {
        symptomData.severityResponse = response.responseValue;
      } else if (item.attribute === 'interference') {
        symptomData.interferenceResponse = response.responseValue;
      }
    });

    // Calculate grades using NCI Scoring Algorithm
    const gradingResults = calculateMultipleGrades(
      Array.from(symptomResponses.values())
    );

    // Save scores to database
    const scores = await Promise.all(
      gradingResults.map((result) => {
        // Validate symptomTerm is not empty
        if (!result.symptomTerm) {
          console.error('ERROR: symptomTerm is null/undefined in grading result:', result);
          throw new Error(`Invalid grading result: symptomTerm is required but got: ${result.symptomTerm}`);
        }

        return this.responseRepo.createScore({
          questionnaireId,
          patientId: questionnaire.patientId,
          symptomTerm: result.symptomTerm, // Changed from symptomCategory - now symptom-specific per CTCAE v5.0
          compositeGrade: result.compositeGrade,
          frequencyScore: result.components.frequency,
          severityScore: result.components.severity,
          interferenceScore: result.components.interference,
          ctcaeEquivalentGrade: result.compositeGrade,
          scoringAlgorithmVersion: 'NCI_v1.0',
        });
      })
    );

    // Detect alerts using Alert Engine
    const treatmentContext = await this.treatmentRepo.getTreatmentContext(
      questionnaire.patientId
    );

    const alerts = detectEmergencyAlerts({
      grades: gradingResults,
      patientContext: treatmentContext
        ? {
            inNadirWindow: buildTreatmentContext({
              treatment: treatmentContext.treatment,
              regimen: treatmentContext.regimen,
              currentCycle: treatmentContext.currentCycle,
              currentDate: new Date(),
            }).inNadirWindow,
          }
        : undefined,
    });

    // CRITICAL: Always update questionnaire status FIRST to ensure completion is recorded
    // This prevents questionnaires from being stuck in 'pending' if alert creation fails
    await this.questionnaireRepo.updateStatus(
      questionnaireId,
      'completed',
      new Date()
    );

    await this.questionnaireRepo.recordCompletionTime(
      questionnaireId,
      completionTimeSeconds
    );

    // Save alerts to database with error handling
    // PATIENT SAFETY: If this fails, we still need to know about high-grade symptoms
    try {
      await Promise.all(
        alerts.map((alert) =>
          this.db('alerts').insert({
            patient_id: questionnaire.patientId,
            questionnaire_id: questionnaireId,
            alert_type: alert.alertType,
            severity: alert.severity,
            symptom_term: alert.symptomTerm, // Changed from symptom_category - now symptom-specific per CTCAE v5.0
            grade: alert.grade,
            alert_message: alert.alertMessage,
            patient_instructions: alert.patientInstructions,
          })
        )
      );
    } catch (error) {
      // Log critical error
      console.error('🚨 CRITICAL ALERT CREATION FAILURE 🚨');
      console.error(`Patient: ${questionnaire.patientId}`);
      console.error(`Questionnaire: ${questionnaireId}`);
      console.error(`Alerts that failed to save:`, alerts);
      console.error('Error:', error);

      // Check if any critical (Grade 3-4) symptoms were missed
      const criticalAlerts = alerts.filter(
        (a) => a.severity === 'red' || (a.grade && a.grade >= 3)
      );

      if (criticalAlerts.length > 0) {
        console.error('⚠️⚠️⚠️ CRITICAL SYMPTOMS DETECTED BUT ALERTS NOT SAVED ⚠️⚠️⚠️');
        console.error('Critical alerts:', criticalAlerts);

        // Create a fallback alert to ensure it's visible
        try {
          await this.db('alerts').insert({
            patient_id: questionnaire.patientId,
            questionnaire_id: questionnaireId,
            alert_type: 'emergency',
            severity: 'red',
            symptom_category: 'system_error',
            grade: 4,
            alert_message: `SYSTEM ERROR: Alert creation failed for questionnaire with ${criticalAlerts.length} critical symptom(s). MANUAL REVIEW REQUIRED.`,
            patient_instructions: 'Please contact your care team immediately. There was a technical issue submitting your questionnaire responses.',
          });
        } catch (fallbackError) {
          console.error('❌ FALLBACK ALERT CREATION ALSO FAILED:', fallbackError);
          // At this point, we need immediate manual intervention
          // In production, this should trigger:
          // - SMS/email to on-call clinician
          // - PagerDuty alert
          // - Slack notification to engineering team
        }
      }

      // Re-throw the error after logging and creating fallback
      // The caller should know that alert creation failed
      throw new Error(`Alert creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      scores,
      alerts,
    };
  }

  /**
   * Get pending questionnaires for patient
   */
  async getPendingQuestionnaires(patientId: string): Promise<Questionnaire[]> {
    return this.questionnaireRepo.findPendingByPatientId(patientId);
  }

  /**
   * Get questionnaire with items
   */
  async getQuestionnaireWithItems(questionnaireId: string): Promise<{
    questionnaire: Questionnaire;
    items: ProCTCAEItem[];
  }> {
    const questionnaire = await this.questionnaireRepo.findById(questionnaireId);
    if (!questionnaire) {
      throw new NotFoundError('Questionnaire');
    }

    const items = await this.proctcaeRepo.findByIds(questionnaire.selectedItems);

    return {
      questionnaire,
      items,
    };
  }
}
