import { Router } from 'express';
import { getDb } from '../db/connection';
import { QuestionnaireService } from '../services/questionnaire.service';
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
 * POST /api/v1/patient/questionnaires/generate
 * Generate new personalized questionnaire
 */
router.post(
  '/questionnaires/generate',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const questionnaireService = new QuestionnaireService(db);

    const result = await questionnaireService.generateQuestionnaire(
      req.user!.patientId!
    );

    res.status(201).json({
      questionnaire: result.questionnaire,
      items: result.items,
      message: 'Personalized questionnaire generated successfully',
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
