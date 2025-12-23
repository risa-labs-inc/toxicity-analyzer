import { Router } from 'express';
import { getDb } from '../db/connection';
import { PatientRepository } from '../repositories/patient.repository';
import { QuestionnaireRepository } from '../repositories/questionnaire.repository';
import { ResponseRepository } from '../repositories/response.repository';
import { TreatmentRepository } from '../repositories/treatment.repository';
import { authenticateDemo, requireClinician, AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prioritizeTriageQueue, getQueueStatistics } from '@toxicity-analyzer/intelligence-layer';
import { buildTreatmentContext } from '@toxicity-analyzer/intelligence-layer';

const router = Router();

/**
 * Get CTCAE v5.0 clinical display name for symptom term
 *
 * Maps internal symptom terms (e.g., "nausea", "hand_foot_syndrome") to
 * standardized CTCAE clinical terminology used by oncologists.
 *
 * @param symptomTerm - Internal symptom term from database
 * @returns CTCAE v5.0 clinical name
 */
function getClinicalDisplayName(symptomTerm: string): string {
  // CTCAE v5.0 clinical terminology mapping
  const clinicalNames: Record<string, string> = {
    // Gastrointestinal
    'nausea': 'Nausea',
    'vomiting': 'Vomiting',
    'diarrhea': 'Diarrhea',
    'constipation': 'Constipation',
    'decreased_appetite': 'Anorexia',

    // Neurological
    'numbness_tingling': 'Peripheral Sensory Neuropathy',
    'pain': 'Pain',

    // Dermatological
    'hand_foot_syndrome': 'Palmar-Plantar Erythrodysesthesia',
    'rash': 'Rash Maculo-Papular',

    // Constitutional
    'fatigue': 'Fatigue',
    'myalgia': 'Myalgia',

    // Add more mappings as needed
  };

  // Return clinical name if available, otherwise format the term
  return clinicalNames[symptomTerm] || formatSymptomName(symptomTerm);
}

/**
 * Format symptom term for display if no clinical mapping exists
 *
 * Converts snake_case to Title Case with proper capitalization.
 *
 * @param symptomTerm - Symptom term to format
 * @returns Formatted name
 */
function formatSymptomName(symptomTerm: string | undefined): string {
  if (!symptomTerm) {
    return 'Unknown Symptom';
  }
  return symptomTerm
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Apply authentication to all clinician routes
router.use(authenticateDemo);
router.use(requireClinician);

/**
 * GET /api/v1/clinician/triage/queue
 * Get prioritized triage queue
 */
router.get(
  '/triage/queue',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const patientRepo = new PatientRepository(db);

    // Extract query parameters for pagination and filtering
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Max 50
    const severityFilter = req.query.severity as string; // 'red', 'yellow', 'green'
    const regimenFilter = req.query.regimen as string;
    const phaseFilter = req.query.phase as string; // 'pre_session', 'post_session', etc.
    const searchQuery = req.query.search as string;

    // Get all active patients
    const patients = await patientRepo.findActive();

    // Get recent questionnaires and alerts for each patient
    const patientsWithAlerts = await Promise.all(
      patients.map(async (patient) => {
        // Get most recent questionnaire (only untriaged)
        const questionnaires = await db('questionnaires')
          .where('patient_id', patient.patientId)
          .where('status', 'completed')
          .where('triaged', false)
          .orderBy('completed_at', 'desc')
          .limit(1);

        if (questionnaires.length === 0) {
          return null;
        }

        const questionnaire = questionnaires[0];

        // Get alerts for this questionnaire
        const alerts = await db('alerts')
          .where('questionnaire_id', questionnaire.questionnaire_id)
          .orderBy('severity', 'asc'); // red, yellow, green

        // Get treatment context
        const treatmentRepo = new TreatmentRepository(db);
        const treatmentContext = await treatmentRepo.getTreatmentContext(patient.patientId);

        if (!treatmentContext) {
          return null;
        }

        const context = buildTreatmentContext({
          treatment: treatmentContext.treatment,
          regimen: treatmentContext.regimen,
          currentCycle: treatmentContext.currentCycle,
          currentDate: new Date(),
        });

        return {
          patientId: patient.patientId,
          patientName: patient.medicalRecordNumber
            ? patient.fullName
              ? `${patient.fullName} - ${patient.medicalRecordNumber}`
              : patient.medicalRecordNumber
            : patient.fullName || patient.patientId,
          questionnaireId: questionnaire.questionnaire_id,
          alerts: alerts.map((a: any) => ({
            alertType: a.alert_type,
            severity: a.severity,
            symptomTerm: a.symptom_term,
            grade: a.grade,
            alertMessage: a.alert_message,
            patientInstructions: a.patient_instructions,
            clinicianInstructions: a.clinician_instructions,
            requiresImmediateAction: a.requires_immediate_action,
          })),
          questionnaireCompletedAt: new Date(questionnaire.completed_at),
          regimenCode: treatmentContext.regimen.regimenCode,
          currentCycle: context.currentCycle,
          treatmentDay: context.treatmentDay,
        };
      })
    );

    // Filter out patients without recent questionnaires
    let validPatients = patientsWithAlerts.filter((p) => p !== null);

    // Apply filters BEFORE prioritization
    if (severityFilter) {
      validPatients = validPatients.filter((p: any) => {
        const hasRed = p.alerts.some((a: any) => a.severity === 'red');
        const hasYellow = p.alerts.some((a: any) => a.severity === 'yellow');
        const severity = hasRed ? 'red' : hasYellow ? 'yellow' : 'green';
        return severity === severityFilter;
      });
    }

    if (regimenFilter) {
      validPatients = validPatients.filter((p: any) =>
        p.regimenCode.toLowerCase().includes(regimenFilter.toLowerCase())
      );
    }

    // Note: Phase filtering would require building context for each patient
    // For now, we'll skip it to avoid performance overhead
    // Can be added if needed by storing phase in patient data

    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      validPatients = validPatients.filter((p: any) =>
        p.patientId.toLowerCase().includes(search) ||
        p.patientName.toLowerCase().includes(search)
      );
    }

    // Prioritize using Alert Engine (on filtered results)
    const triageQueue = prioritizeTriageQueue(validPatients as any);

    // Calculate pagination metadata (before slicing)
    const totalPatients = triageQueue.length;
    const totalPages = Math.ceil(totalPatients / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Paginate results
    const paginatedQueue = triageQueue.slice(startIndex, endIndex);

    // Get queue statistics (use full queue, not paginated)
    const statistics = getQueueStatistics(triageQueue);

    // Transform paginated results to flat structure for frontend
    const formattedQueue = paginatedQueue.map((item) => {
      // Determine overall severity from alerts (highest severity wins)
      const hasRed = item.patient.alerts.some((a) => a.severity === 'red');
      const hasYellow = item.patient.alerts.some((a) => a.severity === 'yellow');
      const severity = hasRed ? 'red' : hasYellow ? 'yellow' : 'green';

      return {
        rank: item.rank,
        patientId: item.patient.patientId,
        patientName: item.patient.patientName,
        questionnaireId: item.patient.questionnaireId,
        regimen: item.patient.regimenCode,
        cycle: item.patient.currentCycle,
        day: item.patient.treatmentDay,
        severity,
        priorityReason: item.priorityReason,
        recommendedAction: item.recommendedAction,
        timelineTarget: item.timelineTarget,
        alerts: item.patient.alerts.map((a) => a.symptomTerm).filter(Boolean),
      };
    });

    res.json({
      queue: formattedQueue,
      statistics,
      pagination: {
        page,
        limit,
        total: totalPatients,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  })
);

/**
 * GET /api/v1/clinician/patients/:id/overview
 * Get patient overview with recent data
 */
router.get(
  '/patients/:id/overview',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const patientRepo = new PatientRepository(db);
    const treatmentRepo = new TreatmentRepository(db);
    const responseRepo = new ResponseRepository(db);
    const questionnaireRepo = new QuestionnaireRepository(db);

    const patientId = req.params.id;

    // Get patient profile
    const patient = await patientRepo.findById(patientId);
    if (!patient) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Patient not found',
      });
      return;
    }

    // Get treatment context
    const treatmentContext = await treatmentRepo.getTreatmentContext(patientId);

    let timeline = null;
    if (treatmentContext) {
      const context = buildTreatmentContext({
        treatment: treatmentContext.treatment,
        regimen: treatmentContext.regimen,
        currentCycle: treatmentContext.currentCycle,
        currentDate: new Date(),
      });

      timeline = {
        treatmentDay: context.treatmentDay,
        phase: context.phase,
        inNadirWindow: context.inNadirWindow,
        currentCycle: context.currentCycle,
        regimenCode: treatmentContext.regimen.regimenCode,
        regimenName: treatmentContext.regimen.regimenName,
      };
    }

    // Get recent questionnaires
    const recentQuestionnaires = await questionnaireRepo.findCompletedByPatientId(
      patientId,
      5
    );

    // Get recent scores
    const recentScores = await responseRepo.findRecentScoresByPatientId(
      patientId,
      20
    );

    // Enrich scores with CTCAE v5.0 clinical display names
    const enrichedScores = recentScores.map(score => ({
      ...score,
      clinicalDisplayName: getClinicalDisplayName(score.symptomTerm),
    }));

    // Get active alerts
    const activeAlerts = await db('alerts')
      .where('patient_id', patientId)
      .where('acknowledged', false)
      .orderBy('triggered_at', 'desc');

    res.json({
      patient,
      timeline,
      recentQuestionnaires,
      recentScores: enrichedScores,
      activeAlerts,
    });
  })
);

/**
 * GET /api/v1/clinician/patients/:id/toxicity-history
 * Get toxicity score history for patient
 */
router.get(
  '/patients/:id/toxicity-history',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const responseRepo = new ResponseRepository(db);

    const scores = await responseRepo.findRecentScoresByPatientId(
      req.params.id,
      50
    );

    // Enrich scores with CTCAE v5.0 clinical display names
    const enrichedScores = scores.map(score => ({
      ...score,
      clinicalDisplayName: getClinicalDisplayName(score.symptomTerm),
    }));

    // Group by symptom term (symptom-specific per CTCAE v5.0)
    const bySymptom = enrichedScores.reduce((acc, score) => {
      if (!acc[score.symptomTerm]) {
        acc[score.symptomTerm] = [];
      }
      acc[score.symptomTerm].push(score);
      return acc;
    }, {} as Record<string, any[]>);

    res.json({
      scores: enrichedScores,
      bySymptom,
    });
  })
);

/**
 * GET /api/v1/clinician/responses/:questionnaireId/detailed
 * Get detailed responses for a questionnaire
 */
router.get(
  '/responses/:questionnaireId/detailed',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const questionnaireRepo = new QuestionnaireRepository(db);
    const responseRepo = new ResponseRepository(db);

    const questionnaire = await questionnaireRepo.findById(req.params.questionnaireId);
    if (!questionnaire) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Questionnaire not found',
      });
      return;
    }

    const responses = await responseRepo.findByQuestionnaireId(req.params.questionnaireId);
    const scores = await responseRepo.findScoresByQuestionnaireId(req.params.questionnaireId);

    // Get item details
    const itemIds = responses.map((r) => r.itemId);
    const items = await db('proctcae_items').whereIn('item_id', itemIds);

    res.json({
      questionnaire,
      responses,
      scores,
      items,
    });
  })
);

/**
 * POST /api/v1/clinician/alerts/:id/acknowledge
 * Acknowledge alert
 */
router.post(
  '/alerts/:id/acknowledge',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();

    await db('alerts')
      .where('alert_id', req.params.id)
      .update({
        acknowledged: true,
        acknowledged_at: new Date(),
        acknowledged_by: req.user!.userId,
      });

    res.json({
      message: 'Alert acknowledged',
    });
  })
);

/**
 * POST /api/v1/clinician/questionnaires/:id/mark-triaged
 * Mark a questionnaire as triaged
 */
router.post(
  '/questionnaires/:id/mark-triaged',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const questionnaireId = req.params.id;

    // Verify questionnaire exists and is completed
    const questionnaire = await db('questionnaires')
      .where('questionnaire_id', questionnaireId)
      .first();

    if (!questionnaire) {
      res.status(404).json({ error: 'Not Found', message: 'Questionnaire not found' });
      return;
    }

    if (questionnaire.status !== 'completed') {
      res.status(400).json({ error: 'Invalid Request', message: 'Only completed questionnaires can be triaged' });
      return;
    }

    // Update triage status
    await db('questionnaires')
      .where('questionnaire_id', questionnaireId)
      .update({
        triaged: true,
        triaged_at: new Date(),
        triaged_by: req.user!.userId,
      });

    res.json({ message: 'Questionnaire marked as triaged', questionnaireId });
  })
);

/**
 * GET /api/v1/clinician/triage/triaged-cases
 * Get list of triaged cases
 */
router.get(
  '/triage/triaged-cases',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const patientRepo = new PatientRepository(db);

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const patients = await patientRepo.findActive();

    // Get most recent TRIAGED questionnaire for each patient
    const patientsWithTriaged = await Promise.all(
      patients.map(async (patient) => {
        const questionnaires = await db('questionnaires')
          .where('patient_id', patient.patientId)
          .where('status', 'completed')
          .where('triaged', true) // Only triaged
          .orderBy('triaged_at', 'desc')
          .limit(1);

        if (questionnaires.length === 0) return null;

        const questionnaire = questionnaires[0];
        const treatmentRepo = new TreatmentRepository(db);
        const treatmentContext = await treatmentRepo.getTreatmentContext(patient.patientId);

        if (!treatmentContext) return null;

        const context = buildTreatmentContext({
          treatment: treatmentContext.treatment,
          regimen: treatmentContext.regimen,
          currentCycle: treatmentContext.currentCycle,
          currentDate: new Date(),
        });

        // Get alerts for this questionnaire to determine severity
        const alerts = await db('alerts')
          .where('questionnaire_id', questionnaire.questionnaire_id)
          .orderBy('severity', 'asc'); // red, yellow, green

        // Determine overall severity from alerts (highest severity wins)
        const hasRed = alerts.some((a: any) => a.severity === 'red');
        const hasYellow = alerts.some((a: any) => a.severity === 'yellow');
        const severity = hasRed ? 'red' : hasYellow ? 'yellow' : 'green';

        return {
          patientId: patient.patientId,
          patientName: patient.medicalRecordNumber
            ? patient.fullName
              ? `${patient.fullName} - ${patient.medicalRecordNumber}`
              : patient.medicalRecordNumber
            : patient.fullName || patient.patientId,
          questionnaireId: questionnaire.questionnaire_id,
          regimen: treatmentContext.regimen.regimenCode,
          cycle: context.currentCycle,
          day: context.treatmentDay,
          severity,
          alerts: alerts.map((a: any) => a.symptom_term).filter(Boolean),
          triagedAt: questionnaire.triaged_at,
          triagedBy: questionnaire.triaged_by,
          questionnaireCompletedAt: questionnaire.completed_at,
        };
      })
    );

    const validCases = patientsWithTriaged
      .filter((p) => p !== null)
      .sort((a, b) => new Date(b.triagedAt).getTime() - new Date(a.triagedAt).getTime());

    // Paginate
    const totalCases = validCases.length;
    const totalPages = Math.ceil(totalCases / limit);
    const startIndex = (page - 1) * limit;
    const paginatedCases = validCases.slice(startIndex, startIndex + limit).map((c, index) => ({
      ...c,
      rank: startIndex + index + 1,
    }));

    res.json({
      cases: paginatedCases,
      pagination: {
        page,
        limit,
        total: totalCases,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  })
);

export default router;
