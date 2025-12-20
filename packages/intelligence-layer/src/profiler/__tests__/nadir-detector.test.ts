import {
  analyzeNadirStatus,
  getInfectionRiskLevel,
  getNadirPrioritySymptoms,
  shouldShowNadirWarnings,
  generateNadirGuidance,
  calculateNadirDates,
} from '../nadir-detector';
import { Regimen } from '@toxicity-analyzer/shared/types/treatment.types';

// Mock regimen data
const mockACTRegimen: Regimen = {
  regimenId: 'regimen-1',
  regimenCode: 'AC-T',
  regimenName: 'Doxorubicin + Cyclophosphamide → Taxane',
  description: 'Sequential AC-T regimen',
  drugComponents: [],
  standardCycleLengthDays: 21,
  totalCycles: 6,
  toxicityProfile: {},
  nadirWindowStart: 7,
  nadirWindowEnd: 12,
};

const mockNoNadirRegimen: Regimen = {
  regimenId: 'regimen-2',
  regimenCode: 'PEMBRO',
  regimenName: 'Pembrolizumab',
  description: 'Immunotherapy',
  drugComponents: [],
  standardCycleLengthDays: 21,
  totalCycles: 8,
  toxicityProfile: {},
  nadirWindowStart: null,
  nadirWindowEnd: null,
};

describe('Nadir Detector', () => {
  describe('analyzeNadirStatus', () => {
    it('should return none status when not in nadir window', () => {
      const analysis = analyzeNadirStatus(5, mockACTRegimen);

      expect(analysis.isInNadirWindow).toBe(false);
      expect(analysis.nadirSeverity).toBe('none');
      expect(analysis.nadirDay).toBeUndefined();
    });

    it('should detect early nadir phase (days 7-8)', () => {
      const analysis = analyzeNadirStatus(7, mockACTRegimen);

      expect(analysis.isInNadirWindow).toBe(true);
      expect(analysis.nadirSeverity).toBe('early');
      expect(analysis.nadirDay).toBe(7);
      expect(analysis.daysIntoNadir).toBe(0);
      expect(analysis.daysUntilNadirEnd).toBe(5);
    });

    it('should detect peak nadir phase (days 9-10)', () => {
      const analysis = analyzeNadirStatus(9, mockACTRegimen);

      expect(analysis.isInNadirWindow).toBe(true);
      expect(analysis.nadirSeverity).toBe('peak');
      expect(analysis.nadirDay).toBe(9);
      expect(analysis.daysIntoNadir).toBe(2);
    });

    it('should detect late nadir phase (days 11-12)', () => {
      const analysis = analyzeNadirStatus(12, mockACTRegimen);

      expect(analysis.isInNadirWindow).toBe(true);
      expect(analysis.nadirSeverity).toBe('late');
      expect(analysis.nadirDay).toBe(12);
      expect(analysis.daysUntilNadirEnd).toBe(0);
    });

    it('should return none for regimen without nadir window', () => {
      const analysis = analyzeNadirStatus(9, mockNoNadirRegimen);

      expect(analysis.isInNadirWindow).toBe(false);
      expect(analysis.nadirSeverity).toBe('none');
    });

    it('should handle day at start of nadir window', () => {
      const analysis = analyzeNadirStatus(7, mockACTRegimen);

      expect(analysis.isInNadirWindow).toBe(true);
      expect(analysis.daysIntoNadir).toBe(0);
    });

    it('should handle day at end of nadir window', () => {
      const analysis = analyzeNadirStatus(12, mockACTRegimen);

      expect(analysis.isInNadirWindow).toBe(true);
      expect(analysis.daysUntilNadirEnd).toBe(0);
    });
  });

  describe('getInfectionRiskLevel', () => {
    it('should return low risk when not in nadir', () => {
      const analysis = analyzeNadirStatus(5, mockACTRegimen);
      const risk = getInfectionRiskLevel(analysis);

      expect(risk).toBe('low');
    });

    it('should return moderate risk during early nadir', () => {
      const analysis = analyzeNadirStatus(7, mockACTRegimen);
      const risk = getInfectionRiskLevel(analysis);

      expect(risk).toBe('moderate');
    });

    it('should return very_high risk during peak nadir', () => {
      const analysis = analyzeNadirStatus(9, mockACTRegimen);
      const risk = getInfectionRiskLevel(analysis);

      expect(risk).toBe('very_high');
    });

    it('should return high risk during late nadir', () => {
      const analysis = analyzeNadirStatus(11, mockACTRegimen);
      const risk = getInfectionRiskLevel(analysis);

      expect(risk).toBe('high');
    });
  });

  describe('getNadirPrioritySymptoms', () => {
    it('should return empty array when not in nadir', () => {
      const analysis = analyzeNadirStatus(5, mockACTRegimen);
      const symptoms = getNadirPrioritySymptoms(analysis);

      expect(symptoms).toEqual([]);
    });

    it('should return core symptoms plus early phase symptoms', () => {
      const analysis = analyzeNadirStatus(7, mockACTRegimen);
      const symptoms = getNadirPrioritySymptoms(analysis);

      expect(symptoms).toContain('infection_signs');
      expect(symptoms).toContain('fever');
      expect(symptoms).toContain('bleeding');
      expect(symptoms).toContain('bruising');
      expect(symptoms).toContain('fatigue');
      expect(symptoms).toContain('weakness');
    });

    it('should return core symptoms plus peak phase symptoms', () => {
      const analysis = analyzeNadirStatus(9, mockACTRegimen);
      const symptoms = getNadirPrioritySymptoms(analysis);

      expect(symptoms).toContain('infection_signs');
      expect(symptoms).toContain('fever');
      expect(symptoms).toContain('shortness_of_breath');
      expect(symptoms).toContain('dizziness');
      expect(symptoms).toContain('chills');
    });

    it('should return core symptoms plus late phase symptoms', () => {
      const analysis = analyzeNadirStatus(12, mockACTRegimen);
      const symptoms = getNadirPrioritySymptoms(analysis);

      expect(symptoms).toContain('infection_signs');
      expect(symptoms).toContain('fever');
      expect(symptoms).toContain('mouth_sores');
      expect(symptoms).toContain('skin_changes');
    });
  });

  describe('shouldShowNadirWarnings', () => {
    it('should return false when not in nadir', () => {
      const analysis = analyzeNadirStatus(5, mockACTRegimen);

      expect(shouldShowNadirWarnings(analysis)).toBe(false);
    });

    it('should return true during early nadir', () => {
      const analysis = analyzeNadirStatus(7, mockACTRegimen);

      expect(shouldShowNadirWarnings(analysis)).toBe(true);
    });

    it('should return true during peak nadir', () => {
      const analysis = analyzeNadirStatus(9, mockACTRegimen);

      expect(shouldShowNadirWarnings(analysis)).toBe(true);
    });

    it('should return false during late nadir', () => {
      const analysis = analyzeNadirStatus(12, mockACTRegimen);

      expect(shouldShowNadirWarnings(analysis)).toBe(false);
    });
  });

  describe('generateNadirGuidance', () => {
    it('should return empty string when not in nadir', () => {
      const analysis = analyzeNadirStatus(5, mockACTRegimen);
      const guidance = generateNadirGuidance(analysis);

      expect(guidance).toBe('');
    });

    it('should return moderate risk guidance for early nadir', () => {
      const analysis = analyzeNadirStatus(7, mockACTRegimen);
      const guidance = generateNadirGuidance(analysis);

      expect(guidance).toContain('entering the nadir period');
      expect(guidance).toContain('extra vigilant');
    });

    it('should return very high risk guidance for peak nadir', () => {
      const analysis = analyzeNadirStatus(9, mockACTRegimen);
      const guidance = generateNadirGuidance(analysis);

      expect(guidance).toContain('PEAK NADIR PERIOD');
      expect(guidance).toContain('highest');
      expect(guidance).toContain('100.4');
    });

    it('should return high risk guidance for late nadir', () => {
      const analysis = analyzeNadirStatus(11, mockACTRegimen);
      const guidance = generateNadirGuidance(analysis);

      expect(guidance).toContain('white blood cell counts');
      expect(guidance).toContain('likely low');
    });
  });

  describe('calculateNadirDates', () => {
    it('should calculate correct nadir dates', () => {
      const infusionDate = new Date('2025-01-15');
      const dates = calculateNadirDates(infusionDate, mockACTRegimen);

      expect(dates).not.toBeNull();
      expect(dates!.nadirStart).toEqual(new Date('2025-01-21')); // Day 7
      expect(dates!.nadirEnd).toEqual(new Date('2025-01-26'));   // Day 12
    });

    it('should return null for regimen without nadir window', () => {
      const infusionDate = new Date('2025-01-15');
      const dates = calculateNadirDates(infusionDate, mockNoNadirRegimen);

      expect(dates).toBeNull();
    });

    it('should handle different infusion dates', () => {
      const infusionDate = new Date('2025-02-01');
      const dates = calculateNadirDates(infusionDate, mockACTRegimen);

      expect(dates).not.toBeNull();
      expect(dates!.nadirStart).toEqual(new Date('2025-02-07'));
      expect(dates!.nadirEnd).toEqual(new Date('2025-02-12'));
    });

    it('should calculate dates across month boundaries', () => {
      const infusionDate = new Date('2025-01-28');
      const dates = calculateNadirDates(infusionDate, mockACTRegimen);

      expect(dates).not.toBeNull();
      expect(dates!.nadirStart).toEqual(new Date('2025-02-03'));
      expect(dates!.nadirEnd).toEqual(new Date('2025-02-08'));
    });
  });
});
