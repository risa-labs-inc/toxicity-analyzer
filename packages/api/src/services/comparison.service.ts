import { Knex } from 'knex';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireDrugModuleService } from './questionnaire-drug-module.service';
import { calculateComparisonMetrics, ComparisonMetrics } from '@toxicity-analyzer/intelligence-layer';
import { ProCTCAEItem, Questionnaire } from '@toxicity-analyzer/shared';
import { ResponseRepository } from '../repositories/response.repository';

export interface ComparisonResult {
  regimenApproach: {
    questionnaire: Questionnaire;
    items: ProCTCAEItem[];
  };
  drugModuleApproach: {
    questionnaire: Questionnaire;
    items: ProCTCAEItem[];
    metadata: {
      activeDrugs: string[];
      regimenStep: string | null;
      totalSymptomsBeforeDedup: number;
      totalSymptomsAfterDedup: number;
      phaseFilteringApplied: boolean;
    };
  };
  metrics: ComparisonMetrics;
  patientId: string;
  generatedAt: Date;
}

/**
 * Comparison Service
 *
 * Generates questionnaires using both approaches and calculates comparison metrics
 */
export class ComparisonService {
  private regimenService: QuestionnaireService;
  private drugModuleService: QuestionnaireDrugModuleService;
  private responseRepo: ResponseRepository;

  constructor(private db: Knex) {
    this.regimenService = new QuestionnaireService(db);
    this.drugModuleService = new QuestionnaireDrugModuleService(db);
    this.responseRepo = new ResponseRepository(db);
  }

  /**
   * Generate questionnaires using both approaches and compare them
   */
  async compareApproaches(patientId: string): Promise<ComparisonResult> {
    // Generate questionnaire using regimen-phase-history approach
    const regimenResult = await this.regimenService.generateQuestionnaire(patientId);

    // Generate questionnaire using drug-module approach
    const drugModuleResult = await this.drugModuleService.generateQuestionnaire(patientId);

    // Get patient history for personalization metrics
    const patientHistory = await this.responseRepo.getSymptomHistory(patientId);

    // Get metadata from drug module approach
    const metadataResponse = await this.drugModuleService.getQuestionnaireWithMetadata(
      drugModuleResult.questionnaire.questionnaireId
    );

    // Calculate comparison metrics
    const metrics = calculateComparisonMetrics(
      regimenResult.items,
      drugModuleResult.items,
      metadataResponse.metadata
        ? {
            activeDrugs: metadataResponse.metadata.activeDrugs,
            regimenStep: metadataResponse.metadata.regimenStep,
            symptomSources: metadataResponse.metadata.symptomSources,
          }
        : undefined,
      patientHistory.map(h => ({
        symptomTerm: h.symptomCategory,
        lastGrade: h.lastGrade,
      }))
    );

    return {
      regimenApproach: regimenResult,
      drugModuleApproach: drugModuleResult,
      metrics,
      patientId,
      generatedAt: new Date(),
    };
  }

  /**
   * Get comparison summary as formatted text
   */
  getComparisonSummary(result: ComparisonResult): string {
    const { metrics } = result;

    const summary = [
      '═══════════════════════════════════════════════════════════',
      'QUESTIONNAIRE APPROACH COMPARISON',
      '═══════════════════════════════════════════════════════════',
      '',
      '📊 SYMPTOM COVERAGE',
      `  Jaccard Similarity: ${(metrics.symptomCoverage.jaccardSimilarity * 100).toFixed(1)}%`,
      `  Shared Symptoms: ${metrics.symptomCoverage.sharedSymptoms.length}`,
      `  Unique to Regimen: ${metrics.symptomCoverage.uniqueToRegimen.length}`,
      `  Unique to Drug Module: ${metrics.symptomCoverage.uniqueToDrugModule.length}`,
      '',
      '🎯 PERSONALIZATION EFFECTIVENESS',
      `  Regimen Approach - Grade 2+ Coverage: ${(metrics.personalization.regimenApproachHistoricalCoverage * 100).toFixed(1)}%`,
      `  Drug Module Approach - Grade 2+ Coverage: ${(metrics.personalization.drugModuleApproachHistoricalCoverage * 100).toFixed(1)}%`,
      `  Regimen Approach - Grade 3+ Coverage: ${(metrics.personalization.regimenApproachGrade3Coverage * 100).toFixed(1)}%`,
      `  Drug Module Approach - Grade 3+ Coverage: ${(metrics.personalization.drugModuleApproachGrade3Coverage * 100).toFixed(1)}%`,
      '',
      '🏥 CLINICAL VALUE (Safety Signal Coverage)',
      `  Regimen Approach: ${(metrics.clinicalValue.regimenApproachSafetyProxyCoverage * 100).toFixed(1)}% (${metrics.clinicalValue.regimenApproachSafetyProxyCount}/${metrics.clinicalValue.criticalSafetySymptoms.length})`,
      `  Drug Module Approach: ${(metrics.clinicalValue.drugModuleApproachSafetyProxyCoverage * 100).toFixed(1)}% (${metrics.clinicalValue.drugModuleApproachSafetyProxyCount}/${metrics.clinicalValue.criticalSafetySymptoms.length})`,
      '',
      '📝 QUESTION COUNT',
      `  Regimen Approach: ${metrics.questionCount.regimenApproachTotal} questions`,
      `  Drug Module Approach: ${metrics.questionCount.drugModuleApproachTotal} questions`,
      `  Difference: ${metrics.questionCount.difference > 0 ? '+' : ''}${metrics.questionCount.difference} (${metrics.questionCount.percentDifference > 0 ? '+' : ''}${metrics.questionCount.percentDifference.toFixed(1)}%)`,
      '',
      '🔍 GRANULARITY',
      `  Step Tracking: ${metrics.granularity.drugModuleApproachHasStepTracking ? 'Yes' : 'No'}`,
      `  Active Drugs: ${metrics.granularity.drugModuleApproachActiveDrugs.join(', ') || 'N/A'}`,
      `  Regimen Step: ${metrics.granularity.drugModuleApproachRegimenStep || 'N/A'}`,
      `  Symptoms with Source Tracking: ${metrics.granularity.drugModuleApproachSymptomSources.length}`,
      '═══════════════════════════════════════════════════════════',
    ];

    return summary.join('\n');
  }
}
