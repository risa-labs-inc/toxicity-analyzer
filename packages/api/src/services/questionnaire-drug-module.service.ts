import { Knex } from 'knex';
import {
  buildTreatmentContext,
  selectQuestionsViaDrugModules,
} from '@toxicity-analyzer/intelligence-layer';
import { ProCTCAEItem, Questionnaire } from '@toxicity-analyzer/shared';
import { PatientRepository } from '../repositories/patient.repository';
import { TreatmentRepository } from '../repositories/treatment.repository';
import { ProCTCAERepository } from '../repositories/proctcae.repository';
import { QuestionnaireRepository } from '../repositories/questionnaire.repository';
import { ResponseRepository } from '../repositories/response.repository';
import { DrugModuleRepository } from '../repositories/drug-module.repository';
import { QuestionnaireMetadataRepository } from '../repositories/questionnaire-metadata.repository';
import { NotFoundError } from '../middleware/error.middleware';

/**
 * Drug-Module Questionnaire Service
 *
 * Parallel implementation to QuestionnaireService that uses the drug-module
 * based questionnaire generation approach instead of regimen-phase-history.
 *
 * Both services share the same response submission and completion logic,
 * but differ in how questionnaires are generated.
 */
export class QuestionnaireDrugModuleService {
  private patientRepo: PatientRepository;
  private treatmentRepo: TreatmentRepository;
  private proctcaeRepo: ProCTCAERepository;
  private questionnaireRepo: QuestionnaireRepository;
  private responseRepo: ResponseRepository;
  private drugModuleRepo: DrugModuleRepository;
  private metadataRepo: QuestionnaireMetadataRepository;

  constructor(private db: Knex) {
    this.patientRepo = new PatientRepository(db);
    this.treatmentRepo = new TreatmentRepository(db);
    this.proctcaeRepo = new ProCTCAERepository(db);
    this.questionnaireRepo = new QuestionnaireRepository(db);
    this.responseRepo = new ResponseRepository(db);
    this.drugModuleRepo = new DrugModuleRepository(db);
    this.metadataRepo = new QuestionnaireMetadataRepository(db);
  }

  /**
   * Generate personalized questionnaire using drug-module approach
   *
   * Uses drug modules to determine which symptoms to ask about based on
   * active drugs for the current cycle/step.
   */
  async generateQuestionnaire(patientId: string): Promise<{
    questionnaire: Questionnaire;
    items: ProCTCAEItem[];
    metadata: {
      activeDrugs: string[];
      regimenStep: string | null;
      totalSymptomsBeforeDedup: number;
      totalSymptomsAfterDedup: number;
      phaseFilteringApplied: boolean;
    };
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

    // Get all drug modules
    const allDrugModules = await this.drugModuleRepo.findAll();

    // Get patient symptom history
    const symptomHistory = await this.responseRepo.getSymptomHistory(patientId);

    // Get all available PRO-CTCAE items
    const allItems = await this.proctcaeRepo.findAll();

    // Use drug-module selector to select questions
    const selectionResult = selectQuestionsViaDrugModules({
      context,
      drugModules: allDrugModules,
      availableItems: allItems,
      patientHistory: symptomHistory,
    });

    // Create questionnaire record
    const questionnaire = await this.questionnaireRepo.create({
      patientId,
      treatmentId: treatment.treatmentId,
      cycleId: currentCycle.cycleId,
      questionnaireType: context.phase,
      treatmentDay: context.treatmentDay,
      dueDate: new Date(),
      status: 'pending',
      selectedItems: selectionResult.selectedQuestions.map((item) => item.itemId),
    });

    // Save generation metadata
    await this.metadataRepo.create({
      questionnaireId: questionnaire.questionnaireId,
      generationApproach: 'drug-module',
      activeDrugs: selectionResult.metadata.activeDrugs,
      symptomSources: selectionResult.metadata.symptomSources,
      totalSymptomsBeforeDedup: selectionResult.metadata.totalSymptomsBeforeDedup,
      totalSymptomsAfterDedup: selectionResult.metadata.totalSymptomsAfterDedup,
      phaseFilteringApplied: selectionResult.metadata.phaseFilteringApplied,
    });

    return {
      questionnaire,
      items: selectionResult.selectedQuestions,
      metadata: {
        activeDrugs: selectionResult.metadata.activeDrugs,
        regimenStep: selectionResult.metadata.regimenStep,
        totalSymptomsBeforeDedup: selectionResult.metadata.totalSymptomsBeforeDedup,
        totalSymptomsAfterDedup: selectionResult.metadata.totalSymptomsAfterDedup,
        phaseFilteringApplied: selectionResult.metadata.phaseFilteringApplied,
      },
    };
  }

  /**
   * Get questionnaire with items and metadata
   */
  async getQuestionnaireWithMetadata(questionnaireId: string): Promise<{
    questionnaire: Questionnaire;
    items: ProCTCAEItem[];
    metadata: any;
  }> {
    const questionnaire = await this.questionnaireRepo.findById(questionnaireId);
    if (!questionnaire) {
      throw new NotFoundError('Questionnaire');
    }

    const items = await this.proctcaeRepo.findByIds(questionnaire.selectedItems);
    const metadata = await this.metadataRepo.findByQuestionnaireId(questionnaireId);

    return {
      questionnaire,
      items,
      metadata,
    };
  }
}
