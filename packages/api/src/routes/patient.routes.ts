import { Router } from 'express';
import { getDb } from '../db/connection';
import { QuestionnaireService } from '../services/questionnaire.service';
import { QuestionnaireDrugModuleService } from '../services/questionnaire-drug-module.service';
import { ComparisonService } from '../services/comparison.service';
import { PatientRepository } from '../repositories/patient.repository';
import { TreatmentRepository } from '../repositories/treatment.repository';
import { ResponseRepository } from '../repositories/response.repository';
import { authenticateDemo, requirePatient, AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { buildTreatmentContext } from '@toxicity-analyzer/intelligence-layer';

const router = Router();

// Apply authentication to all patient routes
router.use(authenticateDemo);
router.use(requirePatient);

/**
 * GET /api/v1/patient/profile
 * Get patient profile
 */
router.get(
  '/profile',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const patientRepo = new PatientRepository(db);

    const patient = await patientRepo.findById(req.user!.patientId!);

    res.json({
      patient,
    });
  })
);

/**
 * GET /api/v1/patient/treatment/timeline
 * Get current treatment timeline and context
 */
router.get(
  '/treatment/timeline',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const treatmentRepo = new TreatmentRepository(db);

    const treatmentContext = await treatmentRepo.getTreatmentContext(
      req.user!.patientId!
    );

    if (!treatmentContext) {
      res.status(404).json({
        error: 'Not Found',
        message: 'No active treatment found',
      });
      return;
    }

    const { treatment, regimen, currentCycle } = treatmentContext;

    // Use The Profiler to calculate timeline
    const context = buildTreatmentContext({
      treatment,
      regimen,
      currentCycle,
      currentDate: new Date(),
    });

    res.json({
      timeline: {
        treatmentDay: context.treatmentDay,
        phase: context.phase,
        inNadirWindow: context.inNadirWindow,
        currentCycle: context.currentCycle,
        regimenCode: regimen.regimenCode,
        regimenName: regimen.regimenName,
        lastInfusionDate: currentCycle.infusionDate,
        nextInfusionDate: currentCycle.plannedNextInfusion,
      },
    });
  })
);

/**
 * GET /api/v1/patient/questionnaires/pending
 * Get pending questionnaires
 */
router.get(
  '/questionnaires/pending',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const questionnaireService = new QuestionnaireService(db);

    const questionnaires = await questionnaireService.getPendingQuestionnaires(
      req.user!.patientId!
    );

    res.json({
      questionnaires,
      count: questionnaires.length,
    });
  })
);

/**
 * POST /api/v1/patient/questionnaires/generate?mode=drug-module|regimen
 * Generate new personalized questionnaire
 *
 * Query Parameters:
 *   - mode: 'drug-module' (default) | 'regimen'
 *
 * Drug-module approach (default):
 *   - 200% better safety coverage
 *   - Safety proxy symptoms bypass phase filtering
 *   - Granular drug tracking with metadata
 *
 * Regimen approach (legacy):
 *   - Phase-filtered symptoms only
 *   - Lower question burden
 */
router.post(
  '/questionnaires/generate',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const mode = (req.query.mode as string) || 'drug-module';

    if (mode !== 'drug-module' && mode !== 'regimen') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid mode parameter. Must be "drug-module" or "regimen"',
      });
      return;
    }

    let result;
    if (mode === 'drug-module') {
      const drugModuleService = new QuestionnaireDrugModuleService(db);
      const drugResult = await drugModuleService.generateQuestionnaire(
        req.user!.patientId!
      );

      // Add generationApproach to metadata for consistency
      result = {
        questionnaire: drugResult.questionnaire,
        items: drugResult.items,
        metadata: {
          generationApproach: 'drug-module',
          ...drugResult.metadata,
        },
      };
    } else {
      // Regimen approach
      const questionnaireService = new QuestionnaireService(db);
      const regimenResult = await questionnaireService.generateQuestionnaire(
        req.user!.patientId!
      );

      // Wrap regimen result to match drug-module format
      result = {
        questionnaire: regimenResult.questionnaire,
        items: regimenResult.items,
        metadata: {
          generationApproach: 'regimen-phase-history',
          activeDrugs: [],
          totalSymptoms: { beforeDedup: 0, afterDedup: 0 },
          phaseFilteringApplied: true,
        },
      };
    }

    res.status(201).json({
      questionnaire: result.questionnaire,
      items: result.items,
      metadata: result.metadata,
      message: `Personalized questionnaire generated successfully (${mode} approach)`,
    });
  })
);

/**
 * POST /api/v1/patient/questionnaires/generate-drug-module
 * Generate new personalized questionnaire (drug-module approach)
 */
router.post(
  '/questionnaires/generate-drug-module',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const drugModuleService = new QuestionnaireDrugModuleService(db);

    const result = await drugModuleService.generateQuestionnaire(
      req.user!.patientId!
    );

    res.status(201).json({
      questionnaire: result.questionnaire,
      items: result.items,
      metadata: result.metadata,
      message: 'Personalized questionnaire generated successfully (drug-module approach)',
    });
  })
);

/**
 * GET /api/v1/patient/questionnaires/:id
 * Get questionnaire with items
 */
router.get(
  '/questionnaires/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const questionnaireService = new QuestionnaireService(db);

    const result = await questionnaireService.getQuestionnaireWithItems(
      req.params.id
    );

    // Verify patient access
    if (result.questionnaire.patientId !== req.user!.patientId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot access other patient questionnaires',
      });
      return;
    }

    res.json(result);
  })
);

/**
 * GET /api/v1/patient/questionnaires/:id/metadata
 * Get questionnaire with items and generation metadata
 */
router.get(
  '/questionnaires/:id/metadata',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const drugModuleService = new QuestionnaireDrugModuleService(db);

    const result = await drugModuleService.getQuestionnaireWithMetadata(
      req.params.id
    );

    // Verify patient access
    if (result.questionnaire.patientId !== req.user!.patientId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot access other patient questionnaires',
      });
      return;
    }

    res.json(result);
  })
);

/**
 * POST /api/v1/patient/questionnaires/compare
 * Generate questionnaires using both approaches and compare them
 */
router.post(
  '/questionnaires/compare',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const comparisonService = new ComparisonService(db);

    const result = await comparisonService.compareApproaches(
      req.user!.patientId!
    );

    const summary = comparisonService.getComparisonSummary(result);

    res.status(201).json({
      comparison: result,
      summary,
      message: 'Questionnaires generated and compared successfully',
    });
  })
);

/**
 * POST /api/v1/patient/questionnaires/:id/start
 * Start questionnaire session
 */
router.post(
  '/questionnaires/:id/start',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const questionnaireService = new QuestionnaireService(db);

    await questionnaireService.startQuestionnaire(req.params.id);

    res.json({
      message: 'Questionnaire started',
      startedAt: new Date(),
    });
  })
);

/**
 * GET /api/v1/patient/questionnaires/:id/responses
 * Get all responses for a questionnaire
 */
router.get(
  '/questionnaires/:id/responses',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const responseRepo = new ResponseRepository(db);

    // Verify questionnaire belongs to patient
    const questionnaire = await db('questionnaires')
      .where('questionnaire_id', req.params.id)
      .first();

    if (!questionnaire) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Questionnaire not found',
      });
      return;
    }

    if (questionnaire.patient_id !== req.user!.patientId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot access other patient questionnaires',
      });
      return;
    }

    // Get all responses for this questionnaire
    const responses = await db('questionnaire_responses as r')
      .join('proctcae_items as pi', 'r.item_id', 'pi.item_id')
      .where('r.questionnaire_id', req.params.id)
      .select(
        'r.item_id as itemId',
        'pi.item_code as itemCode',
        'pi.symptom_category as symptomCategory',
        'pi.attribute',
        'pi.question_text as questionText',
        'r.response_value as responseValue',
        'r.response_label as responseLabel',
        'r.created_at as submittedAt'
      )
      .orderBy('r.created_at', 'asc');

    res.json({
      responses,
      count: responses.length,
    });
  })
);

/**
 * POST /api/v1/patient/questionnaires/:id/responses
 * Submit response to question
 */
router.post(
  '/questionnaires/:id/responses',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const questionnaireService = new QuestionnaireService(db);

    const { itemId, responseValue, responseLabel } = req.body;

    if (!itemId || responseValue === undefined || !responseLabel) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: itemId, responseValue, responseLabel',
      });
      return;
    }

    const result = await questionnaireService.submitResponse(
      req.params.id,
      itemId,
      responseValue,
      responseLabel
    );

    res.json({
      response: result.response,
      branchingQuestions: result.branchingQuestions,
      skipItemIds: result.skipItemIds,
      invalidatedItemIds: result.invalidatedItemIds,
      message: 'Response submitted successfully',
    });
  })
);

/**
 * POST /api/v1/patient/questionnaires/:id/submit
 * Complete questionnaire and calculate scores
 */
router.post(
  '/questionnaires/:id/submit',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const questionnaireService = new QuestionnaireService(db);

    const { completionTimeSeconds } = req.body;

    const result = await questionnaireService.completeQuestionnaire(
      req.params.id,
      completionTimeSeconds || 120
    );

    res.json({
      scores: result.scores,
      alerts: result.alerts,
      message: 'Questionnaire completed successfully',
    });
  })
);

/**
 * GET /api/v1/patient/alerts/active
 * Get active alerts for patient
 */
router.get(
  '/alerts/active',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();

    const alerts = await db('alerts')
      .where('patient_id', req.user!.patientId)
      .where('acknowledged', false)
      .orderBy('triggered_at', 'desc');

    res.json({
      alerts,
      count: alerts.length,
    });
  })
);

export default router;
