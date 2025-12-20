import {
  calculateTreatmentDay,
  determineCyclePhase,
  isInNadirWindow,
  calculateDaysUntilNextInfusion,
  calculateTimeline,
  buildTreatmentContext,
} from '../timeline-calculator';
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

const mockCapecitabineRegimen: Regimen = {
  regimenId: 'regimen-2',
  regimenCode: 'CAPE',
  regimenName: 'Capecitabine',
  description: 'Oral capecitabine',
  drugComponents: [],
  standardCycleLengthDays: 21,
  totalCycles: 8,
  toxicityProfile: {},
  nadirWindowStart: null,
  nadirWindowEnd: null,
};

describe('Timeline Calculator', () => {
  describe('calculateTreatmentDay', () => {
    it('should return 1 on infusion day', () => {
      const today = new Date('2025-01-15');
      const infusionDate = new Date('2025-01-15');

      expect(calculateTreatmentDay(infusionDate, today)).toBe(1);
    });

    it('should return 8 on day 8 after infusion', () => {
      const today = new Date('2025-01-22');
      const infusionDate = new Date('2025-01-15');

      expect(calculateTreatmentDay(infusionDate, today)).toBe(8);
    });

    it('should return 21 on last day of 21-day cycle', () => {
      const today = new Date('2025-02-04');
      const infusionDate = new Date('2025-01-15');

      expect(calculateTreatmentDay(infusionDate, today)).toBe(21);
    });

    it('should use current date when not provided', () => {
      const infusionDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      expect(calculateTreatmentDay(infusionDate)).toBe(6);
    });
  });

  describe('determineCyclePhase', () => {
    it('should return post_session for days 1-3', () => {
      expect(determineCyclePhase(1, mockACTRegimen)).toBe('post_session');
      expect(determineCyclePhase(2, mockACTRegimen)).toBe('post_session');
      expect(determineCyclePhase(3, mockACTRegimen)).toBe('post_session');
    });

    it('should return recovery for days 4-6', () => {
      expect(determineCyclePhase(4, mockACTRegimen)).toBe('recovery');
      expect(determineCyclePhase(5, mockACTRegimen)).toBe('recovery');
      expect(determineCyclePhase(6, mockACTRegimen)).toBe('recovery');
    });

    it('should return nadir for days 7-12 (AC-T regimen)', () => {
      expect(determineCyclePhase(7, mockACTRegimen)).toBe('nadir');
      expect(determineCyclePhase(9, mockACTRegimen)).toBe('nadir');
      expect(determineCyclePhase(12, mockACTRegimen)).toBe('nadir');
    });

    it('should return inter_cycle for days 13-19', () => {
      expect(determineCyclePhase(13, mockACTRegimen)).toBe('inter_cycle');
      expect(determineCyclePhase(15, mockACTRegimen)).toBe('inter_cycle');
      expect(determineCyclePhase(19, mockACTRegimen)).toBe('inter_cycle');
    });

    it('should return pre_session for days 20-22 (approaching next cycle)', () => {
      expect(determineCyclePhase(20, mockACTRegimen)).toBe('pre_session');
      expect(determineCyclePhase(21, mockACTRegimen)).toBe('pre_session');
      expect(determineCyclePhase(22, mockACTRegimen)).toBe('pre_session');
    });

    it('should not return nadir for regimen without nadir window', () => {
      expect(determineCyclePhase(9, mockCapecitabineRegimen)).not.toBe('nadir');
      expect(determineCyclePhase(9, mockCapecitabineRegimen)).toBe('inter_cycle');
    });
  });

  describe('isInNadirWindow', () => {
    it('should return true when in nadir window (AC-T)', () => {
      expect(isInNadirWindow(7, mockACTRegimen)).toBe(true);
      expect(isInNadirWindow(9, mockACTRegimen)).toBe(true);
      expect(isInNadirWindow(12, mockACTRegimen)).toBe(true);
    });

    it('should return false when outside nadir window', () => {
      expect(isInNadirWindow(6, mockACTRegimen)).toBe(false);
      expect(isInNadirWindow(13, mockACTRegimen)).toBe(false);
    });

    it('should return false for regimen without nadir window', () => {
      expect(isInNadirWindow(9, mockCapecitabineRegimen)).toBe(false);
    });

    it('should handle edge cases at window boundaries', () => {
      expect(isInNadirWindow(6, mockACTRegimen)).toBe(false);
      expect(isInNadirWindow(7, mockACTRegimen)).toBe(true);
      expect(isInNadirWindow(12, mockACTRegimen)).toBe(true);
      expect(isInNadirWindow(13, mockACTRegimen)).toBe(false);
    });
  });

  describe('calculateDaysUntilNextInfusion', () => {
    it('should return positive days when infusion is in future', () => {
      const today = new Date('2025-01-15');
      const nextInfusion = new Date('2025-01-22');

      expect(calculateDaysUntilNextInfusion(today, nextInfusion)).toBe(7);
    });

    it('should return 0 when infusion is today', () => {
      const today = new Date('2025-01-15');
      const nextInfusion = new Date('2025-01-15');

      expect(calculateDaysUntilNextInfusion(today, nextInfusion)).toBe(0);
    });

    it('should return negative days when infusion is overdue', () => {
      const today = new Date('2025-01-22');
      const nextInfusion = new Date('2025-01-15');

      expect(calculateDaysUntilNextInfusion(today, nextInfusion)).toBe(-7);
    });
  });

  describe('calculateTimeline', () => {
    const mockTreatment = {
      treatmentId: 'treatment-1',
      patientId: 'patient-1',
      regimenId: 'regimen-1',
      startDate: new Date('2025-01-01'),
      currentCycle: 3,
      totalPlannedCycles: 6,
      treatmentIntent: 'adjuvant' as const,
      status: 'active' as const,
    };

    const mockCycle = {
      cycleId: 'cycle-1',
      treatmentId: 'treatment-1',
      cycleNumber: 3,
      infusionDate: new Date('2025-01-15'),
      plannedNextInfusion: new Date('2025-02-05'),
      completed: false,
    };

    it('should calculate timeline for day 9 (nadir peak)', () => {
      const currentDate = new Date('2025-01-23'); // 8 days after infusion = Day 9

      const result = calculateTimeline({
        treatment: mockTreatment,
        regimen: mockACTRegimen,
        currentCycle: mockCycle,
        currentDate,
      });

      expect(result.treatmentDay).toBe(9);
      expect(result.phase).toBe('nadir');
      expect(result.inNadirWindow).toBe(true);
      expect(result.daysSinceLastInfusion).toBe(8);
      expect(result.daysUntilNextInfusion).toBe(13);
    });

    it('should calculate timeline for day 2 (post-session)', () => {
      const currentDate = new Date('2025-01-16'); // 1 day after = Day 2

      const result = calculateTimeline({
        treatment: mockTreatment,
        regimen: mockACTRegimen,
        currentCycle: mockCycle,
        currentDate,
      });

      expect(result.treatmentDay).toBe(2);
      expect(result.phase).toBe('post_session');
      expect(result.inNadirWindow).toBe(false);
    });

    it('should calculate timeline for day 20 (pre-session)', () => {
      const currentDate = new Date('2025-02-03'); // 19 days after = Day 20

      const result = calculateTimeline({
        treatment: mockTreatment,
        regimen: mockACTRegimen,
        currentCycle: mockCycle,
        currentDate,
      });

      expect(result.treatmentDay).toBe(20);
      expect(result.phase).toBe('pre_session');
      expect(result.inNadirWindow).toBe(false);
    });

    it('should handle regimen without nadir window', () => {
      const currentDate = new Date('2025-01-23');

      const result = calculateTimeline({
        treatment: mockTreatment,
        regimen: mockCapecitabineRegimen,
        currentCycle: mockCycle,
        currentDate,
      });

      expect(result.phase).not.toBe('nadir');
      expect(result.inNadirWindow).toBe(false);
    });
  });

  describe('buildTreatmentContext', () => {
    const mockTreatment = {
      treatmentId: 'treatment-1',
      patientId: 'patient-1',
      regimenId: 'regimen-1',
      startDate: new Date('2025-01-01'),
      currentCycle: 3,
      totalPlannedCycles: 6,
      treatmentIntent: 'adjuvant' as const,
      status: 'active' as const,
    };

    const mockCycle = {
      cycleId: 'cycle-1',
      treatmentId: 'treatment-1',
      cycleNumber: 3,
      infusionDate: new Date('2025-01-15'),
      plannedNextInfusion: new Date('2025-02-05'),
      completed: false,
    };

    it('should build complete treatment context', () => {
      const currentDate = new Date('2025-01-23');

      const context = buildTreatmentContext({
        treatment: mockTreatment,
        regimen: mockACTRegimen,
        currentCycle: mockCycle,
        currentDate,
      });

      expect(context).toMatchObject({
        patientId: 'patient-1',
        treatmentId: 'treatment-1',
        currentCycle: 3,
        treatmentDay: 9,
        phase: 'nadir',
        inNadirWindow: true,
      });
      expect(context.regimen.regimenCode).toBe('AC-T');
      expect(context.lastInfusionDate).toEqual(new Date('2025-01-15'));
      expect(context.nextInfusionDate).toEqual(new Date('2025-02-05'));
    });

    it('should include regimen details', () => {
      const currentDate = new Date('2025-01-23');

      const context = buildTreatmentContext({
        treatment: mockTreatment,
        regimen: mockACTRegimen,
        currentCycle: mockCycle,
        currentDate,
      });

      expect(context.regimen.standardCycleLengthDays).toBe(21);
      expect(context.regimen.nadirWindowStart).toBe(7);
      expect(context.regimen.nadirWindowEnd).toBe(12);
    });
  });
});
